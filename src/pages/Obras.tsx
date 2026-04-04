import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Obra | null>(null);

  const { data: obras, isLoading } = useQuery({
    queryKey: ["obras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {obras?.map((obra) => (
                <TableRow key={obra.id}>
                  <TableCell className="font-medium">{obra.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[obra.status ?? ""] ?? ""}>
                      {obra.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{fmt(obra.valor_previsto)}</TableCell>
                  <TableCell>{obra.localizacao ?? "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(obra); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !obras?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma obra cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {obras?.map((obra) => (
          <Card key={obra.id} className="cursor-pointer" onClick={() => { setEditing(obra); setOpen(true); }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{obra.nome}</span>
                <Badge variant="secondary" className={statusColors[obra.status ?? ""] ?? ""}>
                  {obra.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{fmt(obra.valor_previsto)}</p>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !obras?.length && (
          <p className="text-center text-muted-foreground py-8">Nenhuma obra cadastrada</p>
        )}
      </div>
    </div>
  );
};

export default Obras;
