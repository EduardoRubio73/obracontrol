import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Building2 } from "lucide-react";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { ObraPhotoCarousel } from "@/components/ObraPhotoCarousel";
import { ObraContextTabs } from "@/components/ObraContextTabs";
import logoImg from "@/assets/logo-obracontrol.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OBRA_PAGES = ["/etapas", "/compras", "/financeiro", "/cotacoes", "/dashboard", "/galeria", "/documentos"];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { obraAtiva, obraAtivaId, setObraAtivaId, obras } = useObraAtiva();

  const basePath = "/" + location.pathname.split("/").filter(Boolean)[0];
  const showObraSelector = OBRA_PAGES.includes(basePath) || OBRA_PAGES.includes(location.pathname);
  const showObraTabs = showObraSelector && obraAtiva;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 flex flex-col border-b bg-card">
            <div className="flex h-14 items-center px-4 md:px-6 gap-2">
              {/* Burger menu — mobile only */}
              <SidebarTrigger className="md:hidden shrink-0" />

              {/* Logo — navigates to dashboard */}
              <div
                className="flex items-center gap-2 cursor-pointer shrink-0"
                onClick={() => navigate("/")}
              >
                <img src={logoImg} alt="ObraControl" className="h-8 w-8 rounded-lg object-contain" />
                <span className="hidden sm:inline text-lg font-bold text-foreground">
                  ObraControl
                </span>
              </div>

              {/* Obra selector */}
              {showObraSelector && obras.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  <Select value={obraAtivaId ?? ""} onValueChange={(v) => setObraAtivaId(v)}>
                    <SelectTrigger className="w-full max-w-[180px] h-9 rounded-xl text-sm">
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

            {/* Obra context tabs */}
            {showObraTabs && <ObraContextTabs />}
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
