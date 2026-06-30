function calculateOfferDiscount(offer, subtotal) {
    const safeSubtotal = Math.max(0, Number(subtotal) || 0);
    if (!offer || safeSubtotal <= 0) return 0;
    if (offer.discountType === 'percentage') {
        const raw = safeSubtotal * ((Number(offer.discountValue) || 0) / 100);
        const capped = Number(offer.maxDiscount) ? Math.min(raw, Number(offer.maxDiscount)) : raw;
        return Math.max(0, Math.min(safeSubtotal, Math.floor(capped)));
    }
    return Math.max(0, Math.min(safeSubtotal, Math.floor(Number(offer.discountValue) || 0)));
}

function offerMatchesRestaurant(offer, restaurantId) {
    if (!offer || offer.restaurantScope !== 'selected') return true;
    const ids = Array.isArray(offer.restaurantIds) && offer.restaurantIds.length > 0
        ? offer.restaurantIds
        : [offer.restaurantId].filter(Boolean);
    return ids.some((id) => String(id) === String(restaurantId));
}

export function resolveDiscountSplit({ order, pricing, amounts, offers, restaurantId }) {
    const discount = Number(pricing?.discount) || 0;
    const savedAdminShare = Number(amounts?.adminDiscountShare) || 0;
    const savedRestaurantShare = Number(amounts?.restaurantDiscountShare) || 0;
    if (discount <= 0) {
        return { adminDiscountShare: 0, restaurantDiscountShare: 0, adminBearPercentage: 0, restaurantBearPercentage: 0 };
    }
    if (savedAdminShare > 0 || savedRestaurantShare > 0) {
        return {
            adminDiscountShare: savedAdminShare,
            restaurantDiscountShare: savedRestaurantShare,
            adminBearPercentage: Number(amounts?.discountAdminBearPercentage) || 0,
            restaurantBearPercentage: Number(amounts?.discountRestaurantBearPercentage) || 0,
        };
    }

    const couponCode = String(pricing?.couponCode || order?.pricing?.couponCode || '').trim().toUpperCase();
    const subtotal = Number(pricing?.subtotal) || 0;
    const scopedOffers = (offers || []).filter((offer) => offerMatchesRestaurant(offer, restaurantId));
    const matchedByCode = couponCode
        ? scopedOffers.find((offer) => String(offer?.couponCode || '').trim().toUpperCase() === couponCode)
        : null;
    const matchingOffers = matchedByCode
        ? [matchedByCode]
        : scopedOffers.filter((offer) => calculateOfferDiscount(offer, subtotal) === discount);

    if (matchingOffers.length !== 1) {
        return { adminDiscountShare: discount, restaurantDiscountShare: 0, adminBearPercentage: 100, restaurantBearPercentage: 0 };
    }

    const offer = matchingOffers[0];
    const adminPct = Math.max(0, Math.min(100, Number(offer.adminBearPercentage ?? (offer.createdByRole === 'RESTAURANT' ? 0 : 100)) || 0));
    const restaurantPct = Math.max(0, Math.min(100, Number(offer.restaurantBearPercentage ?? (offer.createdByRole === 'RESTAURANT' ? 100 : 0)) || 0));
    const totalPct = adminPct + restaurantPct;
    const adminBearPercentage = totalPct > 0 ? (adminPct / totalPct) * 100 : 100;
    const restaurantBearPercentage = totalPct > 0 ? (restaurantPct / totalPct) * 100 : 0;
    const restaurantDiscountShare = Math.round(discount * (restaurantBearPercentage / 100) * 100) / 100;
    const adminDiscountShare = Math.max(0, Math.round((discount - restaurantDiscountShare) * 100) / 100);
    return { adminDiscountShare, restaurantDiscountShare, adminBearPercentage, restaurantBearPercentage };
}
