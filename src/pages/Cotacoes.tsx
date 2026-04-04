import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronRight, Check, BarChart3 } from "lucide-react";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-primary/10 text-primary",
  recebendo_propostas: "bg-warning/10 text-warning",
  comparando: "bg-accent text-accent-foreground",
  finalizada: "bg-success/10 text-success",
  cancelada: "bg-destructive/10 text-destructive",
};

const Cotacoes = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: cotacoes, isLoading } = useQuery({
    queryKey: ["cotacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*, obras(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: propostas } = useQuery({
    queryKey: ["propostas", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*, fornecedores(nome)")
        .eq("cotacao_id", selectedId!)
        .order("valor", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const aceitar = useMutation({
    mutationFn: async (propostaId: string) => {
      const { error } = await supabase
        .from("propostas")
        .update({ status: "aceita" })
        .eq("id", propostaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas", selectedId] });
      toast.success("Proposta aceita!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fmt = (v: number | null) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const selected = cotacoes?.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cotações</h1>

      <div className="space-y-3">
        {cotacoes?.map((cotacao) => (
          <Card
            key={cotacao.id}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => setSelectedId(cotacao.id)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{cotacao.descricao}</p>
                <p className="text-sm text-muted-foreground">
                  {(cotacao.obras as any)?.nome ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={statusColors[cotacao.status ?? ""] ?? ""}>
                  {cotacao.status?.replace("_", " ")}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !cotacoes?.length && (
          <p className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</p>
        )}
      </div>

      <Dialog open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.descricao}</DialogTitle>
          </DialogHeader>
          <div>
            <h3 className="mb-3 font-semibold">Propostas</h3>
            {propostas?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Prazo (dias)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propostas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{(p.fornecedores as any)?.nome ?? "—"}</TableCell>
                      <TableCell>{fmt(p.valor)}</TableCell>
                      <TableCell>{p.prazo_dias ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {p.status !== "aceita" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => aceitar.mutate(p.id)}
                            title="Aceitar proposta"
                          >
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma proposta recebida</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cotacoes;
