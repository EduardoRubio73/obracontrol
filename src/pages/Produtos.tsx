import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewCat}>
            <FolderOpen className="mr-2 h-4 w-4" /> Nova Categoria
          </Button>
          <Button onClick={openNewProd}>
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
        </div>
      </div>

      {/* Categories row */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Categorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filterCat === "" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterCat("")}
            >
              Todas
            </Badge>
            {categorias?.map((cat) => (
              <div key={cat.id} className="group flex items-center gap-1">
                <Badge
                  variant={filterCat === cat.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilterCat(filterCat === cat.id ? "" : cat.id)}
                >
                  {cat.nome}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => openEditCat(cat)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteConfirm({ type: "cat", id: cat.id, nome: cat.nome })}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
            {!categorias?.length && (
              <p className="text-sm text-muted-foreground">Nenhuma categoria criada</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Produtos
            {filterCat && (
              <Badge variant="secondary" className="ml-2 text-xs">
                <Filter className="mr-1 h-3 w-3" />
                Filtrando por categoria
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {produtos?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{p.unidade}</TableCell>
                    <TableCell>
                      {p.categorias_produtos?.nome ? (
                        <Badge variant="outline">{p.categorias_produtos.nome}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditProd(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteProd.mutate(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {isLoading ? "Carregando..." : "Nenhum produto cadastrado"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={(v) => { if (!v) { setCatDialog(false); setEditCat(null); setCatName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCat ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ex: Material Elétrico"
              />
            </div>
            <Button
              className="w-full"
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
            <DialogTitle>{editProd ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="Ex: Fio 2.5mm"
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input
                value={prodUnit}
                onChange={(e) => setProdUnit(e.target.value)}
                placeholder="un, m, kg, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select
                value={prodCatId}
                onChange={(e) => setProdCatId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sem categoria</option>
                {categorias?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              onClick={() => saveProd.mutate()}
              disabled={!prodName.trim() || saveProd.isPending}
            >
              {saveProd.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
