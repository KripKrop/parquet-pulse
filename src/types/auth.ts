export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface User {
  user_id: string;
  /** @deprecated use user_id; kept for backwards compatibility */
  id?: string;
  email: string;
  name: string;
  avatar_url: string | null;
  /** Server-owned. Hex like "#A855F7" or HSL string. Never recompute client-side. */
  color: string;
  has_taken_tour?: boolean;
  /** @deprecated alias for has_taken_tour */
  tour_completed?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
}

export interface AuthenticatedContext {
  user: User;
  tenant: Tenant;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenant_id?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  tenant: Tenant;
}

export interface InvitedMember {
  email: string;
  password: string;
}

export interface RegisterRequest {
  tenant_name: string;
  email: string;
  password: string;
  invites?: InvitedMember[];
}

export interface RegisterResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  tenant: Tenant;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface DecodedToken {
  sub: string;
  email: string;
  name?: string;
  avatar_url?: string | null;
  color?: string;
  has_taken_tour?: boolean;
  tenant_id: string;
  tenant_name: string;
  role?: string;
  exp: number;
  type: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatar_url?: string | null;
}

export interface MeResponse {
  user: User;
  tenant?: Tenant;
}
