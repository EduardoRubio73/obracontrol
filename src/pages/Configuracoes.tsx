import { useState, useMemo, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SmartCombobox } from "@/components/ui/smart-combobox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X, HelpCircle, ChevronDown, Upload, Settings2, FileSpreadsheet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CrudItem = { id: string; nome: string; descricao?: string | null };

/* ----------------- Collapsible Section Wrapper ----------------- */
function CollapsibleCard({
  title,
  icon,
  tooltip,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: string;
  tooltip?: string;
  count?: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="rounded-2xl overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              {icon && <span className="text-lg">{icon}</span>}
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              {typeof count === "number" && (
                <Badge variant="secondary" className="ml-1">{count}</Badge>
              )}
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" onClick={(e) => e.stopPropagation()} />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1 border-t">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/* ----------------- Simple CRUD hook ----------------- */
function useCrudTab(table: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: [table, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as CrudItem[];
    },
  });

  const add = useMutation({
    mutationFn: async ({ nome, descricao }: { nome: string; descricao?: string }) => {
      const dup = (items ?? []).find((i) => (i.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim());
      if (dup) throw new Error(`Já existe um item com o nome "${nome}".`);
      const { error } = await supabase.from(table as any).insert({ nome, descricao: descricao || null, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Adicionado!");
    },
    onError: (e: any) => {
      if (e.message?.includes("violates foreign key") || e.message?.includes("RESTRICT")) {
        toast.error("Não é possível: este item está sendo usado em outro cadastro.");
      } else toast.error(e.message);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, nome, descricao }: { id: string; nome: string; descricao?: string }) => {
      const dup = (items ?? []).find((i) => i.id !== id && (i.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim());
      if (dup) throw new Error(`Já existe outro item com o nome "${nome}".`);
      const { error } = await supabase.from(table as any).update({ nome, descricao: descricao || null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Removido!");
    },
    onError: (e: any) => {
      if (e.message?.includes("violates foreign key") || e.message?.includes("RESTRICT") || e.code === "23503") {
        toast.error("Não é possível excluir: este item está sendo usado em outro cadastro.");
      } else toast.error(e.message);
    },
  });

  return { items, isLoading, add, update, del };
}

/* ----------------- Simple CRUD body (nome + descricao) ----------------- */
function CrudBody({ table, label }: { table: string; label: string }) {
  const { items, isLoading, add, update, del } = useCrudTab(table);
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [editingDescricao, setEditingDescricao] = useState("");

  const dupName = !!items?.find((i) => (i.nome ?? "").toLowerCase().trim() === novoNome.toLowerCase().trim());

  const handleAdd = () => {
    if (!novoNome.trim() || dupName) return;
    add.mutate({ nome: novoNome.trim(), descricao: novaDescricao.trim() }, {
      onSuccess: () => { setNovoNome(""); setNovaDescricao(""); },
    });
  };

  const startEdit = (item: CrudItem) => {
    setEditingId(item.id);
    setEditingNome(item.nome);
    setEditingDescricao(item.descricao ?? "");
  };
  const cancelEdit = () => { setEditingId(null); setEditingNome(""); setEditingDescricao(""); };
  const saveEdit = () => {
    if (!editingNome.trim() || !editingId) return;
    update.mutate({ id: editingId, nome: editingNome.trim(), descricao: editingDescricao.trim() }, { onSuccess: cancelEdit });
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-2">
        <Input
          placeholder={`Novo(a) ${label}...`}
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        {dupName && novoNome.trim() && <p className="text-xs text-warning">⚠️ Já existe "{novoNome}"</p>}
        <Input
          placeholder="Descrição (opcional)"
          value={novaDescricao}
          onChange={(e) => setNovaDescricao(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={!novoNome.trim() || dupName || add.isPending} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="space-y-1">
        {isLoading && <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>}
        {!isLoading && !items?.length && (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum(a) {label} cadastrado(a).</p>
        )}
        {items?.map((item) => (
          <div key={item.id} className="flex items-start justify-between py-2 px-2 border-b last:border-0 hover:bg-muted/50 rounded-lg transition-colors">
            {editingId === item.id ? (
              <div className="flex flex-col gap-2 flex-1 mr-2">
                <Input value={editingNome} onChange={(e) => setEditingNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  className="h-9" autoFocus placeholder="Nome" />
                <Input value={editingDescricao} onChange={(e) => setEditingDescricao(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  className="h-9" placeholder="Descrição (opcional)" />
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={saveEdit} disabled={!editingNome.trim()} className="text-primary shrink-0">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={cancelEdit} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span className="font-semibold text-sm text-foreground">{item.nome}</span>
                  {item.descricao && <p className="text-xs text-muted-foreground mt-0.5">{item.descricao}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-8 w-8">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(item.id)} disabled={del.isPending} className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------- Produtos section body ----------------- */
function ProdutosBody() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [manageDialog, setManageDialog] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("");
  const [catId, setCatId] = useState("");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"nome" | "categoria" | "unidade">("categoria");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);

  const { data: categorias } = useQuery({
    queryKey: ["categorias_produtos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias_produtos").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: unidades } = useQuery({
    queryKey: ["unidades_medida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("unidades_medida").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, categorias_produtos!produtos_categoria_id_fkey(nome)")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const list = (produtos ?? []).filter((p: any) => {
      if (search.trim() && !(p.nome ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCat !== "all" && (p.categoria_id ?? "__none__") !== filterCat) return false;
      if (filterUnit !== "all" && (p.unidade ?? "") !== filterUnit) return false;
      return true;
    });
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "nome") return (a.nome ?? "").localeCompare(b.nome ?? "");
      if (sortBy === "unidade") return (a.unidade ?? "").localeCompare(b.unidade ?? "") || (a.nome ?? "").localeCompare(b.nome ?? "");
      // categoria: sort by category name then product name
      const ca = a.categorias_produtos?.nome ?? "zzz_Sem categoria";
      const cb = b.categorias_produtos?.nome ?? "zzz_Sem categoria";
      return ca.localeCompare(cb) || (a.nome ?? "").localeCompare(b.nome ?? "");
    });
    return sorted;
  }, [produtos, search, filterCat, filterUnit, sortBy]);

  const grouped = useMemo(() => {
    if (sortBy !== "categoria") return null;
    const groups: Record<string, any[]> = {};
    for (const p of filtered) {
      const key = p.categorias_produtos?.nome ?? "Sem categoria";
      (groups[key] ||= []).push(p);
    }
    return Object.entries(groups);
  }, [filtered, sortBy]);

  const createCategoria = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.from("categorias_produtos").insert({ nome }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newCat: any) => {
      queryClient.invalidateQueries({ queryKey: ["categorias_produtos"] });
      setCatId(newCat.id);
      toast.success("Categoria criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createUnidade = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.from("unidades_medida").insert({ nome }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newUnit: any) => {
      queryClient.invalidateQueries({ queryKey: ["unidades_medida"] });
      setUnidade(newUnit.nome);
      toast.success("Unidade criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const dup = (produtos ?? []).find(
        (p: any) => (p.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim() && p.id !== edit?.id
      );
      if (dup) throw new Error(`Já existe um produto com o nome "${nome}".`);
      const payload = { nome: nome.trim(), unidade: unidade || "un", categoria_id: catId || null };
      if (edit) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(edit ? "Produto atualizado!" : "Produto criado!");
      close();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto excluído!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (p: any) => {
    setEdit(p); setNome(p.nome); setUnidade(p.unidade || "un"); setCatId(p.categoria_id || ""); setDialog(true);
  };
  const openNew = () => { setEdit(null); setNome(""); setUnidade(""); setCatId(""); setDialog(true); };
  const close = () => { setDialog(false); setEdit(null); setNome(""); setUnidade(""); setCatId(""); };

  const dupInDialog = (produtos ?? []).some(
    (p: any) => (p.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim() && p.id !== edit?.id
  );

  const catOptions = useMemo(() => (categorias ?? []).map((c: any) => ({ value: c.id, label: c.nome })), [categorias]);
  const unitOptions = useMemo(() => (unidades ?? []).map((u: any) => ({ value: u.nome, label: u.nome })), [unidades]);

  return (
    <div className="space-y-3 pt-3">
      <div className="flex gap-2">
        <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={openNew} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      <div className="space-y-1">
        {isLoading && <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>}
        {!isLoading && !filtered.length && (
          <p className="text-muted-foreground text-sm text-center py-4">
            {search ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
          </p>
        )}
        {filtered.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between py-2 px-2 border-b last:border-0 hover:bg-muted/50 rounded-lg transition-colors">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{p.nome}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">{p.unidade || "un"}</Badge>
                {p.categorias_produtos?.nome && (
                  <Badge variant="outline" className="text-xs">{p.categorias_produtos.nome}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirm({ id: p.id, nome: p.nome })}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialog} onOpenChange={(v) => { if (!v) close(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{edit ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Fio elétrico 2.5mm" />
              {dupInDialog && nome.trim() && <p className="text-xs text-warning">⚠️ Já existe um produto com esse nome</p>}
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <SmartCombobox options={unitOptions} value={unidade} onChange={setUnidade}
                onCreateNew={(l) => createUnidade.mutate(l)}
                placeholder="Digite ou selecione (ex: un, m, kg)"
                emptyText="Nenhuma unidade. Digite para criar." />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <SmartCombobox options={catOptions} value={catId} onChange={setCatId}
                onCreateNew={(l) => createCategoria.mutate(l)}
                placeholder="Digite ou selecione uma categoria"
                emptyText="Nenhuma categoria. Digite para criar." />
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={!nome.trim() || dupInDialog || save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirm?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteConfirm) del.mutate(deleteConfirm.id); setDeleteConfirm(null); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ----------------- Wrappers to show count in header ----------------- */
function CrudCollapsible({
  table, label, title, icon, tooltip,
}: { table: string; label: string; title: string; icon: string; tooltip?: string }) {
  const { user } = useAuth();
  const { data: items } = useQuery({
    queryKey: [table, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from(table as any).select("id");
      return data ?? [];
    },
  });
  return (
    <CollapsibleCard title={title} icon={icon} tooltip={tooltip} count={items?.length}>
      <CrudBody table={table} label={label} />
    </CollapsibleCard>
  );
}

function ProdutosCollapsible() {
  const { data } = useQuery({
    queryKey: ["produtos-count"],
    queryFn: async () => {
      const { count } = await supabase.from("produtos").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
  return (
    <CollapsibleCard
      title="Produtos"
      icon="🧱"
      tooltip="Cadastro de produtos usados em compras e cotações. Vincule unidade e categoria."
      count={data}
    >
      <ProdutosBody />
    </CollapsibleCard>
  );
}

const Configuracoes = () => {
  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <h1 className="text-xl sm:text-2xl font-bold">Config. Sistema</h1>
      <p className="text-sm text-muted-foreground">Gerencie os cadastros base do sistema.</p>

      <Tabs defaultValue="materiais">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="materiais">📦 Materiais</TabsTrigger>
            <TabsTrigger value="fornecedores">👥 Fornecedores</TabsTrigger>
            <TabsTrigger value="etapas">📋 Etapas & Tarefas</TabsTrigger>
            <TabsTrigger value="tipos_obra">🏗️ Tipos de Obra</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="materiais" className="space-y-3 mt-4">
          <CrudCollapsible
            table="unidades_medida"
            label="unidade"
            title="Unidades de Medida"
            icon="📏"
            tooltip="Defina as unidades usadas em produtos e compras (ex: un, m, kg, m²)."
          />
          <CrudCollapsible
            table="categorias_produtos"
            label="categoria"
            title="Categorias de Produto"
            icon="🏷️"
            tooltip="Agrupe produtos por categoria para facilitar buscas e relatórios."
          />
          <ProdutosCollapsible />
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-3 mt-4">
          <CrudCollapsible
            table="tipos_fornecedor"
            label="tipo de fornecedor"
            title="Tipos de Fornecedor"
            icon="👷"
            tooltip="Classifique fornecedores (ex: pedreiro, eletricista, loja de material)."
          />
          <p className="text-xs text-muted-foreground pt-2">
            Para cadastrar fornecedores (profissionais e lojas), acesse a página <strong>Fornecedores</strong>.
          </p>
        </TabsContent>

        <TabsContent value="etapas" className="space-y-3 mt-4">
          <CrudCollapsible
            table="etapas_padrao"
            label="etapa padrão"
            title="Etapas Padrão"
            icon="📋"
            tooltip="Modelos de etapas reutilizadas ao criar novas obras."
          />
          <CrudCollapsible
            table="tarefas_padrao"
            label="tarefa padrão"
            title="Tarefas Padrão"
            icon="✅"
            tooltip="Tarefas frequentes que aparecem ao adicionar itens a uma etapa."
          />
        </TabsContent>

        <TabsContent value="tipos_obra" className="space-y-3 mt-4">
          <CrudCollapsible
            table="tipos_obra"
            label="tipo de obra"
            title="Tipos de Obra"
            icon="🏗️"
            tooltip="Categorize obras por tipo (ex: residencial, comercial, reforma)."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
