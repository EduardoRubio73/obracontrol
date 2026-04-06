import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

type CrudItem = { id: string; nome: string };

function useCrudTab(table: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: [table, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as CrudItem[];
    },
  });

  const add = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase
        .from(table as any)
        .insert({ nome, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Adicionado com sucesso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from(table as any)
        .update({ nome } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Atualizado com sucesso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Removido com sucesso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { items, isLoading, add, update, del };
}

function CrudTabContent({ table, label }: { table: string; label: string }) {
  const { items, isLoading, add, update, del } = useCrudTab(table);
  const [novoNome, setNovoNome] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");

  const handleAdd = () => {
    if (!novoNome.trim()) return;
    add.mutate(novoNome.trim(), { onSuccess: () => setNovoNome("") });
  };

  const startEdit = (item: CrudItem) => {
    setEditingId(item.id);
    setEditingNome(item.nome);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingNome("");
  };

  const saveEdit = () => {
    if (!editingNome.trim() || !editingId) return;
    update.mutate(
      { id: editingId, nome: editingNome.trim() },
      { onSuccess: () => cancelEdit() }
    );
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder={`Novo(a) ${label}...`}
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={!novoNome.trim() || add.isPending}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-1">
          {isLoading && (
            <p className="text-muted-foreground text-sm text-center py-6">
              Carregando...
            </p>
          )}

          {!isLoading && !items?.length && (
            <p className="text-muted-foreground text-sm text-center py-6">
              Nenhum(a) {label} cadastrado(a). Adicione acima.
            </p>
          )}

          {items?.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 px-2 border-b last:border-0 hover:bg-muted/50 rounded-lg transition-colors"
            >
              {editingId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editingNome}
                    onChange={(e) => setEditingNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-9"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={saveEdit}
                    disabled={!editingNome.trim() || update.isPending}
                    className="text-primary shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelEdit}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-foreground">{item.nome}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(item)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => del.mutate(item.id)}
                      disabled={del.isPending}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const Configuracoes = () => {
  return (
    <div className="space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Tabs defaultValue="categorias">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Obra</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias">
          <CrudTabContent table="categorias_produtos" label="categoria" />
        </TabsContent>

        <TabsContent value="tipos">
          <CrudTabContent table="tipos_obra" label="tipo de obra" />
        </TabsContent>

        <TabsContent value="unidades">
          <CrudTabContent table="unidades_medida" label="unidade" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
