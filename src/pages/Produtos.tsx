import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, FolderOpen, Filter } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Produtos = () => {
  const queryClient = useQueryClient();
  const [catDialog, setCatDialog] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; nome: string } | null>(null);
  const [catName, setCatName] = useState("");

  const [prodDialog, setProdDialog] = useState(false);
  const [editProd, setEditProd] = useState<any>(null);
  const [prodName, setProdName] = useState("");
  const [prodUnit, setProdUnit] = useState("un");
  const [prodCatId, setProdCatId] = useState("");

  const [filterCat, setFilterCat] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "cat" | "prod"; id: string; nome: string } | null>(null);

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

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos", filterCat],
    queryFn: async () => {
      let q = supabase
        .from("produtos")
        .select("*, categorias_produtos(nome)")
        .order("nome");
      if (filterCat) q = q.eq("categoria_id", filterCat);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Category mutations
  const saveCat = useMutation({
    mutationFn: async () => {
      if (editCat) {
        const { error } = await supabase
          .from("categorias_produtos")
          .update({ nome: catName })
          .eq("id", editCat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categorias_produtos")
          .insert({ nome: catName });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_produtos"] });
      toast.success(editCat ? "Categoria atualizada!" : "Categoria criada!");
      setCatDialog(false);
      setEditCat(null);
      setCatName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias_produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_produtos"] });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Categoria excluída!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Product mutations
  const saveProd = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: prodName,
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

  const openEditCat = (cat: any) => {
    setEditCat(cat);
    setCatName(cat.nome);
    setCatDialog(true);
  };

  const openNewCat = () => {
    setEditCat(null);
    setCatName("");
    setCatDialog(true);
  };

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
    setProdUnit("un");
    setProdCatId("");
    setProdDialog(true);
  };

  const closeProdDialog = () => {
    setProdDialog(false);
    setEditProd(null);
    setProdName("");
    setProdUnit("un");
    setProdCatId("");
  };

  return (
    <div className="space-y-5 px-1">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Produtos</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1 h-12 text-base font-semibold rounded-xl" onClick={openNewCat}>
            <FolderOpen className="mr-2 h-5 w-5" /> Nova Categoria
          </Button>
          <Button size="lg" className="flex-1 h-12 text-base font-semibold rounded-xl" onClick={openNewProd}>
            <Plus className="mr-2 h-5 w-5" /> Novo Produto
          </Button>
        </div>
      </div>

      {/* Categories */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" /> Categorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2.5">
            <Badge
              variant={filterCat === "" ? "default" : "outline"}
              className="cursor-pointer text-base px-4 py-2 rounded-full"
              onClick={() => setFilterCat("")}
            >
              Todas
            </Badge>
            {categorias?.map((cat) => (
              <div key={cat.id} className="group flex items-center gap-1">
                <Badge
                  variant={filterCat === cat.id ? "default" : "outline"}
                  className="cursor-pointer text-base px-4 py-2 rounded-full"
                  onClick={() => setFilterCat(filterCat === cat.id ? "" : cat.id)}
                >
                  {cat.nome}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
                  onClick={() => openEditCat(cat)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
                  onClick={() => setDeleteConfirm({ type: "cat", id: cat.id, nome: cat.nome })}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            {!categorias?.length && (
              <p className="text-base text-muted-foreground">Nenhuma categoria criada</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products — card list for mobile */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" /> Produtos
            {filterCat && (
              <Badge variant="secondary" className="ml-2 text-sm px-3 py-1 rounded-full">
                <Filter className="mr-1 h-3.5 w-3.5" />
                Filtrando por categoria
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {produtos?.length ? (
            <div className="space-y-3">
              {produtos.map((p: any) => (
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
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setDeleteConfirm({ type: "prod", id: p.id, nome: p.nome })}>
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-base py-8">
              {isLoading ? "Carregando..." : "Nenhum produto cadastrado"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={(v) => { if (!v) { setCatDialog(false); setEditCat(null); setCatName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">{editCat ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base">Nome</Label>
              <Input
                className="h-12 text-base rounded-xl"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ex: Material Elétrico"
              />
            </div>
            <Button
              className="w-full h-12 text-base font-semibold rounded-xl"
              onClick={() => saveCat.mutate()}
              disabled={!catName.trim() || saveCat.isPending}
            >
              {saveCat.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={prodDialog} onOpenChange={(v) => { if (!v) closeProdDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">{editProd ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base">Nome</Label>
              <Input
                className="h-12 text-base rounded-xl"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="Ex: Fio 2.5mm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">Unidade</Label>
              <Input
                className="h-12 text-base rounded-xl"
                value={prodUnit}
                onChange={(e) => setProdUnit(e.target.value)}
                placeholder="un, m, kg, etc."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">Categoria</Label>
              <select
                value={prodCatId}
                onChange={(e) => setProdCatId(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base"
              >
                <option value="">Sem categoria</option>
                {categorias?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <Button
              className="w-full h-12 text-base font-semibold rounded-xl"
              onClick={() => saveProd.mutate()}
              disabled={!prodName.trim() || saveProd.isPending}
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
                if (deleteConfirm?.type === "cat") deleteCat.mutate(deleteConfirm.id);
                else if (deleteConfirm?.type === "prod") deleteProd.mutate(deleteConfirm.id);
                setDeleteConfirm(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Produtos;
