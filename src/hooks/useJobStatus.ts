import { useEffect, useRef, useState } from "react";
import { request, wsUrl } from "@/services/apiClient";
import type { JobStatus } from "@/types/api";

export function useJobStatus(jobId?: string) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const pollRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    doneRef.current = false;
    let ws: WebSocket | null = null;

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = window.setInterval(async () => {
        try {
          const s = await request<JobStatus>(`/status/${jobId}`);
          setStatus(s);
          if (s.status === "completed" || s.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            doneRef.current = true;
          }
        } catch (e) {
          // swallow; next tick will retry
        }
      }, 1000);
    };

    try {
      ws = new WebSocket(wsUrl(`/ws/status/${jobId}`));
      ws.onmessage = (ev) => {
        try {
          const s: JobStatus = JSON.parse(ev.data);
          setStatus(s);
          if (s.status === "completed" || s.status === "failed") {
            doneRef.current = true;
            ws?.close();
          }
        } catch {}
      };
      ws.onerror = () => {
        if (!doneRef.current) startPolling();
      };
      ws.onclose = () => {
        if (!doneRef.current) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      ws?.close();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [jobId]);

  const progress = Math.round(((status?.progress ?? 0) * 100 + Number.EPSILON) * 100) / 100;
  const isComplete = status?.status === "completed";
  const isFailed = status?.status === "failed";

  return { status, progress, isComplete, isFailed };
}
