import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { wsClient } from "@/services/wsClient";
import { sseClient } from "@/services/sseClient";
import { presenceApi, notificationsApi } from "@/services/collabApi";
import { useAuth } from "./AuthContext";
import type { NormalizedViewState } from "@/lib/viewStateSummary";

export interface OnlineUser {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  color?: string;
  view_state?: NormalizedViewState;
  last_seen?: string;
}

export interface CursorState {
  user_id: string;
  x: number;
  y: number;
  target?: string;
  ts: number;
}

export type Transport = "ws" | "sse" | "polling" | "down";

interface CollabContextValue {
  transport: Transport;
  onlineUsers: OnlineUser[];
  cursorsByUserId: Record<string, CursorState>;
  unreadNotifications: number;
  typingByThreadId: Record<string, string[]>; // thread -> user_ids
  broadcastViewState: (vs: NormalizedViewState) => void;
  broadcastCursor: (c: { x: number; y: number; target?: string }) => void;
  broadcastCursorLeave: () => void;
  emitTyping: (threadId: string, typing: boolean) => void;
  setUnreadNotifications: (n: number) => void;
}

const CollabContext = createContext<CollabContextValue | undefined>(undefined);

const POLL_INTERVAL_MS = 15_000;

export function CollabProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [transport, setTransport] = useState<Transport>("down");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [cursorsByUserId, setCursors] = useState<Record<string, CursorState>>({});
  const [unreadNotifications, setUnread] = useState(0);
  const [typingByThreadId, setTyping] = useState<Record<string, string[]>>({});
  const currentViewState = useRef<NormalizedViewState>({});
  const sseFallbackTimer = useRef<number | null>(null);
  const pollTimer = useRef<number | null>(null);
  const heartbeatTimer = useRef<number | null>(null);
  const cursorRestThrottle = useRef(0);

  // ─── Connect lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    wsClient.connect();
    return () => {
      wsClient.disconnect();
      sseClient.stop();
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      if (heartbeatTimer.current) window.clearInterval(heartbeatTimer.current);
    };
  }, [isAuthenticated]);

  // ─── Transport state machine: ws → sse → polling ──────────────────────
  useEffect(() => {
    const off = wsClient.on("transport", (t: Transport) => {
      setTransport(t);
      if (t === "ws") {
        sseClient.stop();
        if (pollTimer.current) { window.clearInterval(pollTimer.current); pollTimer.current = null; }
      } else if (t === "down") {
        // Try SSE after WS exhausted retries
        if (sseFallbackTimer.current) window.clearTimeout(sseFallbackTimer.current);
        sseFallbackTimer.current = window.setTimeout(() => {
          sseClient.start();
          // If SSE doesn't open within 8s, fall back to polling
          window.setTimeout(() => {
            if (wsClient.getTransport() !== "ws" && wsClient.getTransport() !== "sse") {
              setTransport("polling");
              startPolling();
            }
          }, 8000);
        }, 500);
      }
    });
    return off;
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimer.current) return;
    pollTimer.current = window.setInterval(async () => {
      try {
        const [pres, notif] = await Promise.all([
          presenceApi.snapshot().catch(() => ({ users: [] })),
          notificationsApi.list({ unread_only: true, limit: 1 }).catch(() => null),
        ]);
        if (pres?.users) setOnlineUsers(pres.users as OnlineUser[]);
        if (notif) setUnread(notif.unread_count);
      } catch {/* ignore */}
    }, POLL_INTERVAL_MS);
  }, []);

  // ─── Snapshot & live event handlers ───────────────────────────────────
  useEffect(() => {
    const offs: Array<() => void> = [];

    offs.push(wsClient.on("snapshot", (payload: any) => {
      const users: OnlineUser[] = payload?.users ?? [];
      setOnlineUsers(users);
      setUnread(payload?.unread_notifications ?? 0);
      setCursors({});
    }));

    offs.push(wsClient.on("presence.joined", (p: OnlineUser) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.user_id === p.user_id)) return prev;
        return [...prev, p];
      });
    }));

    offs.push(wsClient.on("presence.left", (p: { user_id: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.user_id !== p.user_id));
      setCursors((prev) => {
        const { [p.user_id]: _, ...rest } = prev;
        return rest;
      });
    }));

    offs.push(wsClient.on("presence.updated", (p: { user_id: string; view_state?: NormalizedViewState }) => {
      setOnlineUsers((prev) =>
        prev.map((u) => (u.user_id === p.user_id ? { ...u, view_state: p.view_state } : u))
      );
    }));

    offs.push(wsClient.on("cursor.moved", (p: { user_id: string; x: number; y: number; target?: string }) => {
      if (p.user_id === user?.user_id) return;
      setCursors((prev) => ({ ...prev, [p.user_id]: { ...p, ts: Date.now() } }));
    }));

    offs.push(wsClient.on("cursor.left", (p: { user_id: string }) => {
      setCursors((prev) => {
        const { [p.user_id]: _, ...rest } = prev;
        return rest;
      });
    }));

    offs.push(wsClient.on("notification.created", () => {
      setUnread((n) => n + 1);
    }));

    offs.push(wsClient.on("typing", (p: { thread_id: string; user_id: string; typing: boolean }) => {
      setTyping((prev) => {
        const list = new Set(prev[p.thread_id] ?? []);
        if (p.typing) list.add(p.user_id);
        else list.delete(p.user_id);
        return { ...prev, [p.thread_id]: Array.from(list) };
      });
    }));

    return () => { offs.forEach((o) => o()); };
  }, [user?.user_id]);

  // ─── REST heartbeat (only when not WS) ────────────────────────────────
  useEffect(() => {
    if (heartbeatTimer.current) { window.clearInterval(heartbeatTimer.current); heartbeatTimer.current = null; }
    if (transport === "sse" || transport === "polling") {
      heartbeatTimer.current = window.setInterval(() => {
        presenceApi.heartbeat(currentViewState.current).catch(() => {});
      }, 10_000);
    }
  }, [transport]);

  // ─── Outbound actions ─────────────────────────────────────────────────
  const broadcastViewState = useCallback((vs: NormalizedViewState) => {
    currentViewState.current = vs;
    if (wsClient.isOpen()) {
      wsClient.send({ type: "presence.update", payload: vs });
    } else if (transport === "sse" || transport === "polling") {
      presenceApi.heartbeat(vs).catch(() => {});
    }
  }, [transport]);

  const broadcastCursor = useCallback((c: { x: number; y: number; target?: string }) => {
    if (wsClient.isOpen()) {
      wsClient.send({ type: "cursor.move", payload: c });
      return;
    }
    if (transport === "sse") {
      // Degraded: 4/sec REST cap
      const now = performance.now();
      if (now - cursorRestThrottle.current < 250) return;
      cursorRestThrottle.current = now;
      presenceApi.cursor(c).catch(() => {});
    }
    // polling/down → cursors disabled
  }, [transport]);

  const broadcastCursorLeave = useCallback(() => {
    if (wsClient.isOpen()) {
      wsClient.send({ type: "cursor.leave", payload: {} });
    }
  }, []);

  const emitTyping = useCallback((thread_id: string, typing: boolean) => {
    if (!wsClient.isOpen()) return;
    wsClient.send({ type: typing ? "typing.start" : "typing.stop", payload: { thread_id } });
  }, []);

  // ─── Cleanup stale cursors (>3s idle) ─────────────────────────────────
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const next: Record<string, CursorState> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.ts < 3000) next[k] = v;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const value = useMemo<CollabContextValue>(() => ({
    transport,
    onlineUsers,
    cursorsByUserId,
    unreadNotifications,
    typingByThreadId,
    broadcastViewState,
    broadcastCursor,
    broadcastCursorLeave,
    emitTyping,
    setUnreadNotifications: setUnread,
  }), [transport, onlineUsers, cursorsByUserId, unreadNotifications, typingByThreadId, broadcastViewState, broadcastCursor, broadcastCursorLeave, emitTyping]);

  return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>;
}

export function useCollab() {
  const ctx = useContext(CollabContext);
  if (!ctx) throw new Error("useCollab must be used inside CollabProvider");
  return ctx;
}
