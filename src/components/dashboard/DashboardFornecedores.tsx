import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Eye } from "lucide-react";

interface Fornecedor {
  id: string;
  nome: string;
  score: number | null;
  status: string | null;
  categoria: string | null;
}

export const DashboardFornecedores = ({ fornecedores }: { fornecedores: Fornecedor[] }) => {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
            <Users className="h-4 w-4" />
          </span>
          Fornecedores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {fornecedores.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum fornecedor vinculado.</p>
        ) : (
          fornecedores.slice(0, 6).map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{f.nome}</p>
                <p className="text-xs text-muted-foreground">{f.categoria ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-primary">{((f.score ?? 0) * 100).toFixed(0)}%</span>
                <Badge variant={f.status === "ativo" ? "default" : "destructive"} className="text-xs">
                  {f.status ?? "ativo"}
                </Badge>
              </div>
            </div>
          ))
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => navigate("/fornecedores")}>
            <Eye className="h-3.5 w-3.5" /> Ver
          </Button>
          <Button size="sm" className="flex-1 gap-1" onClick={() => navigate("/fornecedores")}>
            <Plus className="h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
