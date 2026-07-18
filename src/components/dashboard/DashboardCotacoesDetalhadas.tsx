import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface Cotacao {
  id: string;
  descricao: string;
  status: string | null;
  obra_id: string;
  propostas_count?: number;
}

const statusBadge: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-primary/15 text-primary",
  recebendo_propostas: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  comparando: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  finalizada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelada: "bg-destructive/15 text-destructive",
};

export const DashboardCotacoesDetalhadas = ({ cotacoes }: { cotacoes: Cotacao[] }) => {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
            <FileText className="h-4 w-4" />
          </span>
          Cotações Detalhadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {cotacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma cotação.</p>
        ) : (
          cotacoes.slice(0, 6).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors"
              onClick={() => navigate(`/obras/${c.obra_id}/cotacoes?open=${c.id}`)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.descricao}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.propostas_count != null && (
                  <span className="text-xs text-muted-foreground">{c.propostas_count} prop.</span>
                )}
                <Badge className={`text-xs border-0 ${statusBadge[c.status ?? "rascunho"] ?? "bg-muted"}`}>
                  {c.status ?? "rascunho"}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
