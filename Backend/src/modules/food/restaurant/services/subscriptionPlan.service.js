import mongoose from "mongoose";
import { FoodRestaurant } from "../models/restaurant.model.js";
import { FoodTransaction } from "../../orders/models/foodTransaction.model.js";
import { FoodOrder } from "../../orders/models/order.model.js";
import { FoodRestaurantWithdrawal } from "../models/foodRestaurantWithdrawal.model.js";
import { getRestaurantSubscriptionSettings } from "../../admin/services/admin.service.js";
import { logRestaurantSubscriptionHistory } from "./subscriptionHistory.service.js";

const GST_RATE = 0.18;
const STARTER_THRESHOLD_LATE_WINDOW_DAYS = 3;

export const SUBSCRIPTION_PLAN_KEYS = {
    STARTER: "starter",
    GROWTH: "growth",
    PREMIUM: "premium",
};

const LEGACY_PLAN_MAP = {
    silver: SUBSCRIPTION_PLAN_KEYS.STARTER,
    gold: SUBSCRIPTION_PLAN_KEYS.GROWTH,
    pro: SUBSCRIPTION_PLAN_KEYS.GROWTH,
    elite: SUBSCRIPTION_PLAN_KEYS.PREMIUM,
};

const toNum = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const isEarnedOrder = (order) => {
    const orderStatus = String(order?.orderStatus || "").trim().toLowerCase();
    const deliveryPhase = String(order?.deliveryState?.currentPhase || "").trim().toLowerCase();
    return (
        orderStatus === "delivered" ||
        deliveryPhase === "delivered" ||
        deliveryPhase === "completed"
    );
};

const calculateOrderPayout = (order) => {
    if (!isEarnedOrder(order)) return 0;

    const tx = order?.transactionId || {};
    const pricing = tx?.pricing || order?.pricing || {};
    const amounts = tx?.amounts || {};
    const storedRestaurantShare = Number(amounts?.restaurantShare);
    if (Number.isFinite(storedRestaurantShare)) {
        return Math.max(0, storedRestaurantShare);
    }

    const subtotal = Number(pricing?.subtotal) || 0;
    const packagingFee = Number(pricing?.packagingFee) || 0;
    const commission = Number(amounts?.restaurantCommission) || Number(pricing?.restaurantCommission) || 0;
    const restaurantDiscountShare = Number(amounts?.restaurantDiscountShare) || 0;
    return Math.max(0, subtotal + packagingFee - commission - restaurantDiscountShare);
};

const getFixedCurrentCycleWindow = (now = new Date()) => {
    const startDay = 15;
    let year = now.getFullYear();
    let month = now.getMonth();

    if (now.getDate() < startDay) {
        month -= 1;
        if (month < 0) {
            month = 11;
            year -= 1;
        }
    }

    return {
        start: new Date(year, month, startDay, 0, 0, 0, 0),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
    };
};

const sumRestaurantOrderPayouts = async ({ restaurantId, startDate, endDate }) => {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) return 0;

    const orders = await FoodOrder.find({
        restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
        orderStatus: { $nin: ["pending_payment"] },
        createdAt: { $gte: startDate, $lte: endDate },
    })
        .populate("transactionId")
        .lean();

    return orders.reduce((sum, order) => sum + calculateOrderPayout(order), 0);
};

export const normalizePlanName = (value) => {
    const plan = String(value || "").trim().toLowerCase();
    if (plan === SUBSCRIPTION_PLAN_KEYS.STARTER || plan === SUBSCRIPTION_PLAN_KEYS.GROWTH || plan === SUBSCRIPTION_PLAN_KEYS.PREMIUM) {
        return plan;
    }
    return LEGACY_PLAN_MAP[plan] || SUBSCRIPTION_PLAN_KEYS.STARTER;
};

