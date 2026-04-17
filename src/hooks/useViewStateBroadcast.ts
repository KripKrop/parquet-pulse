import { useEffect, useRef } from "react";
import { useCollab } from "@/contexts/CollabProvider";
import { normalizeViewState, NormalizedViewState } from "@/lib/viewStateSummary";

/**
 * Debounced view_state broadcaster.
 * Call from any page when route/dataset/filters/source_files/page changes.
 */
export function useViewStateBroadcast(viewState: NormalizedViewState, debounceMs = 500) {
  const { broadcastViewState } = useCollab();
  const timer = useRef<number | null>(null);
  const lastSerialized = useRef<string>("");

  useEffect(() => {
    const normalized = normalizeViewState(viewState);
    const serialized = JSON.stringify(normalized);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      broadcastViewState(normalized);
    }, debounceMs);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [JSON.stringify(viewState), debounceMs, broadcastViewState]);
}
