import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X, HelpCircle } from "lucide-react";

type CrudItem = { id: string; nome: string; descricao?: string | null };

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
    mutationFn: async ({ nome, descricao }: { nome: string; descricao?: string }) => {
      // Anti-duplicidade
      const dup = (items ?? []).find(
        (i) => i.nome.toLowerCase().trim() === nome.toLowerCase().trim()
      );
      if (dup) throw new Error(`Já existe um item com o nome "${nome}".`);
      const { error } = await supabase
        .from(table as any)
        .insert({ nome, descricao: descricao || null, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Adicionado!");
    },
    onError: (e: any) => {
      if (e.message?.includes("violates foreign key") || e.message?.includes("RESTRICT")) {
        toast.error("Não é possível: este item está sendo usado em outro cadastro.");
      } else {
        toast.error(e.message);
      }
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, nome, descricao }: { id: string; nome: string; descricao?: string }) => {
      const dup = (items ?? []).find(
        (i) => i.id !== id && i.nome.toLowerCase().trim() === nome.toLowerCase().trim()
      );
      if (dup) throw new Error(`Já existe outro item com o nome "${nome}".`);
      const { error } = await supabase
        .from(table as any)
        .update({ nome, descricao: descricao || null } as any)
        .eq("id", id);
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
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Removido!");
    },
    onError: (e: any) => {
      if (e.message?.includes("violates foreign key") || e.message?.includes("RESTRICT") || e.code === "23503") {
        toast.error("Não é possível excluir: este item está sendo usado em outro cadastro.");
      } else {
        toast.error(e.message);
      }
    },
  });

  return { items, isLoading, add, update, del };
}

function CrudSection({
  table,
  label,
  title,
  tooltip,
}: {
  table: string;
  label: string;
  title: string;
  tooltip?: string;
}) {
  const { items, isLoading, add, update, del } = useCrudTab(table);
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [editingDescricao, setEditingDescricao] = useState("");

  const dupName = !!items?.find(
    (i) => i.nome.toLowerCase().trim() === novoNome.toLowerCase().trim()
  );

  const handleAdd = () => {
    if (!novoNome.trim() || dupName) return;
    add.mutate(
      { nome: novoNome.trim(), descricao: novaDescricao.trim() },
      { onSuccess: () => { setNovoNome(""); setNovaDescricao(""); } }
    );
  };

  const startEdit = (item: CrudItem) => {
    setEditingId(item.id);
    setEditingNome(item.nome);
    setEditingDescricao(item.descricao ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingNome("");
    setEditingDescricao("");
  };

  const saveEdit = () => {
    if (!editingNome.trim() || !editingId) return;
    update.mutate(
      { id: editingId, nome: editingNome.trim(), descricao: editingDescricao.trim() },
      { onSuccess: () => cancelEdit() }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-2">
        <Input
          placeholder={`Novo(a) ${label}...`}
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        {dupName && novoNome.trim() && (
          <p className="text-xs text-warning">⚠️ Já existe "{novoNome}"</p>
        )}
        <Input
          placeholder="Descrição (opcional)"
          value={novaDescricao}
          onChange={(e) => setNovaDescricao(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button
          onClick={handleAdd}
          disabled={!novoNome.trim() || dupName || add.isPending}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 space-y-1">
          {isLoading && (
            <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
          )}

          {!isLoading && !items?.length && (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhum(a) {label} cadastrado(a).
            </p>
          )}

          {items?.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between py-2 px-2 border-b last:border-0 hover:bg-muted/50 rounded-lg transition-colors"
            >
              {editingId === item.id ? (
                <div className="flex flex-col gap-2 flex-1 mr-2">
                  <Input
                    value={editingNome}
                    onChange={(e) => setEditingNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-9"
                    autoFocus
                    placeholder="Nome"
                  />
                  <Input
                    value={editingDescricao}
                    onChange={(e) => setEditingDescricao(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-9"
                    placeholder="Descrição (opcional)"
                  />
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
                    {item.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.descricao}</p>
                    )}
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
        </CardContent>
      </Card>
    </div>
  );
}

const Configuracoes = () => {
  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <h1 className="text-xl sm:text-2xl font-bold">Config. Sistema</h1>
      <p className="text-sm text-muted-foreground">
        Gerencie os cadastros base do sistema.
      </p>

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

        <TabsContent value="materiais" className="space-y-6 mt-4">
          <CrudSection
            table="unidades_medida"
            label="unidade"
            title="Unidades de Medida"
            tooltip="Defina as unidades usadas em produtos e compras (ex: un, m, kg, m²)."
          />
          <CrudSection
            table="categorias_produtos"
            label="categoria"
            title="Categorias de Produto"
            tooltip="Agrupe produtos por categoria para facilitar buscas e relatórios."
          />
          <p className="text-xs text-muted-foreground pt-2">
            Para cadastrar produtos, acesse a página <strong>Produtos</strong>.
          </p>
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-6 mt-4">
          <CrudSection
            table="tipos_fornecedor"
            label="tipo de fornecedor"
            title="Tipos de Fornecedor"
            tooltip="Classifique fornecedores (ex: pedreiro, eletricista, loja de material)."
          />
          <p className="text-xs text-muted-foreground pt-2">
            Para cadastrar fornecedores (profissionais e lojas), acesse a página <strong>Fornecedores</strong>.
          </p>
        </TabsContent>

        <TabsContent value="etapas" className="space-y-6 mt-4">
          <CrudSection
            table="etapas_padrao"
            label="etapa padrão"
            title="Etapas Padrão"
            tooltip="Modelos de etapas reutilizadas ao criar novas obras."
          />
          <CrudSection
            table="tarefas_padrao"
            label="tarefa padrão"
            title="Tarefas Padrão"
            tooltip="Tarefas frequentes que aparecem ao adicionar itens a uma etapa."
          />
        </TabsContent>

        <TabsContent value="tipos_obra" className="space-y-6 mt-4">
          <CrudSection
            table="tipos_obra"
            label="tipo de obra"
            title="Tipos de Obra"
            tooltip="Categorize obras por tipo (ex: residencial, comercial, reforma)."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
