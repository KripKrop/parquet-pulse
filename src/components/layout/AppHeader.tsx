import { Link, NavLink } from "react-router-dom";
import { Settings2, LogOut, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const AppHeader = () => {
  const { isAuthenticated, logout, timeUntilLogout } = useAuth();

  const formatTimeUntilLogout = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };
  return (
    <motion.header 
      className="glass-panel border-b sticky top-0 z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="container mx-auto flex items-center justify-between py-3">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <Link to="/" className="font-semibold tracking-tight story-link text-gradient-primary">
            Crunch — Universal CSV Viewer
          </Link>
        </motion.div>
        <nav className="flex items-center gap-3">
          {isAuthenticated && timeUntilLogout > 0 && (
            <motion.div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-md glass-button text-xs text-muted-foreground"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Clock className="w-3 h-3" />
              <span>{formatTimeUntilLogout(timeUntilLogout)}</span>
            </motion.div>
          )}
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3 py-1.5 rounded-md glass-button transition-all duration-200 hover:glass-button-hover ${
                  isActive ? "glass-button-active" : ""
                }`
              }
              aria-label="Open Settings"
            >
              <Settings2 size={18} />
              <span className="text-sm">Settings</span>
            </NavLink>
          </motion.div>

          {isAuthenticated && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md glass-button transition-all duration-200 hover:glass-button-hover text-destructive hover:text-destructive"
                aria-label="Logout"
              >
                <LogOut size={18} />
                <span className="text-sm">Logout</span>
              </Button>
            </motion.div>
          )}
        </nav>
      </div>
    </motion.header>
  );
};

export default AppHeader;
