import mongoose from 'mongoose';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodTransaction } from '../../orders/models/foodTransaction.model.js';
import { FoodRestaurant } from '../models/restaurant.model.js';
import { FoodRestaurantWithdrawal } from '../models/foodRestaurantWithdrawal.model.js';

function toTwoDigitYearString(dateObj) {
    const y = String(dateObj.getFullYear());
    return y.slice(-2);
}

function monthShort(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex] || 'Jan';
}

function getFixedCurrentCycleWindow(now = new Date()) {
    const startDay = 15;
    
    let year = now.getFullYear();
    let month = now.getMonth();

    // If before start day, settlement belongs to previous month cycle.
    if (now.getDate() < startDay) {
        month = month - 1;
        if (month < 0) {
            month = 11;
            year -= 1;
        }
    }

    const start = new Date(year, month, startDay, 0, 0, 0, 0);
    // End should be either fixed 21 or now, let's make it more inclusive for "Current Cycle"
    // Users want to see their active earnings, so we extend it to 'now'
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return {
        start,
        end,
        startMeta: { day: String(startDay), month: monthShort(month), year: toTwoDigitYearString(new Date(year, month, startDay)) },
        endMeta: { day: String(now.getDate()), month: monthShort(now.getMonth()), year: toTwoDigitYearString(now) }
    };
}

