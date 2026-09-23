import {
  BookOpen,
  ChevronLeft,
  CircleUserRound,
  Home,
  LogOut,
  Menu,
  Settings2,
  Swords,
  Trophy,
  TrendingUp,
  X
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Brand } from "./Brand";
import { api } from "../lib/api";
import { clearLearnerId, getStoredLearnerId } from "../lib/session";

const navigation = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/challenge", label: "Challenge", icon: Swords },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/profile", label: "Profile & Privacy", icon: Settings2 }
];

export function AppShell({ children, focused = false }: { children: ReactNode; focused?: boolean }) {
  const [open, setOpen] = useState(false);
  const [learner, setLearner] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const learnerId = getStoredLearnerId();
    if (!learnerId) {
      navigate("/onboarding", { replace: true });
      return;
    }
    Promise.all([api.learner(learnerId), api.preferences(learnerId)]).then(([nextLearner, preferences]) => {
      setLearner(nextLearner);
      document.documentElement.classList.toggle("reduce-motion", preferences.reduceMotion);
      document.documentElement.classList.toggle("larger-text", preferences.largerText);
    }).catch(() => {
      clearLearnerId();
      navigate("/onboarding", { replace: true });
    });
  }, [navigate]);

  const signOut = () => {
    clearLearnerId();
    navigate("/", { replace: true });
  };

  return (
    <div className={`app-shell ${focused ? "app-shell--focused" : ""}`}>
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation">
        <Menu size={20} />
      </button>
      {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar__header">
          <Brand />
          <button className="icon-button sidebar__close" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>
        {focused && (
          <button className="focus-back" onClick={() => navigate("/home")}>
            <ChevronLeft size={17} />
            Leave session
          </button>
        )}
        <nav className="sidebar__nav" aria-label="Primary navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="learner-chip">
            <CircleUserRound size={20} />
            <div>
              <strong>{learner?.name ?? "Learner"}</strong>
              <span>{learner ? `Grade ${learner.grade}` : "Loading profile"}</span>
            </div>
          </div>
          <button className="sidebar__logout" onClick={signOut}>
            <LogOut size={17} />
            Use another profile
          </button>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
