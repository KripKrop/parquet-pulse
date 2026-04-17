import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileCompletionModal } from "./ProfileCompletionModal";

/**
 * Shows the "How teammates will see you" modal once on first entry
 * if the user has no avatar AND their name looks auto-derived (matches email local-part).
 * Dismissal is remembered per-user in localStorage.
 */
export function ProfileCompletionGate() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const key = `profile.completion.shown.${user.user_id}`;
    if (localStorage.getItem(key) === "1") return;

    const localPart = user.email?.split("@")[0]?.toLowerCase() ?? "";
    const looksAutoNamed = !user.name || user.name.trim().toLowerCase() === localPart;
    const noAvatar = !user.avatar_url;

    if (looksAutoNamed || noAvatar) {
      // Defer slightly so it doesn't compete with auth redirects
      const t = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(t);
    }
  }, [isAuthenticated, user]);

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next && user) {
      localStorage.setItem(`profile.completion.shown.${user.user_id}`, "1");
    }
  };

  return <ProfileCompletionModal open={open} onOpenChange={handleClose} />;
}
