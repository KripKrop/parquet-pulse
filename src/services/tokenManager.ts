import { jwtDecode } from "jwt-decode";
import type { DecodedToken, User, Tenant } from "@/types/auth";

const ACCESS_KEY = "crunch_access_token";
const REFRESH_KEY = "crunch_refresh_token";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  try {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {}
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    try { accessToken = localStorage.getItem(ACCESS_KEY); } catch {}
  }
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (!refreshToken) {
    try { refreshToken = localStorage.getItem(REFRESH_KEY); } catch {}
  }
  return refreshToken;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

export function decodeAccessToken(): DecodedToken | null {
  const token = getAccessToken();
  if (!token) return null;
  
  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    console.error("Failed to decode access token:", error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
}

export function isAccessTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) return true;
  return isTokenExpired(token);
}

/**
 * Hydrate a partial User from the access token claims.
 * Backend may include name/avatar_url/color in the JWT; if not, /me/profile fills the gap.
 * Color is server-owned and must NOT be recomputed if absent — pass through as-is.
 */
export function getUserFromToken(): User | null {
  const decoded = decodeAccessToken();
  if (!decoded) return null;
  
  return {
    user_id: decoded.sub,
    id: decoded.sub,
    email: decoded.email,
    name: decoded.name ?? decoded.email.split("@")[0],
    avatar_url: decoded.avatar_url ?? null,
    color: decoded.color ?? "",
    has_taken_tour: decoded.has_taken_tour,
    tour_completed: decoded.has_taken_tour,
  };
}

export function getTenantFromToken(): Tenant | null {
  const decoded = decodeAccessToken();
  if (!decoded) return null;
  
  return {
    id: decoded.tenant_id,
    name: decoded.tenant_name,
  };
}

export function getRoleFromToken(): string | null {
  const decoded = decodeAccessToken();
  return decoded?.role || null;
}
