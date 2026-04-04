import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  DollarSign,
  Clock,
  Plus,
  Eye,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusColor: Record<string, string> = {
  planejamento: "bg-muted text-muted-foreground",
  "execução": "bg-primary/15 text-primary",
  "concluído": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pausado: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelado: "bg-destructive/15 text-destructive",
};

const Dashboard = () => {
  const navigate = useNavigate();

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
    queryKey: ["dashboard-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("valor, tipo, obra_id");
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
    queryKey: ["dashboard-fases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("id, nome, progresso, status, obra_id, data_inicio, data_fim");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cotacoes } = useQuery({
    queryKey: ["dashboard-cotacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("id, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Derived ── */
  const obrasTotal = obras?.length ?? 0;
  const obrasAtivas = obras?.filter((o) => o.status === "execução").length ?? 0;

  const totalGasto =
    financeiro?.filter((f) => f.tipo === "despesa").reduce((a, f) => a + (f.valor ?? 0), 0) ?? 0;
  const totalPrevisto = obras?.reduce((a, o) => a + (o.valor_previsto ?? 0), 0) ?? 0;
  const saldo = totalPrevisto - totalGasto;

  const progressoGeral =
    fases && fases.length > 0
      ? Math.round(fases.reduce((a, f) => a + (f.progresso ?? 0), 0) / fases.length)
      : 0;

  const cotacoesAbertas = cotacoes?.filter((c) => c.status !== "finalizada" && c.status !== "cancelada").length ?? 0;
  const cotacoesAguardando = cotacoes?.filter((c) => c.status === "enviada" || c.status === "recebendo_propostas").length ?? 0;

  const obrasRecentes = (obras ?? []).slice(0, 5);

  // Chart data
  const chartData = (obras ?? []).slice(0, 6).map((o) => {
    const gasto =
      financeiro?.filter((f) => f.obra_id === o.id && f.tipo === "despesa").reduce((a, f) => a + (f.valor ?? 0), 0) ?? 0;
    return { nome: o.nome?.substring(0, 12) ?? "", previsto: o.valor_previsto ?? 0, gasto };
  });

  // Timeline: fases with dates
  const fasesTimeline = (fases ?? [])
    .filter((f) => f.data_inicio)
    .sort((a, b) => (a.data_inicio! > b.data_inicio! ? 1 : -1))
    .slice(0, 8);

  const faseStatusIcon: Record<string, typeof CheckCircle2> = {
    concluido: CheckCircle2,
    em_andamento: Clock,
    pendente: Layers,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <Button onClick={() => navigate("/nova-obra")} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Nova Obra
        </Button>
      </div>

      {/* ── Resumo Geral ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Obras", value: obrasTotal, icon: Building2, color: "text-primary" },
          { label: "Em Andamento", value: obrasAtivas, icon: TrendingUp, color: "text-amber-500" },
          { label: "Total Investido", value: fmt(totalGasto), icon: DollarSign, color: "text-emerald-500" },
          { label: "Alertas", value: alertas?.length ?? 0, icon: AlertTriangle, color: "text-destructive" },
        ].map((c) => (
          <Card key={c.label} className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Obras Recentes + Financeiro (side by side on desktop) ── */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Obras Recentes — 2 cols */}
        <Card className="md:col-span-2 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Obras Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {obrasRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma obra cadastrada.</p>
            ) : (
              obrasRecentes.map((o) => {
                const obraFases = fases?.filter((f) => f.obra_id === o.id) ?? [];
                const prog = obraFases.length > 0
                  ? Math.round(obraFases.reduce((a, f) => a + (f.progresso ?? 0), 0) / obraFases.length)
                  : 0;
                return (
                  <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{o.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs border-0 ${statusColor[o.status ?? "planejamento"] ?? "bg-muted"}`}>
                          {o.status ?? "planejamento"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{prog}%</span>
                      </div>
                    </div>
                    <div className="w-20 hidden sm:block">
                      <Progress value={prog} className="h-2" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => navigate(`/obras/${o.id}/dossie`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Financeiro + Cotações stack */}
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Gasto</span>
                <span className="font-semibold">{fmt(totalGasto)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Orçamento</span>
                <span className="font-semibold">{fmt(totalPrevisto)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t">
                <span className="text-muted-foreground">Saldo</span>
                <span className={`font-bold ${saldo < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {fmt(saldo)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Cotações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Abertas</span>
                <span className="font-semibold">{cotacoesAbertas}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aguardando</span>
                <span className="font-semibold">{cotacoesAguardando}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── DESKTOP ONLY: Timeline + Chart ── */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        {/* Timeline */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Linha do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fasesTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem fases com datas definidas.</p>
            ) : (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                {fasesTimeline.map((f) => {
                  const Icon = faseStatusIcon[f.status ?? "pendente"] ?? Layers;
                  return (
                    <div key={f.id} className="relative flex items-start gap-3">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                        <Icon className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">{f.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.data_inicio} → {f.data_fim ?? "em aberto"}
                        </p>
                        <Progress value={f.progresso ?? 0} className="h-1.5 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previsto vs Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem dados financeiros.</p>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="nome" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      formatter={(v: number) => fmt(v)}
                      contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="previsto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Previsto" />
                    <Bar dataKey="gasto" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Gasto" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── DESKTOP ONLY: Tabela completa de obras ── */}
      {(obras ?? []).length > 0 && (
        <Card className="hidden md:block rounded-2xl">
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
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${o.id}/dossie`)}>
                            Ver
                          </Button>
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
    </div>
  );
};

export default Dashboard;
