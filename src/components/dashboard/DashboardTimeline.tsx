import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, Layers } from "lucide-react";

interface Fase {
  id: string;
  nome: string;
  progresso: number | null;
  status: string | null;
  data_inicio: string | null;
  data_fim: string | null;
}

const faseStatusIcon: Record<string, typeof CheckCircle2> = {
  concluido: CheckCircle2,
  em_andamento: Clock,
  pendente: Layers,
};

export const DashboardTimeline = ({ fases }: { fases: Fase[] }) => {
  const timeline = fases
    .filter((f) => f.data_inicio)
    .sort((a, b) => (a.data_inicio! > b.data_inicio! ? 1 : -1))
    .slice(0, 8);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Linha do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sem fases com datas definidas.</p>
        ) : (
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
            {timeline.map((f) => {
              const Icon = faseStatusIcon[f.status ?? "pendente"] ?? Layers;
              return (
                <div key={f.id} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                    <Icon className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">{f.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.data_inicio} → {f.data_fim ?? "em aberto"}
                    </p>
                    <Progress value={f.progresso ?? 0} className="h-1.5 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
