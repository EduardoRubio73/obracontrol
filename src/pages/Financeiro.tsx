import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const tipoColors: Record<string, string> = {
  despesa: "bg-destructive/10 text-destructive",
  receita: "bg-success/10 text-success",
  adiantamento: "bg-warning/10 text-warning",
  reembolso: "bg-primary/10 text-primary",
};

const Financeiro = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: obras } = useQuery({
    queryKey: ["obras-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: transacoes, isLoading } = useQuery({
    queryKey: ["financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("*, obras(nome)")
        .order("data_transacao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("financeiro").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-financeiro"] });
      toast.success("Transação adicionada!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      obra_id: fd.get("obra_id"),
      valor: Number(fd.get("valor")),
      tipo: fd.get("tipo"),
      descricao: fd.get("descricao") || null,
      data_transacao: fd.get("data_transacao") || null,
    });
  };

  const fmt = (v: number | null) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Transação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="obra_id">Obra</Label>
                <select name="obra_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Selecione uma obra</option>
                  {obras?.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor</Label>
                  <Input id="valor" name="valor" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <select name="tipo" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                    <option value="adiantamento">Adiantamento</option>
                    <option value="reembolso">Reembolso</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input id="descricao" name="descricao" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_transacao">Data</Label>
                <Input id="data_transacao" name="data_transacao" type="date" />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoes?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{(t.obras as any)?.nome ?? "—"}</TableCell>
                  <TableCell>{t.descricao ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={tipoColors[t.tipo ?? ""] ?? ""}>
                      {t.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{fmt(t.valor)}</TableCell>
                  <TableCell>{t.data_transacao ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!isLoading && !transacoes?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma transação registrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {transacoes?.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{fmt(t.valor)}</span>
                <Badge variant="secondary" className={tipoColors[t.tipo ?? ""] ?? ""}>
                  {t.tipo}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t.descricao ?? (t.obras as any)?.nome ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{t.data_transacao ?? ""}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Financeiro;