export const buildPlanCatalog = (settings = {}) => {
    const starterPrice = Math.max(0, toNum(settings.starterPrice, 999));
    const growthPrice = Math.max(0, toNum(settings.growthPrice, 1999));
    const premiumPrice = Math.max(0, toNum(settings.premiumPrice, 2999));
    const starterMinGmv = Math.max(0, toNum(settings.starterMinGmv, 0));
    const starterMaxGmv = Math.max(starterMinGmv, toNum(settings.starterMaxGmv, 30000));
    const growthMinGmv = Math.max(starterMaxGmv, toNum(settings.growthMinGmv, starterMaxGmv + 0.01));
    const growthMaxGmv = Math.max(growthMinGmv, toNum(settings.growthMaxGmv, 60000));
    const premiumMinGmv = Math.max(growthMaxGmv, toNum(settings.premiumMinGmv, growthMaxGmv + 0.01));

    return {
        starterMinGmv,
        starterMaxGmv,
        growthMinGmv,
        growthMaxGmv,
        premiumMinGmv,
        plans: [
            { id: SUBSCRIPTION_PLAN_KEYS.STARTER, label: "Starter", basePrice: starterPrice, gmvMin: starterMinGmv, gmvMax: starterMaxGmv },
            { id: SUBSCRIPTION_PLAN_KEYS.GROWTH, label: "Growth", basePrice: growthPrice, gmvMin: growthMinGmv, gmvMax: growthMaxGmv },
            { id: SUBSCRIPTION_PLAN_KEYS.PREMIUM, label: "Premium", basePrice: premiumPrice, gmvMin: premiumMinGmv, gmvMax: null },
        ],
    };
};

export const resolveEligiblePlanByGmv = (gmv30d = 0, catalog = buildPlanCatalog({})) => {
    const safeGmv = Math.max(0, toNum(gmv30d, 0));
    if (safeGmv >= catalog.starterMinGmv && safeGmv <= catalog.starterMaxGmv) return SUBSCRIPTION_PLAN_KEYS.STARTER;
    if (safeGmv >= catalog.growthMinGmv && safeGmv <= catalog.growthMaxGmv) return SUBSCRIPTION_PLAN_KEYS.GROWTH;
    return SUBSCRIPTION_PLAN_KEYS.PREMIUM;
};

export const getRestaurantGmvLast30Days = async (restaurantId) => {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) return 0;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);

    const agg = await FoodTransaction.aggregate([
        {
            $match: {
                restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
                status: { $in: ["authorized", "captured"] },
                createdAt: { $gte: start, $lte: now },
            },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$amounts.restaurantShare", 0] } } } },
    ]);

    const totalFromTransactions = Math.max(0, toNum(agg?.[0]?.total, 0));
    if (totalFromTransactions > 0) {
        return totalFromTransactions;
    }

    return sumRestaurantOrderPayouts({
        restaurantId,
        startDate: start,
        endDate: now,
    });
};

export const resolveRestaurantPlanEligibility = async (restaurantId, settingsOverride = null) => {
    const settings = settingsOverride || (await getRestaurantSubscriptionSettings()) || {};
    const catalog = buildPlanCatalog(settings);
    const gmv30d = await getRestaurantGmvLast30Days(restaurantId);
    const eligiblePlan = resolveEligiblePlanByGmv(gmv30d, catalog);
    return {
        eligiblePlan,
        gmv30d,
        thresholdsUsed: {
            starterMinGmv: catalog.starterMinGmv,
            starterMaxGmv: catalog.starterMaxGmv,
            growthMinGmv: catalog.growthMinGmv,
            growthMaxGmv: catalog.growthMaxGmv,
            premiumMinGmv: catalog.premiumMinGmv,
        },
        planCatalog: catalog.plans,
    };
};

export const resolvePlanPricingFromEligibility = async (restaurantId, settingsOverride = null) => {
    const eligibility = await resolveRestaurantPlanEligibility(restaurantId, settingsOverride);
    const selected = eligibility.planCatalog.find((plan) => plan.id === eligibility.eligiblePlan) || eligibility.planCatalog[0];
    return {
        planName: selected?.id || SUBSCRIPTION_PLAN_KEYS.STARTER,
        baseAmount: Math.max(0, toNum(selected?.basePrice, 0)),
        eligibility,
    };
};

