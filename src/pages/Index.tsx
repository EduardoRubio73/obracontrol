import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceCommand, VoiceCommand } from "@/hooks/useVoiceCommand";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Home,
  Layers,
  ShoppingCart,
  DollarSign,
  Users,
  Mic,
  MicOff,
  Loader2,
} from "lucide-react";

/* ── gradient menu items ── */
const menuItems = [
  {
    key: "hoje",
    label: "Hoje",
    icon: Home,
    gradient: "from-[#FF8A00] to-[#FFB347]",
    shadow: "shadow-[0_8px_24px_-4px_rgba(255,138,0,0.35)]",
    url: "/hoje",
  },
  {
    key: "etapas",
    label: "Etapas",
    icon: Layers,
    gradient: "from-[#4FACFE] to-[#00F2FE]",
    shadow: "shadow-[0_8px_24px_-4px_rgba(79,172,254,0.35)]",
    url: "/etapas",
  },
  {
    key: "compras",
    label: "Compras",
    icon: ShoppingCart,
    gradient: "from-[#43E97B] to-[#38F9D7]",
    shadow: "shadow-[0_8px_24px_-4px_rgba(67,233,123,0.35)]",
    url: "/compras",
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    gradient: "from-[#667EEA] to-[#764BA2]",
    shadow: "shadow-[0_8px_24px_-4px_rgba(102,126,234,0.35)]",
    url: "/financeiro",
  },
  {
    key: "fornecedores",
    label: "Contatos",
    icon: Users,
    gradient: "from-[#BDC3C7] to-[#2C3E50]",
    shadow: "shadow-[0_8px_24px_-4px_rgba(44,62,80,0.25)]",
    url: "/fornecedores",
  },
];

const MenuPrincipal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    status: voiceStatus,
    transcript,
    isSupported: voiceSupported,
    startListening,
    stopListening,
  } = useVoiceCommand();

  /* ── data ── */
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

  /* ── derived ── */
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.nome?.split(" ")[0] ?? "";
  const hasAlerts = (alertas?.length ?? 0) > 0;

  // Dynamic order: if alerts → Hoje first, else Etapas first
  const orderedMenu = hasAlerts
    ? menuItems
    : [
        menuItems[1], // etapas
        menuItems[0], // hoje
        ...menuItems.slice(2),
      ];

  /* ── voice ── */
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
          navigate("/hoje");
          break;
        case "ver_compras":
          navigate("/compras");
          break;
        case "ver_status":
          navigate("/etapas");
          break;
        default:
          toast.error(
            `Não entendi: "${raw}". Tente: concluir, atrasos, status.`
          );
      }
    },
    [tarefas, toggleTask, navigate]
  );

  const handleVoiceClick = () => {
    if (voiceStatus === "listening") {
      stopListening();
    } else {
      startListening(handleVoiceCommand);
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-32 px-2">
      {/* ── BLOCO 1: Header inteligente ── */}
      <div className="pt-6 pb-2 animate-fade-in">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {greeting}
          {firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          {hasAlerts
            ? "⚠️ Você tem algo importante hoje"
            : "Tudo em ordem por aqui 👌"}
        </p>
      </div>

      {/* ── BLOCO 2: Destaque do dia ── */}
      <div className="mt-5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {hasAlerts ? (
          <div className="rounded-3xl bg-gradient-to-r from-red-400/20 to-orange-300/20 border border-red-200/60 p-6">
            <p className="text-xl font-bold text-foreground">
              🚨 Você tem etapas atrasadas
            </p>
            <p className="text-base text-muted-foreground mt-1">
              {alertas![0]?.mensagem}
            </p>
            <Button
              className="mt-4 h-12 rounded-2xl font-bold text-base px-8 bg-red-500 hover:bg-red-600 text-white"
              onClick={() => navigate("/hoje")}
            >
              Resolver agora
            </Button>
          </div>
        ) : (
          <div className="rounded-3xl bg-gradient-to-r from-emerald-400/15 to-teal-300/15 border border-emerald-200/60 p-6 text-center">
            <p className="text-2xl font-bold text-foreground">
              Tudo em dia 🎉
            </p>
            <p className="text-base text-muted-foreground mt-1">
              Sua obra está no caminho certo
            </p>
          </div>
        )}
      </div>

      {/* ── BLOCO 3: Menu grid premium ── */}
      <div className="grid grid-cols-2 gap-5 mt-8">
        {orderedMenu.map((item, i) => {
          const Icon = item.icon;
          const isFull = orderedMenu.length % 2 !== 0 && i === orderedMenu.length - 1;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.url)}
              className={`
                group relative overflow-hidden rounded-[20px]
                bg-gradient-to-br ${item.gradient} ${item.shadow}
                flex flex-col items-center justify-center gap-3
                h-[140px] text-white font-bold text-lg
                transition-all duration-200 ease-out
                active:scale-[0.97] hover:shadow-2xl hover:-translate-y-0.5
                animate-fade-in
                ${isFull ? "col-span-2" : ""}
              `}
              style={{ animationDelay: `${0.08 + i * 0.06}s` }}
            >
              {/* subtle glass overlay */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <Icon className="h-9 w-9 drop-shadow-md relative z-10" strokeWidth={2.2} />
              <span className="relative z-10 drop-shadow-sm text-[17px] tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── BLOCO 6: Voz (botão flutuante) ── */}
      {voiceSupported && (
        <div className="fixed bottom-24 right-5 z-50 md:bottom-8 md:right-8 flex flex-col items-end">
          {voiceStatus !== "idle" && (
            <div
              className={`mb-3 rounded-2xl px-5 py-3 text-base font-semibold shadow-lg animate-fade-in ${
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
            className={`h-16 w-16 rounded-full shadow-xl ${
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

export default MenuPrincipal;
