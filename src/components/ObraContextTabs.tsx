import { NavLink } from "@/components/NavLink";

const obraTabs = [
  { label: "Etapas", url: "/etapas", emoji: "📅" },
  { label: "Financeiro", url: "/financeiro", emoji: "💰" },
  { label: "Compras", url: "/compras", emoji: "🛒" },
  { label: "Cotações", url: "/cotacoes", emoji: "📋" },
  { label: "Galeria", url: "/galeria", emoji: "🖼️" },
  { label: "Documentos", url: "/documentos", emoji: "📁" },
];

export function ObraContextTabs() {
  return (
    <div className="w-full border-b bg-card">
      <nav className="flex flex-wrap gap-2 px-4 py-2">
        {obraTabs.map((tab) => (
          <NavLink
            key={tab.url}
            to={tab.url}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 min-h-[44px] text-sm text-muted-foreground transition-colors hover:bg-accent"
            activeClassName="bg-primary/10 text-primary font-medium"
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
