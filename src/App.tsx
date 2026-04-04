import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Obras from "./pages/Obras";
import Cotacoes from "./pages/Cotacoes";
import Financeiro from "./pages/Financeiro";
import Fornecedores from "./pages/Fornecedores";
import Perfil from "./pages/Perfil";
import Comparacao from "./pages/Comparacao";
import Analise from "./pages/Analise";
import Ranking from "./pages/Ranking";
import PortalFornecedor from "./pages/PortalFornecedor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Carregando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Carregando...</p></div>;
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
            <Route path="/login" element={<PublicRoute><Auth /></PublicRoute>} />
            {/* Public supplier portal - no auth required */}
            <Route path="/cotacao/:token" element={<PortalFornecedor />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/obras" element={<Obras />} />
              <Route path="/cotacoes" element={<Cotacoes />} />
              <Route path="/cotacoes/:id/comparar" element={<Comparacao />} />
              <Route path="/cotacoes/:id/analise" element={<Analise />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/fornecedores" element={<Fornecedores />} />
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
