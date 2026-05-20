import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isModuleAuthenticated } from "@food/utils/auth";
import { restaurantAPI } from "@food/api";

/**
 * Role-based Protected Route Component
 * Only allows access if user is authenticated for the specific module
 */
export default function ProtectedRoute({ children, requiredRole, loginPath = "/food/user/auth/login" }) {
  const location = useLocation();

  // If no role required, allow access
  if (!requiredRole) {
    return children;
  }

  const isAuthenticated = isModuleAuthenticated(requiredRole);
  const isRestaurantRoute = requiredRole === "restaurant";
  const [isSubscriptionCheckDone, setIsSubscriptionCheckDone] = useState(!isRestaurantRoute);
  const [serverRequiresPayment, setServerRequiresPayment] = useState(false);

  // If not authenticated for this module, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  useEffect(() => {
    let active = true;
    const allowedPaths = [
      "/food/restaurant/onboarding-payment",
      "/food/restaurant/onboarding",
      "/food/restaurant/pending-verification",
    ];

    if (!isRestaurantRoute || !isAuthenticated || allowedPaths.includes(location.pathname)) {
      setIsSubscriptionCheckDone(true);
      setServerRequiresPayment(false);
      return () => {
        active = false;
      };
    }

    setIsSubscriptionCheckDone(false);
    const syncRestaurantSubscription = async () => {
      try {
        const response = await restaurantAPI.getCurrentRestaurant();
        const restaurant =
          response?.data?.data?.restaurant ||
          response?.data?.restaurant ||
          null;
        if (restaurant) {
          localStorage.setItem("restaurant_user", JSON.stringify(restaurant));
        }

        const subscriptionFeatureRaw = localStorage.getItem("restaurant_subscription_feature_enabled");
        const subscriptionFeatureEnabled =
          subscriptionFeatureRaw == null ? false : subscriptionFeatureRaw === "true";

        const onboardingFeePaid = Boolean(restaurant?.onboardingFeePaid);
        const expiryRaw = restaurant?.subscriptionValidTill;
        const expiryMs = expiryRaw ? new Date(expiryRaw).getTime() : NaN;
        const isExpired = Number.isFinite(expiryMs) && expiryMs < Date.now();
        const shouldBlock = subscriptionFeatureEnabled && (!onboardingFeePaid || isExpired);

        if (active) {
          setServerRequiresPayment(shouldBlock);
        }
      } catch {
        if (active) {
          setServerRequiresPayment(false);
        }
      } finally {
        if (active) {
          setIsSubscriptionCheckDone(true);
        }
      }
    };

    syncRestaurantSubscription();
    return () => {
      active = false;
    };
  }, [isRestaurantRoute, isAuthenticated, location.pathname]);

  if (isRestaurantRoute) {
    try {
      const raw = localStorage.getItem("restaurant_user")
      const user = raw ? JSON.parse(raw) : null
      const onboardingFeePaid = Boolean(user?.onboardingFeePaid)
      const subscriptionValidTillRaw = user?.subscriptionValidTill
      const subscriptionValidTillMs = subscriptionValidTillRaw ? new Date(subscriptionValidTillRaw).getTime() : NaN
      const isSubscriptionExpired = Number.isFinite(subscriptionValidTillMs) && subscriptionValidTillMs < Date.now()
      const subscriptionFeatureRaw = localStorage.getItem("restaurant_subscription_feature_enabled")
      const subscriptionFeatureEnabled =
        subscriptionFeatureRaw == null ? false : subscriptionFeatureRaw === "true"
      const allowedPaths = ["/food/restaurant/onboarding-payment", "/food/restaurant/onboarding", "/food/restaurant/pending-verification"]
      if (
        subscriptionFeatureEnabled &&
        (!onboardingFeePaid || isSubscriptionExpired) &&
        !allowedPaths.includes(location.pathname)
      ) {
        return <Navigate to="/food/restaurant/onboarding-payment" replace />
      }
    } catch {
      // ignore parse issues
    }

    if (!isSubscriptionCheckDone) {
      return null;
    }
    if (serverRequiresPayment) {
      return <Navigate to="/food/restaurant/onboarding-payment" replace />;
    }
  }

  return children;
}
