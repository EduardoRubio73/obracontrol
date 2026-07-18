import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Eye, Plus, ChevronRight } from "lucide-react";

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

  const obraIds = recentes.map((o) => o.id);
  const { data: fotoMap } = useQuery({
    queryKey: ["obras-thumbs", obraIds.join(",")],
    enabled: obraIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_fotos")
        .select("id, url, obra_id")
        .in("obra_id", obraIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const f of data ?? []) {
        if (!map[f.obra_id]) map[f.obra_id] = f.url;
      }
      return map;
    },
  });

  return (
    <Card className="lg:col-span-2 rounded-2xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </span>
          Obras Recentes
        </CardTitle>
        {obras.length > 5 && (
          <button
            onClick={() => navigate("/obras")}
            className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
          >
            Ver todas <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {recentes.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada ainda.</p>
          </div>
        ) : (
          recentes.map((o) => {
            const obraFases = fases.filter((f) => f.obra_id === o.id);
            const prog = obraFases.length > 0
              ? Math.round(obraFases.reduce((a, f) => a + (f.progresso ?? 0), 0) / obraFases.length)
              : 0;
            const thumb = fotoMap?.[o.id];
            return (
              <div
                key={o.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate(`/obras/${o.id}/dossie`)}
              >
                {thumb ? (
                  <img src={thumb} alt="" className="h-11 w-11 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{o.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] px-1.5 py-0 border-0 ${statusColor[o.status ?? "planejamento"] ?? "bg-muted"}`}>
                      {o.status ?? "planejamento"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{prog}% concluído</span>
                  </div>
                </div>
                <div className="w-16 hidden sm:block">
                  <Progress value={prog} className="h-1.5" />
                </div>
                <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })
        )}

        <button
          onClick={() => navigate("/nova-obra")}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <div className="h-11 w-11 rounded-xl border border-dashed border-current/40 flex items-center justify-center flex-shrink-0">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Adicionar nova obra</span>
        </button>
      </CardContent>
    </Card>
  );
};
