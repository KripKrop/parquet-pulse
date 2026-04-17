/**
 * Collaboration WebSocket client.
 * - Primary auth: Sec-WebSocket-Protocol: bearer.<token>
 * - Fallback: ?token=<token> query param
 * - Heartbeat: replies "pong" to incoming "ping"
 * - Exponential backoff reconnect (1s → 30s)
 * - Close 4003 → triggers token refresh hook before reconnecting
 *
 * NOTE: Browsers do not allow custom HTTP headers on WebSocket upgrade requests.
 * The "Sec-WebSocket-Protocol" approach piggybacks the token on the subprotocol
 * negotiation — backend must accept either form.
 */
import { getAccessToken, isAccessTokenExpired, getRefreshToken, setTokens } from "./tokenManager";
import { refreshToken as refreshTokenApi } from "./authApi";

const WS_BASE = "wss://demoapi.crunchy.sigmoidsolutions.io/ws/workspace";

export type WsEventName =
  | "snapshot"
  | "presence.joined"
  | "presence.left"
  | "presence.updated"
  | "cursor.moved"
  | "cursor.left"
  | "comment.created"
  | "comment.updated"
  | "comment.deleted"
  | "reaction.added"
  | "reaction.removed"
  | "typing"
  | "notification.created"
  | "activity.created"
  | "annotation.created"
  | "annotation.deleted"
  | "error"
  | "open"
  | "close"
  | "transport"; // synthetic: reports current transport (ws|sse|polling|down)

export interface WsEnvelope<T = any> {
  type: string;
  id?: string;
  ts?: string;
  payload?: T;
}

type Listener = (payload: any, env?: WsEnvelope) => void;

class WsClient {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private explicitlyClosed = false;
  private heartbeatTimer: number | null = null;
  private lastPong = Date.now();
  private transport: "ws" | "sse" | "polling" | "down" = "down";

  on(event: WsEventName | string, fn: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.off(event, fn);
  }

  off(event: WsEventName | string, fn: Listener) {
    this.listeners.get(event)?.delete(fn);
  }

  emit(event: WsEventName | string, payload: any, env?: WsEnvelope) {
    this.listeners.get(event)?.forEach((fn) => {
      try { fn(payload, env); } catch (e) { console.error("[wsClient] listener error", e); }
    });
  }

  getTransport() { return this.transport; }

  private setTransport(t: "ws" | "sse" | "polling" | "down") {
    if (this.transport !== t) {
      this.transport = t;
      this.emit("transport", t);
    }
  }

  async connect() {
    this.explicitlyClosed = false;
    let token = getAccessToken();
    if (!token) return;

    if (isAccessTokenExpired()) {
      try {
        const refresh = getRefreshToken();
        if (refresh) {
          const r = await refreshTokenApi({ refresh_token: refresh });
          setTokens(r.access_token, r.refresh_token);
          token = r.access_token;
        }
      } catch {
        return;
      }
    }

    try {
      // Primary: subprotocol-encoded token
      this.socket = new WebSocket(WS_BASE, [`bearer.${token}`]);
      this.bindSocket();
    } catch (err) {
      console.warn("[wsClient] primary subprotocol auth failed, trying query token", err);
      try {
        this.socket = new WebSocket(`${WS_BASE}?token=${encodeURIComponent(token!)}`);
        this.bindSocket();
      } catch (e) {
        console.error("[wsClient] both connection attempts failed", e);
        this.scheduleReconnect();
      }
    }
  }

  private bindSocket() {
    const sock = this.socket;
    if (!sock) return;

    sock.onopen = () => {
      this.reconnectAttempts = 0;
      this.lastPong = Date.now();
      this.setTransport("ws");
      this.startHeartbeatWatchdog();
      this.emit("open", null);
    };

    sock.onmessage = (ev) => {
      let env: WsEnvelope;
      try { env = JSON.parse(ev.data); }
      catch { return; }

      if (env.type === "ping") {
        this.lastPong = Date.now();
        this.send({ type: "pong" });
        return;
      }
      if (env.type === "pong") {
        this.lastPong = Date.now();
        return;
      }
      this.emit(env.type, env.payload ?? env, env);
    };

    sock.onclose = (ev) => {
      this.stopHeartbeatWatchdog();
      this.socket = null;
      this.emit("close", { code: ev.code, reason: ev.reason });
      if (this.explicitlyClosed) {
        this.setTransport("down");
        return;
      }
      // 4003: token expired — refresh then reconnect
      if (ev.code === 4003) {
        this.refreshAndReconnect();
        return;
      }
      // 4002: bad token, do not retry
      if (ev.code === 4002) {
        this.setTransport("down");
        return;
      }
      this.scheduleReconnect();
    };

    sock.onerror = (e) => {
      console.warn("[wsClient] error", e);
    };
  }

  private async refreshAndReconnect() {
    try {
      const refresh = getRefreshToken();
      if (!refresh) { this.setTransport("down"); return; }
      const r = await refreshTokenApi({ refresh_token: refresh });
      setTokens(r.access_token, r.refresh_token);
      this.connect();
    } catch {
      this.setTransport("down");
    }
  }

  private scheduleReconnect() {
    if (this.explicitlyClosed) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 30_000);
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    // After 3 failed attempts, downstream provider should switch to SSE
    if (this.reconnectAttempts > 3) this.setTransport("down");
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  private startHeartbeatWatchdog() {
    this.stopHeartbeatWatchdog();
    this.heartbeatTimer = window.setInterval(() => {
      if (Date.now() - this.lastPong > 60_000) {
        try { this.socket?.close(4001, "heartbeat timeout"); } catch {}
      }
    }, 25_000);
  }

  private stopHeartbeatWatchdog() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(msg: WsEnvelope) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      try { this.socket.send(JSON.stringify(msg)); } catch (e) { console.warn(e); }
    }
  }

  isOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    this.explicitlyClosed = true;
    if (this.reconnectTimer) { window.clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.stopHeartbeatWatchdog();
    try { this.socket?.close(1000, "client disconnect"); } catch {}
    this.socket = null;
    this.setTransport("down");
  }
}

export const wsClient = new WsClient();
