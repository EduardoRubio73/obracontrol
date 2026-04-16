import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { LayoutDashboard, Bot } from "lucide-react";
import { ObraSelectorVisual } from "@/components/ObraSelectorVisual";

/* ── animation style helper ── */
const stagger = (step: number) => ({
  opacity: 0,
  animation: `menu-slide-up 0.45s ease-out ${step * 0.07}s forwards`,
});

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MenuPrincipal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { obraAtiva, obraAtivaId, setObraAtivaId, obras } = useObraAtiva();

  const hasObra = !!obraAtiva && obraAtivaId !== "all";

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

  const { data: etapasEmAndamento } = useQuery({
    queryKey: ["etapas-andamento-count", obraAtivaId],
    enabled: hasObra,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("id")
        .eq("obra_id", obraAtivaId!)
        .eq("status", "em_andamento");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const { data: comprasCount } = useQuery({
    queryKey: ["compras-count", obraAtivaId],
    enabled: hasObra,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select("id")
        .eq("obra_id", obraAtivaId!)
        .neq("status", "concluido");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const { data: financeiroTotal } = useQuery({
    queryKey: ["financeiro-total", obraAtivaId],
    enabled: hasObra,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("valor")
        .eq("obra_id", obraAtivaId!)
        .eq("tipo", "despesa");
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + (r.valor ?? 0), 0);
    },
  });

  const { data: cotacoesAbertas } = useQuery({
    queryKey: ["cotacoes-abertas", obraAtivaId],
    enabled: hasObra,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("id")
        .eq("obra_id", obraAtivaId!)
        .neq("status", "finalizada");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const { data: documentosCount } = useQuery({
    queryKey: ["documentos-count", obraAtivaId],
    enabled: hasObra,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("id")
        .eq("obra_id", obraAtivaId!);
      if (error) throw error;
      return data?.length ?? 0;
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

  /* ── derived ── */
  const hasAlerts = (alertas?.length ?? 0) > 0;

  const obraCards = [
    { emoji: "📋", title: "Etapas", summary: `${etapasEmAndamento ?? 0} em andamento`, route: "/etapas", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" },
    { emoji: "🛒", title: "Compras", summary: `${comprasCount ?? 0} pendentes`, route: "/compras", bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800" },
    { emoji: "💰", title: "Financeiro", summary: fmt(financeiroTotal ?? 0) + " gasto", route: "/financeiro", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" },
    { emoji: "📝", title: "Cotações", summary: `${cotacoesAbertas ?? 0} abertas`, route: "/cotacoes", bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800" },
    { emoji: "🖼️", title: "Galeria", summary: "Fotos da obra", route: "/galeria", bg: "bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800" },
    { emoji: "📁", title: "Documentos", summary: `${documentosCount ?? 0} arquivos`, route: "/documentos", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" },
  ];

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

      {/* Obra selector visual */}
      {obras.length > 0 && (
        <div className="mt-4" style={stagger(1)}>
          <ObraSelectorVisual
            obras={obras}
            selectedId={obraAtivaId}
            onSelect={(id) => setObraAtivaId(id)}
          />
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

      {/* Cards de atalho — obra selecionada */}
      {hasObra ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
          {obraCards.map((card, i) => (
            <Card
              key={card.route}
              style={stagger(i + 3)}
              className={`rounded-2xl cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] border ${card.bg}`}
              onClick={() => navigate(card.route)}
            >
              <CardContent className="p-5 flex flex-col items-start gap-2">
                <span className="text-3xl">{card.emoji}</span>
                <span className="font-bold text-base text-foreground">{card.title}</span>
                <span className="text-xs text-muted-foreground leading-tight">{card.summary}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Todas as obras — boas-vindas + atalhos gerais */
        <div className="mt-8 space-y-4" style={stagger(3)}>
          <Card className="rounded-2xl border bg-card">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-2xl">👋</p>
              <p className="font-semibold text-foreground">Bem-vindo ao ObraControl</p>
              <p className="text-sm text-muted-foreground">
                Selecione uma obra acima para gerenciar etapas, compras, financeiro e muito mais.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
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
        </div>
      )}

      {/* Abrir painel completo */}
      <div className="mt-6" style={stagger(9)}>
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
