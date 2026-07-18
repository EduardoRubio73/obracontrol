import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import logoImg from "@/assets/logo-obracontrol.png";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

const gestaoObraSections = [
  { title: "Início", segment: "hoje", emoji: "👋" },
  { title: "Dashboard", segment: "dashboard", emoji: "📊" },
  { title: "Etapas", segment: "etapas", emoji: "📋" },
  { title: "Fornecedores", segment: "fornecedores", emoji: "👥" },
  { title: "Compras", segment: "compras", emoji: "🛒" },
  { title: "Financeiro", segment: "financeiro", emoji: "💰" },
  { title: "Cotações", segment: "cotacoes", emoji: "📝" },
  { title: "Galeria", segment: "galeria", emoji: "🖼️" },
  { title: "Documentos", segment: "documentos", emoji: "📁" },
  { title: "Status", segment: "status", emoji: "🚦" },
  { title: "Relatórios", segment: "relatorios", emoji: "📈" },
  { title: "Assistente IA", segment: "chat", emoji: "🤖" },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: obraIdFromUrl } = useParams<{ id: string }>();
  const { obras } = useObraAtiva();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const hasObraSelected = !!obraIdFromUrl;
  const obraAtual = obras.find((o) => o.id === obraIdFromUrl) ?? null;

  const gestaoObraItems = gestaoObraSections.map((s) => ({
    title: s.title,
    emoji: s.emoji,
    url: `/obras/${obraIdFromUrl}/${s.segment}`,
  }));

  const handleNav = () => { if (isMobile) setOpenMobile(false); };

  // Check if any item in a group is active
  const isGroupActive = (items: { url: string }[]) =>
    items.some((item) => location.pathname === item.url || location.pathname.startsWith(item.url + "/"));

  const renderItems = (items: { title: string; url: string; emoji: string }[], highlight = false) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className={`flex items-center gap-3 hover:bg-accent ${highlight && hasObraSelected ? "border-l-2 border-primary/60" : ""}`}
            activeClassName="bg-primary/10 text-primary font-medium"
            onClick={handleNav}
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

        {/* Gestão de Obra - botão único, abre a tela hub */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    className="flex items-center gap-3 hover:bg-accent"
                    activeClassName="bg-primary/10 text-primary font-medium"
                    onClick={handleNav}
                  >
                    <span className="w-6 text-center text-base shrink-0">🏗️</span>
                    {!collapsed && <span>Gestão de Obra</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {obras.length === 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/assistente"
                      className="flex items-center gap-3 hover:bg-accent"
                      activeClassName="bg-primary/10 text-primary font-medium"
                      onClick={handleNav}
                    >
                      <span className="w-6 text-center text-base shrink-0">🤖</span>
                      {!collapsed && <span>Assistente</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gestão da Obra - collapsible, default closed */}
        {hasObraSelected && (
          <Collapsible defaultOpen={isGroupActive(gestaoObraItems)}>
            <SidebarGroup>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md transition-colors">
                  {!collapsed && (
                    <span className="flex items-center gap-1">
                      🏗️ Gestão da Obra
                      <span className="ml-1 text-[10px] font-normal text-primary bg-primary/10 rounded-full px-2 py-0.5 truncate max-w-[120px]">
                        {obraAtual?.nome ?? ""}
                      </span>
                    </span>
                  )}
                  {!collapsed && <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>{renderItems(gestaoObraItems, true)}</SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/perfil"
                className="flex items-center gap-3 hover:bg-accent"
                activeClassName="bg-primary/10 text-primary font-medium"
                onClick={handleNav}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.nome} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {profile?.nome?.charAt(0)?.toUpperCase() || <UserCircle className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && <span className="truncate text-sm">{profile?.nome || user?.email}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/configuracoes"
                className="flex items-center gap-3 hover:bg-accent"
                activeClassName="bg-primary/10 text-primary font-medium"
                onClick={handleNav}
              >
                <span className="w-6 text-center text-base shrink-0">⚙️</span>
                {!collapsed && <span>Configurações</span>}
              </NavLink>
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
