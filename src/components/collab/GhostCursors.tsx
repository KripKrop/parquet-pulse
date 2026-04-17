import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCollab } from "@/contexts/CollabProvider";

/**
 * Absolute overlay rendered inside a relative container (e.g. table viewport).
 * Renders one cursor per remote teammate. Spring lerp; fades after 3s of idle.
 */
export function GhostCursors() {
  const { cursorsByUserId, onlineUsers } = useCollab();
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  const usersById: Record<string, { name: string; color?: string }> = Object.fromEntries(
    onlineUsers.map((u) => [u.user_id, { name: u.name, color: u.color }])
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <AnimatePresence>
        {Object.values(cursorsByUserId).map((c) => {
          const u = usersById[c.user_id];
          const color = u?.color || "hsl(var(--primary))";
          const idle = now - c.ts;
          const opacity = idle > 3000 ? 0 : 1;
          return (
            <motion.div
              key={c.user_id}
              initial={{ opacity: 0 }}
              animate={reduceMotion
                ? { opacity, x: c.x, y: c.y }
                : { opacity, x: c.x, y: c.y, transition: { type: "spring", stiffness: 300, damping: 30 } }
              }
              exit={{ opacity: 0 }}
              className="absolute top-0 left-0"
              style={{ translateX: c.x, translateY: c.y }}
            >
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none" style={{ color }}>
                <path
                  d="M2 2L16 10L9 11.5L6 19L2 2Z"
                  fill="currentColor"
                  stroke="hsl(var(--background))"
                  strokeWidth="1.5"
                />
              </svg>
              {u?.name && (
                <div
                  className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-md whitespace-nowrap"
                  style={{ backgroundColor: color }}
                >
                  {u.name}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
