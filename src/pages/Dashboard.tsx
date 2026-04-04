import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
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

const Dashboard = () => {
  const { data: obras } = useQuery({
    queryKey: ["dashboard-obras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome, status, valor_previsto");
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
        .select("id, nome, progresso, status, obra_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const obrasAtivas = obras?.filter((o) => o.status === "execução").length ?? 0;
  const obrasConcluidas = obras?.filter((o) => o.status === "concluído").length ?? 0;
  const obrasTotal = obras?.length ?? 0;

  const totalPrevisto = obras?.reduce((a, o) => a + (o.valor_previsto ?? 0), 0) ?? 0;
  const totalGasto =
    financeiro
      ?.filter((f) => f.tipo === "despesa")
      .reduce((a, f) => a + (f.valor ?? 0), 0) ?? 0;

  const progressoGeral =
    fases && fases.length > 0
      ? Math.round(fases.reduce((a, f) => a + (f.progresso ?? 0), 0) / fases.length)
      : 0;

  // Chart: gasto por obra
  const chartData = (obras ?? []).slice(0, 6).map((o) => {
    const gasto =
      financeiro
        ?.filter((f) => f.obra_id === o.id && f.tipo === "despesa")
        .reduce((a, f) => a + (f.valor ?? 0), 0) ?? 0;
    return {
      nome: o.nome?.substring(0, 12) ?? "",
      previsto: o.valor_previsto ?? 0,
      gasto,
    };
  });

  const cards = [
    { label: "Obras Ativas", value: obrasAtivas, icon: Building2, color: "text-primary" },
    { label: "Concluídas", value: obrasConcluidas, icon: CheckCircle2, color: "text-success" },
    { label: "Total Obras", value: obrasTotal, icon: TrendingUp, color: "text-muted-foreground" },
    { label: "Alertas", value: alertas?.length ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financeiro + Progresso */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Financeiro Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Previsto</span>
              <span className="font-semibold">{fmt(totalPrevisto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gasto</span>
              <span className="font-semibold">{fmt(totalGasto)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo</span>
              <span className={`font-bold ${totalPrevisto - totalGasto < 0 ? "text-destructive" : "text-success"}`}>
                {fmt(totalPrevisto - totalGasto)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-4xl font-black">{progressoGeral}%</span>
              <span className="text-sm text-muted-foreground">{fases?.length ?? 0} etapas</span>
            </div>
            <Progress value={progressoGeral} className="h-3" />
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previsto vs Gasto por Obra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="nome" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="previsto" fill="hsl(220, 90%, 56%)" radius={[4, 4, 0, 0]} name="Previsto" />
                  <Bar dataKey="gasto" fill="hsl(0, 72%, 60%)" radius={[4, 4, 0, 0]} name="Gasto" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
