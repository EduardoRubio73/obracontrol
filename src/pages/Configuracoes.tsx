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
import { Plus, Trash2, Pencil, Check, X, HelpCircle, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CrudItem = { id: string; nome: string; descricao?: string | null; etapa_padrao_id?: string | null };

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
    mutationFn: async ({ nome, descricao, extra }: { nome: string; descricao?: string; extra?: Record<string, unknown> }) => {
      const dup = (items ?? []).find((i) => (i.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim());
      if (dup) throw new Error(`Já existe um item com o nome "${nome}".`);
      const { error } = await supabase.from(table as any).insert({ nome, descricao: descricao || null, user_id: user!.id, ...extra } as any);
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
    mutationFn: async ({ id, nome, descricao, extra }: { id: string; nome: string; descricao?: string; extra?: Record<string, unknown> }) => {
      const dup = (items ?? []).find((i) => i.id !== id && (i.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim());
      if (dup) throw new Error(`Já existe outro item com o nome "${nome}".`);
      const { error } = await supabase.from(table as any).update({ nome, descricao: descricao || null, ...extra } as any).eq("id", id);
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

/* ----------------- Tarefa Padrão body (com grupo/etapa) ----------------- */
function TarefaPadraoBody() {
  const { user } = useAuth();
  const { items, isLoading, add, update, del } = useCrudTab("tarefas_padrao");
  const queryClient = useQueryClient();
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoEtapaId, setNovoEtapaId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [editingDescricao, setEditingDescricao] = useState("");
  const [editingEtapaId, setEditingEtapaId] = useState("");

  const { data: etapasPadrao } = useQuery({
    queryKey: ["etapas_padrao", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("etapas_padrao").select("id, nome").order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const etapaNomeById = (id?: string | null) => etapasPadrao?.find((e) => e.id === id)?.nome ?? null;
  const dupName = !!items?.find((i) => (i.nome ?? "").toLowerCase().trim() === novoNome.toLowerCase().trim());

  const handleAdd = () => {
    if (!novoNome.trim() || dupName) return;
    add.mutate(
      { nome: novoNome.trim(), descricao: novaDescricao.trim(), extra: { etapa_padrao_id: novoEtapaId || null } },
      {
        onSuccess: () => {
          setNovoNome(""); setNovaDescricao(""); setNovoEtapaId("");
          queryClient.invalidateQueries({ queryKey: ["tarefas-padrao-contagem-por-etapa"] });
        },
      }
    );
  };

  const startEdit = (item: CrudItem) => {
    setEditingId(item.id);
    setEditingNome(item.nome);
    setEditingDescricao(item.descricao ?? "");
    setEditingEtapaId(item.etapa_padrao_id ?? "");
  };
  const cancelEdit = () => { setEditingId(null); setEditingNome(""); setEditingDescricao(""); setEditingEtapaId(""); };
  const saveEdit = () => {
    if (!editingNome.trim() || !editingId) return;
    update.mutate(
      { id: editingId, nome: editingNome.trim(), descricao: editingDescricao.trim(), extra: { etapa_padrao_id: editingEtapaId || null } },
      {
        onSuccess: () => {
          cancelEdit();
          queryClient.invalidateQueries({ queryKey: ["tarefas-padrao-contagem-por-etapa"] });
        },
      }
    );
  };

  const EtapaSelect = ({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger className={className}><SelectValue placeholder="Pertence à etapa (opcional)" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhuma (tarefa avulsa)</SelectItem>
        {(etapasPadrao ?? []).map((e) => (
          <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-2">
        <Input placeholder="Nova tarefa padrão..." value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        {dupName && novoNome.trim() && <p className="text-xs text-warning">⚠️ Já existe "{novoNome}"</p>}
        <Input placeholder="Descrição (opcional)" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <EtapaSelect value={novoEtapaId} onChange={setNovoEtapaId} />
        <Button onClick={handleAdd} disabled={!novoNome.trim() || dupName || add.isPending} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="space-y-1">
        {isLoading && <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>}
        {!isLoading && !items?.length && (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma tarefa padrão cadastrada.</p>
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
                <EtapaSelect value={editingEtapaId} onChange={setEditingEtapaId} className="h-9" />
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
                  {etapaNomeById(item.etapa_padrao_id) && (
                    <Badge variant="outline" className="text-xs mt-1">{etapaNomeById(item.etapa_padrao_id)}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-8 w-8">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      del.mutate(item.id, {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ["tarefas-padrao-contagem-por-etapa"] });
                        },
                      })
                    }
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
      </div>
    </div>
  );
}

/* ----------------- Etapa Padrão body (com contagem de tarefas do grupo) ----------------- */
function EtapaPadraoBody() {
  const { items, isLoading, add, update, del } = useCrudTab("etapas_padrao");
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [editingDescricao, setEditingDescricao] = useState("");

  const { data: contagemPorEtapa } = useQuery({
    queryKey: ["tarefas-padrao-contagem-por-etapa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas_padrao" as any)
        .select("etapa_padrao_id")
        .not("etapa_padrao_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { etapa_padrao_id: string }[]) {
        counts[row.etapa_padrao_id] = (counts[row.etapa_padrao_id] ?? 0) + 1;
      }
      return counts;
    },
  });

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
        <Input placeholder="Nova etapa padrão..." value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        {dupName && novoNome.trim() && <p className="text-xs text-warning">⚠️ Já existe "{novoNome}"</p>}
        <Input placeholder="Descrição (opcional)" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <Button onClick={handleAdd} disabled={!novoNome.trim() || dupName || add.isPending} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="space-y-1">
        {isLoading && <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>}
        {!isLoading && !items?.length && (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma etapa padrão cadastrada.</p>
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
                  {!!contagemPorEtapa?.[item.id] && (
                    <Badge variant="secondary" className="text-xs mt-1">{contagemPorEtapa[item.id]} tarefa(s)</Badge>
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
      </div>
    </div>
  );
}

function EtapasPadraoCollapsible() {
  const { user } = useAuth();
  const { data: items } = useQuery({
    queryKey: ["etapas_padrao", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("etapas_padrao").select("id");
      return data ?? [];
    },
  });
  return (
    <CollapsibleCard
      title="Etapas Padrão"
      icon="📋"
      tooltip="Modelos de etapas reutilizadas ao criar novas obras. O contador mostra quantas tarefas padrão já estão vinculadas a cada uma."
      count={items?.length}
    >
      <EtapaPadraoBody />
    </CollapsibleCard>
  );
}

function TarefasPadraoCollapsible() {
  const { user } = useAuth();
  const { data: items } = useQuery({
    queryKey: ["tarefas_padrao", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("tarefas_padrao").select("id");
      return data ?? [];
    },
  });
  return (
    <CollapsibleCard
      title="Tarefas Padrão"
      icon="✅"
      tooltip="Tarefas frequentes que aparecem ao adicionar itens a uma etapa. Vincule a uma etapa padrão para poder carregar todas de uma vez ao criar uma etapa com esse nome."
      count={items?.length}
    >
      <TarefaPadraoBody />
    </CollapsibleCard>
  );
}

/* ----------------- Fornecedores section body ----------------- */
function FornecedoresBody() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [filtroCategoria, setFiltroCategoria] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("ativo");

  const { data: fornecedores, isLoading } = useQuery({
    queryKey: ["fornecedores", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("user_id", user!.id)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tipos } = useQuery({
    queryKey: ["tipos_fornecedor"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_fornecedor").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["fornecedores-categorias", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("categoria")
        .eq("user_id", user!.id)
        .not("categoria", "is", null);
      if (error) throw error;
      const cats = [...new Set((data ?? []).map((f: any) => f.categoria))].sort();
      return cats;
    },
  });

  const filtrados = useMemo(() => {
    return (fornecedores ?? []).filter((f: any) => {
      if (busca.trim() && !(f.nome ?? "").toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroTipo !== "all" && f.tipo !== filtroTipo) return false;
      if (filtroStatus !== "all" && f.status !== filtroStatus) return false;
      if (filtroCategoria !== "all" && f.categoria !== filtroCategoria) return false;
      return true;
    });
  }, [fornecedores, busca, filtroTipo, filtroStatus, filtroCategoria]);

  const save = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Nome é obrigatório");
      const dup = (fornecedores ?? []).find(
        (f: any) => (f.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim() && f.id !== edit?.id
      );
      if (dup) throw new Error(`Já existe fornecedor com o nome "${nome}"`);

      const payload = {
        nome: nome.trim(),
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        cnpj: cnpj.trim() || null,
        endereco: endereco.trim() || null,
        categoria: categoria || null,
        tipo: tipo || null,
        status: status || "ativo",
      };

      if (edit) {
        const { error } = await supabase.from("fornecedores").update(payload).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fornecedores").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores-categorias", user?.id] });
      toast.success(edit ? "Fornecedor atualizado!" : "Fornecedor criado!");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores-categorias", user?.id] });
      toast.success("Fornecedor removido!");
    },
    onError: (e: any) => {
      if (e.code === "23503") {
        toast.error("Não é possível excluir: este fornecedor está vinculado a cotações ou compras.");
      } else toast.error(e.message);
    },
  });

  const openNew = () => {
    setEdit(null);
    setNome("");
    setEmail("");
    setTelefone("");
    setCnpj("");
    setEndereco("");
    setCategoria("");
    setTipo("");
    setStatus("ativo");
    setDialog(true);
  };

  const openEdit = (f: any) => {
    setEdit(f);
    setNome(f.nome);
    setEmail(f.email || "");
    setTelefone(f.telefone || "");
    setCnpj(f.cnpj || "");
    setEndereco(f.endereco || "");
    setCategoria(f.categoria || "");
    setTipo(f.tipo || "");
    setStatus(f.status || "ativo");
    setDialog(true);
  };

  const closeDialog = () => {
    setDialog(false);
    setEdit(null);
    setNome("");
    setEmail("");
    setTelefone("");
    setCnpj("");
    setEndereco("");
    setCategoria("");
    setTipo("");
    setStatus("ativo");
  };

  const abrirWhatsApp = (telefone: string) => {
    if (!telefone.trim()) return;
    const tel = telefone.replace(/\D/g, "");
    window.open(`https://wa.me/55${tel}`, "_blank");
  };

  const abrirEmail = (email: string) => {
    if (!email.trim()) return;
    window.location.href = `mailto:${email}`;
  };

  const abrirLigacao = (telefone: string) => {
    if (!telefone.trim()) return;
    window.location.href = `tel:${telefone}`;
  };

  const getBadgeVariant = (status: string) => {
    if (status === "ativo") return "default";
    if (status === "alerta") return "secondary";
    if (status === "bloqueado") return "destructive";
    return "outline";
  };

  const dupInDialog = (fornecedores ?? []).some(
    (f: any) => (f.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim() && f.id !== edit?.id
  );

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-col sm:flex-row gap-2 items-end">
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1"
        />
        <Button onClick={openNew} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {(tipos ?? []).map((t: any) => (
                <SelectItem key={t.id} value={t.nome}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">✅ Ativo</SelectItem>
              <SelectItem value="alerta">⚠️ Alerta</SelectItem>
              <SelectItem value="bloqueado">❌ Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {(categorias ?? []).map((c: string) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1 border rounded-lg divide-y max-h-96 overflow-y-auto">
        {isLoading && <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>}
        {!isLoading && !filtrados.length && (
          <p className="text-muted-foreground text-sm text-center py-4">
            {fornecedores?.length ? "Nenhum fornecedor encontrado com os filtros" : "Nenhum fornecedor cadastrado"}
          </p>
        )}
        {filtrados.map((f: any) => (
          <div key={f.id} className="py-3 px-3 hover:bg-muted/50 transition-colors space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{f.nome}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {f.email && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      📧 {f.email}
                    </span>
                  )}
                  {f.telefone && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      ☎️ {f.telefone}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {f.cnpj && <Badge variant="outline" className="text-xs">🔢 {f.cnpj}</Badge>}
                  {f.endereco && <Badge variant="outline" className="text-xs">📍 {f.endereco}</Badge>}
                  {f.categoria && <Badge variant="outline" className="text-xs">🏷️ {f.categoria}</Badge>}
                  {f.tipo && <Badge variant="outline" className="text-xs">👷 {f.tipo}</Badge>}
                  {f.status && <Badge variant={getBadgeVariant(f.status)} className="text-xs">🎯 {f.status}</Badge>}
                  {f.score !== null && f.score !== undefined && (
                    <Badge variant="secondary" className="text-xs">⭐ {f.score.toFixed(1)}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0 flex-col">
                <div className="flex gap-1">
                  {f.telefone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => abrirWhatsApp(f.telefone)}
                      title="Abrir WhatsApp"
                    >
                      💬
                    </Button>
                  )}
                  {f.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => abrirEmail(f.email)}
                      title="Enviar email"
                    >
                      📧
                    </Button>
                  )}
                  {f.telefone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => abrirLigacao(f.telefone)}
                      title="Ligar"
                    >
                      📞
                    </Button>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(f)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteConfirm({ id: f.id, nome: f.nome })}
                    disabled={del.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialog} onOpenChange={(v) => { setDialog(v); if (!v) closeDialog(); }}>
        <DialogContent className="max-w-md max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Nome*</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do fornecedor"
                autoFocus
              />
              {dupInDialog && nome.trim() && <p className="text-xs text-warning">⚠️ Já existe fornecedor com esse nome</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Endereço</Label>
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua X, 123" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Categoria</Label>
              <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Pedraria" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {(tipos ?? []).map((t: any) => (
                    <SelectItem key={t.id} value={t.nome}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">✅ Ativo</SelectItem>
                  <SelectItem value="alerta">⚠️ Alerta</SelectItem>
                  <SelectItem value="bloqueado">❌ Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={!nome.trim() || dupInDialog || save.isPending}
            >
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

function FornecedoresCollapsible() {
  const { user } = useAuth();
  const { data: items } = useQuery({
    queryKey: ["fornecedores", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("fornecedores")
        .select("id")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });
  return (
    <CollapsibleCard
      title="Fornecedores"
      icon="👥"
      tooltip="Cadastro completo de fornecedores com filtros, busca e ações de contato."
      count={items?.length}
    >
      <FornecedoresBody />
    </CollapsibleCard>
  );
}

/* ----------------- Produtos section body ----------------- */
function ProdutoRow({ p, onEdit, onDelete }: { p: any; onEdit: (p: any) => void; onDelete: (v: { id: string; nome: string }) => void }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-muted/40 transition-colors">
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(p)}>
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete({ id: p.id, nome: p.nome })}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function ProdutosBody() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
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
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2 shrink-0">
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="__none__">Sem categoria</SelectItem>
              {(categorias ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Unidade</Label>
          <Select value={filterUnit} onValueChange={setFilterUnit}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              {(unidades ?? []).map((u: any) => (
                <SelectItem key={u.id} value={u.nome}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Ordenar por</Label>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="categoria">📂 Categoria (agrupado)</SelectItem>
              <SelectItem value="nome">🔤 Nome (A-Z)</SelectItem>
              <SelectItem value="unidade">📏 Unidade</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>}
        {!isLoading && !filtered.length && (
          <p className="text-muted-foreground text-sm text-center py-4">
            {search || filterCat !== "all" || filterUnit !== "all" ? "Nenhum produto encontrado com os filtros" : "Nenhum produto cadastrado"}
          </p>
        )}

        {grouped ? (
          grouped.map(([catName, items]) => (
            <div key={catName} className="rounded-xl border overflow-hidden">
              <div className="bg-muted/60 px-3 py-2 flex items-center justify-between">
                <span className="font-semibold text-sm">📂 {catName}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="divide-y">
                {items.map((p: any) => (
                  <ProdutoRow key={p.id} p={p} onEdit={openEdit} onDelete={setDeleteConfirm} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border divide-y">
            {filtered.map((p: any) => (
              <ProdutoRow key={p.id} p={p} onEdit={openEdit} onDelete={setDeleteConfirm} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={(v) => { setDialog(v); if (!v) close(); }}>
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
          <FornecedoresCollapsible />
          <CrudCollapsible
            table="tipos_fornecedor"
            label="tipo de fornecedor"
            title="Tipos de Fornecedor"
            icon="👷"
            tooltip="Classifique fornecedores (ex: pedreiro, eletricista, loja de material)."
          />
        </TabsContent>

        <TabsContent value="etapas" className="space-y-3 mt-4">
          <EtapasPadraoCollapsible />
          <TarefasPadraoCollapsible />
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
