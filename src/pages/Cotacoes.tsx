import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ChevronRight, Check, BarChart3, Plus, Trash2, Link2, Copy,
  PackagePlus, Brain, Mail, Send, Eye, Clock, CheckCircle2, AlertTriangle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-primary/10 text-primary",
  recebendo_propostas: "bg-warning/10 text-warning",
  comparando: "bg-accent text-accent-foreground",
  finalizada: "bg-success/10 text-success",
  cancelada: "bg-destructive/10 text-destructive",
};

const trackingStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  enviado: { label: "Enviado", color: "bg-primary/10 text-primary", icon: <Send className="h-3 w-3" /> },
  visualizado: { label: "Visualizado", color: "bg-warning/10 text-warning", icon: <Eye className="h-3 w-3" /> },
  respondeu: { label: "Respondeu", color: "bg-success/10 text-success", icon: <CheckCircle2 className="h-3 w-3" /> },
  expirado: { label: "Expirado", color: "bg-destructive/10 text-destructive", icon: <AlertTriangle className="h-3 w-3" /> },
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
  const [prodSearch, setProdSearch] = useState("");
  const [selectedProds, setSelectedProds] = useState<Record<string, { nome: string; unidade: string; qtd: string }>>({});
  const [emailDialog, setEmailDialog] = useState<string | null>(null);
  const [emailList, setEmailList] = useState("");
  const [prazoDias, setPrazoDias] = useState("7");

  // Run expiration check on mount
  useEffect(() => {
    supabase.rpc("expirar_cotacoes").then(({ error }) => {
      if (error) console.error("expirar_cotacoes:", error.message);
    });
  }, []);

  const { data: obras } = useQuery({
    queryKey: ["obras-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: fornecedoresDb } = useQuery({
    queryKey: ["fornecedores-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("id, nome, email");
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

  const { data: tracking } = useQuery({
    queryKey: ["cotacao-tracking", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacao_fornecedores")
        .select("*, fornecedores(nome)")
        .eq("cotacao_id", selectedId!)
        .order("created_at");
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

  // Products catalog for multi-select
  const { data: produtosCatalog } = useQuery({
    queryKey: ["produtos-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, categorias_produtos(nome)")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filteredProducts = useMemo(() => {
    if (!produtosCatalog) return [];
    if (!prodSearch) return produtosCatalog;
    const s = prodSearch.toLowerCase();
    return produtosCatalog.filter(
      (p: any) =>
        p.nome.toLowerCase().includes(s) ||
        p.categorias_produtos?.nome?.toLowerCase().includes(s)
    );
  }, [produtosCatalog, prodSearch]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredProducts.forEach((p: any) => {
      const cat = p.categorias_produtos?.nome || "Sem categoria";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts]);

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

  const enviarCotacao = useMutation({
    mutationFn: async ({ cotacaoId, fornecedorIds, prazoDias: dias }: { cotacaoId: string; fornecedorIds: string[]; prazoDias: number }) => {
      const prazoLimite = new Date();
      prazoLimite.setDate(prazoLimite.getDate() + dias);

      const registros = fornecedorIds.map((fId) => {
        const forn = fornecedoresDb?.find((f) => f.id === fId);
        return {
          cotacao_id: cotacaoId,
          fornecedor_id: fId,
          email: forn?.email || null,
          status: "enviado",
          data_envio: new Date().toISOString(),
          prazo_limite: prazoLimite.toISOString(),
        };
      });

      const { error } = await supabase
        .from("cotacao_fornecedores")
        .upsert(registros, { onConflict: "cotacao_id,fornecedor_id" });
      if (error) throw error;

      // Update cotação status
      await supabase
        .from("cotacoes")
        .update({ status: "enviada" })
        .eq("id", cotacaoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      queryClient.invalidateQueries({ queryKey: ["cotacao-tracking", selectedId] });
      toast.success("Cotação enviada para fornecedores!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fmt = (v: number | null) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

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

  const handleEnviarEmails = () => {
    if (!emailDialog) return;
    const cotacao = cotacoes?.find((c) => c.id === emailDialog);
    if (!cotacao) return;

    const token = (cotacao as any).token_publico;
    const link = `${window.location.origin}/cotacao/${token}`;
    const nomeObra = (cotacao.obras as any)?.nome ?? "Obra";
    const prazo = (cotacao as any).data_expiracao ?? "Não definido";

    const emails = emailList
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (!emails.length) {
      toast.error("Informe pelo menos um email válido");
      return;
    }

    const subject = `Solicitação de Orçamento - ${nomeObra}`;
    const body = `Prezados,

Estamos realizando uma cotação referente à obra:

${nomeObra}

Solicitamos o envio da proposta através do link abaixo:

${link}

Prazo para envio: ${prazo}

IMPORTANTE:
O envio deve ser feito exclusivamente pelo formulário para garantir padronização e análise correta.

As propostas serão analisadas com base em critérios técnicos e financeiros.

Atenciosamente,
ObraControl`;

    if (emails.length === 1) {
      window.location.href = `mailto:${encodeURIComponent(emails[0])}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      const [first, ...rest] = emails;
      const cc = rest.map(encodeURIComponent).join(",");
      window.location.href = `mailto:${encodeURIComponent(first)}?cc=${cc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    toast.success(`Email preparado para ${emails.length} fornecedor(es)!`);
    setEmailDialog(null);
    setEmailList("");
  };

  // Send cotação to selected fornecedores
  const [sendDialog, setSendDialog] = useState<string | null>(null);
  const [selectedFornecedores, setSelectedFornecedores] = useState<string[]>([]);

  const handleSendCotacao = () => {
    if (!sendDialog || !selectedFornecedores.length) {
      toast.error("Selecione pelo menos um fornecedor");
      return;
    }
    enviarCotacao.mutate({
      cotacaoId: sendDialog,
      fornecedorIds: selectedFornecedores,
      prazoDias: Number(prazoDias) || 7,
    });

    // Also open mailto with selected fornecedores' emails
    const cotacao = cotacoes?.find((c) => c.id === sendDialog);
    if (cotacao) {
      const token = (cotacao as any).token_publico;
      const link = `${window.location.origin}/cotacao/${token}`;
      const nomeObra = (cotacao.obras as any)?.nome ?? "Obra";
      const emails = selectedFornecedores
        .map((id) => fornecedoresDb?.find((f) => f.id === id)?.email)
        .filter(Boolean) as string[];

      if (emails.length) {
        const subject = `Solicitação de Orçamento - ${nomeObra}`;
        const body = `Prezados,\n\nEstamos realizando uma cotação referente à obra:\n\n${nomeObra}\n\nSolicitamos o envio da proposta através do link abaixo:\n\n${link}\n\nPrazo para envio: ${prazoDias} dias\n\nIMPORTANTE:\nO envio deve ser feito exclusivamente pelo formulário.\n\nAtenciosamente,\nObraControl`;

        const [first, ...rest] = emails;
        const cc = rest.length ? `&cc=${rest.map(encodeURIComponent).join(",")}` : "";
        window.location.href = `mailto:${encodeURIComponent(first)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${cc}`;
      }
    }

    setSendDialog(null);
    setSelectedFornecedores([]);
  };

  const toggleFornecedor = (id: string) => {
    setSelectedFornecedores((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
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
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className={statusColors[cotacao.status ?? ""] ?? ""}>
                  {cotacao.status?.replace("_", " ")}
                </Badge>
                <Button variant="ghost" size="icon" title="Gerenciar itens" onClick={() => setItemDialog(cotacao.id)}>
                  <PackagePlus className="h-4 w-4" />
                </Button>
                {(cotacao as any).token_publico && (
                  <>
                    <Button variant="ghost" size="icon" title="Enviar para fornecedores" onClick={() => { setSendDialog(cotacao.id); setSelectedFornecedores([]); }}>
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Enviar por email manual" onClick={() => { setEmailDialog(cotacao.id); setEmailList(""); }}>
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Copiar link" onClick={() => copyLink((cotacao as any).token_publico)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setSelectedId(cotacao.id)} />
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !cotacoes?.length && (
          <p className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</p>
        )}
      </div>

      {/* Detail Dialog with Tracking */}
      <Dialog open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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

          {/* Tracking Panel */}
          {tracking && tracking.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" /> Status dos Fornecedores
              </h3>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enviado</TableHead>
                      <TableHead>Visualizado</TableHead>
                      <TableHead>Respondido</TableHead>
                      <TableHead>Prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tracking.map((t: any) => {
                      const cfg = trackingStatusConfig[t.status] || trackingStatusConfig.pendente;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.fornecedores?.nome ?? t.email ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("gap-1", cfg.color)}>
                              {cfg.icon} {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{fmtDate(t.data_envio)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(t.data_visualizacao)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(t.data_resposta)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(t.prazo_limite)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile */}
              <div className="space-y-2 md:hidden">
                {tracking.map((t: any) => {
                  const cfg = trackingStatusConfig[t.status] || trackingStatusConfig.pendente;
                  return (
                    <div key={t.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{t.fornecedores?.nome ?? t.email ?? "—"}</span>
                        <Badge variant="secondary" className={cn("gap-1 text-xs", cfg.color)}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <span>Enviado: {fmtDate(t.data_envio)}</span>
                        <span>Visto: {fmtDate(t.data_visualizacao)}</span>
                        <span>Respondido: {fmtDate(t.data_resposta)}</span>
                        <span>Prazo: {fmtDate(t.prazo_limite)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Propostas */}
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
                          <Button variant="ghost" size="icon" onClick={() => aceitar.mutate(p.id)} title="Aceitar proposta">
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
                <>
                  <Button className="flex-1" onClick={() => { const id = selectedId; setSelectedId(null); navigate(`/cotacoes/${id}/comparar`); }}>
                    <BarChart3 className="mr-2 h-4 w-4" /> Comparar
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { const id = selectedId; setSelectedId(null); navigate(`/cotacoes/${id}/analise`); }}>
                    <Brain className="mr-2 h-4 w-4" /> Análise IA
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send to Fornecedores Dialog */}
      <Dialog open={!!sendDialog} onOpenChange={(v) => { if (!v) { setSendDialog(null); setSelectedFornecedores([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" /> Enviar Cotação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os fornecedores cadastrados. O status será rastreado automaticamente.
            </p>

            <div className="space-y-2">
              <Label>Prazo (dias)</Label>
              <Input type="number" value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} min="1" />
            </div>

            <div className="space-y-2">
              <Label>Fornecedores</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-2">
                {fornecedoresDb?.length ? fornecedoresDb.map((f) => (
                  <label
                    key={f.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md p-2 cursor-pointer transition-colors",
                      selectedFornecedores.includes(f.id) ? "bg-primary/10" : "hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFornecedores.includes(f.id)}
                      onChange={() => toggleFornecedor(f.id)}
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{f.nome}</p>
                      {f.email && <p className="text-xs text-muted-foreground">{f.email}</p>}
                    </div>
                  </label>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum fornecedor cadastrado
                  </p>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSendCotacao}
              disabled={!selectedFornecedores.length || enviarCotacao.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {enviarCotacao.isPending ? "Enviando..." : `Enviar para ${selectedFornecedores.length} fornecedor(es)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Email Dialog */}
      <Dialog open={!!emailDialog} onOpenChange={(v) => { if (!v) { setEmailDialog(null); setEmailList(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Email Manual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe emails manualmente. O app de email será aberto com a mensagem pronta.
            </p>
            <div className="space-y-2">
              <Label>Emails dos fornecedores</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={"fornecedor1@email.com\nfornecedor2@email.com"}
                value={emailList}
                onChange={(e) => setEmailList(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separe por vírgula, ponto-e-vírgula ou quebra de linha</p>
            </div>
            <Button className="w-full" onClick={handleEnviarEmails}>
              <Mail className="mr-2 h-4 w-4" /> Abrir Email
            </Button>
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
            <div className="flex gap-2">
              <Input placeholder="Nome do item" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="flex-1" />
              <Input placeholder="Qtd" type="number" value={newItemQtd} onChange={(e) => setNewItemQtd(e.target.value)} className="w-20" />
              <Input placeholder="Un" value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} className="w-16" />
              <Button size="icon" onClick={handleAddItem} disabled={addItem.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
                        <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)}>
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
