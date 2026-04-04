import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Pencil,
  Activity,
  DollarSign,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const statusFaseColors: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-blue-500/15 text-blue-700 border-blue-200",
  concluido: "bg-green-500/15 text-green-700 border-green-200",
  cancelado: "bg-red-500/15 text-red-700 border-red-200",
};

const statusFaseLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Fase {
  id: string;
  obra_id: string;
  nome: string;
  status: string;
  progresso: number;
  data_inicio: string | null;
  data_fim: string | null;
}

const ObraDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [faseDialog, setFaseDialog] = useState(false);
  const [editingFase, setEditingFase] = useState<Fase | null>(null);

  // Obra data
  const { data: obra } = useQuery({
    queryKey: ["obra", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fases
  const { data: fases } = useQuery({
    queryKey: ["obra-fases", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("*")
        .eq("obra_id", id!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as Fase[];
    },
  });

  // Fase itens (for chart)
  const { data: faseItens } = useQuery({
    queryKey: ["fase-itens", id],
    enabled: !!fases?.length,
    queryFn: async () => {
      const faseIds = fases!.map((f) => f.id);
      const { data, error } = await supabase
        .from("fase_itens")
        .select("*")
        .in("fase_id", faseIds);
      if (error) throw error;
      return data;
    },
  });

  // Financeiro
  const { data: financeiro } = useQuery({
    queryKey: ["obra-financeiro", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("*")
        .eq("obra_id", id!);
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const upsertFase = useMutation({
    mutationFn: async (values: Partial<Fase>) => {
      if (editingFase) {
        const { error } = await supabase
          .from("obra_fases")
          .update(values)
          .eq("id", editingFase.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("obra_fases")
          .insert({ ...values, obra_id: id! } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obra-fases", id] });
      queryClient.invalidateQueries({ queryKey: ["fase-itens", id] });
      toast.success(editingFase ? "Fase atualizada!" : "Fase criada!");
      setFaseDialog(false);
      setEditingFase(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFaseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsertFase.mutate({
      nome: fd.get("nome") as string,
      status: fd.get("status") as string,
      progresso: Number(fd.get("progresso") || 0),
      data_inicio: (fd.get("data_inicio") as string) || null,
      data_fim: (fd.get("data_fim") as string) || null,
    });
  };

  // KPIs
  const totalFases = fases?.length ?? 0;
  const fasesConcluidas = fases?.filter((f) => f.status === "concluido").length ?? 0;
  const fasesAndamento = fases?.filter((f) => f.status === "em_andamento").length ?? 0;
  const fasesPendentes = fases?.filter((f) => f.status === "pendente").length ?? 0;
  const progressoGeral =
    totalFases > 0
      ? fases!.reduce((acc, f) => acc + (f.progresso ?? 0), 0) / totalFases
      : 0;

  // Financeiro KPIs
  const custoTotal = financeiro?.reduce((acc, f) => acc + Number(f.valor), 0) ?? 0;
  const despesas =
    financeiro?.filter((f) => f.tipo === "despesa").reduce((acc, f) => acc + Number(f.valor), 0) ?? 0;
  const receitas =
    financeiro?.filter((f) => f.tipo === "receita").reduce((acc, f) => acc + Number(f.valor), 0) ?? 0;

  // Chart data: cost per phase
  const chartData = fases?.map((f) => {
    const itens = faseItens?.filter((i) => i.fase_id === f.id) ?? [];
    const previsto = itens.reduce((acc, i) => acc + Number(i.valor_previsto ?? 0), 0);
    const real = itens.reduce((acc, i) => acc + Number(i.valor_real ?? 0), 0);
    return { nome: f.nome, Previsto: previsto, Real: real };
  }) ?? [];

  // Alerts: overdue phases
  const today = new Date().toISOString().split("T")[0];
  const alertas = fases?.filter(
    (f) => f.status !== "concluido" && f.status !== "cancelado" && f.data_fim && f.data_fim < today
  ) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/obras")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{obra?.nome ?? "Carregando..."}</h1>
          {obra?.descricao && (
            <p className="text-sm text-muted-foreground">{obra.descricao}</p>
          )}
        </div>
        {obra?.status && (
          <Badge variant="secondary" className="text-sm">
            {obra.status}
          </Badge>
        )}
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm font-bold text-primary">{progressoGeral.toFixed(0)}%</span>
          </div>
          <Progress value={progressoGeral} className="h-3" />
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/15">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Concluídas</p>
              <p className="text-xl font-bold">{fasesConcluidas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
              <p className="text-xl font-bold">{fasesAndamento}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-xl font-bold">{fasesPendentes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
              <p className="text-xl font-bold text-orange-600">{alertas.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financeiro */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo Total</p>
              <p className="text-lg font-bold">{fmt(custoTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-bold text-red-600">{fmt(despesas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/15">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-lg font-bold text-green-600">{fmt(receitas)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Cost per Phase */}
      {chartData.some((d) => d.Previsto > 0 || d.Real > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📈 Custo por Fase</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="nome" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="Previsto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Real" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alertas.length > 0 && (
        <Card className="border-orange-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Fases Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertas.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 p-3"
              >
                <div>
                  <p className="font-medium">{f.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    Prazo: {f.data_fim} · Progresso: {f.progresso}%
                  </p>
                </div>
                <Badge className="bg-orange-500/15 text-orange-700 border-orange-200">
                  {statusFaseLabels[f.status] ?? f.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Phases List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">📋 Fases da Obra</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingFase(null);
              setFaseDialog(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova Fase
          </Button>
        </CardHeader>
        <CardContent>
          {!fases?.length ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma fase cadastrada. Adicione a primeira fase desta obra.
            </p>
          ) : (
            <div className="space-y-3">
              {fases.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{f.nome}</p>
                      <Badge className={statusFaseColors[f.status] ?? ""}>
                        {statusFaseLabels[f.status] ?? f.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={f.progresso} className="h-2 flex-1" />
                      <span className="text-sm font-medium tabular-nums w-10 text-right">
                        {f.progresso}%
                      </span>
                    </div>
                    {(f.data_inicio || f.data_fim) && (
                      <p className="text-xs text-muted-foreground">
                        {f.data_inicio && `Início: ${f.data_inicio}`}
                        {f.data_inicio && f.data_fim && " · "}
                        {f.data_fim && `Fim: ${f.data_fim}`}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingFase(f);
                      setFaseDialog(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Dialog */}
      <Dialog open={faseDialog} onOpenChange={(v) => { setFaseDialog(v); if (!v) setEditingFase(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFase ? "Editar Fase" : "Nova Fase"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFaseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Fase</Label>
              <Input
                id="nome"
                name="nome"
                defaultValue={editingFase?.nome ?? ""}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  name="status"
                  defaultValue={editingFase?.status ?? "pendente"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="progresso">Progresso (%)</Label>
                <Input
                  id="progresso"
                  name="progresso"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={editingFase?.progresso ?? 0}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  name="data_inicio"
                  type="date"
                  defaultValue={editingFase?.data_inicio ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Data Fim</Label>
                <Input
                  id="data_fim"
                  name="data_fim"
                  type="date"
                  defaultValue={editingFase?.data_fim ?? ""}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={upsertFase.isPending}>
              {upsertFase.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ObraDetalhe;
