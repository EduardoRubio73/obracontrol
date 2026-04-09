import {
  Layers,
  ShoppingCart,
  DollarSign,
  FileText,
  Users,
  Package,
  UserCircle,
  LogOut,
  LayoutDashboard,
  Building2,
  BarChart3,
  Settings,
  PanelLeft,
  Bot,
  Image,
  FolderOpen,
} from "lucide-react";
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
  { title: "📊 Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "🏗️ Obras", url: "/obras", icon: Building2 },
];

const gestaoObraItems = [
  { title: "📋 Etapas", url: "/etapas", icon: Layers },
  { title: "🛒 Compras", url: "/compras", icon: ShoppingCart },
  { title: "💰 Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "📝 Cotações", url: "/cotacoes", icon: FileText },
  { title: "🖼️ Galeria", url: "/galeria", icon: Image },
  { title: "📁 Documentos", url: "/documentos", icon: FolderOpen },
];

const configItems = [
  { title: "👥 Fornecedores", url: "/fornecedores", icon: Users },
  { title: "📦 Produtos", url: "/produtos", icon: Package },
  { title: "📈 Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "⚙️ Configurações", url: "/configuracoes", icon: Settings },
  { title: "🤖 Assistente IA", url: "/chat", icon: Bot },
  { title: "👤 Perfil", url: "/perfil", icon: UserCircle },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
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
            className={`hover:bg-accent ${highlight && hasObraSelected ? "border-l-2 border-primary/60" : ""}`}
            activeClassName="bg-primary/10 text-primary font-medium"
          >
            <item.icon className="mr-2 h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 py-5 cursor-pointer" onClick={() => navigate("/")}>
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
              className="text-muted-foreground hover:bg-accent"
            >
              <PanelLeft className="mr-2 h-4 w-4" />
              {!collapsed && <span>Recolher menu</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>🚪 Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
