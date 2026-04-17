/**
 * REST wrappers for collaboration endpoints.
 * Errors are returned in the new shape: { error: { code, message } }.
 * We parse them separately from the legacy `apiClient.request` error pipeline.
 */
import { getAccessToken, getRefreshToken, setTokens, isAccessTokenExpired } from "./tokenManager";
import { refreshToken as refreshTokenApi } from "./authApi";

const BASE = "https://demoapi.crunchy.sigmoidsolutions.io";

export class CollabApiError extends Error {
  code: string;
  status: number;
  retryAfter?: number;
  constructor(message: string, code: string, status: number, retryAfter?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function ensureToken() {
  if (isAccessTokenExpired()) {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        const r = await refreshTokenApi({ refresh_token: refresh });
        setTokens(r.access_token, r.refresh_token);
      } catch {/* swallow; downstream will 401 */}
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

  const res = await fetch(`${BASE}${path.startsWith("/") ? path : "/" + path}`, { ...init, headers });

  if (!res.ok) {
    const retryAfterRaw = res.headers.get("Retry-After");
    const retryAfter = retryAfterRaw ? parseInt(retryAfterRaw, 10) : undefined;
    let code = "unknown_error";
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      } else if (body?.detail) {
        message = typeof body.detail === "string" ? body.detail : message;
      }
    } catch {/* non-JSON */}
    throw new CollabApiError(message, code, res.status, retryAfter);
  }

  if (res.status === 204) return undefined as unknown as T;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res as unknown as T;
}

// ─── Comments ──────────────────────────────────────────────────────────────
export interface CommentAuthor { user_id: string; name: string; email?: string; avatar_url?: string | null; color?: string; }
export interface CommentReaction { emoji: string; count: number; reacted_by_me: boolean; users?: string[]; }
export interface CommentObject {
  id: string;
  client_id?: string;
  file_id: string;
  row_hash: string;
  parent_id: string | null;
  author: CommentAuthor;
  body: string;
  mentions: { user_id: string; name: string }[];
  reactions: CommentReaction[];
  reply_count: number;
  created_at: string;
  updated_at: string;
  edited: boolean;
  deleted: boolean;
}

export interface ListCommentsResponse {
  comments: CommentObject[];
  next_cursor: string | null;
  total: number;
}

export const commentsApi = {
  list: (fileId: string, rowHash: string, cursor?: string) => {
    const qs = new URLSearchParams({ file_id: fileId, row_hash: rowHash });
    if (cursor) qs.set("cursor", cursor);
    return collabFetch<ListCommentsResponse>(`/comments?${qs.toString()}`);
  },
  replies: (commentId: string, cursor?: string) => {
    const qs = new URLSearchParams();
    if (cursor) qs.set("cursor", cursor);
    return collabFetch<ListCommentsResponse>(`/comments/${commentId}/replies${qs.toString() ? "?" + qs : ""}`);
  },
  create: (payload: { file_id: string; row_hash: string; parent_id: string | null; body: string; mentions: string[]; client_id: string; }) =>
    collabFetch<CommentObject>("/comments", { method: "POST", body: JSON.stringify(payload) }),
  edit: (id: string, payload: { body: string; mentions: string[] }) =>
    collabFetch<CommentObject>(`/comments/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  remove: (id: string) =>
    collabFetch<void>(`/comments/${id}`, { method: "DELETE" }),
  toggleReaction: (id: string, emoji: string) =>
    collabFetch<{ added: boolean; comment: CommentObject }>(`/comments/${id}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) }),
};

// ─── Notifications ─────────────────────────────────────────────────────────
export interface NotificationObject {
  id: string;
  type: "mention" | "reply" | "reaction";
  actor: { user_id: string; name: string; avatar_url?: string | null; color?: string };
  source: { kind: string; id: string; preview: string; deep_link: string };
  read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: (params: { unread_only?: boolean; cursor?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.unread_only) qs.set("unread_only", "true");
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    return collabFetch<{ notifications: NotificationObject[]; unread_count: number; next_cursor: string | null }>(
      `/notifications${qs.toString() ? "?" + qs : ""}`
    );
  },
  markRead: (id: string) => collabFetch<void>(`/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => collabFetch<void>(`/notifications/read-all`, { method: "POST" }),
};

// ─── Activity ──────────────────────────────────────────────────────────────
export interface ActivityEvent {
  id: string;
  type: "upload" | "delete" | "comment" | "ai_question" | "filter_shared" | "reaction" | string;
  actor: { user_id: string; name: string; avatar_url?: string | null; color?: string };
  target: { kind: string; id: string; label: string };
  payload?: any;
  created_at: string;
}

export const activityApi = {
  list: (params: { types?: string[]; user_id?: string; cursor?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.types?.length) qs.set("types", params.types.join(","));
    if (params.user_id) qs.set("user_id", params.user_id);
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    return collabFetch<{ events: ActivityEvent[]; next_cursor: string | null }>(
      `/activity${qs.toString() ? "?" + qs : ""}`
    );
  },
};

// ─── Tenant members (for @mentions) ────────────────────────────────────────
export interface TenantMember {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  color?: string;
  online?: boolean;
}

export const membersApi = {
  list: (q?: string, limit = 20) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    qs.set("limit", String(limit));
    return collabFetch<{ members: TenantMember[] }>(`/tenant/members?${qs.toString()}`);
  },
};

// ─── Presence / cursor REST fallback (for SSE mode) ────────────────────────
export const presenceApi = {
  snapshot: () => collabFetch<{ users: any[] }>("/presence"),
  heartbeat: (view_state: any) =>
    collabFetch<void>("/presence/heartbeat", { method: "POST", body: JSON.stringify({ view_state }) }),
  cursor: (payload: { x: number; y: number; target?: string }) =>
    collabFetch<void>("/cursor", { method: "POST", body: JSON.stringify(payload) }),
};
