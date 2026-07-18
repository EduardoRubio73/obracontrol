import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { useVoiceCommand, VoiceCommand } from "@/hooks/useVoiceCommand";
import { RequireObra } from "@/components/RequireObra";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, LayoutDashboard, Mic, MicOff, Loader2, Volume2, ShoppingCart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

function limparTextoParaVoz(texto: string): string {
  return texto
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, ' ')
    .replace(/`/g, '')
    .replace(/#{1,6}\s?/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function HojeContent({ obraId }: { obraId?: string }) {
  const { user } = useAuth();
  const { obras } = useObraAtiva();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [falando, setFalando] = useState(false);
  const {
    status: voiceStatus,
    transcript,
    isSupported: voiceSupported,
    startListening,
    stopListening,
  } = useVoiceCommand();

  const falar = useCallback((texto: string) => {
    speechSynthesis.cancel();
    const textoLimpo = limparTextoParaVoz(texto);
    const utterance = new SpeechSynthesisUtterance(textoLimpo);
    utterance.lang = "pt-BR";
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.onend = () => setFalando(false);
    utterance.onerror = () => setFalando(false);
    setFalando(true);
    speechSynthesis.speak(utterance);
  }, []);

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

  const { data: tarefas } = useQuery({
    queryKey: ["tarefas-pendentes", obraId],
    queryFn: async () => {
      let q = supabase
        .from("fase_itens")
        .select("id, nome, status, fase_id, obra_fases!inner(nome, obra_id)")
        .neq("status", "concluido")
        .limit(5);
      if (obraId) q = q.eq("obra_fases.obra_id", obraId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: comprasPendentes } = useQuery({
    queryKey: ["compras-pendentes", obraId],
    queryFn: async () => {
      let q = supabase
        .from("compras")
        .select("id, descricao, status, valor_total, fornecedor_id, fornecedores(nome)")
        .eq("status", "pendente")
        .limit(5);
      if (obraId) q = q.eq("obra_id", obraId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: progresso } = useQuery({
    queryKey: ["progresso-geral", obraId],
    queryFn: async () => {
      let query = supabase.from("vw_progresso_obra" as any).select("*");
      if (obraId) query = query.eq("obra_id", obraId);
      const { data, error } = (await query) as any;
      if (error) throw error;
      const rows = data as { progresso_geral: number }[];
      if (!rows?.length) return 0;
      const avg =
        rows.reduce((a: number, r: any) => a + (r.progresso_geral ?? 0), 0) /
        rows.length;
      return Math.round(avg);
    },
  });

  const marcarComprado = useMutation({
    mutationFn: async (compraId: string) => {
      const { error } = await supabase.rpc("marcar_comprado", { p_compra_id: compraId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras-pendentes"] });
      toast.success("Compra marcada como realizada! 🛒");
    },
  });

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

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.nome?.split(" ")[0] ?? "";
  const obraAtual = obraId ? obras.find((o) => o.id === obraId) : null;
  const hasAlerts = (alertas?.length ?? 0) > 0;
  const hasTasks = (tarefas?.length ?? 0) > 0;
  const hasCompras = (comprasPendentes?.length ?? 0) > 0;

  const handleVoiceCommand = useCallback(
    (cmd: VoiceCommand, raw: string) => {
      switch (cmd.action) {
        case "criar_obra":
          falar("Vamos criar uma nova obra!");
          toast.success("Vamos criar uma nova obra!");
          navigate("/nova-obra");
          break;
        case "concluir_tarefa": {
          if (tarefas?.length) {
            const match = cmd.target
              ? tarefas.find((t) =>
                  t.nome.toLowerCase().includes(cmd.target!.toLowerCase())
                )
              : tarefas[0];
            if (match) {
              toggleTask.mutate(match.id);
              falar(`Tarefa "${match.nome}" concluída!`);
              toast.success(`"${match.nome}" concluída por voz!`);
            } else {
              falar("Não encontrei essa tarefa.");
              toast.info("Não encontrei essa tarefa.");
            }
          } else {
            falar("Sem tarefas pendentes.");
            toast.info("Sem tarefas pendentes.");
          }
          break;
        }
        case "ver_atrasos":
        case "ver_hoje":
          window.scrollTo({ top: 0, behavior: "smooth" });
          falar("Mostrando o resumo do seu dia.");
          toast.info("Mostrando resumo do dia");
          break;
        case "ver_compras":
          falar("Abrindo compras.");
          navigate("/compras");
          break;
        case "ver_status":
          falar("Abrindo o painel geral.");
          navigate("/dashboard");
          break;
        case "ver_financeiro":
          falar("Abrindo o financeiro.");
          navigate("/financeiro");
          break;
        case "ver_etapas":
          falar("Abrindo as etapas.");
          navigate("/etapas");
          break;
        case "ajuda":
          falar("Você pode dizer: concluir tarefa, nova obra, ver atrasos, status, ou financeiro.");
          toast("Você pode dizer:", {
            description: "• \"Concluir tarefa\"\n• \"Nova obra\"\n• \"Ver atrasos\"\n• \"Status\"\n• \"Financeiro\"",
            duration: 6000,
          });
          break;
        default:
          falar("Não entendi. Tente dizer: concluir tarefa, nova obra, ou ajuda.");
          toast("Não entendi. Tente:", {
            description: "• Concluir tarefa\n• Nova obra\n• Ver atrasos\n• Status\n• Ajuda",
            duration: 5000,
          });
      }
    },
    [tarefas, toggleTask, navigate, falar]
  );

  const handleVoiceClick = () => {
    if (voiceStatus === "listening") stopListening();
    else startListening(handleVoiceCommand);
  };

  return (
    <div className="space-y-8 max-w-lg mx-auto pb-32 px-1">
      {/* Header */}
      <div className="pt-4 space-y-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {greeting}
            {firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            {obraAtual ? (
              <>Obra: <span className="font-medium text-foreground">{obraAtual.nome}</span></>
            ) : hasAlerts ? (
              "Existem pendências que precisam de atenção."
            ) : (
              "Sem pendências. Obra no caminho certo."
            )}
          </p>
        </div>
        {obraId && (
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl font-semibold gap-2"
            onClick={() => navigate(`/obras/${obraId}/dashboard`)}
          >
            <LayoutDashboard className="h-5 w-5" />
            Abrir Dashboard completo
          </Button>
        )}
      </div>

      {/* Alert */}
      {hasAlerts && (
        <Card className="border-2 border-warning/40 bg-warning/10 shadow-sm animate-fade-in">
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

      {/* CTA */}
      {(hasTasks || hasCompras) && (
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

      {/* All good */}
      {!hasAlerts && !hasTasks && !hasCompras && (
        <Card className="border-2 border-success/30 bg-success/10 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-2xl font-bold text-foreground">Tudo em dia 👏</p>
            <p className="text-base text-muted-foreground mt-2">
              Você não tem pendências hoje
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
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

      {/* Tasks */}
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
                  <p className="font-semibold text-lg text-foreground">{t.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {(t.obra_fases as any)?.nome ?? ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compras Pendentes */}
      {hasCompras && (
        <div className="space-y-4">
          <p className="text-base font-semibold text-muted-foreground">
            🛒 Compras pendentes
          </p>
          {comprasPendentes!.map((c: any) => (
            <Card key={c.id} className="shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <ShoppingCart className="h-6 w-6 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg text-foreground truncate">
                    {c.descricao || "Compra sem descrição"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(c.fornecedores as any)?.nome ?? "Sem fornecedor"}
                    {c.valor_total ? ` · R$ ${Number(c.valor_total).toFixed(2)}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => marcarComprado.mutate(c.id)}
                >
                  Comprado
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {voiceSupported && (
        <div className="fixed bottom-24 right-5 z-50 md:bottom-8 md:right-8 flex flex-col items-end">
          {(voiceStatus !== "idle" || falando) && (
            <div
              className={`mb-3 rounded-2xl px-5 py-3 text-base font-semibold shadow-lg animate-fade-in ${
                falando
                  ? "bg-accent text-accent-foreground"
                  : voiceStatus === "listening"
                  ? "bg-primary text-primary-foreground"
                  : voiceStatus === "processing"
                  ? "bg-success text-success-foreground"
                  : "bg-destructive text-destructive-foreground"
              }`}
            >
              {falando && "🔊 Respondendo..."}
              {!falando && voiceStatus === "listening" && "🎤 Estou ouvindo..."}
              {!falando && voiceStatus === "processing" && `"${transcript}"`}
              {!falando && voiceStatus === "error" && "Não entendi, tente de novo"}
            </div>
          )}
          <Button
            onClick={handleVoiceClick}
            className={`h-16 w-16 rounded-full shadow-xl ${
              falando
                ? "bg-accent hover:bg-accent/90 animate-pulse"
                : voiceStatus === "listening"
                ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {falando ? (
              <Volume2 className="h-7 w-7 text-accent-foreground" />
            ) : voiceStatus === "listening" ? (
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
}

export default function Hoje() {
  const { id: obraId } = useParams<{ id: string }>();
  if (obraId) {
    return (
      <RequireObra obraId={obraId} pageName="Hoje">
        <HojeContent obraId={obraId} />
      </RequireObra>
    );
  }
  return <HojeContent />;
}
