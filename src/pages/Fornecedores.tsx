import { useState } from "react";
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
import { toast } from "sonner";
import { Plus, Phone, MessageCircle, User, Search } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  TIPOS_FORNECEDOR,
  CATEGORIAS_PROFISSIONAL,
  CATEGORIAS_LOJA,
  ALL_CATEGORIAS,
} from "@/lib/regras-decisao";

type Fornecedor = Tables<"fornecedores">;

export default function Fornecedores() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [formTipo, setFormTipo] = useState<string>("profissional");

  const { data: fornecedores, isLoading, isError } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: Partial<TablesInsert<"fornecedores">>) => {
      if (editing) {
        const { error } = await supabase
          .from("fornecedores")
          .update(values)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("fornecedores")
          .insert({
            ...values,
            user_id: user!.id,
          } as TablesInsert<"fornecedores">);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
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
      telefone: (fd.get("telefone") as string) || null,
      email: (fd.get("email") as string) || null,
      tipo: fd.get("tipo") as string,
      categoria: (fd.get("categoria") as string) || null,
    } as any);
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    return phone.replace(/\D/g, "");
  };

  const categoriaLabel = (cat: string | null) => {
    if (!cat) return null;
    return ALL_CATEGORIAS.find((c) => c.value === cat)?.label ?? cat;
  };

  const filtered = fornecedores?.filter((f) => {
    if (filtroTipo !== "todos" && f.tipo !== filtroTipo) return false;
    if (busca && !f.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const categoriaOptions = formTipo === "loja" ? CATEGORIAS_LOJA : CATEGORIAS_PROFISSIONAL;

  return (
    <div className="space-y-6 max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto pb-28 px-1">
      <div className="pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Fornecedores
        </h1>
        <p className="text-lg text-muted-foreground mt-1">Profissionais e lojas</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-12 rounded-xl"
          />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "todos", label: "Todos" },
          { value: "profissional", label: "Profissionais" },
          { value: "loja", label: "Lojas" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFiltroTipo(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              filtroTipo === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Button
        className="w-full h-14 rounded-2xl font-bold text-lg"
        onClick={() => {
          setEditing(null);
          setFormTipo("profissional");
          setOpen(true);
        }}
      >
        <Plus className="mr-2 h-6 w-6" />
        Novo fornecedor
      </Button>

      {filtered?.map((f) => {
        const phoneDigits = formatPhone(f.telefone);
        return (
          <Card key={f.id} className="shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => {
                  setEditing(f);
                  setFormTipo(f.tipo || "profissional");
                  setOpen(true);
                }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xl text-foreground">{f.nome}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {f.tipo && (
                      <Badge variant="secondary" className="capitalize text-xs">
                        {f.tipo}
                      </Badge>
                    )}
                    {(f as any).categoria && (
                      <Badge variant="outline" className="text-xs">
                        {categoriaLabel((f as any).categoria)}
                      </Badge>
                    )}
                  </div>
                  {f.telefone && (
                    <p className="text-base text-muted-foreground mt-1">
                      📞 {f.telefone}
                    </p>
                  )}
                  {f.email && (
                    <p className="text-sm text-muted-foreground">
                      📧 {f.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {phoneDigits && (
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl font-semibold text-base gap-2"
                    asChild
                  >
                    <a href={`tel:+55${phoneDigits}`}>
                      <Phone className="h-5 w-5" />
                      Ligar
                    </a>
                  </Button>
                )}
                {phoneDigits && (
                  <Button
                    className="flex-1 h-12 rounded-xl font-semibold text-base gap-2 bg-success hover:bg-success/90 text-success-foreground"
                    asChild
                  >
                    <a
                      href={`https://wa.me/55${phoneDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {isLoading && (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-lg font-medium">Carregando fornecedores...</p>
          </CardContent>
        </Card>
      )}

      {isError && !isLoading && (
        <Card className="border-destructive">
          <CardContent className="py-14 text-center text-destructive">
            <p className="text-lg font-medium">Erro ao carregar fornecedores</p>
            <p className="text-sm mt-1">Verifique sua conexão e tente novamente</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !filtered?.length && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-lg font-medium">
              Nenhum fornecedor encontrado
            </p>
            <p className="text-base mt-2">
              Adicione seus fornecedores para contato rápido
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar fornecedor" : "Novo fornecedor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                name="nome"
                required
                defaultValue={editing?.nome ?? ""}
                placeholder="Ex: João Construções"
                className="h-12 text-base"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  name="tipo"
                  value={formTipo}
                  onValueChange={setFormTipo}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_FORNECEDOR.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="tipo" value={formTipo} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <select
                  name="categoria"
                  defaultValue={(editing as any)?.categoria ?? ""}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecionar...</option>
                  {categoriaOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                name="telefone"
                defaultValue={editing?.telefone ?? ""}
                placeholder="(11) 99999-9999"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                defaultValue={editing?.email ?? ""}
                placeholder="email@exemplo.com"
                className="h-12 text-base"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg"
              disabled={upsert.isPending}
            >
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
