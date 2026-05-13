import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@food/components/ui/card';
import { Button } from '@food/components/ui/button';
import { Switch } from '@food/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const FEATURE_KEY = 'restaurant_subscription';

export default function FeatureSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [features, setFeatures] = useState([]);

    const restaurantSubscription = useMemo(
        () => features.find((item) => item.key === FEATURE_KEY) || null,
        [features]
    );

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await adminAPI.getFeatureSettings();
                const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
                setFeatures(rows);
            } catch (error) {
                toast.error('Failed to load feature settings.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const setToggle = (checked) => {
        setFeatures((prev) =>
            prev.map((row) =>
                row.key === FEATURE_KEY ? { ...row, isEnabled: Boolean(checked) } : row
            )
        );
    };

    const handleSave = async () => {
        if (!restaurantSubscription) return;
        try {
            setSaving(true);
            await adminAPI.updateFeatureSetting(FEATURE_KEY, {
                isEnabled: Boolean(restaurantSubscription.isEnabled)
            });
            window.dispatchEvent(new CustomEvent('adminFeatureSettingUpdated', {
                detail: {
                    key: FEATURE_KEY,
                    isEnabled: Boolean(restaurantSubscription.isEnabled)
                }
            }));
            toast.success('Feature setting updated successfully.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update feature setting.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[320px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Feature Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Enable or disable platform features safely from one place.</p>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg">Restaurant Subscription</CardTitle>
                    <CardDescription>
                        Controls post-approval onboarding payment, due checks, withdrawal restrictions, and subscription settings visibility.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-700">
                        {restaurantSubscription?.isEnabled
                            ? 'Enabled: subscription flows are active'
                            : 'Disabled: subscription flows are hidden and checks are bypassed'}
                    </div>
                    <Switch
                        checked={Boolean(restaurantSubscription?.isEnabled)}
                        onCheckedChange={setToggle}
                    />
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || !restaurantSubscription}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
