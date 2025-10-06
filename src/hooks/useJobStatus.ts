import { useEffect, useRef, useState } from "react";
import { request, wsUrl } from "@/services/apiClient";
import { getAccessToken } from "@/services/tokenManager";
import { toast } from "@/hooks/use-toast";
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
      const token = getAccessToken();
      const url = token 
        ? `${wsUrl(`/ws/status/${jobId}`)}?token=${encodeURIComponent(token)}`
        : wsUrl(`/ws/status/${jobId}`);
      ws = new WebSocket(url);
      
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
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (!doneRef.current) startPolling();
      };
      
      ws.onclose = (event) => {
        // Handle authentication failure (4401)
        if (event.code === 4401) {
          toast({
            title: "Authentication Failed",
            description: "Please refresh the page to re-authenticate",
            variant: "destructive"
          });
          doneRef.current = true;
          return;
        }
        
        // For normal closures or other errors, fall back to polling
        if (!doneRef.current) {
          console.log("WebSocket closed, falling back to HTTP polling");
          startPolling();
        }
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
