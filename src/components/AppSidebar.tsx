import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo-obracontrol.png";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const principalItems = [
  { title: "Dashboard", url: "/dashboard", emoji: "📊" },
  { title: "Obras", url: "/obras", emoji: "🏗️" },
];

const gestaoObraItems = [
  { title: "Etapas", url: "/etapas", emoji: "📋" },
  { title: "Compras", url: "/compras", emoji: "🛒" },
  { title: "Financeiro", url: "/financeiro", emoji: "💰" },
  { title: "Cotações", url: "/cotacoes", emoji: "📝" },
  { title: "Galeria", url: "/galeria", emoji: "🖼️" },
  { title: "Documentos", url: "/documentos", emoji: "📁" },
];

const configItems = [
  { title: "Fornecedores", url: "/fornecedores", emoji: "👥" },
  { title: "Produtos", url: "/produtos", emoji: "📦" },
  { title: "Relatórios", url: "/relatorios", emoji: "📈" },
  { title: "Configurações", url: "/configuracoes", emoji: "⚙️" },
  { title: "Assistente IA", url: "/chat", emoji: "🤖" },
  { title: "Perfil", url: "/perfil", emoji: "👤" },
];

export function AppSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { obraAtiva, obraAtivaId } = useObraAtiva();

  const hasObraSelected = !!obraAtiva && obraAtivaId !== "all";

  const renderItems = (items: typeof principalItems, highlight = false) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className={`flex items-center gap-3 hover:bg-accent ${highlight && hasObraSelected ? "border-l-2 border-primary/60" : ""}`}
            activeClassName="bg-primary/10 text-primary font-medium"
          >
            <span className="w-6 text-center text-base shrink-0">{item.emoji}</span>
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 py-5 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <img
            src={logoImg}
            alt="ObraControl"
            className="h-9 w-9 shrink-0 rounded-lg object-contain"
          />
          {!collapsed && (
            <span className="text-lg font-bold text-foreground">
              ObraControl
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "📌 Principal"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(principalItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasObraSelected && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {!collapsed && (
                <span className="flex items-center gap-1">
                  🏗️ Gestão da Obra
                  <span className="ml-1 text-[10px] font-normal text-primary bg-primary/10 rounded-full px-2 py-0.5 truncate max-w-[120px]">
                    {obraAtiva.nome}
                  </span>
                </span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(gestaoObraItems, true)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "⚙️ Configurações"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(configItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              className="flex items-center gap-3 text-muted-foreground hover:bg-accent"
            >
              <span className="w-6 text-center text-base shrink-0">📐</span>
              {!collapsed && <span>Recolher menu</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="flex items-center gap-3 text-destructive hover:bg-destructive/10"
            >
              <span className="w-6 text-center text-base shrink-0">🚪</span>
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
