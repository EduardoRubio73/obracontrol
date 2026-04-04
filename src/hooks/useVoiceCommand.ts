import { useState, useCallback, useRef } from "react";

type VoiceStatus = "idle" | "listening" | "processing" | "error";

interface VoiceCommand {
  action: string;
  target?: string;
}

const COMMAND_MAP: Record<string, string> = {
  // concluir tarefa
  "concluir": "concluir_tarefa",
  "completar": "concluir_tarefa",
  "finalizar": "concluir_tarefa",
  "marcar": "concluir_tarefa",
  "feito": "concluir_tarefa",
  "pronto": "concluir_tarefa",
  "done": "concluir_tarefa",
  // ver atrasos
  "atraso": "ver_atrasos",
  "atrasos": "ver_atrasos",
  "atrasado": "ver_atrasos",
  "atrasada": "ver_atrasos",
  "atrasadas": "ver_atrasos",
  // ver compras
  "compra": "ver_compras",
  "compras": "ver_compras",
  "comprar": "ver_compras",
  "material": "ver_compras",
  "materiais": "ver_compras",
  // ver status
  "status": "ver_status",
  "resumo": "ver_status",
  "progresso": "ver_status",
  "como está": "ver_status",
};

function parseCommand(transcript: string): VoiceCommand {
  const lower = transcript.toLowerCase().trim();

  for (const [keyword, action] of Object.entries(COMMAND_MAP)) {
    if (lower.includes(keyword)) {
      // Extract target (text after the keyword)
      const idx = lower.indexOf(keyword);
      const after = lower.slice(idx + keyword.length).trim();
      return { action, target: after || undefined };
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
