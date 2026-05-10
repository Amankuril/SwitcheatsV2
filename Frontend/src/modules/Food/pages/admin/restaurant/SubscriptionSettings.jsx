import React, { useState, useEffect } from 'react';
import { adminAPI } from '@/services/api';
import { Button } from '@food/components/ui/button';
import { Input } from '@food/components/ui/input';
import { Label } from '@food/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@food/components/ui/card';
import { toast } from "sonner";
import { Loader2, Save, CreditCard, Award, Rocket } from "lucide-react";

const SubscriptionSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        silverPrice: 999,
        goldPrice: 1999,
        onboardingFee: 799
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await adminAPI.getRestaurantSubscriptionSettings();
            if (res.data?.success && res.data.data) {
                setSettings(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error("Failed to load subscription settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await adminAPI.updateRestaurantSubscriptionSettings(settings);
            if (res.data?.success) {
                toast.success("Subscription settings updated successfully.");
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error("Failed to update subscription settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Restaurant Subscription Settings</h1>
                <p className="text-gray-500">Manage the pricing for restaurant subscription plans and onboarding fees.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-slate-400">
                    <CardHeader className="bg-slate-50/50 pb-4">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-slate-600" />
                            <CardTitle className="text-lg">Silver Plan</CardTitle>
                        </div>
                        <CardDescription>Basic monthly subscription for restaurants</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="silverPrice">Monthly Price (₹)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                <Input
                                    id="silverPrice"
                                    type="number"
                                    min="0"
                                    className="pl-7"
                                    value={settings.silverPrice}
                                    onChange={(e) => setSettings({ ...settings, silverPrice: Math.max(0, Number(e.target.value)) })}
                                />
                            </div>
                            <p className="text-xs text-gray-400 italic">GST (18%) will be added automatically on the onboarding page.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 shadow-sm overflow-hidden border-l-4 border-l-amber-400">
                    <CardHeader className="bg-amber-50/50 pb-4">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-amber-600" />
                            <CardTitle className="text-lg">Gold Plan</CardTitle>
                        </div>
                        <CardDescription>Premium monthly subscription for restaurants</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="goldPrice">Monthly Price (₹)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                <Input
                                    id="goldPrice"
                                    type="number"
                                    min="0"
                                    className="pl-7"
                                    value={settings.goldPrice}
                                    onChange={(e) => setSettings({ ...settings, goldPrice: Math.max(0, Number(e.target.value)) })}
                                />
                            </div>
                            <p className="text-xs text-gray-400 italic">GST (18%) will be added automatically on the onboarding page.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 shadow-sm overflow-hidden border-l-4 border-l-blue-400 md:col-span-2">
                    <CardHeader className="bg-blue-50/50 pb-4">
                        <div className="flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">Onboarding Fee</CardTitle>
                        </div>
                        <CardDescription>One-time mandatory setup fee for all new restaurants</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid gap-4 md:grid-cols-2 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="onboardingFee">Setup Fee (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                    <Input
                                        id="onboardingFee"
                                        type="number"
                                        min="0"
                                        className="pl-7"
                                        value={settings.onboardingFee}
                                        onChange={(e) => setSettings({ ...settings, onboardingFee: Math.max(0, Number(e.target.value)) })}
                                    />
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <p className="text-sm text-blue-800 flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Total Payable with GST: <strong>₹{Math.round(settings.onboardingFee * 1.18)}</strong>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4">
                <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="w-full md:w-auto min-w-[150px]"
                >
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default SubscriptionSettings;
