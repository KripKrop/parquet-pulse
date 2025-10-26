import { Link, NavLink, useLocation } from "react-router-dom";
import { Settings2, Database, Files, Building2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const AppHeader = () => {
  const { isAuthenticated, logout, user, tenant } = useAuth();
  const location = useLocation();
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
          <div className="flex items-center space-x-1">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-1.5 rounded-md glass-button transition-all duration-200 hover:glass-button-hover ${
                    isActive ? "glass-button-active" : ""
                  }`
                }
              >
                <Database className="h-4 w-4" />
                <span className="text-sm">Data</span>
              </NavLink>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <NavLink
                to="/files"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-1.5 rounded-md glass-button transition-all duration-200 hover:glass-button-hover ${
                    isActive ? "glass-button-active" : ""
                  }`
                }
              >
                <Files className="h-4 w-4" />
                <span className="text-sm">Files</span>
              </NavLink>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <NavLink
                to="/ai"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-1.5 rounded-md glass-button transition-all duration-200 hover:glass-button-hover ${
                    isActive ? "glass-button-active" : ""
                  }`
                }
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">AI</span>
              </NavLink>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{tenant?.name}</span>
              </div>
              <span className="text-muted-foreground">
                {user?.email}
              </span>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                Logout
              </Button>
            </div>
          )}
        </nav>
      </div>
    </motion.header>
  );
};

export default AppHeader;
