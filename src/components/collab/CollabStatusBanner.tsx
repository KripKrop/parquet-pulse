import { useCollab } from "@/contexts/CollabProvider";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Shown only when live collaboration is degraded (polling) or fully down.
 * Glassmorphism, dismissible per-session.
 */
export function CollabStatusBanner() {
  const { transport } = useCollab();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("collab.banner.dismissed") === "1");

  useEffect(() => {
    if (transport === "ws" || transport === "sse") {
      // Re-arm when transport recovers
      setDismissed(false);
      sessionStorage.removeItem("collab.banner.dismissed");
    }
  }, [transport]);

  const visible = !dismissed && (transport === "polling" || transport === "down");

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="sticky top-0 z-40 w-full"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="glass-panel border border-amber-500/30 rounded-md px-3 py-2 flex items-center gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="flex-1">
                {transport === "polling"
                  ? "Live collaboration is degraded — using polling. Cursors are disabled."
                  : "Live collaboration unavailable. Refresh to retry."}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => {
                  setDismissed(true);
                  sessionStorage.setItem("collab.banner.dismissed", "1");
                }}
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
