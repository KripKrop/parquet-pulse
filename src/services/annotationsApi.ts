import { CollabApiError } from "./collabApi";
// annotationsApi mirrors collabApi's error parsing for the new { error: { code, message } } shape.

const BASE = "https://demoapi.crunchy.sigmoidsolutions.io";

async function ensureToken() {
  if (isAccessTokenExpired()) {
    const r = getRefreshToken();
    if (r) {
      try {
        const res = await refreshTokenApi({ refresh_token: r });
        setTokens(res.access_token, res.refresh_token);
      } catch {/* */}
    }
  }
}

async function collabFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  await ensureToken();
  const headers = new Headers(init.headers || {});
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("content-type") && init.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const retryAfter = res.headers.get("Retry-After");
    let code = "unknown_error";
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) { code = body.error.code ?? code; message = body.error.message ?? message; }
    } catch {}
    throw new CollabApiError(message, code, res.status, retryAfter ? parseInt(retryAfter, 10) : undefined);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export type AnnotationAnchor =
  | { kind: "row"; file_id: string; row_hash: string }
  | { kind: "view"; route: string; view_state: any };

export interface AnnotationObject {
  id: string;
  answer_id: string;
  anchor: AnnotationAnchor;
  author: { user_id: string; name: string; avatar_url?: string | null; color?: string };
  preview: string;
  created_at: string;
}

export const annotationsApi = {
  create: (payload: { answer_id: string; anchor: AnnotationAnchor }) =>
    collabFetch<AnnotationObject>(`/annotations`, { method: "POST", body: JSON.stringify(payload) }),

  resolveForRow: (file_id: string, row_hash: string) => {
    const qs = new URLSearchParams({ file_id, row_hash });
    return collabFetch<{ annotations: AnnotationObject[] }>(`/annotations?${qs.toString()}`);
  },

  resolveForView: (route: string, view_state: any) => {
    const qs = new URLSearchParams({ route, view_state: JSON.stringify(view_state) });
    return collabFetch<{ annotations: AnnotationObject[] }>(`/annotations?${qs.toString()}`);
  },

  remove: (id: string) =>
    collabFetch<void>(`/annotations/${id}`, { method: "DELETE" }),
};
