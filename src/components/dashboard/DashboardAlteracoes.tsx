import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Alteracao {
  id: string;
  tipo: string;
  descricao: string;
  valor_impacto: number | null;
  created_at: string;
}

const tipoBadge: Record<string, string> = {
  escopo: "bg-primary/15 text-primary",
  custo: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  prazo: "bg-destructive/15 text-destructive",
};

export const DashboardAlteracoes = ({ alteracoes }: { alteracoes: Alteracao[] }) => (
  <Card className="rounded-2xl">
    <CardHeader className="pb-2">
      <CardTitle className="text-base flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
          <History className="h-4 w-4" />
        </span>
        Alterações
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {alteracoes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma alteração registrada.</p>
      ) : (
        alteracoes.slice(0, 8).map((a) => (
          <div key={a.id} className="p-2 rounded-lg bg-muted/40 space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={`text-xs border-0 ${tipoBadge[a.tipo] ?? "bg-muted"}`}>{a.tipo}</Badge>
              {a.valor_impacto != null && (
                <span className={`text-xs font-semibold ${a.valor_impacto > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {a.valor_impacto > 0 ? "+" : ""}{fmt(a.valor_impacto)}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground">{a.descricao}</p>
            <p className="text-xs text-muted-foreground">{a.created_at.substring(0, 10)}</p>
          </div>
        ))
      )}
    </CardContent>
  </Card>
);
