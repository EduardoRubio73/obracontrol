import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ObraAtivaProvider } from "@/hooks/useObraAtiva";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Hoje from "./pages/Hoje";
import Etapas from "./pages/Etapas";
import EtapaDetalhe from "./pages/EtapaDetalhe";
import Compras from "./pages/Compras";
import Financeiro from "./pages/Financeiro";
import Cotacoes from "./pages/Cotacoes";
import Fornecedores from "./pages/Fornecedores";
import Produtos from "./pages/Produtos";
import NovaObra from "./pages/NovaObra";
import Dossie from "./pages/Dossie";
import ObraAlteracoes from "./pages/ObraAlteracoes";
import Perfil from "./pages/Perfil";
import PortalFornecedor from "./pages/PortalFornecedor";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Obras from "./pages/Obras";
import Galeria from "./pages/Galeria";
import Materiais from "./pages/Materiais";
import Documentos from "./pages/Documentos";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Auditoria from "./pages/Auditoria";
import Chat from "./pages/Chat";
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              }
            />
            <Route path="/cotacao/:token" element={<PortalFornecedor />} />
            <Route
              element={
                <ProtectedRoute>
                  <ObraAtivaProvider>
                    <AppLayout />
                  </ObraAtivaProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/obras" element={<Obras />} />
              <Route path="/hoje" element={<Hoje />} />
              <Route path="/etapas" element={<Etapas />} />
              <Route path="/etapas/:id" element={<EtapaDetalhe />} />
              <Route path="/compras" element={<Compras />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/cotacoes" element={<Cotacoes />} />
              <Route path="/fornecedores" element={<Fornecedores />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/nova-obra" element={<NovaObra />} />
              <Route path="/galeria" element={<Galeria />} />
              <Route path="/obras/:id/dossie" element={<Dossie />} />
              <Route path="/obras/:id/galeria" element={<Galeria />} />
              <Route path="/obras/:id/materiais" element={<Materiais />} />
              <Route path="/obras/:id/documentos" element={<Documentos />} />
              <Route path="/obras/:id/alteracoes" element={<ObraAlteracoes />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/auditoria" element={<Auditoria />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/perfil" element={<Perfil />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
