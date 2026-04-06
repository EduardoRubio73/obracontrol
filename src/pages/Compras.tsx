import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { RequireObra } from "@/components/RequireObra";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, ShoppingCart, CheckCircle2 } from "lucide-react";

const statusColors: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  comprado: "bg-success/10 text-success",
  cancelado: "bg-destructive/10 text-destructive",
};

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  comprado: "Comprado",
  cancelado: "Cancelado",
};

const fmt = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ComprasContent() {
  const { user } = useAuth();
  const { obraAtivaId } = useObraAtiva();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fornecedor_id: "",
    produto_id: "",
    descricao: "",
    quantidade: "1",
    valor_unitario: "",
    observacao: "",
  });

  const { data: compras, isLoading } = useQuery({
    queryKey: ["compras", obraAtivaId],
    enabled: !!obraAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras" as any)
        .select("*")
        .eq("obra_id", obraAtivaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores-select"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("id, nome");
      return data ?? [];
    },
  });

  const { data: produtos } = useQuery({
    queryKey: ["produtos-select"],
    queryFn: async () => {
      const { data } = await supabase.from("produtos").select("id, nome");
      return data ?? [];
    },
  });

  const resetForm = () => {
    setForm({ fornecedor_id: "", produto_id: "", descricao: "", quantidade: "1", valor_unitario: "", observacao: "" });
    setEditId(null);
  };

  const save = useMutation({
    mutationFn: async (values: any) => {
      if (editId) {
        const { error } = await supabase.from("compras" as any).update(values).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("compras" as any).insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras", obraAtivaId] });
      toast.success(editId ? "Compra atualizada!" : "Compra criada!");
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("compras" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras", obraAtivaId] });
      toast.success("Compra removida!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("compras" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["compras", obraAtivaId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const qtd = Number(form.quantidade) || 1;
    const vUnit = Number(form.valor_unitario) || 0;
    save.mutate({
      obra_id: obraAtivaId!,
      fornecedor_id: form.fornecedor_id || null,
      produto_id: form.produto_id || null,
      descricao: form.descricao || null,
      quantidade: qtd,
      valor_unitario: vUnit,
      valor_total: qtd * vUnit,
      observacao: form.observacao || null,
      user_id: user!.id,
    });
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      fornecedor_id: c.fornecedor_id ?? "",
      produto_id: c.produto_id ?? "",
      descricao: c.descricao ?? "",
      quantidade: String(c.quantidade ?? 1),
      valor_unitario: String(c.valor_unitario ?? ""),
      observacao: c.observacao ?? "",
    });
    setOpen(true);
  };

  const empty = !isLoading && !compras?.length;

  return (
    <div className="space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <div className="pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Compras
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Gerencie as compras da obra
        </p>
      </div>

      <Button
        className="w-full h-14 rounded-2xl font-bold text-lg"
        onClick={() => { resetForm(); setOpen(true); }}
      >
        <Plus className="mr-2 h-6 w-6" />
        Nova Compra
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {compras?.map((c: any) => {
          const fornNome = fornecedores?.find((f) => f.id === c.fornecedor_id)?.nome;
          const prodNome = produtos?.find((p) => p.id === c.produto_id)?.nome;
          return (
            <Card key={c.id} className="shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-foreground truncate">
                      {prodNome || c.descricao || "Compra"}
                    </p>
                    {fornNome && (
                      <p className="text-sm text-muted-foreground">{fornNome}</p>
                    )}
                  </div>
                  <Badge className={`${statusColors[c.status] ?? "bg-muted"} text-xs shrink-0`}>
                    {statusLabel[c.status] ?? c.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {c.quantidade}x {c.valor_unitario ? fmt(c.valor_unitario) : "—"}
                  </span>
                  {c.valor_total ? (
                    <span className="font-bold text-foreground">{fmt(c.valor_total)}</span>
                  ) : null}
                </div>

                {c.observacao && (
                  <p className="text-sm text-muted-foreground">{c.observacao}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {c.status === "pendente" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => toggleStatus.mutate({ id: c.id, status: "comprado" })}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar comprado
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => del.mutate(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {empty && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="py-14 text-center">
            <ShoppingCart className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl font-bold text-muted-foreground">Nenhuma compra</p>
            <p className="text-base text-muted-foreground mt-2">
              Clique em "Nova Compra" para começar.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Compra" : "Nova Compra"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <select
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base"
                value={form.fornecedor_id}
                onChange={(e) => setForm((p) => ({ ...p, fornecedor_id: e.target.value }))}
              >
                <option value="">Selecione (opcional)</option>
                {fornecedores?.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Produto</Label>
              <select
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base"
                value={form.produto_id}
                onChange={(e) => setForm((p) => ({ ...p, produto_id: e.target.value }))}
              >
                <option value="">Selecione (opcional)</option>
                {produtos?.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Ex: Cimento CP-II"
                className="h-12 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.quantidade}
                  onChange={(e) => setForm((p) => ({ ...p, quantidade: e.target.value }))}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor unitário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_unitario}
                  onChange={(e) => setForm((p) => ({ ...p, valor_unitario: e.target.value }))}
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Input
                value={form.observacao}
                onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                placeholder="Detalhes extras..."
                className="h-12 text-base"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg"
              disabled={save.isPending}
            >
              {save.isPending ? "Salvando..." : editId ? "Salvar alterações" : "Criar compra"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Compras() {
  return (
    <RequireObra>
      <ComprasContent />
    </RequireObra>
  );
}
