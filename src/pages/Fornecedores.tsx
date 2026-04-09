import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
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
import { toast } from "sonner";
import { Plus, Phone, MessageCircle, User, Search } from "lucide-react";
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = options.some((o) => o.toLowerCase() === search.toLowerCase());

  return (
    <div ref={ref} className="relative">
      <Input
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Digite ou selecione..."
        className="h-12 text-sm"
        autoComplete="off"
      />
      {open && (filtered.length > 0 || (search.trim() && !exactMatch)) && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover shadow-lg max-h-48 overflow-auto">
          {filtered.map((o) => (
            <button key={o} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => { onChange(o); setSearch(o); setOpen(false); }}>
              {o}
            </button>
          ))}
          {search.trim() && !exactMatch && (
            <button type="button" className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-accent transition-colors border-t"
              onClick={() => { onChange(search.trim()); setOpen(false); }}>
              + Adicionar "{search.trim()}"
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
        <div className="flex gap-2 sm:gap-3">
          {phoneDigits && (
            <Button variant="outline" className="flex-1 h-10 sm:h-12 rounded-xl font-semibold text-sm sm:text-base gap-1 sm:gap-2" asChild>
              <a href={`tel:+55${phoneDigits}`}><Phone className="h-4 w-4 sm:h-5 sm:w-5" />Ligar</a>
            </Button>
          )}
          {phoneDigits && (
            <Button className="flex-1 h-10 sm:h-12 rounded-xl font-semibold text-sm sm:text-base gap-1 sm:gap-2 bg-success hover:bg-success/90 text-success-foreground" asChild>
              <a href={`https://wa.me/55${phoneDigits}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />WhatsApp
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Fornecedores() {
  const { user } = useAuth();
  const { obraAtivaId, obraAtiva } = useObraAtiva();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [formTipo, setFormTipo] = useState<string>("profissional");
  const [formCategoria, setFormCategoria] = useState("");
  const [formTelefone, setFormTelefone] = useState("");

  // All fornecedores
  const { data: fornecedores, isLoading, isError } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fornecedores vinculados à obra (via financeiro + compras)
  const { data: vinculadosIds } = useQuery({
    queryKey: ["fornecedores-vinculados", obraAtivaId],
    enabled: !!obraAtivaId,
    queryFn: async () => {
      const [fin, comp] = await Promise.all([
        supabase.from("financeiro").select("fornecedor_id").eq("obra_id", obraAtivaId!).not("fornecedor_id", "is", null),
        supabase.from("compras").select("fornecedor_id").eq("obra_id", obraAtivaId!).not("fornecedor_id", "is", null),
      ]);
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
        await supabase.from("tipos_fornecedor").insert({ nome: values.categoria } as any);
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
      queryClient.invalidateQueries({ queryKey: ["fornecedores-vinculados", obraAtivaId] });
      toast.success(editing ? "Atualizado!" : "Fornecedor adicionado!");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

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
  const hasVinculados = obraAtivaId && vinculados && vinculados.length > 0;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto pb-28 px-1">
      <div className="pt-2 sm:pt-4">
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
          Fornecedores {obraAtiva ? `— ${obraAtiva.nome}` : ""}
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
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
