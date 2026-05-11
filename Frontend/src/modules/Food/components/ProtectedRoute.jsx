import { Navigate, useLocation } from "react-router-dom";
import { isModuleAuthenticated } from "@food/utils/auth";

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

  // If not authenticated for this module, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  if (requiredRole === "restaurant") {
    try {
      const raw = localStorage.getItem("restaurant_user")
      const user = raw ? JSON.parse(raw) : null
      const onboardingFeePaid = Boolean(user?.onboardingFeePaid)
      const allowedPaths = ["/food/restaurant/onboarding-payment", "/food/restaurant/onboarding", "/food/restaurant/pending-verification"]
      if (!onboardingFeePaid && !allowedPaths.includes(location.pathname)) {
        return <Navigate to="/food/restaurant/onboarding-payment" replace />
      }
    } catch {
      // ignore parse issues
    }
  }

  return children;
}
