import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileSearch, ArrowLeft, History } from "lucide-react";
import { toast } from "sonner";

import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { DashboardObrasRecentes } from "@/components/dashboard/DashboardObrasRecentes";
import { DashboardFinanceiroCard } from "@/components/dashboard/DashboardFinanceiroCard";
import { DashboardCotacoesCard } from "@/components/dashboard/DashboardCotacoesCard";
import { DashboardTimeline } from "@/components/dashboard/DashboardTimeline";
import { DashboardChartPrevistoGasto } from "@/components/dashboard/DashboardChartPrevistoGasto";
import { DashboardEvolucaoMensal } from "@/components/dashboard/DashboardEvolucaoMensal";
import { DashboardDocumentos } from "@/components/dashboard/DashboardDocumentos";
import { DashboardAlteracoes } from "@/components/dashboard/DashboardAlteracoes";
import { DashboardFornecedores } from "@/components/dashboard/DashboardFornecedores";
import { DashboardCotacoesDetalhadas } from "@/components/dashboard/DashboardCotacoesDetalhadas";
import { DashboardAdminSection } from "@/components/dashboard/DashboardAdminSection";

const statusColor: Record<string, string> = {
  planejamento: "bg-muted text-muted-foreground",
  "execução": "bg-primary/15 text-primary",
  "concluído": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pausado: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelado: "bg-destructive/15 text-destructive",
};

const allStatuses = ["planejamento", "execução", "concluído", "pausado", "cancelado"] as const;

