import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const Configuracoes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [novaCat, setNovaCat] = useState("");

  // Categorias
  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias_produtos").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCat = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("categorias_produtos").insert({ nome, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      setNovaCat("");
      toast.success("Categoria adicionada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias_produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      toast.success("Removida");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tiposObra = ["Casa", "Reforma", "Apartamento", "Comercial", "Industrial"];
  const unidades = ["un", "m²", "m³", "kg", "litro", "saco", "peça", "metro"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Obra</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nova categoria..."
              value={novaCat}
              onChange={(e) => setNovaCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && novaCat.trim() && addCat.mutate(novaCat.trim())}
            />
            <Button onClick={() => novaCat.trim() && addCat.mutate(novaCat.trim())} disabled={!novaCat.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 space-y-2">
              {categorias?.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span>{c.nome}</span>
                  <Button variant="ghost" size="icon" onClick={() => delCat.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {!categorias?.length && <p className="text-muted-foreground text-sm text-center py-4">Nenhuma categoria</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Tipos de Obra Disponíveis</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {tiposObra.map((t) => (
                <div key={t} className="py-2 border-b last:border-0 text-sm">{t}</div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unidades" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Unidades de Medida</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {unidades.map((u) => (
                <div key={u} className="py-2 border-b last:border-0 text-sm">{u}</div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
