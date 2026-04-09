import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { ObraPhotoCarousel } from "@/components/ObraPhotoCarousel";
import logoImg from "@/assets/logo-obracontrol.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const NO_BACK_ROUTES = ["/", "/dashboard"];

const routeLabels: Record<string, string> = {
  "/etapas": "Etapas",
  "/compras": "Compras",
  "/financeiro": "Financeiro",
  "/cotacoes": "Cotações",
  "/fornecedores": "Fornecedores",
  "/produtos": "Produtos",
  "/hoje": "Início",
  "/dashboard": "Dashboard",
  "/obras": "Obras",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
  "/auditoria": "Auditoria",
  "/perfil": "Perfil",
  "/nova-obra": "Nova Obra",
};

// Pages that require obra context (show selector)
const OBRA_PAGES = ["/etapas", "/compras", "/financeiro", "/cotacoes", "/dashboard"];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const showBack = !NO_BACK_ROUTES.includes(location.pathname);
  const { obraAtiva, obraAtivaId, setObraAtivaId, obras } = useObraAtiva();

  const basePath = "/" + location.pathname.split("/").filter(Boolean)[0];
  const currentLabel = routeLabels[location.pathname] || routeLabels[basePath] || "";
  const showObraSelector = OBRA_PAGES.includes(basePath) || OBRA_PAGES.includes(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 flex flex-col border-b bg-card">
            <div className="flex h-14 items-center px-4 md:px-6 gap-2">
              

              {/* Logo mobile */}
              <div className="flex items-center gap-2 md:hidden cursor-pointer" onClick={() => navigate("/")}>
                <img src={logoImg} alt="ObraControl" className="h-8 w-8 rounded-lg object-contain" />
              </div>

              {showBack && (
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
              )}

              {/* Obra selector */}
              {showObraSelector && obras.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  <Select value={obraAtivaId ?? ""} onValueChange={(v) => setObraAtivaId(v)}>
                    <SelectTrigger className="w-[180px] h-9 rounded-xl text-sm">
                      <SelectValue placeholder="Selecionar obra" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as obras</SelectItem>
                      {obras.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Breadcrumb */}
            {obraAtiva && currentLabel && showObraSelector && (
              <div className="px-4 md:px-6 pb-2">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink className="cursor-pointer text-xs" onClick={() => navigate("/obras")}>
                        Obras
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink className="cursor-pointer text-xs" onClick={() => navigate(`/obras/${obraAtivaId}/dossie`)}>
                        {obraAtiva.nome}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-xs">{currentLabel}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            )}
          </header>
          {obraAtiva && showObraSelector && (
            <ObraPhotoCarousel obraId={obraAtiva.id} />
          )}
          <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
