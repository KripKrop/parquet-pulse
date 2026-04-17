import { request } from "./apiClient";
import type { MeResponse, UpdateProfileRequest, User } from "@/types/auth";

const TOUR_LOCAL_KEY = "crunch_tour_completed";

export async function markTourComplete(): Promise<void> {
  try { localStorage.setItem(TOUR_LOCAL_KEY, "1"); } catch {}
  try {
    await request("/me/tour-complete", { method: "POST" });
  } catch (error) {
    console.warn("Failed to mark tour complete on server:", error);
  }
}

export function isTourCompletedLocal(): boolean {
  try { return localStorage.getItem(TOUR_LOCAL_KEY) === "1"; } catch { return false; }
}

export function resetTourLocal(): void {
  try { localStorage.removeItem(TOUR_LOCAL_KEY); } catch {}
}

export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>("/me");
}

export async function updateProfile(payload: UpdateProfileRequest): Promise<{ user: User }> {
  return request<{ user: User }>("/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
