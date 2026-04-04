import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Mic, MicOff, Send, Loader2, Bot } from "lucide-react";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  buttons?: { label: string; action: string }[];
  timestamp: Date;
}

const SUGGESTIONS = [
  { label: "Criar obra", message: "Quero criar uma nova obra" },
  { label: "Adicionar gasto", message: "Quero adicionar um gasto" },
  { label: "Ver andamento", message: "Quero ver o andamento da obra" },
];

function processUserMessage(
  text: string,
  obraAtiva: { id: string; nome: string } | null,
  navigate: (path: string) => void
): ChatMessage {
  const lower = text.toLowerCase().trim();
  const id = crypto.randomUUID();
  const timestamp = new Date();

  if (lower.includes("criar obra") || lower.includes("nova obra")) {
    return {
      id, role: "assistant", timestamp,
      content: "Vamos criar uma nova obra! Clique abaixo para iniciar o cadastro.",
      buttons: [{ label: "Criar obra", action: "/nova-obra" }],
    };
  }

  if (lower.includes("gasto") || lower.includes("despesa") || lower.includes("lançar")) {
    if (!obraAtiva) {
      return { id, role: "assistant", timestamp, content: "Selecione uma obra primeiro no seletor do topo para registrar um gasto." };
    }
    return {
      id, role: "assistant", timestamp,
      content: `Vou te levar ao financeiro da obra **${obraAtiva.nome}** para registrar o gasto.`,
      buttons: [{ label: "Ir para Financeiro", action: "/financeiro" }],
    };
  }

  if (lower.includes("andamento") || lower.includes("status") || lower.includes("progresso")) {
    if (!obraAtiva) {
      return { id, role: "assistant", timestamp, content: "Selecione uma obra primeiro para ver o andamento." };
    }
    return {
      id, role: "assistant", timestamp,
      content: `Aqui está o painel da obra **${obraAtiva.nome}**:`,
      buttons: [
        { label: "Ver Dashboard", action: "/dashboard" },
        { label: "Ver Etapas", action: "/etapas" },
      ],
    };
  }

  if (lower.includes("cotação") || lower.includes("cotacao")) {
    return {
      id, role: "assistant", timestamp,
      content: obraAtiva
        ? `Vou abrir as cotações da obra **${obraAtiva.nome}**.`
        : "Selecione uma obra para gerenciar cotações.",
      buttons: obraAtiva ? [{ label: "Ver Cotações", action: "/cotacoes" }] : undefined,
    };
  }

  if (lower.includes("etapa")) {
    return {
      id, role: "assistant", timestamp,
      content: obraAtiva
        ? `Abrindo etapas da obra **${obraAtiva.nome}**.`
        : "Selecione uma obra para ver as etapas.",
      buttons: obraAtiva ? [{ label: "Ver Etapas", action: "/etapas" }] : undefined,
    };
  }

  if (lower.includes("fornecedor") || lower.includes("contato")) {
    return {
      id, role: "assistant", timestamp,
      content: "Aqui estão seus fornecedores e contatos.",
      buttons: [{ label: "Ver Fornecedores", action: "/fornecedores" }],
    };
  }

  if (lower.includes("compra")) {
    return {
      id, role: "assistant", timestamp,
      content: obraAtiva
        ? `Vou mostrar as sugestões de compra para **${obraAtiva.nome}**.`
        : "Selecione uma obra para ver compras.",
      buttons: obraAtiva ? [{ label: "Ver Compras", action: "/compras" }] : undefined,
    };
  }

  if (lower.includes("ajuda") || lower.includes("help")) {
    return {
      id, role: "assistant", timestamp,
      content: "Posso te ajudar com:\n\n• **Criar obra** — iniciar uma nova obra\n• **Adicionar gasto** — registrar despesa\n• **Ver andamento** — status da obra\n• **Cotações** — gerenciar cotações\n• **Etapas** — ver cronograma\n• **Compras** — sugestões de compra\n• **Fornecedores** — contatos",
    };
  }

  return {
    id, role: "assistant", timestamp,
    content: "Não entendi bem. Tente algo como:\n\n• \"Criar obra\"\n• \"Adicionar gasto\"\n• \"Ver andamento\"\n• \"Ajuda\"",
  };
}

export default function Chat() {
  const navigate = useNavigate();
  const { obraAtiva } = useObraAtiva();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Olá! 👋 Sou seu assistente de obra.\n\n${obraAtiva ? `Obra ativa: **${obraAtiva.nome}**\n\n` : ""}Como posso te ajudar?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    status: voiceStatus,
    transcript,
    isSupported: voiceSupported,
    startListening,
    stopListening,
  } = useVoiceCommand();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = processUserMessage(text, obraAtiva, navigate);
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  }, [obraAtiva, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleVoiceClick = () => {
    if (voiceStatus === "listening") {
      stopListening();
    } else {
      startListening((_cmd, raw) => {
        if (raw) sendMessage(raw);
      });
    }
  };

  const handleButtonAction = (action: string) => {
    navigate(action);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">Assistente de Obra</p>
            {obraAtiva && (
              <p className="text-xs text-muted-foreground truncate">{obraAtiva.nome}</p>
            )}
          </div>
        </div>
        {voiceSupported && (
          <Button variant="ghost" size="icon" onClick={handleVoiceClick} className="shrink-0">
            {voiceStatus === "listening" ? (
              <MicOff className="h-5 w-5 text-destructive" />
            ) : (
              <Mic className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              }`}
            >
              {msg.content.split("**").map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
              )}

              {msg.buttons && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {msg.buttons.map((btn) => (
                    <Button
                      key={btn.action}
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs h-8 bg-background"
                      onClick={() => handleButtonAction(btn.action)}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggestions (only when few messages) */}
        {messages.length <= 1 && !isTyping && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.message)}
                className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice status */}
      {voiceStatus === "listening" && (
        <div className="px-4 py-2 bg-primary/10 text-primary text-center text-sm font-medium animate-pulse shrink-0">
          🎤 Ouvindo... fale agora
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t bg-card shrink-0">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Fale ou digite o que deseja fazer..."
          className="flex-1 rounded-full h-11 bg-background text-sm"
          disabled={isTyping}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isTyping}
          className="h-11 w-11 rounded-full shrink-0"
        >
          {isTyping ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  );
}
