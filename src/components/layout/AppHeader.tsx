import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Settings2, Database, Files, Building2, Sparkles, CheckCircle2, AlertCircle, Menu, Activity } from "lucide-react";
import { PresenceAvatars } from "@/components/collab/PresenceAvatars";
import { NotificationBell } from "@/components/collab/NotificationBell";
import { AvatarChip } from "@/components/profile/AvatarChip";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useAI } from "@/contexts/AIContext";
import { useDatasetVersion } from "@/hooks/useDatasetVersionCheck";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { to: "/", icon: Database, label: "Data" },
  { to: "/files", icon: Files, label: "Files" },
  { to: "/ai", icon: Sparkles, label: "AI" },
  { to: "/activity", icon: Activity, label: "Activity" },
  { to: "/settings", icon: Settings2, label: "Settings" },
];

const AppHeader = () => {
  const { isAuthenticated, logout, user, tenant } = useAuth();
  const { indexStatus } = useAI();
  const { data: currentVersion } = useDatasetVersion(isAuthenticated);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isStale = indexStatus && 
                  currentVersion && 
                  currentVersion !== "unknown" &&
                  indexStatus.dataset_version !== currentVersion;
  
  const hasIndex = indexStatus !== null;

  const AIStatusBadge = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            {hasIndex ? (
              <Badge 
                variant={isStale ? "destructive" : "outline"}
                className="gap-1 cursor-pointer"
                onClick={() => { navigate("/ai"); setMobileMenuOpen(false); }}
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
                onClick={() => { navigate("/ai"); setMobileMenuOpen(false); }}
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
                  <p className="text-xs text-destructive">Click to rebuild</p>
                )}
              </>
            ) : (
              <>
                <p className="font-medium">No AI index</p>
                <p className="text-xs text-muted-foreground">Click to build your first index</p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // ─── Mobile header ───
  if (isMobile) {
    return (
      <motion.header
        className="glass-panel border-b sticky top-0 z-50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/" className="font-semibold tracking-tight text-gradient-primary text-sm">
            Crunch
          </Link>

          {isAuthenticated && <AIStatusBadge />}
          {!isAuthenticated && <div className="w-9" />}
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-gradient-primary">Crunch</SheetTitle>
            </SheetHeader>

            <nav className="flex flex-col p-2 gap-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  data-tour={to === "/files" ? "files-nav" : to === "/ai" ? "ai" : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            {isAuthenticated && (
              <div className="mt-auto border-t p-4 space-y-3 absolute bottom-0 left-0 right-0">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{tenant?.name}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                <Button onClick={() => { logout(); setMobileMenuOpen(false); }} variant="outline" size="sm" className="w-full">
                  Logout
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </motion.header>
    );
  }

  // ─── Desktop header (unchanged) ───
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
            {navItems.map(({ to, icon: Icon, label }) => (
              <motion.div key={to} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <NavLink
                  to={to}
                  data-tour={to === "/files" ? "files-nav" : to === "/ai" ? "ai" : undefined}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-3 py-1.5 rounded-md glass-button transition-all duration-200 hover:glass-button-hover ${
                      isActive ? "glass-button-active" : ""
                    }`
                  }
                  {...(label === "Settings" ? { "aria-label": "Open Settings" } : {})}
                >
                  <Icon className={label === "Settings" ? "h-[18px] w-[18px]" : "h-4 w-4"} />
                  <span className="text-sm">{label}</span>
                </NavLink>
              </motion.div>
            ))}
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-3 text-sm">
              <AIStatusBadge />
              <PresenceAvatars />
              <NotificationBell />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{tenant?.name}</span>
              </div>
              {user && (
                <AvatarChip
                  name={user.name}
                  email={user.email}
                  avatarUrl={user.avatar_url}
                  color={user.color}
                  size="sm"
                />
              )}
              <Button onClick={logout} variant="outline" size="sm" className="text-xs h-8">
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
