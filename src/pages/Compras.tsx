import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShoppingCart, CheckCircle2, Search, ChevronsUpDown, XCircle } from "lucide-react";

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

/* ── Searchable Dropdown ── */
function SearchableSelect({
  label,
  items,
  value,
  onChange,
  onAdd,
  placeholder = "Buscar...",
}: {
  label: string;
  items: { id: string; nome: string }[];
  value: string;
  onChange: (id: string) => void;
  onAdd: (nome: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = items.find((i) => i.id === value);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((i) => i.nome.toLowerCase().includes(s));
  }, [items, search]);

  const handleAdd = () => {
    if (search.trim()) {
      onAdd(search.trim());
      setSearch("");
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full h-12 justify-between text-base font-normal rounded-xl"
          >
            <span className="truncate">{selected?.nome || "Selecione (opcional)"}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              className="flex-1 h-11 bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground"
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors ${
                  item.id === value ? "bg-accent font-semibold" : ""
                }`}
                onClick={() => { onChange(item.id); setOpen(false); setSearch(""); }}
              >
                {item.nome}
              </button>
            ))}
            {filtered.length === 0 && search && (
              <div className="p-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2 text-primary"
                  onClick={handleAdd}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar "{search}"
                </Button>
              </div>
            )}
            {filtered.length === 0 && !search && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum item</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ComprasContent({ obraId }: { obraId: string }) {
  const { user } = useAuth();
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

  const { data: obra } = useQuery({
    queryKey: ["obra", obraId],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("nome").eq("id", obraId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: compras, isLoading } = useQuery({
    queryKey: ["compras", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select("*")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-select"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("id, nome");
      return data ?? [];
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-select"],
    queryFn: async () => {
      const { data } = await supabase.from("produtos").select("id, nome");
      return data ?? [];
    },
  });

  const addFornecedor = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from("fornecedores")
        .insert({ nome, user_id: user!.id })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores-select"] });
      setForm((p) => ({ ...p, fornecedor_id: data.id }));
      toast.success("Fornecedor adicionado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addProduto = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from("produtos")
        .insert({ nome, user_id: user!.id })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["produtos-select"] });
      setForm((p) => ({ ...p, produto_id: data.id }));
      toast.success("Produto adicionado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ fornecedor_id: "", produto_id: "", descricao: "", quantidade: "1", valor_unitario: "", observacao: "" });
    setEditId(null);
  };

  const save = useMutation({
    mutationFn: async (values: any) => {
      if (editId) {
        const { error } = await supabase.from("compras").update(values).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("compras").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras", obraId] });
      toast.success(editId ? "Compra atualizada!" : "Compra criada!");
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("compras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras", obraId] });
      toast.success("Compra removida!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const marcarComprado = useMutation({
    mutationFn: async (compraId: string) => {
      const { error } = await supabase.rpc("marcar_comprado", { p_compra_id: compraId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras", obraId] });
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      toast.success("Compra registrada e lançada no financeiro!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("compras").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras", obraId] });
      toast.success("Status atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const qtd = Number(form.quantidade) || 1;
    const vUnit = Number(form.valor_unitario) || 0;
    save.mutate({
      obra_id: obraId,
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
  const pendentes = compras?.filter((c) => c.status === "pendente") ?? [];
  const comprados = compras?.filter((c) => c.status !== "pendente") ?? [];

  const renderCard = (c: any) => {
    const fornNome = fornecedores.find((f) => f.id === c.fornecedor_id)?.nome;
    const prodNome = produtos.find((p) => p.id === c.produto_id)?.nome;
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
            {/* Status dropdown */}
            <select
              value={c.status}
              onChange={(e) => changeStatus.mutate({ id: c.id, status: e.target.value })}
              className={`text-xs font-semibold rounded-full px-3 py-1 border-0 appearance-none cursor-pointer ${statusColors[c.status] ?? "bg-muted"}`}
            >
              <option value="pendente">Pendente</option>
              <option value="comprado">Comprado</option>
              <option value="cancelado">Cancelado</option>
            </select>
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
                onClick={() => marcarComprado.mutate(c.id)}
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
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <div className="pt-2 sm:pt-4">
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
          Compras {obra ? `— ${obra.nome}` : ""}
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground mt-1">
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

      {pendentes.length > 0 && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-warning flex items-center gap-2">
            🕐 Pendentes ({pendentes.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendentes.map(renderCard)}
          </div>
        </div>
      )}

      {comprados.length > 0 && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-success flex items-center gap-2">
            ✅ Comprados ({comprados.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comprados.map(renderCard)}
          </div>
        </div>
      )}

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
            <SearchableSelect
              label="Fornecedor"
              items={fornecedores}
              value={form.fornecedor_id}
              onChange={(id) => setForm((p) => ({ ...p, fornecedor_id: id }))}
              onAdd={(nome) => addFornecedor.mutate(nome)}
              placeholder="Buscar fornecedor..."
            />

            <SearchableSelect
              label="Produto"
              items={produtos}
              value={form.produto_id}
              onChange={(id) => setForm((p) => ({ ...p, produto_id: id }))}
              onAdd={(nome) => addProduto.mutate(nome)}
              placeholder="Buscar produto..."
            />

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
  const { id } = useParams<{ id: string }>();
  return (
    <RequireObra obraId={id} pageName="Compras">
      {id && <ComprasContent obraId={id} />}
    </RequireObra>
  );
}
