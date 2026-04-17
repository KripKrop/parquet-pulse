/**
 * SSE fallback for collaboration events.
 * Activates when WebSocket transport gives up (after 3 retries).
 * Same event payload shape; client→server actions go through REST instead.
 */
import { getAccessToken } from "./tokenManager";
import { wsClient } from "./wsClient";

const SSE_BASE = "https://demoapi.crunchy.sigmoidsolutions.io/events/stream";

class SseClient {
  private es: EventSource | null = null;
  private active = false;

  start() {
    if (this.es) return;
    const token = getAccessToken();
    if (!token) return;

    const url = `${SSE_BASE}?token=${encodeURIComponent(token)}`;
    try {
      this.es = new EventSource(url, { withCredentials: false });
      this.active = true;

      const knownEvents = [
        "snapshot",
        "presence.joined", "presence.left", "presence.updated",
        "cursor.moved", "cursor.left",
        "comment.created", "comment.updated", "comment.deleted",
        "reaction.added", "reaction.removed",
        "typing",
        "notification.created", "activity.created",
        "annotation.created", "annotation.deleted",
      ];

      knownEvents.forEach((evt) => {
        this.es!.addEventListener(evt, (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data);
            wsClient.emit(evt, data);
          } catch (e) {
            console.warn("[sseClient] bad payload for", evt, e);
          }
        });
      });

      this.es.onopen = () => {
        // Re-emit transport state through wsClient so providers stay subscribed in one place
        (wsClient as any).setTransport?.("sse");
        wsClient.emit("transport", "sse");
      };

      this.es.onerror = () => {
        // Browser will auto-retry; if it stays errored long, provider may switch to polling
        console.warn("[sseClient] error");
      };
    } catch (err) {
      console.error("[sseClient] failed to start", err);
      this.active = false;
    }
  }

  stop() {
    this.active = false;
    try { this.es?.close(); } catch {}
    this.es = null;
  }

  isActive() { return this.active; }
}

export const sseClient = new SseClient();
