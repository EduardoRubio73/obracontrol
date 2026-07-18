import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, TrendingUp, DollarSign, AlertTriangle, type LucideIcon } from "lucide-react";

const fmtCompact = (v: number) => {
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return abs.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

interface Props {
  obrasTotal: number;
  obrasAtivas: number;
  totalGasto: number;
  alertasCount: number;
  /** Id da obra do dashboard atual (quando é um dashboard por obra) */
  obraId?: string;
}

interface Item {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
  ring: string;
  route: string;
  pulse?: boolean;
}

export const DashboardSummaryCards = ({ obrasTotal, obrasAtivas, totalGasto, alertasCount, obraId }: Props) => {
  const navigate = useNavigate();

  const items: Item[] = [
    {
      label: "Total de Obras",
      value: obrasTotal,
      icon: Building2,
      color: "text-primary",
      bg: "bg-primary/10",
      ring: "hover:border-primary/30",
      route: obraId ? `/obras/${obraId}/dossie` : "/obras",
    },
    {
      label: "Etapas Ativas",
      value: obrasAtivas,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      ring: "hover:border-amber-500/30",
      route: obraId ? `/obras/${obraId}/etapas` : "/obras",
    },
    {
      label: "Total Investido",
      value: fmtCompact(totalGasto),
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      ring: "hover:border-emerald-500/30",
      route: obraId ? `/obras/${obraId}/financeiro` : "/obras",
    },
    {
      label: "Alertas",
      value: alertasCount,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      ring: "hover:border-destructive/30",
      route: "/hoje",
      pulse: alertasCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {items.map((c) => (
        <Card
          key={c.label}
          className={`group relative rounded-2xl border-border/60 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${c.ring}`}
          onClick={() => navigate(c.route)}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className={`relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 ${c.bg}`}>
              <c.icon className={`h-5 w-5 ${c.color}`} />
              {c.pulse && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums leading-tight truncate">
                {c.value}
              </p>
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight mt-0.5">
                {c.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
