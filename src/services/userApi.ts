import { request } from "./apiClient";

const TOUR_LOCAL_KEY = "crunch_tour_completed";

export async function markTourComplete(): Promise<void> {
  // Always set local flag first so user isn't re-prompted even if API fails
  try {
    localStorage.setItem(TOUR_LOCAL_KEY, "1");
  } catch {
    // ignore storage failures
  }

  try {
    await request("/me/tour-complete", { method: "POST" });
  } catch (error) {
    // Non-fatal — local flag still set, will retry silently next session
    console.warn("Failed to mark tour complete on server:", error);
  }
}

export function isTourCompletedLocal(): boolean {
  try {
    return localStorage.getItem(TOUR_LOCAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function resetTourLocal(): void {
  try {
    localStorage.removeItem(TOUR_LOCAL_KEY);
  } catch {
    // ignore
  }
}
