import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FileText,
  DollarSign,
  Trophy,
  UserCircle,
} from "lucide-react";

const tabs = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Obras", url: "/obras", icon: Building2 },
  { title: "Cotações", url: "/cotacoes", icon: FileText },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Ranking", url: "/ranking", icon: Trophy },
  { title: "Perfil", url: "/perfil", icon: UserCircle },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-card md:hidden">
      {tabs.map((tab) => (
        <NavLink
          key={tab.title}
          to={tab.url}
          end={tab.url === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
              isActive ? "text-primary font-medium" : "text-muted-foreground"
            }`
          }
        >
          <tab.icon className="h-5 w-5" />
          <span>{tab.title}</span>
        </NavLink>
      ))}
    </nav>
  );
}
