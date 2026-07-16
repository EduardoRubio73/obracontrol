import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, TrendingUp, DollarSign, AlertTriangle, ListChecks, ShoppingCart } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  obrasTotal: number;
  obrasAtivas: number;
  totalGasto: number;
  alertasCount: number;
  /** Id da obra do dashboard atual (quando é um dashboard por obra) */
  obraId?: string;
}

export const DashboardSummaryCards = ({ obrasTotal, obrasAtivas, totalGasto, alertasCount, obraId }: Props) => {
  const navigate = useNavigate();

  const items = [
    { label: "Total Obras", value: obrasTotal, icon: Building2, color: "text-primary", route: obraId ? `/obras/${obraId}/dossie` : "/obras" },
    { label: "Etapas Ativas", value: obrasAtivas, icon: TrendingUp, color: "text-amber-500", route: obraId ? `/obras/${obraId}/etapas` : "/obras" },
    { label: "Total Investido", value: fmt(totalGasto), icon: DollarSign, color: "text-emerald-500", route: obraId ? `/obras/${obraId}/financeiro` : "/obras" },
    { label: "Alertas", value: alertasCount, icon: AlertTriangle, color: "text-destructive", route: "/hoje" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
      {items.map((c) => (
        <Card
          key={c.label}
          className="rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate(c.route)}
        >
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <c.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${c.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-xl font-bold text-foreground truncate">{c.value}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
