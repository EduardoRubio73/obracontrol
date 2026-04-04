import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusColor: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  concluido: "bg-success/10 text-success",
  comprado: "bg-primary/10 text-primary",
  cancelado: "bg-destructive/10 text-destructive",
};

const Materiais = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: obra } = useQuery({
    queryKey: ["obra", id],
    queryFn: async () => {
      const { data } = await supabase.from("obras").select("nome").eq("id", id!).single();
      return data;
    },
  });

  const { data: fases } = useQuery({
    queryKey: ["materiais-fases", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("id, nome")
        .eq("obra_id", id!)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["materiais-itens", id],
    enabled: !!fases?.length,
    queryFn: async () => {
      const faseIds = fases!.map((f) => f.id);
      const { data, error } = await supabase
        .from("fase_itens")
        .select("*")
        .in("fase_id", faseIds)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalPrevisto = itens?.reduce((a, i) => a + (i.valor_previsto ?? 0), 0) ?? 0;
  const totalReal = itens?.reduce((a, i) => a + (i.valor_real ?? 0), 0) ?? 0;

  const getFaseName = (faseId: string) => fases?.find((f) => f.id === faseId)?.nome ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Materiais</h1>
          <p className="text-sm text-muted-foreground">{obra?.nome}</p>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Previsto</p>
            <p className="text-lg font-bold">{fmt(totalPrevisto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Real</p>
            <p className="text-lg font-bold">{fmt(totalReal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Diferença</p>
            <p className={`text-lg font-bold ${totalPrevisto - totalReal < 0 ? "text-destructive" : "text-success"}`}>
              {fmt(totalPrevisto - totalReal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {!itens?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum material cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Previsto</TableHead>
                <TableHead className="text-right">Real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{getFaseName(item.fase_id)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColor[item.status ?? ""] ?? ""}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmt(item.valor_previsto ?? 0)}</TableCell>
                  <TableCell className="text-right">{fmt(item.valor_real ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default Materiais;