function parseISODateParam(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function parseISODateParamEnd(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
}

export async function getRestaurantFinance(restaurantId, query = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) return null;
    const rid = new mongoose.Types.ObjectId(restaurantId);

    // Fetch restaurant profile for header display.
    const restaurant = await FoodRestaurant.findById(rid)
        .select('restaurantName addressLine1 addressLine2 area city state pincode location subscriptionDueAmount subscriptionStatus')
        .lean();

    const address =
        restaurant?.location?.formattedAddress ||
        (restaurant?.addressLine1
            ? [restaurant.addressLine1, restaurant.addressLine2, restaurant.area].filter(Boolean).join(', ')
            : restaurant?.addressLine1 || '');

    const nowWindow = getFixedCurrentCycleWindow(new Date());

    // Fetch all relevant orders in the current cycle window as the primary source for the list.
    const currentOrders = await FoodOrder.find({
        restaurantId: rid,
        orderStatus: { $nin: ['pending_payment'] },
        createdAt: { $gte: nowWindow.start, $lte: nowWindow.end }
    })
        .populate('transactionId')
        .sort({ createdAt: -1 })
        .lean();

    const currentCycleOrders = currentOrders.map((order) => {
        const tx = order.transactionId || {};
        const items = Array.isArray(order.items) ? order.items : [];
        const foodNames = items.map((it) => it?.name).filter(Boolean).join(', ');
        
        // Use pricing from transaction if available, fallback to order pricing.
        const pricing = tx.pricing || order.pricing || {};
        const amounts = tx.amounts || {};
        
        const subtotal = Number(pricing.subtotal) || 0;
        const packagingFee = Number(pricing.packagingFee) || 0;
        const commission = Number(amounts.restaurantCommission) || Number(pricing.restaurantCommission) || 0;
        
        // Calculate payout if not explicitly in transaction share.
        const payout = Number(amounts.restaurantShare) || (subtotal + packagingFee - commission);

        return {
            orderId: order.orderId || order.order_id || `FOD-${order._id.toString().slice(-6).toUpperCase()}`,
            createdAt: order.createdAt,
            items,
            foodNames,
            orderTotal: Math.max(0, (Number(pricing.total) || 0) - (Number(pricing.tax) || 0)),
            totalAmount: Number(pricing.total) || 0,
            payout: Math.max(0, payout),
            commission: commission,
            paymentMethod: tx.paymentMethod || order.payment?.method || 'cash',
            orderStatus: order.orderStatus,
            status: tx.status || (order.payment?.status === 'paid' ? 'captured' : 'pending')
        };
    });

    const currentCycleEstimatedPayout = currentCycleOrders.reduce(
        (sum, o) => sum + (Number(o.payout) || 0),
        0
    );

    // Calculate global estimated payout (all unsettled transactions)
    // IMPORTANT: For withdrawal balance, we only count 'captured' or 'authorized' funds.
    const allUnsettledTransactions = await FoodTransaction.find({
        restaurantId: rid,
        status: { $in: ['captured', 'authorized'] },
        'settlement.isRestaurantSettled': { $ne: true }
    }).select('amounts.restaurantShare').lean();

    const globalEstimatedPayout = allUnsettledTransactions.reduce(
        (sum, tx) => sum + (Number(tx.amounts?.restaurantShare) || 0),
        0
    );

    // Block only pending withdrawals from available balance.
    // Approved/rejected requests are processed records and should not keep locking payout.
    const pendingWithdrawalsAgg = await FoodRestaurantWithdrawal.aggregate([
        {
            $match: {
                restaurantId: rid,
                $expr: {
                    $eq: [{ $toLower: { $trim: { input: '$status' } } }, 'pending']
                }
            }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalPendingWithdrawals = Number(pendingWithdrawalsAgg?.[0]?.total || 0);
    const subscriptionDue = Math.max(0, Number(restaurant?.subscriptionDueAmount || 0));
    // Calculate final balance for withdrawal.
    // NOTE: We no longer automatically deduct subscriptionDue here per user request ("direct deduct na ho").
    // We will instead block the withdrawal in the controller if subscriptionDue > 0.
    const availableBalance = Math.max(0, globalEstimatedPayout - totalPendingWithdrawals);

    const currentCycle = {
        start: { ...nowWindow.startMeta },
        end: { ...nowWindow.endMeta },
        totalEarnings: currentCycleEstimatedPayout, // We still show current cycle earnings label
        totalWithdrawn: totalPendingWithdrawals,
        estimatedPayout: availableBalance, // This is what UI shows as "Total Earnings"
        netAvailable: Math.max(0, availableBalance - subscriptionDue), // Net amount that is ACTUALLY withdrawable
        totalOrders: currentCycleOrders.length,
        payoutDate: null,
        orders: currentCycleOrders
    };

    // Invoice Summary (derived from current cycle or broader if needed)
    const invoiceSummary = {
        count: currentCycleOrders.length,
        subtotal: currentCycleOrders.reduce((sum, o) => sum + (Number(o.orderTotal) || 0), 0),
        taxes: currentCycleOrders.reduce((sum, o) => sum + Math.max(0, (Number(o.totalAmount) || 0) - (Number(o.orderTotal) || 0)), 0),
        gross: currentCycleOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
    };

    // Past cycles: build from provided startDate/endDate query.
    const startDate = parseISODateParam(query.startDate);
    const endDate = parseISODateParamEnd(query.endDate);

    let pastCyclesResult = { orders: [], totalOrders: 0 };
    if (startDate && endDate) {
        const pastOrders = await FoodOrder.find({
            restaurantId: rid,
            orderStatus: { $nin: ['pending_payment'] },
            createdAt: { $gte: startDate, $lte: endDate }
        })
            .populate('transactionId')
            .sort({ createdAt: -1 })
            .lean();

        const pastCycleOrders = pastOrders.map((order) => {
            const tx = order.transactionId || {};
            const items = Array.isArray(order.items) ? order.items : [];
            const foodNames = items.map((it) => it?.name).filter(Boolean).join(', ');
            
            // Use pricing from transaction if available, fallback to order pricing.
            const pricing = tx.pricing || order.pricing || {};
            const amounts = tx.amounts || {};
            
            const subtotal = Number(pricing.subtotal) || 0;
            const packagingFee = Number(pricing.packagingFee) || 0;
            const commission = Number(amounts.restaurantCommission) || Number(pricing.restaurantCommission) || 0;
            
            // Calculate payout if not explicitly in transaction share.
            const payout = Number(amounts.restaurantShare) || (subtotal + packagingFee - commission);

            return {
                orderId: order.orderId || order.order_id || `FOD-${order._id.toString().slice(-6).toUpperCase()}`,
                createdAt: order.createdAt,
                items,
                foodNames,
                orderTotal: Math.max(0, (Number(pricing.total) || 0) - (Number(pricing.tax) || 0)),
                totalAmount: Number(pricing.total) || 0,
                payout: Math.max(0, payout),
                commission: commission,
                paymentMethod: tx.paymentMethod || order.payment?.method || 'cash',
                orderStatus: order.orderStatus,
                status: tx.status || (order.payment?.status === 'paid' ? 'captured' : 'pending')
            };
        });

        pastCyclesResult = {
            orders: pastCycleOrders,
            totalOrders: pastCycleOrders.length
        };
    }

    return {
        restaurant: {
            name: restaurant?.restaurantName || '',
            restaurantId: restaurant?._id ? `REST${restaurant._id.toString().slice(-6).padStart(6, '0')}` : 'N/A',
            address,
            subscriptionDueAmount: Number(restaurant?.subscriptionDueAmount || 0),
            subscriptionStatus: restaurant?.subscriptionStatus || 'paid'
        },
        currentCycle,
        invoiceSummary,
        pastCycles: pastCyclesResult
    };
}