export const buildSubscriptionTotals = (planBase, paymentType = "later", partialBase = 0) => {
    const normalizedType = ["full", "partial", "later"].includes(String(paymentType)) ? String(paymentType) : "later";
    const base = Math.max(0, toNum(planBase, 0));
    const planGST = Math.round(base * GST_RATE);
    const planTotal = base + planGST;

    let paidBase = 0;
    if (normalizedType === "full") paidBase = base;
    if (normalizedType === "partial") paidBase = Math.max(0, Math.min(base, toNum(partialBase, 0)));

    const paidGST = Math.round(paidBase * GST_RATE);
    const paidTotal = paidBase + paidGST;
    const dueTotal = Math.max(0, planTotal - paidTotal);

    return {
        paymentType: normalizedType,
        planGST,
        planTotal,
        paidBase,
        paidGST,
        paidTotal,
        dueTotal,
    };
};

export const getStarterPlanTotalWithGst = (settings = {}) => {
    const starterPrice = Math.max(0, toNum(settings?.starterPrice, 999));
    const gstAmount = Math.round(starterPrice * GST_RATE);
    return starterPrice + gstAmount;
};

export const getStarterAutoDeductThreshold = (settings = {}) => {
    const starterPlanTotal = getStarterPlanTotalWithGst(settings);
    return Math.max(
        starterPlanTotal,
        toNum(settings?.starterAutoDeductThreshold, starterPlanTotal)
    );
};

const getSubscriptionCycleWindow = (restaurant, now = new Date()) => {
    const endsAt = restaurant?.subscriptionValidTill ? new Date(restaurant.subscriptionValidTill) : null;
    if (!endsAt || Number.isNaN(endsAt.getTime())) return null;

    const startsAt = new Date(endsAt);
    startsAt.setDate(startsAt.getDate() - 30);

    const effectiveEnd = now.getTime() < endsAt.getTime() ? now : endsAt;
    return {
        startsAt,
        endsAt,
        effectiveEnd,
    };
};

export const getRestaurantCycleGmv = async (restaurantId, restaurant, now = new Date()) => {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) return 0;
    const cycleWindow = getSubscriptionCycleWindow(restaurant, now);
    if (!cycleWindow) return 0;

    const agg = await FoodTransaction.aggregate([
        {
            $match: {
                restaurantId: new mongoose.Types.ObjectId(String(restaurantId)),
                status: { $in: ["authorized", "captured"] },
                createdAt: { $gte: cycleWindow.startsAt, $lte: cycleWindow.effectiveEnd },
            },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$amounts.restaurantShare", 0] } } } },
    ]);

    const totalFromTransactions = Math.max(0, toNum(agg?.[0]?.total, 0));
    if (totalFromTransactions > 0) {
        return totalFromTransactions;
    }

    return sumRestaurantOrderPayouts({
        restaurantId,
        startDate: cycleWindow.startsAt,
        endDate: cycleWindow.effectiveEnd,
    });
};

