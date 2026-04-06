import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { RequireObra } from "@/components/RequireObra";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const fmt = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinanceiroContent() {
  const { user } = useAuth();
  const { obraAtivaId } = useObraAtiva();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: transacoes, isLoading } = useQuery({
    queryKey: ["financeiro", obraAtivaId],
    enabled: !!obraAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("*")
        .eq("obra_id", obraAtivaId!)
        .order("data_transacao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalGasto =
    transacoes
      ?.filter((t) => t.tipo === "despesa")
      .reduce((a, t) => a + Number(t.valor), 0) ?? 0;

  const totalRecebido =
    transacoes
      ?.filter((t) => t.tipo === "receita")
      .reduce((a, t) => a + Number(t.valor), 0) ?? 0;

  const disponivel = totalRecebido - totalGasto;

  const create = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("financeiro").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro", obraAtivaId] });
      toast.success("Registrado!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      obra_id: obraAtivaId!,
      valor: Number(fd.get("valor")),
      tipo: fd.get("tipo"),
      descricao: fd.get("descricao") || null,
      data_transacao: fd.get("data_transacao") || null,
      user_id: user!.id,
    });
  };

  return (
    <div className="space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <div className="pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Financeiro
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-sm border-2 border-destructive/20 bg-destructive/5">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">💸 Total gasto</p>
            <p className="text-2xl font-black tabular-nums text-destructive">
              {fmt(totalGasto)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-2 border-success/20 bg-success/5">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">💰 Disponível</p>
            <p className="text-2xl font-black tabular-nums text-success">
              {fmt(disponivel)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Button
        className="w-full h-14 rounded-2xl font-bold text-lg"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-6 w-6" />
        Adicionar gasto
      </Button>

      {transacoes?.map((t) => {
        const isDespesa = t.tipo === "despesa";
        return (
          <Card key={t.id} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-xl tabular-nums text-foreground">
                  {isDespesa ? "−" : "+"} {fmt(t.valor)}
                </p>
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    isDespesa
                      ? "bg-destructive/10 text-destructive"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {isDespesa ? "Saída" : "Entrada"}
                </span>
              </div>
              <p className="text-base text-muted-foreground mt-2">
                {t.descricao ?? "—"}
              </p>
              {t.data_transacao && (
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(t.data_transacao).toLocaleDateString("pt-BR")}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!isLoading && !transacoes?.length && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-lg">Nenhum gasto registrado</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  name="valor"
                  type="number"
                  step="0.01"
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  name="tipo"
                  required
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base"
                >
                  <option value="despesa">Saída</option>
                  <option value="receita">Entrada</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                name="descricao"
                placeholder="Ex: Cimento"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input name="data_transacao" type="date" className="h-12 text-base" />
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg"
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

export default function Financeiro() {
  return (
    <RequireObra>
      <FinanceiroContent />
    </RequireObra>
  );
}
