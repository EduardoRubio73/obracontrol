import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceCommand, VoiceCommand } from "@/hooks/useVoiceCommand";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Mic, MicOff, Loader2 } from "lucide-react";

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

  // Profile name
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  // Alerts (unresolved)
  const { data: alertas } = useQuery({
    queryKey: ["alertas-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_sistema")
        .select("*")
        .eq("resolvido", false)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  // Pending tasks
  const { data: tarefas } = useQuery({
    queryKey: ["tarefas-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_itens")
        .select("id, nome, status, fase_id, obra_fases(nome)")
        .neq("status", "concluido")
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Progress
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
  const firstName = profile?.nome?.split(" ")[0] ?? "";

  const hasAlerts = (alertas?.length ?? 0) > 0;
  const hasTasks = (tarefas?.length ?? 0) > 0;

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
    <div className="space-y-8 max-w-lg mx-auto pb-32 px-1">
      {/* BLOCO 1 — Saudação */}
      <div className="pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {greeting}
          {firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Vamos cuidar da sua obra hoje
        </p>
      </div>

      {/* BLOCO 2 — Alerta */}
      {hasAlerts && (
        <Card className="border-2 border-warning/40 bg-warning/10 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xl font-bold text-foreground">
              ⚠️ Você tem etapas atrasadas
            </p>
            <p className="text-base text-muted-foreground mt-1">
              {alertas![0]?.mensagem}
            </p>
          </CardContent>
        </Card>
      )}

      {/* BLOCO 3 — Ação principal */}
      {hasTasks && (
        <Button
          className="w-full h-16 text-xl font-bold rounded-2xl bg-warning text-warning-foreground hover:bg-warning/90 shadow-md"
          onClick={() =>
            document
              .getElementById("secao-tarefas")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Começar agora
        </Button>
      )}

      {/* Se tudo estiver ok */}
      {!hasAlerts && !hasTasks && (
        <Card className="border-2 border-success/30 bg-success/10 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-2xl font-bold text-foreground">
              Tudo em dia 👏
            </p>
            <p className="text-base text-muted-foreground mt-2">
              Você não tem pendências hoje
            </p>
          </CardContent>
        </Card>
      )}

      {/* BLOCO 4 — Progresso */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <p className="text-base font-semibold text-muted-foreground mb-4">
            📊 Progresso da obra
          </p>
          <div className="flex items-end justify-between mb-3">
            <span className="text-4xl font-black tabular-nums text-foreground">
              {progresso ?? 0}%
            </span>
          </div>
          <Progress
            value={progresso ?? 0}
            className="h-5 rounded-full bg-secondary [&>div]:bg-primary [&>div]:rounded-full"
          />
        </CardContent>
      </Card>

      {/* BLOCO 5 — Tarefas do dia */}
      {hasTasks && (
        <div id="secao-tarefas" className="space-y-4">
          <p className="text-base font-semibold text-muted-foreground">
            ✅ Tarefas do dia
          </p>
          {tarefas!.map((t) => (
            <Card key={t.id} className="shadow-sm">
              <CardContent className="p-5 flex items-center gap-5">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => toggleTask.mutate(t.id)}
                  className="h-7 w-7 rounded-lg border-2"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg text-foreground">
                    {t.nome}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(t.obra_fases as any)?.nome ?? ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* BLOCO 6 — Voz (botão flutuante) */}
      {voiceSupported && (
        <div className="fixed bottom-24 right-5 z-50 md:bottom-8 md:right-8 flex flex-col items-end">
          {voiceStatus !== "idle" && (
            <div
              className={`mb-3 rounded-2xl px-5 py-3 text-base font-semibold shadow-lg ${
                voiceStatus === "listening"
                  ? "bg-primary text-primary-foreground"
                  : voiceStatus === "processing"
                  ? "bg-success text-success-foreground"
                  : "bg-destructive text-destructive-foreground"
              }`}
            >
              {voiceStatus === "listening" && "🎤 Estou ouvindo..."}
              {voiceStatus === "processing" && `"${transcript}"`}
              {voiceStatus === "error" && "Não entendi, tente de novo"}
            </div>
          )}
          <Button
            onClick={handleVoiceClick}
            className={`h-16 w-16 rounded-full shadow-xl text-lg ${
              voiceStatus === "listening"
                ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {voiceStatus === "listening" ? (
              <MicOff className="h-7 w-7 text-primary-foreground" />
            ) : voiceStatus === "processing" ? (
              <Loader2 className="h-7 w-7 text-primary-foreground animate-spin" />
            ) : (
              <Mic className="h-7 w-7 text-primary-foreground" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Hoje;
