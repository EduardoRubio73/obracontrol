import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye, Clock, Hourglass } from "lucide-react";

interface Props {
  abertas: number;
  aguardando: number;
}

export const DashboardCotacoesCard = ({ abertas, aguardando }: Props) => {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
            <FileText className="h-4 w-4" />
          </span>
          Cotações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/50 p-2.5 flex items-center gap-2">
            <Clock className="h-4 w-4 text-violet-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{abertas}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Abertas</p>
            </div>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5 flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{aguardando}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Aguardando</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => navigate("/cotacoes")}>
            <Eye className="h-3.5 w-3.5" /> Ver
          </Button>
          <Button size="sm" className="flex-1 gap-1 bg-violet-600 hover:bg-violet-700" onClick={() => navigate("/cotacoes")}>
            <Plus className="h-3.5 w-3.5" /> Nova
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
