/**
 * Pure helper to render a short, human-readable summary of a normalized view_state.
 * Used in PresenceAvatars hovercards.
 */
export interface NormalizedViewState {
  route?: string;
  dataset?: string;
  source_files?: string[];
  filters?: Record<string, string[]>;
  page?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  "/": "Data Explorer",
  "/files": "Files",
  "/ai": "AI Assistant",
  "/activity": "Activity",
  "/settings": "Settings",
  "/profile": "Profile",
};

export function viewStateSummary(vs?: NormalizedViewState | null): string {
  if (!vs) return "Idle";
  const parts: string[] = [];
  const routeLabel = vs.route ? (ROUTE_LABELS[vs.route] ?? vs.route) : null;
  if (routeLabel) parts.push(routeLabel);

  if (vs.source_files && vs.source_files.length > 0) {
    if (vs.source_files.length === 1) parts.push(`on ${vs.source_files[0]}`);
    else parts.push(`on ${vs.source_files.length} files`);
  }

  const filterEntries = vs.filters ? Object.entries(vs.filters) : [];
  if (filterEntries.length > 0) {
    const [firstCol, firstVals] = filterEntries[0];
    const more = filterEntries.length - 1;
    const valStr = firstVals.slice(0, 2).join(", ") + (firstVals.length > 2 ? "…" : "");
    parts.push(`filtering ${firstCol}=${valStr}${more > 0 ? ` +${more} more` : ""}`);
  }

  return parts.join(" · ") || "Idle";
}

/** Stable view_state key (sorted) so the same logical view yields identical strings across clients. */
export function normalizeViewState(vs: NormalizedViewState): NormalizedViewState {
  const out: NormalizedViewState = {};
  if (vs.route) out.route = vs.route;
  if (vs.dataset) out.dataset = vs.dataset;
  if (vs.source_files && vs.source_files.length > 0) out.source_files = [...vs.source_files].sort();
  if (vs.filters && Object.keys(vs.filters).length > 0) {
    const sortedKeys = Object.keys(vs.filters).sort();
    out.filters = Object.fromEntries(sortedKeys.map((k) => [k, [...vs.filters![k]].sort()]));
  }
  if (vs.page) out.page = vs.page;
  return out;
}