export const getStarterThresholdContext = async (restaurant, settingsOverride = null, now = new Date()) => {
    const plan = normalizePlanName(restaurant?.subscriptionPlan);
    const defaultContext = {
        enabled: false,
        plan,
        thresholdAmount: 0,
        currentCycleGmv: 0,
        lastThreeDaysWindowActive: false,
        shouldDiscountDue: false,
        cycleStartsAt: null,
        cycleEndsAt: restaurant?.subscriptionValidTill || null,
    };

    if (!restaurant?._id || plan !== SUBSCRIPTION_PLAN_KEYS.STARTER) {
        return defaultContext;
    }

    const cycleWindow = getSubscriptionCycleWindow(restaurant, now);
    if (!cycleWindow) {
        return defaultContext;
    }

    const settings = settingsOverride || (await getRestaurantSubscriptionSettings()) || {};
    const thresholdAmount = getStarterAutoDeductThreshold(settings);
    const currentCycleGmv = await getRestaurantCycleGmv(restaurant._id, restaurant, now);
    const lateWindowStartsAt = new Date(cycleWindow.endsAt);
    lateWindowStartsAt.setDate(lateWindowStartsAt.getDate() - STARTER_THRESHOLD_LATE_WINDOW_DAYS);
    const belowThreshold = currentCycleGmv < thresholdAmount;
    const lastThreeDaysWindowActive =
        belowThreshold &&
        now.getTime() >= lateWindowStartsAt.getTime() &&
        now.getTime() < cycleWindow.endsAt.getTime();
    const shouldDiscountDue =
        belowThreshold &&
        now.getTime() >= cycleWindow.endsAt.getTime() &&
        Math.max(0, toNum(restaurant?.subscriptionDueAmount, 0)) > 0;

    return {
        enabled: true,
        plan,
        thresholdAmount,
        currentCycleGmv,
        lastThreeDaysWindowActive,
        shouldDiscountDue,
        cycleStartsAt: cycleWindow.startsAt,
        cycleEndsAt: cycleWindow.endsAt,
    };
};

export const applyStarterThresholdDiscountIfEligible = async (restaurant, settingsOverride = null, now = new Date()) => {
    if (!restaurant?._id) {
        return { applied: false, reason: "missing_restaurant" };
    }

    const thresholdContext = await getStarterThresholdContext(restaurant, settingsOverride, now);
    if (!thresholdContext.enabled) {
        return { applied: false, reason: "starter_threshold_not_applicable", thresholdContext };
    }
    if (!thresholdContext.shouldDiscountDue) {
        return { applied: false, reason: "discount_not_due", thresholdContext };
    }

    const dueAmount = Math.max(0, toNum(restaurant.subscriptionDueAmount, 0));
    if (dueAmount <= 0) {
        return { applied: false, reason: "no_due", thresholdContext };
    }

    const paidBefore = Math.max(0, toNum(restaurant.subscriptionPaidAmount, 0));
    restaurant.subscriptionPaidAmount = paidBefore + dueAmount;
    restaurant.subscriptionDueAmount = 0;
    restaurant.subscriptionStatus = "paid";
    await restaurant.save();

    await logRestaurantSubscriptionHistory({
        restaurantId: restaurant._id,
        eventType: "subscription_payment",
        plan: restaurant.subscriptionPlan,
        paymentType: "discounted",
        amount: 0,
        dueBefore: dueAmount,
        dueAfter: 0,
        paidBefore,
        paidAfter: Math.max(0, toNum(restaurant.subscriptionPaidAmount, 0)),
        gmvLast30Days: thresholdContext.currentCycleGmv,
        note: `Starter subscription due waived because cycle GMV stayed below threshold of ₹${thresholdContext.thresholdAmount}`,
        metadata: {
            discountApplied: true,
            thresholdAmount: thresholdContext.thresholdAmount,
            currentCycleGmv: thresholdContext.currentCycleGmv,
        },
    }).catch(() => null);

    return {
        applied: true,
        discountedAmount: dueAmount,
        thresholdContext,
    };
};

