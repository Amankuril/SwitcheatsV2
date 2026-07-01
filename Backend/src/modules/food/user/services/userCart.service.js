import mongoose from 'mongoose';
import { FoodUser } from '../../../../core/users/user.model.js';
import { FoodUserCart } from '../models/userCart.model.js';
import { ValidationError } from '../../../../core/auth/errors.js';

const toPositiveInt = (value, fallback = 1) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const toNonNegativeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
};

const normalizeCartItems = (items = []) => {
    if (!Array.isArray(items)) return [];

    return items
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
            const quantity = toPositiveInt(item.quantity, 1);
            const price = toNonNegativeNumber(item.price ?? item.variantPrice, 0);
            const variantPrice = toNonNegativeNumber(item.variantPrice ?? item.price, price);

            return {
                lineItemId: String(item.lineItemId || item.id || ''),
                itemId: String(item.itemId || item.productId || item.id || ''),
                name: String(item.name || 'Item').trim(),
                price,
                quantity,
                variantId: String(item.variantId || ''),
                variantName: String(item.variantName || ''),
                variantPrice,
                image: String(item.image || item.imageUrl || ''),
                foodType: String(item.foodType || ''),
                isVeg: item.isVeg === true || String(item.foodType || '').toLowerCase() === 'veg',
            };
        })
        .filter((item) => item.name && item.quantity > 0);
};

export async function syncUserCart(userId, rawItems = []) {
    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
        throw new ValidationError('Invalid user');
    }

    const userObjectId = new mongoose.Types.ObjectId(String(userId));
    const items = normalizeCartItems(rawItems);

    if (items.length === 0) {
        await FoodUserCart.deleteOne({ userId: userObjectId });
        return null;
    }

    const firstItem = items[0];
    const rawFirst = Array.isArray(rawItems) ? rawItems[0] : null;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return FoodUserCart.findOneAndUpdate(
        { userId: userObjectId },
        {
            userId: userObjectId,
            restaurantId: String(rawFirst?.restaurantId || ''),
            restaurantName: String(rawFirst?.restaurant || rawFirst?.restaurantName || ''),
            items: items.map((item) => ({
                ...item,
            })),
            itemCount,
            subtotal,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
}

const buildSearchUserIds = async (search = '') => {
    const term = String(search || '').trim();
    if (!term) return null;

    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await FoodUser.find({
        $or: [{ name: regex }, { phone: regex }, { email: regex }],
    })
        .select('_id')
        .limit(200)
        .lean();

    return users.map((user) => user._id);
};

export async function listUserCartsForAdmin(query = {}) {
    const page = Math.max(1, toPositiveInt(query.page, 1));
    const limit = Math.min(100, Math.max(1, toPositiveInt(query.limit, 20)));
    const skip = (page - 1) * limit;
    const search = String(query.search || '').trim();

    const filter = { 'items.0': { $exists: true } };

    if (search) {
        const restaurantRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const userIds = await buildSearchUserIds(search);

        const orConditions = [
            { restaurantName: restaurantRegex },
            { restaurantId: restaurantRegex },
        ];

        if (Array.isArray(userIds) && userIds.length > 0) {
            orConditions.push({ userId: { $in: userIds } });
        }

        filter.$or = orConditions;
    }

    const [carts, total] = await Promise.all([
        FoodUserCart.find(filter)
            .populate('userId', 'name phone email profileImage')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        FoodUserCart.countDocuments(filter),
    ]);

    const normalized = carts.map((cart) => {
        const user = cart.userId && typeof cart.userId === 'object' ? cart.userId : null;

        return {
            id: String(cart._id),
            userId: user?._id ? String(user._id) : String(cart.userId || ''),
            userName: user?.name || 'Unknown user',
            userPhone: user?.phone || '',
            userEmail: user?.email || '',
            userImage: user?.profileImage || '',
            restaurantId: cart.restaurantId || '',
            restaurantName: cart.restaurantName || '',
            items: Array.isArray(cart.items) ? cart.items : [],
            itemCount: Number(cart.itemCount) || 0,
            subtotal: Number(cart.subtotal) || 0,
            updatedAt: cart.updatedAt,
            createdAt: cart.createdAt,
        };
    });

    return {
        carts: normalized,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    };
}
