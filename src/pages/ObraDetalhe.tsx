import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Zap,
  Pause,
  Bell,
  Plus,
  Pencil,
} from "lucide-react";

const statusFaseLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusPastelColors: Record<string, string> = {
  concluido: "bg-emerald-100 text-emerald-800 border-emerald-200",
  em_andamento: "bg-sky-100 text-sky-800 border-sky-200",
  pendente: "bg-slate-100 text-slate-600 border-slate-200",
  cancelado: "bg-rose-100 text-rose-700 border-rose-200",
};

const statusProgressBg: Record<string, string> = {
  concluido: "[&>div]:bg-emerald-400",
  em_andamento: "[&>div]:bg-sky-400",
  pendente: "[&>div]:bg-slate-300",
  cancelado: "[&>div]:bg-rose-400",
};

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
  const { user } = useAuth();
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

  // System alerts
  const { data: systemAlertas } = useQuery({
    queryKey: ["alertas-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_sistema" as any)
        .select("*")
        .eq("resolvido", false)
        .order("created_at", { ascending: false }) as any;
      if (error) throw error;
      return data as { id: string; entidade: string; tipo: string; mensagem: string; created_at: string }[];
    },
  });

  // Generate alerts on load
  useEffect(() => {
    if (user?.id) {
      supabase.rpc("gerar_alertas_sistema", { p_user_id: user.id }).then(({ error }) => {
        if (error) console.error("gerar_alertas_sistema:", error.message);
      });
    }
  }, [user?.id]);

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await (supabase.from("alertas_sistema" as any) as any)
        .update({ resolvido: true })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas-sistema"] });
      toast.success("Alerta resolvido!");
    },
  });

  // Phase CRUD
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
  const progressoGeral =
    totalFases > 0
      ? fases!.reduce((acc, f) => acc + (f.progresso ?? 0), 0) / totalFases
      : 0;

  // Alert icons & colors
  const alertConfig: Record<string, { icon: typeof AlertTriangle; bg: string; border: string; text: string }> = {
    atraso: { icon: AlertTriangle, bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
    orcamento: { icon: AlertCircle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    parada: { icon: Pause, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    custo: { icon: Zap, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    lento: { icon: Clock, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  };

  return (
    <div className="space-y-8">
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

      {/* ===== BIG PROGRESS CARD ===== */}
      <Card className="bg-sky-50/70 border-sky-200">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-sky-900">📊 Progresso da Obra</h2>
            <span className="text-4xl font-black tabular-nums text-sky-600">
              {progressoGeral.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={progressoGeral}
            className="h-6 rounded-full bg-sky-200/60 [&>div]:bg-sky-500 [&>div]:rounded-full"
          />
          <p className="text-sm text-sky-700 mt-3">
            {totalFases} fase{totalFases !== 1 ? "s" : ""} cadastrada{totalFases !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* ===== ALERT CARDS ===== */}
      {(systemAlertas?.length ?? 0) > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" />
            🔔 Alertas Importantes
            <Badge variant="destructive" className="ml-2">{systemAlertas!.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {systemAlertas!.map((a) => {
              const cfg = alertConfig[a.tipo] ?? { icon: Bell, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" };
              const Icon = cfg.icon;
              return (
                <Card key={a.id} className={`${cfg.bg} ${cfg.border} border-2`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cfg.bg} border ${cfg.border}`}>
                        <Icon className={`h-6 w-6 ${cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${cfg.bg} ${cfg.text} ${cfg.border} border text-xs font-bold`}>
                            {a.tipo}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {a.entidade}
                          </Badge>
                        </div>
                        <p className={`text-base font-medium ${cfg.text}`}>{a.mensagem}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(a.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`shrink-0 text-xs ${cfg.text} hover:${cfg.bg}`}
                        onClick={() => resolveAlert.mutate(a.id)}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Resolver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== PHASE CARD LIST ===== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">📋 Fases da Obra</h2>
          <Button
            onClick={() => {
              setEditingFase(null);
              setFaseDialog(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova Fase
          </Button>
        </div>

        {!fases?.length ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma fase cadastrada. Adicione a primeira fase desta obra.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fases.map((f) => {
              const pastel = statusPastelColors[f.status] ?? statusPastelColors.pendente;
              const progressCls = statusProgressBg[f.status] ?? "";
              return (
                <Card
                  key={f.id}
                  className={`border-2 ${pastel.includes("border-") ? pastel.split(" ").find(c => c.startsWith("border-")) : "border-border"} overflow-hidden`}
                >
                  <CardContent className="p-6 space-y-4">
                    {/* Title & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate">{f.nome}</h3>
                        {(f.data_inicio || f.data_fim) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {f.data_inicio && `Início: ${new Date(f.data_inicio).toLocaleDateString("pt-BR")}`}
                            {f.data_inicio && f.data_fim && " · "}
                            {f.data_fim && `Fim: ${new Date(f.data_fim).toLocaleDateString("pt-BR")}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={`${pastel} text-xs font-bold`}>
                          {statusFaseLabels[f.status] ?? f.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingFase(f);
                            setFaseDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Big progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Progresso</span>
                        <span className="text-2xl font-black tabular-nums">
                          {f.progresso ?? 0}%
                        </span>
                      </div>
                      <Progress
                        value={f.progresso ?? 0}
                        className={`h-5 rounded-full bg-slate-200/60 ${progressCls} [&>div]:rounded-full`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
