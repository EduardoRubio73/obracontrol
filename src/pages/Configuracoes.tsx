import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

function useCrudTab(table: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [novoNome, setNovoNome] = useState("");

  const { data: items } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const add = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from(table as any).insert({ nome, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      setNovoNome("");
      toast.success("Adicionado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { items, novoNome, setNovoNome, add, del };
}

function CrudTabContent({ table }: { table: string }) {
  const { items, novoNome, setNovoNome, add, del } = useCrudTab(table);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Novo item..."
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && novoNome.trim() && add.mutate(novoNome.trim())}
        />
        <Button onClick={() => novoNome.trim() && add.mutate(novoNome.trim())} disabled={!novoNome.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Card>
        <CardContent className="p-4 space-y-2">
          {items?.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <span>{c.nome}</span>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {!items?.length && (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum item cadastrado</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const Configuracoes = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Obra</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias">
          <CrudTabContent table="categorias_produtos" />
        </TabsContent>

        <TabsContent value="tipos">
          <CrudTabContent table="tipos_obra" />
        </TabsContent>

        <TabsContent value="unidades">
          <CrudTabContent table="unidades_medida" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
