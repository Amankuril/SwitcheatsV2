import { FoodFeatureSetting } from '../models/featureSetting.model.js';

export const FEATURE_KEYS = {
    RESTAURANT_SUBSCRIPTION: 'restaurant_subscription'
};

const DEFAULT_FEATURES = [
    {
        key: FEATURE_KEYS.RESTAURANT_SUBSCRIPTION,
        name: 'Restaurant Subscription',
        description: 'Controls restaurant onboarding payment, subscription dues checks, and subscription settings UI.',
        isEnabled: true
    }
];

export async function ensureDefaultFeatureSettings() {
    for (const feature of DEFAULT_FEATURES) {
        await FoodFeatureSetting.updateOne(
            { key: feature.key },
            { $setOnInsert: feature },
            { upsert: true }
        );
    }
}

export async function listFeatureSettings() {
    await ensureDefaultFeatureSettings();
    const docs = await FoodFeatureSetting.find({}).sort({ createdAt: 1 }).lean();
    return docs.map((doc) => ({
        key: doc.key,
        name: doc.name,
        description: doc.description || '',
        isEnabled: Boolean(doc.isEnabled),
        updatedAt: doc.updatedAt
    }));
}

export async function updateFeatureSetting(key, payload = {}) {
    await ensureDefaultFeatureSettings();
    const nextEnabled = Boolean(payload?.isEnabled);
    const updated = await FoodFeatureSetting.findOneAndUpdate(
        { key: String(key || '').trim() },
        { $set: { isEnabled: nextEnabled } },
        { new: true }
    ).lean();

    return updated
        ? {
            key: updated.key,
            name: updated.name,
            description: updated.description || '',
            isEnabled: Boolean(updated.isEnabled),
            updatedAt: updated.updatedAt
        }
        : null;
}

export async function isFeatureEnabled(key, fallback = true) {
    if (!key) return fallback;
    await ensureDefaultFeatureSettings();
    const doc = await FoodFeatureSetting.findOne({ key: String(key).trim() }).select('isEnabled').lean();
    if (!doc) return fallback;
    return Boolean(doc.isEnabled);
}
