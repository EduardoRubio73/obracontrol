import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Eye, Plus } from "lucide-react";

const statusColor: Record<string, string> = {
  planejamento: "bg-muted text-muted-foreground",
  "execução": "bg-primary/15 text-primary",
  "concluído": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pausado: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelado: "bg-destructive/15 text-destructive",
};

interface Obra {
  id: string;
  nome: string;
  status: string | null;
  valor_previsto: number | null;
}

interface Fase {
  id: string;
  obra_id: string;
  progresso: number | null;
}

interface Props {
  obras: Obra[];
  fases: Fase[];
}

export const DashboardObrasRecentes = ({ obras, fases }: Props) => {
  const navigate = useNavigate();
  const recentes = obras.slice(0, 5);

  return (
    <Card className="md:col-span-2 rounded-2xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Obras Recentes
        </CardTitle>
        <Button size="sm" className="gap-1" onClick={() => navigate("/nova-obra")}>
          <Plus className="h-3.5 w-3.5" /> Nova
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma obra cadastrada.</p>
        ) : (
          recentes.map((o) => {
            const obraFases = fases.filter((f) => f.obra_id === o.id);
            const prog = obraFases.length > 0
              ? Math.round(obraFases.reduce((a, f) => a + (f.progresso ?? 0), 0) / obraFases.length)
              : 0;
            return (
              <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{o.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-xs border-0 ${statusColor[o.status ?? "planejamento"] ?? "bg-muted"}`}>
                      {o.status ?? "planejamento"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{prog}%</span>
                  </div>
                </div>
                <div className="w-20 hidden sm:block">
                  <Progress value={prog} className="h-2" />
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => navigate(`/obras/${o.id}/dossie`)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
