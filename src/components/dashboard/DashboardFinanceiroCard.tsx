import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  totalGasto: number;
  totalPrevisto: number;
}

export const DashboardFinanceiroCard = ({ totalGasto, totalPrevisto }: Props) => {
  const saldo = totalPrevisto - totalGasto;

  return (
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
  );
};
