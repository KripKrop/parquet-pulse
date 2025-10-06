import { jwtDecode } from "jwt-decode";
import type { DecodedToken, User, Tenant } from "@/types/auth";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

export function decodeAccessToken(): DecodedToken | null {
  if (!accessToken) return null;
  
  try {
    return jwtDecode<DecodedToken>(accessToken);
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
  if (!accessToken) return true;
  return isTokenExpired(accessToken);
}

export function getUserFromToken(): User | null {
  const decoded = decodeAccessToken();
  if (!decoded) return null;
  
  return {
    id: decoded.sub,
    email: decoded.email,
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
