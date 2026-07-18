import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Plus, Eye } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  totalGasto: number;
  totalPrevisto: number;
}

export const DashboardFinanceiroCard = ({ totalGasto, totalPrevisto }: Props) => {
  const navigate = useNavigate();
  const saldo = totalPrevisto - totalGasto;
  const pctUsado = totalPrevisto > 0 ? Math.min(100, Math.round((totalGasto / totalPrevisto) * 100)) : 0;
  const estourado = saldo < 0;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <DollarSign className="h-4 w-4" />
          </span>
          Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{fmt(totalGasto)} gasto</span>
            <span>{pctUsado}% do orçamento</span>
          </div>
          <Progress
            value={pctUsado}
            className={`h-2 ${estourado ? "[&>div]:bg-destructive" : "[&>div]:bg-emerald-500"}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-xl bg-muted/50 p-2.5">
            <p className="text-[11px] text-muted-foreground">Orçamento</p>
            <p className="text-sm font-bold text-foreground truncate">{fmt(totalPrevisto)}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5">
            <p className="text-[11px] text-muted-foreground">Saldo</p>
            <p className={`text-sm font-bold truncate ${estourado ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {fmt(saldo)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => navigate("/financeiro")}>
            <Eye className="h-3.5 w-3.5" /> Ver
          </Button>
          <Button size="sm" className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate("/financeiro")}>
            <Plus className="h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
