import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTour } from "@/contexts/TourContext";
import { isTourCompletedLocal } from "@/services/userApi";

/**
 * Auto-starts the onboarding tour for first-time users after login,
 * once they land on the home route. Mounted alongside <OnboardingTour />.
 */
export function TourAutoStart() {
  const { isAuthenticated, user, loading } = useAuth();
  const { start, isActive } = useTour();
  const location = useLocation();
  const fired = useRef(false);

  useEffect(() => {
    if (loading || !isAuthenticated || fired.current || isActive) return;
    if (location.pathname !== "/") return;

    const serverCompleted = user?.tour_completed === true;
    const localCompleted = isTourCompletedLocal();
    if (serverCompleted || localCompleted) {
      fired.current = true;
      return;
    }

    fired.current = true;
    // Let the layout settle before opening
    const t = setTimeout(() => start(), 700);
    return () => clearTimeout(t);
  }, [isAuthenticated, user, loading, location.pathname, start, isActive]);

  return null;
}