const statusLabels: Record<string, string> = {
  planejamento: "Planejamento",
  "execução": "Execução",
  "concluído": "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { obraAtiva, filtroObraId, isAll } = useObraAtiva();
  const [statusModal, setStatusModal] = useState<{ open: boolean; status: string }>({ open: false, status: "" });
  const [justificativa, setJustificativa] = useState("");

  const filtroId = filtroObraId;

  /* ── Queries ── */
  const { data: obras } = useQuery({
    queryKey: ["dashboard-obras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome, status, valor_previsto, created_at, justificativa_status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: financeiro } = useQuery({
    queryKey: ["dashboard-financeiro", filtroId],
    queryFn: async () => {
      let q = supabase.from("financeiro").select("valor, tipo, obra_id, data_transacao");
      if (filtroId) q = q.eq("obra_id", filtroId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: alertas } = useQuery({
    queryKey: ["dashboard-alertas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_sistema")
        .select("id")
        .eq("resolvido", false);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: fases } = useQuery({
    queryKey: ["dashboard-fases", filtroId],
    queryFn: async () => {
      let q = supabase.from("obra_fases").select("id, nome, progresso, status, obra_id, data_inicio, data_fim");
      if (filtroId) q = q.eq("obra_id", filtroId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cotacoes } = useQuery({
    queryKey: ["dashboard-cotacoes", filtroId],
    queryFn: async () => {
      let q = supabase.from("cotacoes").select("id, status, descricao, obra_id");
      if (filtroId) q = q.eq("obra_id", filtroId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: documentos } = useQuery({
    queryKey: ["dashboard-documentos", filtroId],
    enabled: !!filtroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("id, nome, tipo, created_at, url")
        .eq("obra_id", filtroId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: alteracoes } = useQuery({
    queryKey: ["dashboard-alteracoes", filtroId],
    enabled: !!filtroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_alteracoes")
        .select("id, tipo, descricao, valor_impacto, created_at")
        .eq("obra_id", filtroId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: fornecedores } = useQuery({
    queryKey: ["dashboard-fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome, score, status, categoria")
        .order("score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: propostas } = useQuery({
    queryKey: ["dashboard-propostas", filtroId],
    enabled: !!filtroId,
    queryFn: async () => {
      const cotacaoIds = (cotacoes ?? []).map((c) => c.id);
      if (cotacaoIds.length === 0) return [];
      const { data, error } = await supabase
        .from("propostas")
        .select("id, cotacao_id, status")
        .in("cotacao_id", cotacaoIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: auditoria } = useQuery({
    queryKey: ["dashboard-auditoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditoria")
        .select("id, tabela, acao, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: vozLogs } = useQuery({
    queryKey: ["dashboard-voz-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voz_comandos_log")
        .select("id, comando, interpretacao, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Status history ── */
  const { data: statusHistorico } = useQuery({
    queryKey: ["dashboard-status-historico", filtroId],
    enabled: !!filtroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_status_historico")
        .select("id, status_anterior, status_novo, justificativa, created_at")
        .eq("obra_id", filtroId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Status mutation ── */
  const changeStatus = useMutation({
    mutationFn: async ({ obraId, status, justificativa }: { obraId: string; status: string; justificativa?: string }) => {
      const statusAnterior = obraAtual?.status ?? null;

      const { error } = await supabase.from("obras").update({
        status: status as any,
        justificativa_status: justificativa || null,
      } as any).eq("id", obraId);
      if (error) throw error;

      // Insert history record
      const { error: histError } = await supabase.from("obra_status_historico").insert({
        obra_id: obraId,
        status_anterior: statusAnterior,
        status_novo: status,
        justificativa: justificativa || null,
      } as any);
      if (histError) console.error("Erro ao salvar histórico:", histError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-obras"] });
      queryClient.invalidateQueries({ queryKey: ["obras-lista"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-status-historico", filtroId] });
      toast.success("Status atualizado!");
    },
  });

  /* ── Derived ── */
  const obrasTotal = filtroId ? 1 : (obras?.length ?? 0);
  const fasesEmAndamento = fases?.filter((f) => f.status === "em_andamento").length ?? 0;
  const totalGasto =
    financeiro?.filter((f) => f.tipo === "despesa").reduce((a, f) => a + (f.valor ?? 0), 0) ?? 0;

  const obrasFiltradas = filtroId ? obras?.filter((o) => o.id === filtroId) : obras;
  const totalPrevisto = (obrasFiltradas ?? []).reduce((a, o) => a + (o.valor_previsto ?? 0), 0);

  const cotacoesAbertas = cotacoes?.filter((c) => c.status !== "finalizada" && c.status !== "cancelada").length ?? 0;
  const cotacoesAguardando = cotacoes?.filter((c) => c.status === "enviada" || c.status === "recebendo_propostas").length ?? 0;

  const chartData = (obrasFiltradas ?? []).slice(0, 6).map((o) => {
    const gasto = financeiro?.filter((f) => f.obra_id === o.id && f.tipo === "despesa").reduce((a, f) => a + (f.valor ?? 0), 0) ?? 0;
    return { nome: o.nome?.substring(0, 12) ?? "", previsto: o.valor_previsto ?? 0, gasto };
  });

  const cotacoesDetalhadas = (cotacoes ?? []).map((c) => ({
    ...c,
    propostas_count: (propostas ?? []).filter((p) => p.cotacao_id === c.id).length,
  }));

  const dashTitle = obraAtiva ? `Dashboard — ${obraAtiva.nome}` : "Dashboard — Todas as Obras";
  const obraAtualStatus = obraAtiva?.status ?? null;
  const obraAtual = obras?.find((o) => o.id === filtroId);
  const justificativaAtual = (obraAtual as any)?.justificativa_status ?? null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Início
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate max-w-xs sm:max-w-md">{dashTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          {filtroId && (
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => navigate(`/obras/${filtroId}/dossie`)}>
              <FileSearch className="h-4 w-4" /> Gerar Dossiê
            </Button>
          )}
        </div>
      </div>

      {filtroId && obraAtualStatus && (
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-wrap gap-2">
            {allStatuses.map((s) => {
              const isActive = obraAtualStatus === s;
              const pill = (
                <button
                  key={s}
                  onClick={() => {
                    if (!isActive) {
                      setJustificativa("");
                      setStatusModal({ open: true, status: s });
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                    isActive
                      ? `${statusColor[s]} border-current ring-2 ring-current/20`
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  }`}
                >
                  {statusLabels[s]}
                </button>
              );

              if (isActive && justificativaAtual) {
                return (
                  <Tooltip key={s}>
                    <TooltipTrigger asChild>{pill}</TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs font-medium">Justificativa:</p>
                      <p className="text-xs">{justificativaAtual}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return pill;
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Modal justificativa de status */}
      <Dialog open={statusModal.open} onOpenChange={(v) => !v && setStatusModal({ open: false, status: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar para {statusLabels[statusModal.status] ?? statusModal.status}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Justificativa / Observação (opcional)</label>
              <Textarea
                placeholder="Explique o motivo da alteração..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStatusModal({ open: false, status: "" })}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (filtroId) {
                    changeStatus.mutate({
                      obraId: filtroId,
                      status: statusModal.status,
                      justificativa: justificativa.trim(),
                    });
                  }
                  setStatusModal({ open: false, status: "" });
                }}
                disabled={changeStatus.isPending}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <DashboardSummaryCards
        obrasTotal={obrasTotal}
        obrasAtivas={fasesEmAndamento}
        totalGasto={totalGasto}
        alertasCount={alertas?.length ?? 0}
      />

      {/* Obras Recentes + Financeiro + Cotações */}
      <div className="grid md:grid-cols-3 gap-4">
        <DashboardObrasRecentes obras={obrasFiltradas ?? []} fases={fases ?? []} />
        <div className="space-y-4">
          <DashboardFinanceiroCard totalGasto={totalGasto} totalPrevisto={totalPrevisto} />
          <DashboardCotacoesCard abertas={cotacoesAbertas} aguardando={cotacoesAguardando} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        <DashboardTimeline fases={fases ?? []} />
        <DashboardChartPrevistoGasto chartData={chartData} />
      </div>

      {/* Evolução Mensal */}
      <DashboardEvolucaoMensal financeiro={financeiro ?? []} />

      {/* Documentos + Alterações (when obra selected) */}
      {filtroId && (
        <div className="grid md:grid-cols-2 gap-4">
          <DashboardDocumentos documentos={documentos ?? []} />
          <DashboardAlteracoes alteracoes={alteracoes ?? []} />
        </div>
      )}

      {/* Histórico de Status */}
      {filtroId && (statusHistorico ?? []).length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico de Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(statusHistorico ?? []).map((h) => (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.status_anterior && (
                        <>
                          <Badge className={`text-xs border-0 ${statusColor[h.status_anterior] ?? "bg-muted"}`}>
                            {statusLabels[h.status_anterior] ?? h.status_anterior}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                        </>
                      )}
                      <Badge className={`text-xs border-0 ${statusColor[h.status_novo] ?? "bg-muted"}`}>
                        {statusLabels[h.status_novo] ?? h.status_novo}
                      </Badge>
                    </div>
                    {h.justificativa && (
                      <p className="text-sm text-muted-foreground mt-1">{h.justificativa}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(h.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <DashboardFornecedores fornecedores={fornecedores ?? []} />
        <DashboardCotacoesDetalhadas cotacoes={cotacoesDetalhadas} />
      </div>

      {/* DESKTOP: Tabela completa de obras */}
      {!filtroId && (obras ?? []).length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Todas as Obras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Previsto</th>
                    <th className="pb-2 font-medium">Gasto</th>
                    <th className="pb-2 font-medium">Progresso</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {(obras ?? []).map((o) => {
                    const obraFases = fases?.filter((f) => f.obra_id === o.id) ?? [];
                    const prog = obraFases.length > 0
                      ? Math.round(obraFases.reduce((a, f) => a + (f.progresso ?? 0), 0) / obraFases.length)
                      : 0;
                    const gasto = financeiro?.filter((f) => f.obra_id === o.id && f.tipo === "despesa").reduce((a, f) => a + (f.valor ?? 0), 0) ?? 0;
                    return (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-3 font-medium">{o.nome}</td>
                        <td className="py-3">
                          <Badge className={`text-xs border-0 ${statusColor[o.status ?? "planejamento"] ?? "bg-muted"}`}>
                            {o.status ?? "planejamento"}
                          </Badge>
                        </td>
                        <td className="py-3">{fmt(o.valor_previsto ?? 0)}</td>
                        <td className="py-3">{fmt(gasto)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={prog} className="h-2 w-16" />
                            <span className="text-xs text-muted-foreground">{prog}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${o.id}/dossie`)}>Ver</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Section */}
      <DashboardAdminSection auditoria={auditoria ?? []} vozLogs={vozLogs ?? []} />
    </div>
  );
};

export default Dashboard;
