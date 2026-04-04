import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface Props {
  abertas: number;
  aguardando: number;
}

export const DashboardCotacoesCard = ({ abertas, aguardando }: Props) => (
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
    </CardContent>
  </Card>
);
