import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, Bot } from "lucide-react";
import { ObraSwitcherCarousel } from "@/components/ObraSwitcherCarousel";
import { FloatingZoomTextToolbar } from "@/components/FloatingZoomTextToolbar";

/* ── animation style helper ── */
const stagger = (step: number) => ({
  opacity: 0,
  animation: `menu-slide-up 0.45s ease-out ${step * 0.07}s forwards`,
});

const MenuPrincipal = () => {
  const navigate = useNavigate();
  const { obras } = useObraAtiva();

  /* ── queries ── */
  const { data: alertas } = useQuery({
    queryKey: ["alertas-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_sistema")
        .select("*")
        .eq("resolvido", false)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: fornecedoresCount } = useQuery({
    queryKey: ["fornecedores-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const hasAlerts = (alertas?.length ?? 0) > 0;

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-32 px-3">
      {/* CSS keyframes */}
      <style>{`
        @keyframes menu-slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="pt-6 pb-1" style={stagger(0)}>
        <p className="text-lg font-semibold text-foreground">
          Gestão da sua obra
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe e controle tudo em um só lugar
        </p>
      </div>

      {/* Obra switcher */}
      {obras.length > 0 && (
        <div className="mt-5" style={stagger(1)}>
          <ObraSwitcherCarousel obras={obras} />
        </div>
      )}

      {/* Alerta */}
      {hasAlerts && (
        <div className="mt-5" style={stagger(2)}>
          <div className="rounded-3xl bg-destructive/10 border border-destructive/30 p-6">
            <p className="text-base text-foreground font-semibold">
              {alertas![0]?.mensagem}
            </p>
            <Button
              className="mt-4 h-12 rounded-2xl font-bold text-base px-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => navigate("/hoje")}
            >
              Resolver agora
            </Button>
          </div>
        </div>
      )}

      {obras.length === 0 && (
        <div className="mt-8" style={stagger(2)}>
          <Card className="rounded-2xl border bg-card">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-2xl">👋</p>
              <p className="font-semibold text-foreground">Bem-vindo ao ObraControl</p>
              <p className="text-sm text-muted-foreground">
                Cadastre sua primeira obra para começar a gerenciar etapas, compras, financeiro e muito mais.
              </p>
              <Button className="mt-2" onClick={() => navigate("/nova-obra")}>
                Cadastrar obra
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Atalhos gerais */}
      <div className="grid grid-cols-2 gap-3 mt-6" style={stagger(3)}>
        <Card className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/obras")}>
          <CardContent className="p-4 flex flex-col items-start gap-1">
            <span className="text-2xl">🏗️</span>
            <span className="font-semibold text-sm">Obras</span>
            <span className="text-xs text-muted-foreground">{obras.length} cadastradas</span>
          </CardContent>
        </Card>
        <Card className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/fornecedores")}>
          <CardContent className="p-4 flex flex-col items-start gap-1">
            <span className="text-2xl">👥</span>
            <span className="font-semibold text-sm">Contatos</span>
            <span className="text-xs text-muted-foreground">{fornecedoresCount ?? 0} fornecedores</span>
          </CardContent>
        </Card>
      </div>

      {/* Abrir painel completo */}
      <div className="mt-6" style={stagger(4)}>
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full h-12 rounded-2xl border-2 border-border bg-card text-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] hover:bg-muted"
        >
          <LayoutDashboard className="h-5 w-5" />
          Abrir painel completo
        </button>
      </div>

      {/* Floating controls cluster */}
      <div className="fixed bottom-24 right-5 z-50 md:bottom-8 md:right-8 flex flex-col items-end gap-3">
        <FloatingZoomTextToolbar />
        <Button
          onClick={() => navigate("/chat")}
          className="h-16 w-16 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-transform duration-100 active:scale-[0.93]"
        >
          <Bot className="h-7 w-7 text-primary-foreground" />
        </Button>
      </div>
    </div>
  );
};

export default MenuPrincipal;
