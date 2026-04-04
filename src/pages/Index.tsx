import { useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceCommand, VoiceCommand } from "@/hooks/useVoiceCommand";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  Sun,
  Clock,
  Mic,
  MicOff,
  Loader2,
} from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Hoje = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Generate system alerts on load
  useEffect(() => {
    if (user?.id) {
      supabase.rpc("gerar_alertas_sistema", { p_user_id: user.id });
    }
  }, [user?.id]);

  // Get user's first obra for mensagem_dia
  const { data: obras } = useQuery({
    queryKey: ["obras-lista"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("id, nome").limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Mensagem do dia (from first obra)
  const { data: mensagemDia } = useQuery({
    queryKey: ["mensagem-dia", obras?.[0]?.id],
    enabled: !!obras?.[0]?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("mensagem_dia", { p_obra: obras![0].id });
      if (error) throw error;
      return data as string;
    },
  });

  // System alerts (unresolved)
  const { data: alertas } = useQuery({
    queryKey: ["alertas-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_sistema" as any)
        .select("*")
        .eq("resolvido", false)
        .order("created_at", { ascending: false }) as any;
      if (error) throw error;
      return data as { id: string; entidade: string; tipo: string; mensagem: string; created_at: string }[];
    },
  });

  // Pending fase_itens (not completed)
  const { data: tarefas } = useQuery({
    queryKey: ["tarefas-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_itens")
        .select("id, nome, status, fase_id")
        .neq("status", "concluido")
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Delayed phases
  const { data: atrasadas } = useQuery({
    queryKey: ["fases-atrasadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_fases_previsao" as any)
        .select("*")
        .eq("atrasado", true) as any;
      if (error) throw error;
      return data as { id: string; nome: string; progresso: number; status: string }[];
    },
  });

  // Purchase suggestions
  const { data: compras } = useQuery({
    queryKey: ["sugestao-compra-hoje"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_sugestao_compra" as any)
        .select("*")
        .neq("acao", "ok") as any;
      if (error) throw error;
      return data as { id: string; fase: string; item: string; acao: string }[];
    },
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await (supabase.from("alertas_sistema" as any) as any)
        .update({ resolvido: true })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas-sistema"] });
      toast.success("Alerta resolvido!");
    },
  });

  // Toggle task done
  const toggleTask = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("fase_itens")
        .update({ status: "concluido" })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-pendentes"] });
      toast.success("Tarefa concluída!");
    },
  });

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const alertColors: Record<string, { bg: string; border: string; text: string }> = {
    atraso: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
    orcamento: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    parada: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  };

  const acaoLabels: Record<string, { label: string; color: string }> = {
    comprar: { label: "Comprar", color: "bg-sky-100 text-sky-800 border-sky-200" },
    revisar: { label: "Revisar", color: "bg-amber-100 text-amber-800 border-amber-200" },
    renegociar: { label: "Renegociar", color: "bg-rose-100 text-rose-800 border-rose-200" },
  };

  const hasContent = (alertas?.length ?? 0) > 0 || (tarefas?.length ?? 0) > 0 || (atrasadas?.length ?? 0) > 0 || (compras?.length ?? 0) > 0;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Hero greeting */}
      <div className="text-center space-y-2 pt-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 border-2 border-amber-200">
            <Sun className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        <h1 className="text-3xl font-black">{greeting}!</h1>
        <p className="text-lg text-muted-foreground">Vamos cuidar da sua obra hoje</p>
      </div>

      {/* Mensagem do Dia */}
      {mensagemDia && (
        <Card className="bg-sky-50/80 border-sky-200 border-2">
          <CardContent className="py-6 px-8 text-center">
            <p className="text-xl font-bold text-sky-800">{mensagemDia}</p>
          </CardContent>
        </Card>
      )}

      {!hasContent && (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
            <p className="text-lg font-semibold">Tudo em dia! 🎉</p>
            <p className="text-sm mt-1">Nenhuma pendência encontrada.</p>
          </CardContent>
        </Card>
      )}

      {/* ===== ALERTAS DO DIA ===== */}
      {(alertas?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-rose-500" />
            🔔 Alertas do Dia
            <Badge variant="destructive" className="ml-1">{alertas!.length}</Badge>
          </h2>
          {alertas!.map((a) => {
            const cfg = alertColors[a.tipo] ?? { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" };
            return (
              <Card key={a.id} className={`${cfg.bg} ${cfg.border} border-2`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 ${cfg.border} ${cfg.bg}`}>
                    <AlertTriangle className={`h-6 w-6 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-semibold ${cfg.text}`}>{a.mensagem}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`shrink-0 ${cfg.text} ${cfg.border}`}
                    onClick={() => resolveAlert.mutate(a.id)}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Resolver
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== TAREFAS PARA FAZER ===== */}
      {(tarefas?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">📋 Tarefas para fazer</h2>
          {tarefas!.map((t) => (
            <Card key={t.id} className="border-2">
              <CardContent className="p-5 flex items-center gap-4">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => toggleTask.mutate(t.id)}
                  className="h-7 w-7 rounded-lg border-2"
                />
                <p className="text-base font-semibold flex-1">{t.nome}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== FASES COM ATRASO ===== */}
      {(atrasadas?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-rose-500" />
            ⏳ Fases com atraso
          </h2>
          {atrasadas!.map((f) => (
            <Card key={f.id} className="bg-rose-50 border-rose-200 border-2">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 border border-rose-200">
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    </div>
                    <p className="text-base font-bold text-rose-800">{f.nome}</p>
                  </div>
                  <span className="text-2xl font-black tabular-nums text-rose-700">{f.progresso ?? 0}%</span>
                </div>
                <Progress
                  value={f.progresso ?? 0}
                  className="h-4 rounded-full bg-rose-200/60 [&>div]:bg-rose-500 [&>div]:rounded-full"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== PRECISA COMPRAR ===== */}
      {(compras?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-sky-500" />
            🛒 Precisa comprar
          </h2>
          {compras!.map((c) => {
            const acaoCfg = acaoLabels[c.acao] ?? { label: c.acao, color: "bg-slate-100 text-slate-700 border-slate-200" };
            return (
              <Card key={c.id} className="border-2">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 border-2 border-sky-200">
                    <ShoppingCart className="h-6 w-6 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold">{c.item}</p>
                    <p className="text-sm text-muted-foreground">{c.fase}</p>
                  </div>
                  <Badge className={`${acaoCfg.color} text-xs font-bold border`}>{acaoCfg.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Hoje;
