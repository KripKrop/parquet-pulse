import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse 
} from "@/types/auth";

const BASE_URL = "https://demoapi.crunchy.sigmoidsolutions.io";

async function makeAuthRequest<T>(
  endpoint: string, 
  method: string, 
  body?: any
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  return makeAuthRequest<RegisterResponse>("/register", "POST", data);
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return makeAuthRequest<LoginResponse>("/login", "POST", data);
}

export async function refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  return makeAuthRequest<RefreshTokenResponse>("/token/refresh", "POST", data);
}
