import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  timeUntilLogout: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [timeUntilLogout, setTimeUntilLogout] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize auth state
  useEffect(() => {
    const loginTime = localStorage.getItem("loginTime");
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    
    if (isLoggedIn === "true" && loginTime) {
      const elapsed = Date.now() - parseInt(loginTime);
      if (elapsed < SESSION_DURATION) {
        setIsAuthenticated(true);
        setTimeUntilLogout(SESSION_DURATION - elapsed);
      } else {
        logout();
      }
    }
  }, []);

  // Activity tracking
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      localStorage.setItem("lastActivity", Date.now().toString());
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [isAuthenticated]);

  // Session timeout checker
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const loginTime = localStorage.getItem("loginTime");
      const lastActivity = localStorage.getItem("lastActivity");
      
      if (!loginTime || !lastActivity) {
        logout();
        return;
      }

      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      const timeSinceLogin = Date.now() - parseInt(loginTime);

      // Auto logout if 4 hours since login OR 30 minutes of inactivity
      if (timeSinceLogin >= SESSION_DURATION || timeSinceActivity >= 30 * 60 * 1000) {
        logout();
        return;
      }

      setTimeUntilLogout(SESSION_DURATION - timeSinceLogin);
    }, ACTIVITY_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Route protection
  useEffect(() => {
    const isSettingsThemeOnly = location.pathname === "/settings";
    const isLoginPage = location.pathname === "/login";
    
    if (!isAuthenticated && !isLoginPage && !isSettingsThemeOnly) {
      navigate("/login", { replace: true });
    } else if (isAuthenticated && isLoginPage) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  const login = () => {
    const now = Date.now();
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("loginTime", now.toString());
    localStorage.setItem("lastActivity", now.toString());
    setIsAuthenticated(true);
    setTimeUntilLogout(SESSION_DURATION);
  };

  const logout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("lastActivity");
    setIsAuthenticated(false);
    setTimeUntilLogout(0);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, timeUntilLogout }}>
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