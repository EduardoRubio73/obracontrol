import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Pencil, ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Fornecedor = Tables<"fornecedores">;

interface FornecedorMetrica {
  fornecedor_id: string;
  total_convites: number | null;
  total_respostas: number | null;
  total_vitorias: number | null;
  tempo_medio_resposta: number | null;
  score: number | null;
}

function getReputacao(score: number | null, totalConvites: number | null, totalRespostas: number | null) {
  const s = score ?? 0;
  const convites = totalConvites ?? 0;
  const respostas = totalRespostas ?? 0;
  const faltas = convites - respostas;

  // Bloqueado: score muito baixo ou muitas faltas
  if (s < 0.3 && convites >= 2) {
    return {
      status: "bloqueado",
      label: "Bloqueado",
      className: "bg-red-500/15 text-red-700 border-red-200",
      icon: ShieldOff,
    };
  }
  // Alerta: 2+ faltas ou score mediano
  if (faltas >= 2 || (s < 0.5 && convites >= 2)) {
    return {
      status: "alerta",
      label: "Atenção",
      className: "bg-orange-500/15 text-orange-700 border-orange-200",
      icon: ShieldAlert,
    };
  }
  // Ativo/Confiável
  if (convites > 0) {
    return {
      status: "ativo",
      label: "Confiável",
      className: "bg-green-500/15 text-green-700 border-green-200",
      icon: ShieldCheck,
    };
  }
  // Sem histórico
  return {
    status: "novo",
    label: "Novo",
    className: "bg-muted text-muted-foreground border-border",
    icon: ShieldCheck,
  };
}

const Fornecedores = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);

  const { data: fornecedores, isLoading } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: metricas } = useQuery({
    queryKey: ["fornecedor-metricas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedor_metricas").select("*");
      if (error) throw error;
      return data as FornecedorMetrica[];
    },
  });

  const metricasMap = new Map(
    (metricas ?? []).map((m) => [m.fornecedor_id, m])
  );

  const upsert = useMutation({
    mutationFn: async (values: Partial<TablesInsert<"fornecedores">>) => {
      if (editing) {
        const { error } = await supabase.from("fornecedores").update(values).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fornecedores").insert({ ...values, user_id: user!.id } as TablesInsert<"fornecedores">);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast.success(editing ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
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
      tipo: fd.get("tipo") as string || null,
      cnpj: fd.get("cnpj") as string || null,
      email: fd.get("email") as string || null,
      telefone: fd.get("telefone") as string || null,
      endereco: fd.get("endereco") as string || null,
    });
  };

  const renderReputacao = (fornecedorId: string) => {
    const m = metricasMap.get(fornecedorId);
    const rep = getReputacao(m?.score ?? null, m?.total_convites ?? null, m?.total_respostas ?? null);
    const Icon = rep.icon;
    return (
      <div className="flex items-center gap-2">
        <Badge className={rep.className}>
          <Icon className="mr-1 h-3 w-3" />
          {rep.label}
        </Badge>
        {m && (m.total_convites ?? 0) > 0 && (
          <div className="flex items-center gap-1.5">
            <Progress value={(m.score ?? 0) * 100} className="h-1.5 w-12" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {((m.score ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Fornecedor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" defaultValue={editing?.nome ?? ""} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Input id="tipo" name="tipo" defaultValue={editing?.tipo ?? ""} placeholder="Material, Serviço..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" name="cnpj" defaultValue={editing?.cnpj ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" name="telefone" defaultValue={editing?.telefone ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" name="endereco" defaultValue={editing?.endereco ?? ""} />
              </div>
              <Button type="submit" className="w-full" disabled={upsert.isPending}>
                {upsert.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Reputação</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedores?.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.tipo ?? "—"}</TableCell>
                  <TableCell>{renderReputacao(f.id)}</TableCell>
                  <TableCell>{f.cnpj ?? "—"}</TableCell>
                  <TableCell>{f.telefone ?? "—"}</TableCell>
                  <TableCell>{f.email ?? "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(f); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !fornecedores?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum fornecedor cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {fornecedores?.map((f) => (
          <Card key={f.id} className="cursor-pointer" onClick={() => { setEditing(f); setOpen(true); }}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{f.nome}</p>
                {renderReputacao(f.id)}
              </div>
              <p className="text-sm text-muted-foreground">{f.tipo ?? "—"} · {f.telefone ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Fornecedores;