export const computeRestaurantAvailableEarnings = async (restaurantId) => {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) return 0;
    const rid = new mongoose.Types.ObjectId(String(restaurantId));
    const currentCycleWindow = getFixedCurrentCycleWindow(new Date());

    const [earningsAgg, committedWithdrawalsAgg, restaurant] = await Promise.all([
        FoodTransaction.aggregate([
            {
                $match: {
                    restaurantId: rid,
                    status: { $in: ["captured", "authorized"] },
                    "settlement.isRestaurantSettled": { $ne: true },
                },
            },
            { $group: { _id: null, total: { $sum: { $ifNull: ["$amounts.restaurantShare", 0] } } } },
        ]),
        FoodRestaurantWithdrawal.aggregate([
            {
                $match: {
                    restaurantId: rid,
                    createdAt: { $gte: currentCycleWindow.start, $lte: currentCycleWindow.end },
                    $expr: {
                        $in: [
                            { $toLower: { $trim: { input: "$status" } } },
                            ["pending", "approved"],
                        ],
                    },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        FoodRestaurant.findById(rid).select("subscriptionAutoDeductedAmount").lean(),
    ]);

    let earnings = Math.max(0, toNum(earningsAgg?.[0]?.total, 0));
    if (earnings <= 0) {
        earnings = await sumRestaurantOrderPayouts({
            restaurantId,
            startDate: currentCycleWindow.start,
            endDate: currentCycleWindow.end,
        });
    }
    const committedWithdrawals = Math.max(0, toNum(committedWithdrawalsAgg?.[0]?.total, 0));
    const subscriptionReserved = Math.max(0, toNum(restaurant?.subscriptionAutoDeductedAmount, 0));
    return Math.max(0, earnings - committedWithdrawals - subscriptionReserved);
};

export const attemptAutoSettleSubscriptionDue = async (restaurantId) => {
    if (!restaurantId) return { settled: false, reason: "missing_restaurant_id" };
    const restaurant = await FoodRestaurant.findById(restaurantId);
    if (!restaurant) return { settled: false, reason: "restaurant_not_found" };

    const dueAmount = Math.max(0, toNum(restaurant.subscriptionDueAmount, 0));
    if (dueAmount <= 0) return { settled: false, reason: "no_due" };
    const settings = await getRestaurantSubscriptionSettings();
    const thresholdDiscount = await applyStarterThresholdDiscountIfEligible(restaurant, settings);
    if (thresholdDiscount.applied) {
        return {
            settled: false,
            discounted: true,
            discountedAmount: thresholdDiscount.discountedAmount,
            reason: "starter_due_discounted",
            thresholdContext: thresholdDiscount.thresholdContext,
        };
    }
    const dueBefore = dueAmount;
    const paidBefore = toNum(restaurant.subscriptionPaidAmount, 0);

    const availableEarnings = await computeRestaurantAvailableEarnings(restaurantId);
    const thresholdContext = await getStarterThresholdContext(restaurant, settings);
    if (thresholdContext.enabled && availableEarnings < thresholdContext.thresholdAmount) {
        return {
            settled: false,
            reason: "starter_threshold_not_reached",
            availableEarnings,
            dueAmount,
            thresholdAmount: thresholdContext.thresholdAmount,
            currentCycleGmv: thresholdContext.currentCycleGmv,
        };
    }
    if (availableEarnings < dueAmount) {
        return { settled: false, reason: "insufficient_earnings", availableEarnings, dueAmount };
    }

    restaurant.subscriptionPaidAmount = toNum(restaurant.subscriptionPaidAmount, 0) + dueAmount;
    restaurant.subscriptionAutoDeductedAmount = toNum(restaurant.subscriptionAutoDeductedAmount, 0) + dueAmount;
    restaurant.subscriptionDueAmount = 0;
    restaurant.subscriptionStatus = "paid";
    await restaurant.save();
    const gmvLast30Days = await getRestaurantGmvLast30Days(restaurantId);
    await logRestaurantSubscriptionHistory({
        restaurantId,
        eventType: "subscription_auto_deduct",
        plan: restaurant.subscriptionPlan,
        amount: dueAmount,
        dueBefore,
        dueAfter: 0,
        paidBefore,
        paidAfter: toNum(restaurant.subscriptionPaidAmount, 0),
        gmvLast30Days,
        note: "Auto-settled subscription due from available earnings",
    }).catch(() => null);

    return {
        settled: true,
        dueSettled: dueAmount,
        availableEarningsBeforeSettle: availableEarnings,
        remainingAvailableAfterSettle: Math.max(0, availableEarnings - dueAmount),
    };
};

export const isSubscriptionExpired = (restaurant) => {
    if (!restaurant?.subscriptionValidTill) return false;
    const validTill = new Date(restaurant.subscriptionValidTill);
    if (Number.isNaN(validTill.getTime())) return false;
    return validTill.getTime() < Date.now();
};
