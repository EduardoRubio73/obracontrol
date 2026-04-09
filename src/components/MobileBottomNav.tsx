import { NavLink } from "react-router-dom";
import {
  Home,
  Layers,
  ShoppingCart,
  DollarSign,
  Users,
} from "lucide-react";

const tabs = [
  { title: "🏠 Início", url: "/", icon: Home },
  { title: "📋 Etapas", url: "/etapas", icon: Layers },
  { title: "🛒 Compras", url: "/compras", icon: ShoppingCart },
  { title: "💰 Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "👥 Contatos", url: "/fornecedores", icon: Users },
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
              isActive ? "text-primary font-semibold" : "text-muted-foreground"
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
