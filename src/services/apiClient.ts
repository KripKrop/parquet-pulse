import { toast } from "@/hooks/use-toast";

const LS_BASE_URL = "ucpv.baseUrl";
const LS_API_KEY = "ucpv.apiKey";

let baseUrl: string = localStorage.getItem(LS_BASE_URL) || "http://localhost:8000";
let apiKey: string = localStorage.getItem(LS_API_KEY) || "changeme";

export function setApiConfig(cfg: { baseUrl: string; apiKey: string }) {
  baseUrl = cfg.baseUrl.trim().replace(/\/$/, "");
  apiKey = cfg.apiKey;
  localStorage.setItem(LS_BASE_URL, baseUrl);
  localStorage.setItem(LS_API_KEY, apiKey);
}

export function getApiConfig() {
  return { baseUrl, apiKey };
}

function buildUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${baseUrl}${path.startsWith("/") ? path : "/" + path}`;
}

export function wsUrl(path: string) {
  const url = buildUrl(path);
  try {
    const u = new URL(url);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    return u.toString();
  } catch {
    return url.replace(/^http/, "ws");
  }
}

export async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const headers = new Headers(init.headers || {});
  headers.set("x-api-key", apiKey);
  if (!headers.has("content-type") && init.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    if (res.status === 401) {
      toast({ title: "Unauthorized", description: "Invalid API Key. Update it in Settings.", variant: "destructive" });
    }
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res as unknown as T;
}
