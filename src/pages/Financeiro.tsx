import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const tipoColors: Record<string, string> = {
  despesa: "bg-red-100 text-red-700",
  receita: "bg-emerald-100 text-emerald-700",
  adiantamento: "bg-amber-100 text-amber-700",
  reembolso: "bg-blue-100 text-blue-700",
};

const fmt = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Financeiro() {
  const { user } = useAuth();
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

  const totalGasto = transacoes
    ?.filter((t) => t.tipo === "despesa")
    .reduce((a, t) => a + Number(t.valor), 0) ?? 0;

  const create = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("financeiro").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      toast.success("Gasto adicionado!");
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
      user_id: user!.id,
    });
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-24">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Financeiro</h1>
      </div>

      {/* Total */}
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">💰 Total gasto</p>
          <p className="text-3xl font-black tabular-nums">{fmt(totalGasto)}</p>
        </CardContent>
      </Card>

      {/* Add button */}
      <Button
        className="w-full h-12 rounded-xl font-bold text-base"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-5 w-5" />
        Adicionar gasto
      </Button>

      {/* List */}
      {transacoes?.map((t) => (
        <Card key={t.id} className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg tabular-nums">
                {fmt(t.valor)}
              </span>
              <Badge className={tipoColors[t.tipo ?? ""] ?? "bg-secondary text-secondary-foreground"}>
                {t.tipo}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t.descricao ?? (t.obras as any)?.nome ?? "—"}
            </p>
            {t.data_transacao && (
              <p className="text-xs text-muted-foreground">
                {new Date(t.data_transacao).toLocaleDateString("pt-BR")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {!isLoading && !transacoes?.length && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum gasto registrado
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Obra</Label>
              <select
                name="obra_id"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione</option>
                {obras?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input name="valor" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  name="tipo"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                  <option value="adiantamento">Adiantamento</option>
                  <option value="reembolso">Reembolso</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input name="descricao" placeholder="Ex: Cimento" />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input name="data_transacao" type="date" />
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-bold"
              disabled={create.isPending}
            >
              {create.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
