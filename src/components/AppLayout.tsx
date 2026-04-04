import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NO_BACK_ROUTES = ["/", "/dashboard"];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const showBack = !NO_BACK_ROUTES.includes(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-card px-4 md:px-6 gap-2">
            <SidebarTrigger className="hidden md:flex" />
            {showBack && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
            )}
            <h1 className="ml-2 text-lg font-semibold md:hidden">ObraControl</h1>
          </header>
          <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
