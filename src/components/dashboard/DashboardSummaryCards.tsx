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
}

export const DashboardSummaryCards = ({ obrasTotal, obrasAtivas, totalGasto, alertasCount }: Props) => {
  const navigate = useNavigate();

  const items = [
    { label: "Total Obras", value: obrasTotal, icon: Building2, color: "text-primary", route: "/obras" },
    { label: "Etapas Ativas", value: obrasAtivas, icon: TrendingUp, color: "text-amber-500", route: "/etapas" },
    { label: "Total Investido", value: fmt(totalGasto), icon: DollarSign, color: "text-emerald-500", route: "/financeiro" },
    { label: "Alertas", value: alertasCount, icon: AlertTriangle, color: "text-destructive", route: "/dashboard" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((c) => (
        <Card
          key={c.label}
          className="rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate(c.route)}
        >
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
  );
};
