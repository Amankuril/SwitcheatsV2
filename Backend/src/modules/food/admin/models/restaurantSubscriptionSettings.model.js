import mongoose from 'mongoose';

const restaurantSubscriptionSettingsSchema = new mongoose.Schema(
    {
        silverPrice: { type: Number, required: true, default: 999 },
        goldPrice: { type: Number, required: true, default: 1999 },
        onboardingFee: { type: Number, required: true, default: 799 }
    },
    { collection: 'food_restaurant_subscription_settings', timestamps: true }
);

export const FoodRestaurantSubscriptionSettings = mongoose.model('FoodRestaurantSubscriptionSettings', restaurantSubscriptionSettingsSchema);
