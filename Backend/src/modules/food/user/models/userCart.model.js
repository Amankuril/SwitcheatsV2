import mongoose from 'mongoose';

const userCartItemSchema = new mongoose.Schema(
    {
        lineItemId: { type: String, trim: true, default: '' },
        itemId: { type: String, trim: true, default: '' },
        name: { type: String, trim: true, default: '' },
        price: { type: Number, min: 0, default: 0 },
        quantity: { type: Number, min: 1, default: 1 },
        variantId: { type: String, trim: true, default: '' },
        variantName: { type: String, trim: true, default: '' },
        variantPrice: { type: Number, min: 0, default: 0 },
        image: { type: String, default: '' },
        foodType: { type: String, default: '' },
        isVeg: { type: Boolean, default: false },
    },
    { _id: false },
);

const userCartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodUser',
            required: true,
            unique: true,
            index: true,
        },
        restaurantId: { type: String, trim: true, default: '' },
        restaurantName: { type: String, trim: true, default: '' },
        items: {
            type: [userCartItemSchema],
            default: [],
        },
        itemCount: { type: Number, min: 0, default: 0 },
        subtotal: { type: Number, min: 0, default: 0 },
    },
    {
        collection: 'food_user_carts',
        timestamps: true,
    },
);

userCartSchema.index({ updatedAt: -1 });
userCartSchema.index({ restaurantId: 1 });

export const FoodUserCart = mongoose.model('FoodUserCart', userCartSchema);
