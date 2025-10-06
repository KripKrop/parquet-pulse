export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: string;
  email: string;
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
  owner_email: string;
  owner_password: string;
  invited_members?: InvitedMember[];
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
  tenant_id: string;
  tenant_name: string;
  role?: string;
  exp: number;
  type: string;
}
