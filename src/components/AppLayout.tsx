import { Outlet, useNavigate, useParams } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ObraPhotoCarousel } from "@/components/ObraPhotoCarousel";
import logoImg from "@/assets/logo-obracontrol.png";

export function AppLayout() {
  const navigate = useNavigate();
  const { id: obraId } = useParams<{ id: string }>();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 flex flex-col border-b bg-card">
            <div className="flex h-14 items-center px-4 md:px-6 gap-2">
              {/* Burger menu — mobile only */}
              <SidebarTrigger className="shrink-0" />

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
            </div>
          </header>

          {obraId && <ObraPhotoCarousel obraId={obraId} />}
          <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
