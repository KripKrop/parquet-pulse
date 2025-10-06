import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as authApi from "@/services/authApi";
import * as tokenManager from "@/services/tokenManager";
import type { User, Tenant, RegisterRequest } from "@/types/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  tenant: Tenant | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string, tenantId?: string) => Promise<{ error?: string }>;
  register: (data: RegisterRequest) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!user && !!tenant;

  // Initialize from stored tokens
  useEffect(() => {
    const initAuth = () => {
      const accessToken = tokenManager.getAccessToken();
      
      if (accessToken && !tokenManager.isAccessTokenExpired()) {
        const userData = tokenManager.getUserFromToken();
        const tenantData = tokenManager.getTenantFromToken();
        const roleData = tokenManager.getRoleFromToken();
        
        if (userData && tenantData) {
          setUser(userData);
          setTenant(tenantData);
          setRole(roleData);
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      if (tokenManager.isAccessTokenExpired()) {
        const refresh = tokenManager.getRefreshToken();
        if (refresh) {
          try {
            const response = await authApi.refreshToken({ refresh_token: refresh });
            tokenManager.setTokens(response.access_token, response.refresh_token);
            
            const userData = tokenManager.getUserFromToken();
            const tenantData = tokenManager.getTenantFromToken();
            const roleData = tokenManager.getRoleFromToken();
            
            if (userData && tenantData) {
              setUser(userData);
              setTenant(tenantData);
              setRole(roleData);
            }
          } catch (error) {
            await logout();
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Route protection
  useEffect(() => {
    if (loading) return;
    
    const isLoginPage = location.pathname === "/login";
    
    if (!isAuthenticated && !isLoginPage) {
      navigate("/login", { replace: true });
    } else if (isAuthenticated && isLoginPage) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate, loading]);

  const login = async (email: string, password: string, tenantId?: string) => {
    try {
      const response = await authApi.login({ 
        email, 
        password, 
        tenant_id: tenantId 
      });
      
      tokenManager.setTokens(response.access_token, response.refresh_token);
      setUser(response.user);
      setTenant(response.tenant);
      setRole(tokenManager.getRoleFromToken());
      
      return {};
    } catch (error: any) {
      return { error: error.message || "Login failed" };
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      
      tokenManager.setTokens(response.access_token, response.refresh_token);
      setUser(response.user);
      setTenant(response.tenant);
      setRole(tokenManager.getRoleFromToken());
      
      return {};
    } catch (error: any) {
      return { error: error.message || "Registration failed" };
    }
  };

  const logout = async () => {
    tokenManager.clearTokens();
    setUser(null);
    setTenant(null);
    setRole(null);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      tenant,
      role,
      login, 
      register,
      logout, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
