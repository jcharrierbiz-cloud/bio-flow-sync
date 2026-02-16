import { useLocation, useNavigate } from "react-router-dom";
import { Home, CalendarDays, PlusCircle, Heart } from "lucide-react";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/agenda", icon: CalendarDays, label: "Agenda" },
  { path: "/log", icon: PlusCircle, label: "Log" },
  { path: "/health", icon: Heart, label: "Santé" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card rounded-none border-t border-x-0 border-b-0 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300 ${
                isActive
                  ? "text-energy"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_hsl(175,80%,45%)]" : ""}`} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
