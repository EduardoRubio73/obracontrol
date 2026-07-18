import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { BarChart3 } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  chartData: { nome: string; previsto: number; gasto: number }[];
}

export const DashboardChartPrevistoGasto = ({ chartData }: Props) => (
  <Card className="rounded-2xl">
    <CardHeader className="pb-2">
      <CardTitle className="text-base flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
          <BarChart3 className="h-4 w-4" />
        </span>
        Previsto vs Gasto
      </CardTitle>
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
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="previsto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Previsto" />
              <Bar dataKey="gasto" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Gasto" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardContent>
  </Card>
);
