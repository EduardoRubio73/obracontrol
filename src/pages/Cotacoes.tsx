import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronRight, Check, BarChart3, Plus, Trash2, Link2, Copy, PackagePlus, Brain, Mail,
} from "lucide-react";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-primary/10 text-primary",
  recebendo_propostas: "bg-warning/10 text-warning",
  comparando: "bg-accent text-accent-foreground",
  finalizada: "bg-success/10 text-success",
  cancelada: "bg-destructive/10 text-destructive",
};

const Cotacoes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newCotacao, setNewCotacao] = useState(false);
  const [itemDialog, setItemDialog] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQtd, setNewItemQtd] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("un");
  const [emailDialog, setEmailDialog] = useState<string | null>(null);
  const [emailList, setEmailList] = useState("");

  const { data: obras } = useQuery({
    queryKey: ["obras-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: cotacoes, isLoading } = useQuery({
    queryKey: ["cotacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*, obras(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: propostas } = useQuery({
    queryKey: ["propostas", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*, fornecedores(nome)")
        .eq("cotacao_id", selectedId!)
        .order("valor", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["itens-cotacao", itemDialog],
    enabled: !!itemDialog,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_cotacao")
        .select("*")
        .eq("cotacao_id", itemDialog!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const createCotacao = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("cotacoes").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      toast.success("Cotação criada!");
      setNewCotacao(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async (values: { cotacao_id: string; nome: string; quantidade: number; unidade: string }) => {
      const { error } = await supabase.from("itens_cotacao").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens-cotacao", itemDialog] });
      setNewItemName("");
      setNewItemQtd("1");
      toast.success("Item adicionado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itens_cotacao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["itens-cotacao", itemDialog] }),
  });

  const aceitar = useMutation({
    mutationFn: async (propostaId: string) => {
      const { error } = await supabase
        .from("propostas")
        .update({ status: "aceita" })
        .eq("id", propostaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas", selectedId] });
      toast.success("Proposta aceita!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fmt = (v: number | null) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const selected = cotacoes?.find((c) => c.id === selectedId);

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/cotacao/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleNewCotacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createCotacao.mutate({
      obra_id: fd.get("obra_id"),
      descricao: fd.get("descricao"),
      data_expiracao: fd.get("data_expiracao") || null,
    });
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !itemDialog) return;
    addItem.mutate({
      cotacao_id: itemDialog,
      nome: newItemName.trim(),
      quantidade: Number(newItemQtd) || 1,
      unidade: newItemUnit || "un",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cotações</h1>
        <Dialog open={newCotacao} onOpenChange={setNewCotacao}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Cotação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Cotação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleNewCotacao} className="space-y-4">
              <div className="space-y-2">
                <Label>Obra</Label>
                <select name="obra_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Selecione</option>
                  {obras?.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input name="descricao" required placeholder="Ex: Material elétrico" />
              </div>
              <div className="space-y-2">
                <Label>Data de Expiração</Label>
                <Input name="data_expiracao" type="date" />
              </div>
              <Button type="submit" className="w-full" disabled={createCotacao.isPending}>
                {createCotacao.isPending ? "Criando..." : "Criar Cotação"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {cotacoes?.map((cotacao) => (
          <Card key={cotacao.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="flex items-center justify-between p-4">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setSelectedId(cotacao.id)}
              >
                <p className="font-medium">{cotacao.descricao}</p>
                <p className="text-sm text-muted-foreground">
                  {(cotacao.obras as any)?.nome ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={statusColors[cotacao.status ?? ""] ?? ""}>
                  {cotacao.status?.replace("_", " ")}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Gerenciar itens"
                  onClick={() => setItemDialog(cotacao.id)}
                >
                  <PackagePlus className="h-4 w-4" />
                </Button>
                {(cotacao as any).token_publico && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Copiar link público"
                    onClick={() => copyLink((cotacao as any).token_publico)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground cursor-pointer"
                  onClick={() => setSelectedId(cotacao.id)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !cotacoes?.length && (
          <p className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</p>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.descricao}</DialogTitle>
          </DialogHeader>

          {(selected as any)?.token_publico && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <code className="flex-1 text-xs truncate">
                {window.location.origin}/cotacao/{(selected as any).token_publico}
              </code>
              <Button size="sm" variant="outline" onClick={() => copyLink((selected as any).token_publico)}>
                <Copy className="mr-1 h-3 w-3" /> Copiar
              </Button>
            </div>
          )}

          <div>
            <h3 className="mb-3 font-semibold">Propostas</h3>
            {propostas?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Prazo (dias)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propostas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{(p.fornecedores as any)?.nome ?? "—"}</TableCell>
                      <TableCell>{fmt(p.valor)}</TableCell>
                      <TableCell>{p.prazo_dias ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {p.status !== "aceita" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => aceitar.mutate(p.id)}
                            title="Aceitar proposta"
                          >
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma proposta recebida</p>
            )}

            <div className="mt-4 flex gap-2">
              {propostas && propostas.length >= 2 && (
                <Button
                  className="flex-1"
                  onClick={() => {
                    const id = selectedId;
                    setSelectedId(null);
                    navigate(`/cotacoes/${id}/comparar`);
                  }}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Comparar
                </Button>
              )}
              {propostas && propostas.length >= 2 && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const id = selectedId;
                    setSelectedId(null);
                    navigate(`/cotacoes/${id}/analise`);
                  }}
                >
                  <Brain className="mr-2 h-4 w-4" />
                  Análise IA
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Items Management Dialog */}
      <Dialog open={!!itemDialog} onOpenChange={(v) => !v && setItemDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Itens da Cotação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add item form */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome do item"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Qtd"
                type="number"
                value={newItemQtd}
                onChange={(e) => setNewItemQtd(e.target.value)}
                className="w-20"
              />
              <Input
                placeholder="Un"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="w-16"
              />
              <Button size="icon" onClick={handleAddItem} disabled={addItem.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items list */}
            {itens?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Un</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.nome}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>{item.unidade}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteItem.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum item definido. Adicione itens para os fornecedores preencherem.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cotacoes;
