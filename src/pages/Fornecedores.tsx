import { useState, useRef, useEffect, useMemo, useId } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Phone, MessageCircle, User, Search, Trash2 } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Fornecedor = Tables<"fornecedores">;

const TIPOS_FORNECEDOR = [
  { value: "profissional", label: "Profissional" },
  { value: "loja", label: "Loja / Fornecedor" },
];

/* ── Phone mask ── */
function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/* ── Text normalization (accent/case-insensitive search) ── */
function normalizeText(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/* ── Combobox for Categoria ── */
function CategoriaCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listboxId = useId();

  useEffect(() => { setSearch(value); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    const starts: string[] = [];
    const includes: string[] = [];
    for (const o of options) {
      const no = normalizeText(o);
      if (!q || no.startsWith(q)) starts.push(o);
      else if (no.includes(q)) includes.push(o);
    }
    const collator = (a: string, b: string) => a.localeCompare(b, "pt-BR");
    return [...starts.sort(collator), ...includes.sort(collator)];
  }, [options, search]);

  const exactMatch = options.some((o) => normalizeText(o) === normalizeText(search));
  const showAdd = search.trim().length > 0 && !exactMatch;
  const totalItems = filtered.length + (showAdd ? 1 : 0);

  const openList = () => {
    setOpen(true);
    const idx = filtered.findIndex((o) => normalizeText(o) === normalizeText(value));
    setHighlighted(idx);
  };

  useEffect(() => {
    if (open && highlighted >= 0) {
      itemRefs.current[highlighted]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted, open]);

  const selectOption = (o: string) => {
    onChange(o);
    setSearch(o);
    setOpen(false);
    setHighlighted(-1);
  };

  const addNew = () => {
    const v = search.trim();
    if (!v) return;
    onChange(v);
    setOpen(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      openList();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < filtered.length) {
        selectOption(filtered[highlighted]);
      } else if (highlighted === filtered.length && showAdd) {
        addNew();
      } else if (filtered.length === 1 && !showAdd) {
        selectOption(filtered[0]);
      } else if (showAdd) {
        addNew();
      }
    }
  };

  const activeDescendant =
    highlighted >= 0 && highlighted < filtered.length
      ? `${listboxId}-opt-${highlighted}`
      : highlighted === filtered.length && showAdd
      ? `${listboxId}-add`
      : undefined;

  return (
    <div ref={ref} className="relative" role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-controls={listboxId} aria-owns={listboxId}>
      <Input
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={openList}
        onKeyDown={handleKeyDown}
        placeholder="Digite ou selecione..."
        className="h-12 text-sm"
        autoComplete="off"
        role="textbox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
      />
      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-xl border bg-popover shadow-lg max-h-48 overflow-auto"
        >
          {filtered.length === 0 && !showAdd && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {options.length === 0 ? "Nenhuma categoria cadastrada." : "Nenhum resultado encontrado."}
            </p>
          )}
          {filtered.map((o, i) => {
            const isSelected = normalizeText(o) === normalizeText(value);
            const isHighlighted = i === highlighted;
            return (
              <button
                key={o}
                id={`${listboxId}-opt-${i}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                ref={(el) => { itemRefs.current[i] = el; }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                  isHighlighted ? "bg-accent" : isSelected ? "bg-accent/60 font-semibold" : "hover:bg-accent"
                }`}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => selectOption(o)}
              >
                {isSelected && <span aria-hidden="true">✔️</span>}
                {o}
              </button>
            );
          })}
          {showAdd && (
            <button
              id={`${listboxId}-add`}
              type="button"
              role="option"
              aria-selected={highlighted === filtered.length}
              ref={(el) => { itemRefs.current[filtered.length] = el; }}
              className={`w-full text-left px-3 py-2 text-sm text-primary font-medium transition-colors border-t flex items-center gap-1 ${
                highlighted === filtered.length ? "bg-accent" : "hover:bg-accent"
              }`}
              onMouseEnter={() => setHighlighted(filtered.length)}
              onClick={addNew}
            >
              <span aria-hidden="true">+</span> Adicionar "{search.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Fornecedor Card ── */
function FornecedorCard({ f, onEdit }: { f: Fornecedor; onEdit: () => void }) {
  const phoneDigits = f.telefone?.replace(/\D/g, "") || null;
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onEdit}>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base sm:text-xl text-foreground truncate">{f.nome}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {f.tipo && <Badge variant="secondary" className="capitalize text-xs">{f.tipo}</Badge>}
              {f.categoria && <Badge variant="outline" className="text-xs">{f.categoria}</Badge>}
            </div>
            {f.telefone && <p className="text-sm sm:text-base text-muted-foreground mt-1 truncate">📞 {f.telefone}</p>}
            {f.email && <p className="text-xs sm:text-sm text-muted-foreground truncate">📧 {f.email}</p>}
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          {phoneDigits && (
            <Button variant="outline" className="flex-1 h-10 sm:h-12 rounded-xl font-semibold text-sm sm:text-base gap-1 sm:gap-2" asChild>
              <a href={`tel:+55${phoneDigits}`}><Phone className="h-4 w-4 sm:h-5 sm:w-5" />Ligar</a>
            </Button>
          )}
          {phoneDigits && (
            <Button className="flex-1 h-10 sm:h-12 rounded-xl font-semibold text-sm sm:text-base gap-1 sm:gap-2 bg-success hover:bg-success/90 text-success-foreground" asChild>
              <a href={`https://wa.me/55${phoneDigits}?text=${encodeURIComponent(`Olá, ${f.nome}, Digite sua mensagem aqui...`)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />WhatsApp
              </a>
            </Button>
          )}
          {f.email && (
            <Button variant="outline" className="flex-1 h-10 sm:h-12 rounded-xl font-semibold text-sm sm:text-base gap-1 sm:gap-2" asChild>
              <a href={`mailto:${f.email}?subject=${encodeURIComponent('Digite o assunto aqui...')}&body=${encodeURIComponent(`Olá, ${f.nome}, Digite sua mensagem aqui...`)}`}>📧 Email</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Fornecedores() {
  const { user } = useAuth();
  const { id: obraId } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [formTipo, setFormTipo] = useState<string>("profissional");
  const [formCategoria, setFormCategoria] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [checkingVinculos, setCheckingVinculos] = useState(false);

  // All fornecedores
  const { data: fornecedores, isLoading, isError } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: obra } = useQuery({
    queryKey: ["obra", obraId],
    enabled: !!obraId,
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("nome").eq("id", obraId!).single();
      if (error) throw error;
      return data;
    },
  });

  // Fornecedores vinculados à obra (via financeiro + compras)
  const { data: vinculadosIds } = useQuery({
    queryKey: ["fornecedores-vinculados", obraId],
    enabled: !!obraId,
    queryFn: async () => {
      const [fin, comp] = await Promise.all([
        supabase.from("financeiro").select("fornecedor_id").eq("obra_id", obraId!).not("fornecedor_id", "is", null),
        supabase.from("compras").select("fornecedor_id").eq("obra_id", obraId!).not("fornecedor_id", "is", null),
      ]);
      if (fin.error) throw fin.error;
      if (comp.error) throw comp.error;
      const ids = new Set<string>();
      fin.data?.forEach((r: any) => r.fornecedor_id && ids.add(r.fornecedor_id));
      comp.data?.forEach((r: any) => r.fornecedor_id && ids.add(r.fornecedor_id));
      return ids;
    },
  });

  // Dynamic categories from tipos_fornecedor
  const { data: tiposFornecedor } = useQuery({
    queryKey: ["tipos-fornecedor"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_fornecedor").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const categoriaOptions = tiposFornecedor?.map((t) => t.nome) ?? [];

  const upsert = useMutation({
    mutationFn: async (values: Partial<TablesInsert<"fornecedores">>) => {
      // Auto-insert new categoria if not in list
      if (values.categoria && !categoriaOptions.some((c) => c.toLowerCase() === (values.categoria as string).toLowerCase())) {
        // Re-checa no banco (case-insensitive) antes de inserir, pra reduzir a janela de corrida
        const { data: existente } = await supabase
          .from("tipos_fornecedor")
          .select("id")
          .ilike("nome", values.categoria as string)
          .maybeSingle();
        if (!existente) {
          const { error: insertError } = await supabase.from("tipos_fornecedor").insert({ nome: values.categoria } as any);
          // 23505 = unique_violation: outro usuário criou a mesma categoria nesse meio-tempo, ignora
          if (insertError && (insertError as any).code !== "23505") throw insertError;
        }
        queryClient.invalidateQueries({ queryKey: ["tipos-fornecedor"] });
      }

      if (editing) {
        const { error } = await supabase.from("fornecedores").update(values).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fornecedores").insert({
          ...values,
          user_id: user!.id,
        } as TablesInsert<"fornecedores">);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores-vinculados", obraId] });
      toast.success(editing ? "Atualizado!" : "Fornecedor adicionado!");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores-vinculados", obraId] });
      toast.success("Fornecedor excluído.");
      setConfirmDeleteOpen(false);
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDeleteClick = async () => {
    if (!editing) return;
    setCheckingVinculos(true);
    try {
      const [fin, comp] = await Promise.all([
        supabase.from("financeiro").select("id", { count: "exact", head: true }).eq("fornecedor_id", editing.id),
        supabase.from("compras").select("id", { count: "exact", head: true }).eq("fornecedor_id", editing.id),
      ]);
      if (fin.error) throw fin.error;
      if (comp.error) throw comp.error;
      const totalVinculos = (fin.count ?? 0) + (comp.count ?? 0);
      if (totalVinculos > 0) {
        toast.error("Este fornecedor não pode ser excluído porque está vinculado a lançamentos financeiros ou compras.");
        return;
      }
      setConfirmDeleteOpen(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCheckingVinculos(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsert.mutate({
      nome: fd.get("nome") as string,
      telefone: formTelefone || null,
      email: (fd.get("email") as string) || null,
      tipo: formTipo,
      categoria: formCategoria || null,
    } as any);
  };

  const openNew = () => {
    setEditing(null);
    setFormTipo("profissional");
    setFormCategoria("");
    setFormTelefone("");
    setOpen(true);
  };

  const openEdit = (f: Fornecedor) => {
    setEditing(f);
    setFormTipo(f.tipo || "profissional");
    setFormCategoria(f.categoria || "");
    setFormTelefone(f.telefone || "");
    setOpen(true);
  };

  const filtered = fornecedores?.filter((f) => {
    if (filtroTipo !== "todos" && f.tipo !== filtroTipo) return false;
    if (busca && !f.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const vinculados = filtered?.filter((f) => vinculadosIds?.has(f.id));
  const outros = filtered?.filter((f) => !vinculadosIds?.has(f.id));
  const hasVinculados = !!obraId && vinculados && vinculados.length > 0;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto pb-28 px-1">
      <div className="pt-2 sm:pt-4">
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
          Fornecedores {obra ? `— ${obra.nome}` : ""}
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground mt-1">Profissionais e lojas</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9 h-12 rounded-xl" />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "todos", label: "Todos" },
          { value: "profissional", label: "Profissionais" },
          { value: "loja", label: "Lojas" },
        ].map((opt) => (
          <button key={opt.value} onClick={() => setFiltroTipo(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              filtroTipo === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      <Button className="w-full h-14 rounded-2xl font-bold text-lg" onClick={openNew}>
        <Plus className="mr-2 h-6 w-6" />
        Novo fornecedor
      </Button>

      {/* Vinculados à obra */}
      {hasVinculados && (
        <>
          <h2 className="text-lg font-bold text-foreground mt-4">Vinculados à obra</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vinculados.map((f) => (
              <FornecedorCard key={f.id} f={f} onEdit={() => openEdit(f)} />
            ))}
          </div>
        </>
      )}

      {/* Todos os fornecedores */}
      <h2 className="text-lg font-bold text-foreground mt-4">
        {hasVinculados ? "Todos os fornecedores" : ""}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(hasVinculados ? outros : filtered)?.map((f) => (
          <FornecedorCard key={f.id} f={f} onEdit={() => openEdit(f)} />
        ))}
      </div>

      {isLoading && (
        <Card><CardContent className="py-14 text-center text-muted-foreground"><p className="text-lg font-medium">Carregando fornecedores...</p></CardContent></Card>
      )}
      {isError && !isLoading && (
        <Card className="border-destructive"><CardContent className="py-14 text-center text-destructive"><p className="text-lg font-medium">Erro ao carregar fornecedores</p></CardContent></Card>
      )}
      {!isLoading && !isError && !filtered?.length && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-lg font-medium">Nenhum fornecedor encontrado</p>
            <p className="text-base mt-2">Adicione seus fornecedores para contato rápido</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input name="nome" required defaultValue={editing?.nome ?? ""} placeholder="Ex: João Construções" className="h-12 text-base" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formTipo} onValueChange={setFormTipo}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_FORNECEDOR.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="tipo" value={formTipo} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <CategoriaCombobox value={formCategoria} onChange={setFormCategoria} options={categoriaOptions} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                name="telefone"
                value={formTelefone}
                onChange={(e) => setFormTelefone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={editing?.email ?? ""} placeholder="email@exemplo.com" className="h-12 text-base" />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-lg" disabled={upsert.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-2xl font-semibold text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDeleteClick}
                disabled={checkingVinculos}
              >
                <Trash2 className="mr-2 h-5 w-5" />
                {checkingVinculos ? "Verificando..." : "Excluir fornecedor"}
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{editing?.nome}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={() => editing && remove.mutate(editing.id)}
            >
              {remove.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
