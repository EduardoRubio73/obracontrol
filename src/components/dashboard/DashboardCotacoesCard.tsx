import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye } from "lucide-react";

interface Props {
  abertas: number;
  aguardando: number;
}

export const DashboardCotacoesCard = ({ abertas, aguardando }: Props) => {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Cotações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Abertas</span>
          <span className="font-semibold">{abertas}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Aguardando</span>
          <span className="font-semibold">{aguardando}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => navigate("/cotacoes")}>
            <Eye className="h-3.5 w-3.5" /> Ver
          </Button>
          <Button size="sm" className="flex-1 gap-1" onClick={() => navigate("/cotacoes")}>
            <Plus className="h-3.5 w-3.5" /> Nova
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
