import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface FinanceiroRow {
  valor: number;
  tipo: string | null;
  data_transacao: string | null;
}

export const DashboardEvolucaoMensal = ({ financeiro }: { financeiro: FinanceiroRow[] }) => {
  const monthMap = new Map<string, number>();
  financeiro
    .filter((f) => f.tipo === "despesa" && f.data_transacao)
    .forEach((f) => {
      const month = f.data_transacao!.substring(0, 7); // YYYY-MM
      monthMap.set(month, (monthMap.get(month) ?? 0) + (f.valor ?? 0));
    });

  const chartData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, total]) => ({
      mes: mes.substring(5) + "/" + mes.substring(2, 4), // MM/YY
      total,
    }));

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </span>
          Evolução Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sem dados mensais.</p>
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Gasto" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
