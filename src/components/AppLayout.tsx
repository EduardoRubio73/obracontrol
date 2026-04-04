import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-card px-4 md:px-6">
            <SidebarTrigger className="hidden md:flex" />
            <h1 className="ml-2 text-lg font-semibold md:hidden">ObraControl</h1>
          </header>
          <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
