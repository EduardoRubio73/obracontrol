import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mic, MicOff, Send, Loader2, Bot, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  acoes?: { label: string; route: string }[];
  anexos?: { nome: string; url: string; tipo: string }[];
  timestamp: Date;
}

interface PendingFile {
  file: File;
  preview?: string;
}

const SUGGESTIONS = [
  { label: "Criar obra", message: "Quero criar uma nova obra" },
  { label: "Adicionar gasto", message: "Quero adicionar um gasto" },
  { label: "Ver andamento", message: "Quero ver o andamento da obra" },
  { label: "Ajuda", message: "O que você pode fazer?" },
];

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.pdf,.doc,.docx";

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { obraAtiva, obraAtivaId } = useObraAtiva();
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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    status: voiceStatus,
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

  const uploadFiles = async (files: PendingFile[]): Promise<{ nome: string; url: string; tipo: string }[]> => {
    if (!user) return [];
    const uploaded: { nome: string; url: string; tipo: string }[] = [];

    for (const pf of files) {
      const ext = pf.file.name.split(".").pop() || "bin";
      const path = `chat/${user.id}/${Date.now()}_${pf.file.name}`;

      const { error } = await supabase.storage
        .from("documentos")
        .upload(path, pf.file);

      if (error) {
        console.error("Upload error:", error);
        toast.error(`Erro ao enviar ${pf.file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("documentos")
        .getPublicUrl(path);

      const tipo = pf.file.type.startsWith("image/") ? "imagem" : "documento";
      uploaded.push({ nome: pf.file.name, url: urlData.publicUrl, tipo });

      // Save to documentos table if obra is active
      if (obraAtivaId) {
        await supabase.from("documentos").insert({
          obra_id: obraAtivaId,
          nome: pf.file.name,
          url: urlData.publicUrl,
          tipo: ext,
          tamanho_bytes: pf.file.size,
          user_id: user.id,
        });
      }
    }

    return uploaded;
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() && pendingFiles.length === 0) return;

    // Upload files first
    let anexos: { nome: string; url: string; tipo: string }[] = [];
    if (pendingFiles.length > 0) {
      anexos = await uploadFiles(pendingFiles);
      setPendingFiles([]);
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      anexos: anexos.length > 0 ? anexos : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Build history from previous messages (exclude welcome)
      const historico = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("chat-assistente", {
        body: {
          mensagem: text.trim(),
          obra_id: obraAtivaId,
          historico,
          anexos: anexos.map((a) => ({ nome: a.nome, url: a.url })),
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ ${data.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } else {
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.resposta || "Não consegui processar sua mensagem.",
          acoes: data.acoes?.length > 0 ? data.acoes : undefined,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "❌ Erro ao se comunicar com o assistente. Tente novamente.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, obraAtivaId, pendingFiles, user]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: PendingFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} excede 20MB`);
        continue;
      }
      const pf: PendingFile = { file };
      if (file.type.startsWith("image/")) {
        pf.preview = URL.createObjectURL(file);
      }
      newFiles.push(pf);
    }
    setPendingFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
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
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              }`}
            >
              {/* Attachments */}
              {msg.anexos && msg.anexos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.anexos.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-background/50 rounded-lg px-2 py-1 text-xs">
                      {a.tipo === "imagem" ? (
                        <ImageIcon className="h-3.5 w-3.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      <span className="truncate max-w-[120px]">{a.nome}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {/* Action buttons */}
              {msg.acoes && msg.acoes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {msg.acoes.map((acao) => (
                    <Button
                      key={acao.route}
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs h-8 bg-background"
                      onClick={() => navigate(acao.route)}
                    >
                      {acao.label}
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

        {/* Suggestions */}
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

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="px-4 py-2 border-t bg-card flex gap-2 overflow-x-auto shrink-0">
          {pendingFiles.map((pf, i) => (
            <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted">
              {pf.preview ? (
                <img src={pf.preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => removePendingFile(i)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] px-1 truncate">
                {pf.file.name}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t bg-card shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-11 w-11"
          onClick={() => fileInputRef.current?.click()}
          disabled={isTyping}
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>
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
          disabled={(!input.trim() && pendingFiles.length === 0) || isTyping}
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
