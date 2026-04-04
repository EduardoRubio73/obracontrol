import { useState, useCallback, useRef } from "react";

type VoiceStatus = "idle" | "listening" | "processing" | "error";

interface VoiceCommand {
  action: string;
  target?: string;
}

/* ── Intent definitions: keyword groups → action ── */
const INTENTS: { action: string; keywords: string[] }[] = [
  {
    action: "criar_obra",
    keywords: [
      "nova obra", "criar obra", "começar obra", "iniciar obra",
      "nova reforma", "criar reforma", "começar reforma",
      "novo projeto", "criar projeto", "iniciar projeto",
      "vamos começar", "quero criar", "quero começar",
      "abrir obra", "registrar obra", "cadastrar obra",
      "nova construção", "iniciar construção",
    ],
  },
  {
    action: "concluir_tarefa",
    keywords: [
      "concluir", "completar", "finalizar", "marcar",
      "feito", "pronto", "done", "terminei", "acabei",
      "tarefa pronta", "tarefa feita", "concluí",
    ],
  },
  {
    action: "ver_atrasos",
    keywords: [
      "atraso", "atrasos", "atrasado", "atrasada", "atrasadas",
      "pendências", "pendencia", "o que falta", "que falta",
      "problemas", "alertas", "urgente", "urgências",
    ],
  },
  {
    action: "ver_compras",
    keywords: [
      "compra", "compras", "comprar", "material", "materiais",
      "fornecedor", "fornecedores", "cotação", "cotações",
      "orçamento", "orçamentos", "pedido", "pedidos",
    ],
  },
  {
    action: "ver_status",
    keywords: [
      "status", "resumo", "progresso", "como está", "como vai",
      "andamento", "situação", "visão geral", "dashboard",
      "resultado", "relatório", "como tá",
    ],
  },
  {
    action: "ver_financeiro",
    keywords: [
      "financeiro", "dinheiro", "gasto", "gastos", "custo", "custos",
      "pagamento", "pagamentos", "quanto gastei", "valor",
      "receita", "despesa", "despesas", "saldo",
    ],
  },
  {
    action: "ver_etapas",
    keywords: [
      "etapa", "etapas", "fase", "fases",
      "cronograma", "planejamento", "agenda",
    ],
  },
  {
    action: "ver_hoje",
    keywords: [
      "hoje", "o que fazer", "que fazer hoje", "tarefas do dia",
      "minha agenda", "meu dia", "próxima tarefa", "próximo passo",
    ],
  },
  {
    action: "ajuda",
    keywords: [
      "ajuda", "help", "o que posso fazer", "comandos",
      "o que você faz", "opções", "menu", "como funciona",
    ],
  },
];

function parseCommand(transcript: string): VoiceCommand {
  const lower = transcript.toLowerCase().trim();

  // Try multi-word phrases first (longer matches are more specific)
  for (const intent of INTENTS) {
    for (const keyword of intent.keywords) {
      if (lower.includes(keyword)) {
        const idx = lower.indexOf(keyword);
        const after = lower.slice(idx + keyword.length).trim();
        return { action: intent.action, target: after || undefined };
      }
    }
  }

  return { action: "unknown", target: lower };
}

export function useVoiceCommand() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(
    (onCommand: (cmd: VoiceCommand, raw: string) => void) => {
      if (!isSupported) {
        setStatus("error");
        return;
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setStatus("listening");

      recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        setTranscript(result);
        setStatus("processing");

        const cmd = parseCommand(result);
        onCommand(cmd, result);

        setTimeout(() => setStatus("idle"), 2000);
      };

      recognition.onerror = () => {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      };

      recognition.onend = () => {
        if (status === "listening") {
          setStatus("idle");
        }
      };

      recognition.start();
    },
    [isSupported, status]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("idle");
  }, []);

  return {
    status,
    transcript,
    isSupported,
    startListening,
    stopListening,
  };
}

export type { VoiceCommand, VoiceStatus };
