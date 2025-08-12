import { Link, NavLink } from "react-router-dom";
import { Settings2 } from "lucide-react";

const AppHeader = () => {
  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex items-center justify-between py-3">
        <Link to="/" className="font-semibold tracking-tight story-link">
          Crunch — Universal CSV Viewer
        </Link>
        <nav className="flex items-center gap-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent transition ${
                isActive ? "bg-accent" : ""
              }`
            }
            aria-label="Open Settings"
          >
            <Settings2 size={18} />
            <span className="text-sm">Settings</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
