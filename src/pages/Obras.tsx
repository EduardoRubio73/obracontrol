import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { toast } from "sonner";
import { Plus, Eye, Pencil, Archive, Copy, Search, FolderOpen, Image, Package, FileText, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Obra = Tables<"obras">;

const statusColors: Record<string, string> = {
  planejamento: "bg-primary/10 text-primary",
  "execução": "bg-warning/10 text-warning",
  "concluído": "bg-success/10 text-success",
  pausado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/10 text-destructive",
};

const Obras = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Obra | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  const { data: obras, isLoading } = useQuery({
    queryKey: ["obras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const obraIds = obras?.map((o) => o.id) ?? [];
  const { data: fotoMap } = useQuery({
    queryKey: ["obras-list-thumbs", obraIds.join(",")],
    enabled: obraIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_fotos")
        .select("id, url, obra_id")
        .in("obra_id", obraIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const f of data ?? []) {
        if (!map[f.obra_id]) map[f.obra_id] = f.url;
      }
      return map;
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: Partial<TablesInsert<"obras">>) => {
      if (editing) {
        const { error } = await supabase.from("obras").update(values).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("obras").insert({ ...values, user_id: user!.id } as TablesInsert<"obras">);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast.success(editing ? "Obra atualizada!" : "Obra criada!");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const archiveMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("obras").update({ status: "cancelado" as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast.success("Obra arquivada");
    },
  });

  const duplicateMut = useMutation({
    mutationFn: async (obra: Obra) => {
      const { error } = await supabase.from("obras").insert({
        user_id: user!.id,
        nome: `${obra.nome} (cópia)`,
        descricao: obra.descricao,
        valor_previsto: obra.valor_previsto,
        localizacao: obra.localizacao,
        tipo_obra: obra.tipo_obra,
        classificacao: obra.classificacao,
        status: "planejamento" as any,
      } as TablesInsert<"obras">);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      toast.success("Obra duplicada!");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsert.mutate({
      nome: fd.get("nome") as string,
      descricao: fd.get("descricao") as string,
      valor_previsto: Number(fd.get("valor_previsto")) || 0,
      localizacao: fd.get("localizacao") as string,
      data_inicio: (fd.get("data_inicio") as string) || null,
      data_prevista_conclusao: (fd.get("data_prevista_conclusao") as string) || null,
      status: (fd.get("status") as any) || "planejamento",
    });
  };

  const fmt = (v: number | null) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filtered = obras?.filter((o) => {
    if (filtroStatus !== "todas" && o.status !== filtroStatus) return false;
    if (busca && !o.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Obras</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Obra</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Obra" : "Nova Obra"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" defaultValue={editing?.nome ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" name="descricao" defaultValue={editing?.descricao ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_previsto">Valor Previsto</Label>
                  <Input id="valor_previsto" name="valor_previsto" type="number" step="0.01" defaultValue={editing?.valor_previsto ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select name="status" defaultValue={editing?.status ?? "planejamento"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="planejamento">Planejamento</option>
                    <option value="execução">Execução</option>
                    <option value="concluído">Concluído</option>
                    <option value="pausado">Pausado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data Início</Label>
                  <Input id="data_inicio" name="data_inicio" type="date" defaultValue={editing?.data_inicio ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_prevista_conclusao">Previsão Conclusão</Label>
                  <Input id="data_prevista_conclusao" name="data_prevista_conclusao" type="date" defaultValue={editing?.data_prevista_conclusao ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização</Label>
                <Input id="localizacao" name="localizacao" defaultValue={editing?.localizacao ?? ""} />
              </div>
              <Button type="submit" className="w-full" disabled={upsert.isPending}>
                {upsert.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar obra..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "todas", label: "Todas" },
          { value: "planejamento", label: "Planejamento" },
          { value: "execução", label: "Execução" },
          { value: "concluído", label: "Concluído" },
          { value: "pausado", label: "Pausado" },
          { value: "cancelado", label: "Arquivado" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFiltroStatus(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              filtroStatus === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor Previsto</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="w-48">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((obra) => (
                <TableRow key={obra.id}>
                  <TableCell className="font-medium text-primary hover:underline cursor-pointer" onClick={() => navigate(`/obras/${obra.id}/dossie`)}>{obra.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[obra.status ?? ""] ?? ""}>{obra.status}</Badge>
                  </TableCell>
                  <TableCell>{fmt(obra.valor_previsto)}</TableCell>
                  <TableCell>{obra.localizacao ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Dossiê" onClick={() => navigate(`/obras/${obra.id}/dossie`)}><Clock className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Galeria" onClick={() => navigate(`/obras/${obra.id}/galeria`)}><Image className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Materiais" onClick={() => navigate(`/obras/${obra.id}/materiais`)}><Package className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Documentos" onClick={() => navigate(`/obras/${obra.id}/documentos`)}><FileText className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => { setEditing(obra); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicateMut.mutate(obra)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Arquivar" onClick={() => archiveMut.mutate(obra.id)}><Archive className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !filtered?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma obra encontrada</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered?.map((obra) => (
          <Card key={obra.id} className="cursor-pointer" onClick={() => navigate(`/obras/${obra.id}/dossie`)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{obra.nome}</span>
                <Badge variant="secondary" className={statusColors[obra.status ?? ""] ?? ""}>{obra.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{fmt(obra.valor_previsto)}</p>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !filtered?.length && (
          <p className="text-center text-muted-foreground py-8">Nenhuma obra encontrada</p>
        )}
      </div>
    </div>
  );
};

export default Obras;
