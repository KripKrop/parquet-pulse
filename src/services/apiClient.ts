import { toast } from "@/hooks/use-toast";
import { getAccessToken, isAccessTokenExpired, getRefreshToken, setTokens, clearTokens } from "./tokenManager";
import { refreshToken as refreshTokenApi } from "./authApi";

const BASE_URL = "https://demoapi.crunchy.sigmoidsolutions.io";

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function handleTokenRefresh() {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refresh = getRefreshToken();
      if (!refresh) {
        throw new Error("No refresh token available");
      }

      const response = await refreshTokenApi({ refresh_token: refresh });
      setTokens(response.access_token, response.refresh_token);
    } catch (error) {
      clearTokens();
      window.location.href = "/login";
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;
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

export async function request<T = any>(
  path: string, 
  init: RequestInit = {}
): Promise<T & { _headers?: Headers }> {
  // Check if token is expired and refresh if needed
  if (isAccessTokenExpired()) {
    const refresh = getRefreshToken();
    if (refresh) {
      await handleTokenRefresh();
    }
  }

  const url = buildUrl(path);
  const headers = new Headers(init.headers || {});
  
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("content-type") && init.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });
  
  if (!res.ok) {
    if (res.status === 401) {
      // Try to refresh token once
      const refresh = getRefreshToken();
      if (refresh && !isRefreshing) {
        try {
          await handleTokenRefresh();
          // Retry the original request
          const retryHeaders = new Headers(init.headers || {});
          const newToken = getAccessToken();
          if (newToken) {
            retryHeaders.set("Authorization", `Bearer ${newToken}`);
          }
          const retryRes = await fetch(url, { ...init, headers: retryHeaders });
          if (retryRes.ok) {
            const contentType = retryRes.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const data = await retryRes.json();
              // Attach headers for dataset versioning
              if (path === "/columns") {
                return { ...data, _headers: retryRes.headers } as any;
              }
              return data;
            }
            return retryRes as unknown as T;
          }
        } catch (error) {
          toast({ 
            title: "Session Expired", 
            description: "Please log in again.", 
            variant: "destructive" 
          });
          window.location.href = "/login";
          throw error;
        }
      }
      
      toast({ 
        title: "Unauthorized", 
        description: "Please log in again.", 
        variant: "destructive" 
      });
    }

    if (res.status === 403) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to perform this action.",
        variant: "destructive"
      });
    }

    if (res.status === 404) {
      toast({
        title: "Not Found",
        description: "Resource not found or belongs to another tenant.",
        variant: "destructive"
      });
    }
    
    const text = await res.text().catch(() => "");
    const err: any = new Error(text || `Request failed: ${res.status}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    // Attach headers for dataset versioning
    if (path === "/columns") {
      return { ...data, _headers: res.headers } as any;
    }
    return data;
  }
  return res as unknown as T;
}

// Legacy exports for compatibility
export function getApiConfig() {
  return { baseUrl: BASE_URL, apiKey: "" };
}

export function setApiConfig() {
  // No-op for backward compatibility
}
