import { Link, NavLink, useLocation } from "react-router-dom";
import { Settings2, Database, Files, Building2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useAI } from "@/contexts/AIContext";
import { useDatasetVersion } from "@/hooks/useDatasetVersionCheck";

const AppHeader = () => {
  const { isAuthenticated, logout, user, tenant } = useAuth();
  const { indexStatus } = useAI();
  const { data: currentVersion } = useDatasetVersion();
  const location = useLocation();

  const isStale = indexStatus && 
                  currentVersion && 
                  currentVersion !== "unknown" &&
                  indexStatus.dataset_version !== currentVersion;
  
  const hasIndex = indexStatus !== null;

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
              {/* AI Index Status Indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      {hasIndex ? (
                        <Badge 
                          variant={isStale ? "destructive" : "outline"}
                          className="gap-1 cursor-pointer"
                          onClick={() => window.location.href = "/ai"}
                        >
                          {isStale ? (
                            <>
                              <AlertCircle className="h-3 w-3" />
                              AI Outdated
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              AI Ready
                            </>
                          )}
                        </Badge>
                      ) : (
                        <Badge 
                          variant="secondary"
                          className="gap-1 cursor-pointer"
                          onClick={() => window.location.href = "/ai"}
                        >
                          <Database className="h-3 w-3" />
                          Build AI
                        </Badge>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {hasIndex ? (
                        <>
                          <p className="font-medium">
                            {isStale ? "Index is outdated" : "AI is ready to use"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {indexStatus?.cards_indexed} columns indexed
                          </p>
                          {isStale && (
                            <p className="text-xs text-destructive">
                              Click to rebuild
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-medium">No AI index</p>
                          <p className="text-xs text-muted-foreground">
                            Click to build your first index
                          </p>
                        </>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

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
