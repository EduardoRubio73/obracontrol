import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const Dashboard = () => {
  const { data: resumo } = useQuery({
    queryKey: ["resumo-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vw_resumo_financeiro").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: financeiro } = useQuery({
    queryKey: ["financeiro-chart"],
    queryFn: async () => {
      const { data, error } = await supabase.from("financeiro").select("tipo, valor, data_transacao");
      if (error) throw error;
      return data;
    },
  });

  const totais = resumo?.reduce(
    (acc, r) => ({
      previsto: acc.previsto + (Number(r.valor_previsto) || 0),
      gasto: acc.gasto + (Number(r.total_gasto) || 0),
    }),
    { previsto: 0, gasto: 0 }
  ) ?? { previsto: 0, gasto: 0 };

  const economia = totais.previsto - totais.gasto;

  // Group financeiro by month
  const chartData = financeiro?.reduce<Record<string, { mes: string; receita: number; despesa: number }>>((acc, f) => {
    const mes = f.data_transacao ? f.data_transacao.slice(0, 7) : "Sem data";
    if (!acc[mes]) acc[mes] = { mes, receita: 0, despesa: 0 };
    if (f.tipo === "receita") acc[mes].receita += Number(f.valor);
    else acc[mes].despesa += Number(f.valor);
    return acc;
  }, {});

  const chartArray = chartData ? Object.values(chartData).sort((a, b) => a.mes.localeCompare(b.mes)) : [];

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Building2} label="Obras" value={resumo?.length ?? 0} />
        <SummaryCard icon={DollarSign} label="Valor Previsto" value={fmt(totais.previsto)} />
        <SummaryCard icon={TrendingDown} label="Valor Gasto" value={fmt(totais.gasto)} color="destructive" />
        <SummaryCard icon={TrendingUp} label="Economia" value={fmt(economia)} color="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartArray}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          color === "destructive" ? "bg-destructive/10 text-destructive" :
          color === "success" ? "bg-success/10 text-success" :
          "bg-primary/10 text-primary"
        }`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
