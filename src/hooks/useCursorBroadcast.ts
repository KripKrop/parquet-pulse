import { RefObject, useEffect, useRef } from "react";
import { useCollab } from "@/contexts/CollabProvider";

/**
 * Throttled cursor broadcaster (30fps max). Attach to a table container ref.
 * Sends cursor.move on mousemove and cursor.leave on mouseleave/blur/route change.
 */
export function useCursorBroadcast(
  containerRef: RefObject<HTMLElement>,
  resolveTarget?: (target: EventTarget | null) => string | undefined,
) {
  const { broadcastCursor, broadcastCursorLeave } = useCollab();
  const lastEmit = useRef(0);
  const FRAME_MS = 1000 / 30;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastEmit.current < FRAME_MS) return;
      lastEmit.current = now;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      broadcastCursor({ x, y, target: resolveTarget?.(e.target) });
    };

    const onLeave = () => broadcastCursorLeave();
    const onBlur = () => broadcastCursorLeave();

    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onBlur);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onBlur);
      broadcastCursorLeave();
    };
  }, [containerRef, broadcastCursor, broadcastCursorLeave, resolveTarget]);
}
