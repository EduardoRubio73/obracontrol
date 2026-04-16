import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SmartCombobox } from "@/components/ui/smart-combobox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Search, HelpCircle } from "lucide-react";
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

const Produtos = () => {
  const queryClient = useQueryClient();

  const [prodDialog, setProdDialog] = useState(false);
  const [editProd, setEditProd] = useState<any>(null);
  const [prodName, setProdName] = useState("");
  const [prodUnit, setProdUnit] = useState("");
  const [prodCatId, setProdCatId] = useState("");

  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);

  const { data: categorias } = useQuery({
    queryKey: ["categorias_produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_produtos")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: unidades } = useQuery({
    queryKey: ["unidades_medida"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades_medida")
        .select("*")
        .order("nome");
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

  const filteredProdutos = useMemo(() => {
    return (produtos ?? []).filter((p: any) => {
      if (filterCat && p.categoria_id !== filterCat) return false;
      if (search.trim() && !p.nome.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [produtos, filterCat, search]);

  // Create new category inline
  const createCategoria = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from("categorias_produtos")
        .insert({ nome })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newCat: any) => {
      queryClient.invalidateQueries({ queryKey: ["categorias_produtos"] });
      setProdCatId(newCat.id);
      toast.success("Categoria criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createUnidade = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from("unidades_medida")
        .insert({ nome })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newUnit: any) => {
      queryClient.invalidateQueries({ queryKey: ["unidades_medida"] });
      setProdUnit(newUnit.nome);
      toast.success("Unidade criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveProd = useMutation({
    mutationFn: async () => {
      // Anti-duplicidade
      const dup = (produtos ?? []).find(
        (p: any) =>
          p.nome.toLowerCase().trim() === prodName.toLowerCase().trim() &&
          p.id !== editProd?.id
      );
      if (dup) throw new Error(`Já existe um produto com o nome "${prodName}".`);

      const payload = {
        nome: prodName.trim(),
        unidade: prodUnit || "un",
        categoria_id: prodCatId || null,
      };
      if (editProd) {
        const { error } = await supabase
          .from("produtos")
          .update(payload)
          .eq("id", editProd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(editProd ? "Produto atualizado!" : "Produto criado!");
      closeProdDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteProd = useMutation({
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

  const openEditProd = (p: any) => {
    setEditProd(p);
    setProdName(p.nome);
    setProdUnit(p.unidade || "un");
    setProdCatId(p.categoria_id || "");
    setProdDialog(true);
  };

  const openNewProd = () => {
    setEditProd(null);
    setProdName("");
    setProdUnit("");
    setProdCatId("");
    setProdDialog(true);
  };

  const closeProdDialog = () => {
    setProdDialog(false);
    setEditProd(null);
    setProdName("");
    setProdUnit("");
    setProdCatId("");
  };

  const dupNameInDialog = (produtos ?? []).some(
    (p: any) =>
      p.nome.toLowerCase().trim() === prodName.toLowerCase().trim() &&
      p.id !== editProd?.id
  );

  const categoriaOptions = useMemo(
    () => [
      { value: "", label: "Todas as categorias" },
      ...((categorias ?? []).map((c) => ({ value: c.id, label: c.nome }))),
    ],
    [categorias]
  );

  const categoriaOptionsModal = useMemo(
    () => (categorias ?? []).map((c) => ({ value: c.id, label: c.nome })),
    [categorias]
  );

  const unidadeOptions = useMemo(
    () => (unidades ?? []).map((u) => ({ value: u.nome, label: u.nome })),
    [unidades]
  );

  return (
    <TooltipProvider>
      <div className="space-y-5 px-1 max-w-4xl mx-auto pb-28">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Produtos</h1>
          <Button size="lg" className="h-12 text-base font-semibold rounded-xl" onClick={openNewProd}>
            <Plus className="mr-2 h-5 w-5" /> Novo Produto
          </Button>
        </div>

        {/* Search + Filter */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto pelo nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 text-base rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                Filtrar por categoria
              </Label>
              <SmartCombobox
                options={categoriaOptions}
                value={filterCat}
                onChange={setFilterCat}
                placeholder="Todas as categorias"
                allowCreate={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Products list */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" /> Produtos
              <Badge variant="secondary" className="ml-2">
                {filteredProdutos.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProdutos.length ? (
              <div className="space-y-3">
                {filteredProdutos.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border p-4 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold truncate">{p.nome}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-sm px-3 py-0.5 rounded-full">
                          {p.unidade || "un"}
                        </Badge>
                        {p.categorias_produtos?.nome && (
                          <Badge variant="outline" className="text-sm px-3 py-0.5 rounded-full">
                            {p.categorias_produtos.nome}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => openEditProd(p)}>
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setDeleteConfirm({ id: p.id, nome: p.nome })}>
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-base py-8">
                {isLoading ? "Carregando..." : (search || filterCat ? "Nenhum produto encontrado com os filtros aplicados" : "Nenhum produto cadastrado")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Product Dialog */}
        <Dialog open={prodDialog} onOpenChange={(v) => { if (!v) closeProdDialog(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">{editProd ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-base">Nome</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">Use um nome descritivo. Não é permitido nomes duplicados.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  className="h-12 text-base rounded-xl"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Fio elétrico 2.5mm"
                />
                {dupNameInDialog && prodName.trim() && (
                  <p className="text-xs text-warning">⚠️ Já existe um produto com esse nome</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-base">Unidade</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">Informe a unidade de medida para controle de estoque (ex: un, m, kg, m²).</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <SmartCombobox
                  options={unidadeOptions}
                  value={prodUnit}
                  onChange={setProdUnit}
                  onCreateNew={(label) => createUnidade.mutate(label)}
                  placeholder="Digite ou selecione (ex: un, m, kg)"
                  emptyText="Nenhuma unidade. Digite para criar."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-base">Categoria</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">Categorize o produto. Você pode criar uma nova categoria digitando.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <SmartCombobox
                  options={categoriaOptionsModal}
                  value={prodCatId}
                  onChange={setProdCatId}
                  onCreateNew={(label) => createCategoria.mutate(label)}
                  placeholder="Digite ou selecione uma categoria"
                  emptyText="Nenhuma categoria. Digite para criar."
                />
              </div>

              <Button
                className="w-full h-12 text-base font-semibold rounded-xl"
                onClick={() => saveProd.mutate()}
                disabled={!prodName.trim() || dupNameInDialog || saveProd.isPending}
              >
                {saveProd.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Tem certeza que deseja excluir <strong>{deleteConfirm?.nome}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11 text-base rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11 text-base rounded-xl"
                onClick={() => {
                  if (deleteConfirm) deleteProd.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default Produtos;
