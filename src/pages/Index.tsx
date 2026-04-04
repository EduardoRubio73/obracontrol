import { useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceCommand, VoiceCommand } from "@/hooks/useVoiceCommand";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  Mic,
  MicOff,
  Loader2,
} from "lucide-react";

const Hoje = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    status: voiceStatus,
    transcript,
    isSupported: voiceSupported,
    startListening,
    stopListening,
  } = useVoiceCommand();

  const alertasRef = useRef<HTMLDivElement>(null);

  // System alerts (unresolved)
  const { data: alertas } = useQuery({
    queryKey: ["alertas-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_sistema" as any)
        .select("*")
        .eq("resolvido", false)
        .order("created_at", { ascending: false }) as any;
      if (error) throw error;
      return data as {
        id: string;
        tipo: string;
        mensagem: string;
        created_at: string;
      }[];
    },
  });

  // Pending tasks (fase_itens not completed) — max 3
  const { data: tarefas } = useQuery({
    queryKey: ["tarefas-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_itens")
        .select("id, nome, status, fase_id, obra_fases(nome)")
        .neq("status", "concluido")
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  // Overall progress
  const { data: progresso } = useQuery({
    queryKey: ["progresso-geral"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_progresso_obra" as any)
        .select("*") as any;
      if (error) throw error;
      const rows = data as { progresso_geral: number }[];
      if (!rows?.length) return 0;
      const avg =
        rows.reduce((a: number, r: any) => a + (r.progresso_geral ?? 0), 0) /
        rows.length;
      return Math.round(avg);
    },
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await (
        supabase.from("alertas_sistema" as any) as any
      )
        .update({ resolvido: true })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas-sistema"] });
      toast.success("Alerta resolvido!");
    },
  });

  // Toggle task done
  const toggleTask = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("fase_itens")
        .update({ status: "concluido" })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["progresso-geral"] });
      toast.success("Tarefa concluída! ✅");
    },
  });

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const hasAlerts = (alertas?.length ?? 0) > 0;
  const hasTasks = (tarefas?.length ?? 0) > 0;
  const allGood = !hasAlerts && !hasTasks;

  // Voice
  const handleVoiceCommand = useCallback(
    (cmd: VoiceCommand, raw: string) => {
      switch (cmd.action) {
        case "concluir_tarefa": {
          if (tarefas?.length) {
            const match = cmd.target
              ? tarefas.find((t) =>
                  t.nome.toLowerCase().includes(cmd.target!.toLowerCase())
                )
              : tarefas[0];
            if (match) {
              toggleTask.mutate(match.id);
              toast.success(`"${match.nome}" concluída por voz!`);
            } else {
              toast.info("Não encontrei essa tarefa.");
            }
          } else {
            toast.info("Sem tarefas pendentes.");
          }
          break;
        }
        case "ver_atrasos":
        case "ver_compras":
        case "ver_status":
          window.scrollTo({ top: 0, behavior: "smooth" });
          toast.info("Mostrando resumo");
          break;
        default:
          toast.error(
            `Não entendi: "${raw}". Tente: concluir, atrasos, status.`
          );
      }
    },
    [tarefas, toggleTask]
  );

  const handleVoiceClick = () => {
    if (voiceStatus === "listening") {
      stopListening();
    } else {
      startListening(handleVoiceCommand);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-28">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {greeting} 👋
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Sua obra está{" "}
          <span className="font-bold text-foreground">{progresso ?? 0}%</span>{" "}
          pronta
        </p>
      </div>

      {/* Alert card (red pastel) */}
      {hasAlerts && (
        <div ref={alertasRef} className="space-y-3">
          {alertas!.slice(0, 2).map((a) => (
            <Card
              key={a.id}
              className="border-2 border-red-200 bg-red-50 shadow-sm"
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-red-800">
                    {a.mensagem}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 shrink-0"
                  onClick={() => resolveAlert.mutate(a.id)}
                >
                  Resolver
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action card */}
      {hasTasks && !allGood && (
        <Card className="border-2 border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-bold text-amber-900">
              Você tem tarefas para fazer hoje
            </p>
            <Button
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl px-8 h-12 text-base"
              onClick={() =>
                document
                  .getElementById("secao-tarefas")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Começar agora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All good */}
      {allGood && (
        <Card className="border-2 border-emerald-200 bg-emerald-50 shadow-sm">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
            <p className="text-xl font-bold text-emerald-800">
              Tudo em dia 👏
            </p>
            <p className="text-muted-foreground mt-1">
              Você não tem pendências hoje
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">
              📊 Progresso geral
            </p>
            <span className="text-2xl font-black tabular-nums">
              {progresso ?? 0}%
            </span>
          </div>
          <Progress
            value={progresso ?? 0}
            className="h-4 rounded-full bg-secondary [&>div]:bg-primary [&>div]:rounded-full"
          />
        </CardContent>
      </Card>

      {/* Tasks (max 3) */}
      {hasTasks && (
        <div id="secao-tarefas" className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">
            📋 Próximas tarefas
          </p>
          {tarefas!.map((t) => (
            <Card key={t.id} className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => toggleTask.mutate(t.id)}
                  className="h-6 w-6 rounded-lg border-2"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base">{t.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {(t.obra_fases as any)?.nome ?? ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating voice button */}
      {voiceSupported && (
        <div className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6">
          {voiceStatus !== "idle" && (
            <div
              className={`mb-2 rounded-xl px-4 py-2 text-sm font-medium shadow-lg ${
                voiceStatus === "listening"
                  ? "bg-primary text-primary-foreground"
                  : voiceStatus === "processing"
                  ? "bg-emerald-500 text-white"
                  : "bg-destructive text-destructive-foreground"
              }`}
            >
              {voiceStatus === "listening" && "Estou ouvindo..."}
              {voiceStatus === "processing" && `"${transcript}"`}
              {voiceStatus === "error" && "Não entendi, tente novamente"}
            </div>
          )}
          <Button
            size="lg"
            onClick={handleVoiceClick}
            className={`h-14 w-14 rounded-full shadow-xl ${
              voiceStatus === "listening"
                ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {voiceStatus === "listening" ? (
              <MicOff className="h-6 w-6 text-white" />
            ) : voiceStatus === "processing" ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Mic className="h-6 w-6 text-white" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Hoje;
