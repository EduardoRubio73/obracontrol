import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, FileSearch, ArrowLeft } from "lucide-react";

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

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Dashboard = () => {
  const navigate = useNavigate();
  const [obraFiltro, setObraFiltro] = useState<string>("todas");

  const filtroId = obraFiltro !== "todas" ? obraFiltro : null;

  /* ── Queries ── */
  const { data: obras } = useQuery({
    queryKey: ["dashboard-obras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome, status, valor_previsto, created_at")
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

  /* ── Derived ── */
  const obrasTotal = obras?.length ?? 0;
  const obrasAtivas = obras?.filter((o) => o.status === "execução").length ?? 0;
  const totalGasto =
    financeiro?.filter((f) => f.tipo === "despesa").reduce((a, f) => a + (f.valor ?? 0), 0) ?? 0;

  const obrasFiltradas = filtroId ? obras?.filter((o) => o.id === filtroId) : obras;
  const totalPrevisto = (obrasFiltradas ?? []).reduce((a, o) => a + (o.valor_previsto ?? 0), 0);

  const cotacoesAbertas = cotacoes?.filter((c) => c.status !== "finalizada" && c.status !== "cancelada").length ?? 0;
  const cotacoesAguardando = cotacoes?.filter((c) => c.status === "enviada" || c.status === "recebendo_propostas").length ?? 0;

  // Chart data
  const chartData = (obrasFiltradas ?? []).slice(0, 6).map((o) => {
    const gasto = financeiro?.filter((f) => f.obra_id === o.id && f.tipo === "despesa").reduce((a, f) => a + (f.valor ?? 0), 0) ?? 0;
    return { nome: o.nome?.substring(0, 12) ?? "", previsto: o.valor_previsto ?? 0, gasto };
  });

  // Cotações with proposal count
  const cotacoesDetalhadas = (cotacoes ?? []).map((c) => ({
    ...c,
    propostas_count: (propostas ?? []).filter((p) => p.cotacao_id === c.id).length,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Início
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={obraFiltro} onValueChange={setObraFiltro}>
            <SelectTrigger className="w-[200px] rounded-xl">
              <SelectValue placeholder="Selecionar obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as obras</SelectItem>
              {(obras ?? []).map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtroId && (
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => navigate(`/obras/${filtroId}/dossie`)}>
              <FileSearch className="h-4 w-4" /> Gerar Dossiê
            </Button>
          )}
          <Button onClick={() => navigate("/nova-obra")} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Nova Obra
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <DashboardSummaryCards
        obrasTotal={obrasTotal}
        obrasAtivas={obrasAtivas}
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

      {/* Fornecedores + Cotações Detalhadas */}
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
