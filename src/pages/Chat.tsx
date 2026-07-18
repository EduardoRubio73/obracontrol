import { useState, useRef, useEffect, useCallback, useReducer } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, Bot, Paperclip, X, FileText, Image as ImageIcon, Mic, Volume2, MicOff } from "lucide-react";
import { VoiceWaveform } from "@/components/VoiceWaveform";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { RequireObra } from "@/components/RequireObra";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceLoop, VoiceLoopStatus } from "@/hooks/useVoiceLoop";
import { useCriarObra } from "@/hooks/useCriarObra";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  criacaoObraReducer,
  ESTADO_INICIAL,
  classificacoes,
  type CriacaoObraCardData,
  type EscopoIA,
  type Complexidade,
  type FornecedorSelecionado,
} from "@/lib/criarObraChatFlow";
import { buscarObraSimilar } from "@/lib/criarObraSimilaridade";
import { CriacaoObraCard } from "@/components/chat/CriacaoObraCard";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  acoes?: { label: string; route: string }[];
  anexos?: { nome: string; url: string; tipo: string }[];
  card?: CriacaoObraCardData;
  timestamp: Date;
}

interface PendingFile {
  file: File;
  preview?: string;
}

const SUGGESTIONS = [
  { label: "Adicionar gasto", message: "Quero adicionar um gasto" },
  { label: "Ver andamento", message: "Quero ver o andamento da obra" },
  { label: "Nova etapa", message: "Quero criar uma nova etapa" },
  { label: "Registrar compra", message: "Quero registrar uma compra" },
  { label: "Ver financeiro", message: "Quero ver o financeiro dessa obra" },
  { label: "Fornecedores", message: "Quero ver os fornecedores" },
  { label: "Ajuda", message: "O que você pode fazer?" },
];

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.pdf,.doc,.docx";

export function ChatContent({ obraId }: { obraId: string | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { obras } = useObraAtiva();
  const obraAtiva = obraId ? obras.find((o) => o.id === obraId) ?? null : null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);

  const [criacaoObraState, dispatchCriacao] = useReducer(criacaoObraReducer, ESTADO_INICIAL);

  const pushMessage = useCallback((partial: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [...prev, { ...partial, id: crypto.randomUUID(), timestamp: new Date() }]);
  }, []);

  const iniciarCriacaoObra = useCallback(() => {
    dispatchCriacao({ type: "iniciar" });
    pushMessage({ role: "assistant", content: "Vamos criar uma nova obra! Qual é o nome dela?" });
  }, [pushMessage]);

  const cancelarCriacaoObra = useCallback(() => {
    dispatchCriacao({ type: "cancelar" });
    pushMessage({ role: "assistant", content: "Ok, cancelei a criação da obra. Como posso ajudar?" });
  }, [pushMessage]);

  const onUsarDuplicata = useCallback((obra: { id: string; nome: string }) => {
    dispatchCriacao({ type: "cancelar" });
    navigate(`/obras/${obra.id}/chat`);
  }, [navigate]);

  const onIgnorarDuplicata = useCallback(() => {
    dispatchCriacao({ type: "ignorar_duplicata" });
    pushMessage({ role: "assistant", content: "Sem problema! Qual o tipo da obra?", card: { kind: "tipo" } });
  }, [pushMessage]);

  const queryClient = useQueryClient();

  const { data: tiposObra } = useQuery({
    queryKey: ["tipos_obra"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_obra").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
  const tiposObraOptions = (tiposObra ?? []).map((t) => ({ value: t.nome, label: t.nome }));

  const criarTipoObra = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.from("tipos_obra").insert({ nome }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (novo: { nome: string }) => {
      queryClient.invalidateQueries({ queryKey: ["tipos_obra"] });
      onSelecionarTipo(novo.nome);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSelecionarTipo = useCallback((tipo: string) => {
    dispatchCriacao({ type: "informar_tipo", tipoObra: tipo });
    pushMessage({ role: "user", content: tipo });
    pushMessage({ role: "assistant", content: "Qual a complexidade da obra?", card: { kind: "complexidade" } });
  }, [pushMessage]);

  const onSelecionarClassificacao = useCallback((c: Complexidade) => {
    dispatchCriacao({ type: "informar_classificacao", classificacao: c });
    const label = classificacoes.find((x) => x.value === c)?.label ?? c;
    pushMessage({ role: "user", content: label });
    pushMessage({ role: "assistant", content: "Descreva a obra. Quanto mais detalhe, melhor será o escopo gerado pela IA." });
  }, [pushMessage]);

  const gerarEscopoGuiado = useCallback(async (descricaoAtual: string) => {
    dispatchCriacao({ type: "gerando_escopo" });
    pushMessage({ role: "assistant", content: "Gerando escopo com IA... ✨" });
    try {
      const { data, error } = await supabase.functions.invoke("gerar-escopo", {
        body: { descricao: descricaoAtual, tipo_obra: criacaoObraState.tipoObra, classificacao: criacaoObraState.classificacao },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const escopo = data as EscopoIA;
      dispatchCriacao({ type: "escopo_gerado", escopo });
      pushMessage({ role: "assistant", content: "Aqui está o escopo gerado pela IA:", card: { kind: "escopo", escopo } });
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Erro ao gerar escopo.";
      dispatchCriacao({ type: "escopo_falhou", erro: mensagem });
      pushMessage({ role: "assistant", content: `⚠️ ${mensagem}`, card: { kind: "escopo_erro", mensagem } });
    }
  }, [criacaoObraState.tipoObra, criacaoObraState.classificacao, pushMessage]);

  const onEditarDescricao = useCallback(() => {
    dispatchCriacao({ type: "voltar_para_descricao" });
    pushMessage({ role: "assistant", content: `Ok! Descreva novamente a obra (você tinha escrito: "${criacaoObraState.descricao}").` });
  }, [pushMessage, criacaoObraState.descricao]);

  const onRetryEscopo = useCallback(() => {
    void gerarEscopoGuiado(criacaoObraState.descricao);
  }, [gerarEscopoGuiado, criacaoObraState.descricao]);

  const { data: allFornecedores } = useQuery({
    queryKey: ["fornecedores-lista"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("id, nome, email, tipo, categoria, score, telefone").eq("status", "ativo");
      if (error) throw error;
      return data;
    },
  });
  const [addFornecedorId, setAddFornecedorId] = useState("");
  const { criarObra } = useCriarObra();

  const carregarSugestoesFornecedores = useCallback(async () => {
    const { data } = await supabase.rpc("fn_sugerir_top3_fornecedores", { p_complexidade: criacaoObraState.classificacao });
    let sugeridos: FornecedorSelecionado[] = [];
    if (data && data.length > 0) {
      sugeridos = data.map((s: any) => {
        const full = allFornecedores?.find((f) => f.id === s.id);
        return {
          id: s.id, nome: s.nome, categoria: s.categoria || null,
          tipo: full?.tipo || null, score: full?.score || null, telefone: full?.telefone || null,
        };
      });
    }
    dispatchCriacao({ type: "definir_fornecedores_sugeridos", fornecedores: sugeridos });
    pushMessage({ role: "assistant", content: "Selecionamos os melhores profissionais para sua obra. Escolha até 3:", card: { kind: "fornecedores" } });
  }, [criacaoObraState.classificacao, allFornecedores, pushMessage]);

  const onConfirmarEscopo = useCallback(() => {
    dispatchCriacao({ type: "confirmar_escopo" });
    void carregarSugestoesFornecedores();
  }, [carregarSugestoesFornecedores]);

  const onAlternarFornecedor = useCallback((f: FornecedorSelecionado) => {
    dispatchCriacao({ type: "alternar_fornecedor", fornecedor: f });
  }, []);

  const onAdicionarFornecedor = useCallback(() => {
    if (!addFornecedorId) return;
    const forn = allFornecedores?.find((f) => f.id === addFornecedorId);
    if (!forn) return;
    dispatchCriacao({
      type: "alternar_fornecedor",
      fornecedor: { id: forn.id, nome: forn.nome, categoria: forn.categoria || null, tipo: forn.tipo, score: forn.score, telefone: forn.telefone },
    });
    setAddFornecedorId("");
  }, [addFornecedorId, allFornecedores]);

  const executarCriacaoObra = useCallback(async () => {
    if (criacaoObraState.fornecedoresSelecionados.length < 1 || !user) return;
    dispatchCriacao({ type: "criando_obra" });
    pushMessage({ role: "assistant", content: "Criando obra... 🏗️" });
    try {
      const novaObraId = await criarObra.mutateAsync({
        nome: criacaoObraState.nome,
        tipoObra: criacaoObraState.tipoObra,
        classificacao: criacaoObraState.classificacao,
        descricao: criacaoObraState.descricao,
        escopo: criacaoObraState.escopo,
        fornecedores: criacaoObraState.fornecedoresSelecionados,
        userId: user.id,
      });
      dispatchCriacao({ type: "obra_criada", obraId: novaObraId });
      navigate(`/obras/${novaObraId}/chat`, {
        state: {
          obraCriada: { nome: criacaoObraState.nome, fornecedoresCount: criacaoObraState.fornecedoresSelecionados.length },
        },
      });
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Erro ao criar obra.";
      dispatchCriacao({ type: "criacao_falhou", erro: mensagem });
      pushMessage({ role: "assistant", content: `⚠️ ${mensagem}`, card: { kind: "criacao_erro", mensagem } });
    }
  }, [criacaoObraState, user, criarObra, navigate, pushMessage]);

  const handleCriacaoObraTexto = useCallback((texto: string) => {
    const trimmed = texto.trim();
    if (!trimmed) return;

    if (criacaoObraState.step === "nome") {
      if (trimmed.length < 3) {
        pushMessage({ role: "assistant", content: "O nome precisa ter pelo menos 3 letras. Como se chama a obra?" });
        return;
      }
      pushMessage({ role: "user", content: trimmed });
      setInput("");
      const duplicata = buscarObraSimilar(trimmed, obras);
      dispatchCriacao({ type: "informar_nome", nome: trimmed, duplicata });
      if (duplicata) {
        pushMessage({
          role: "assistant",
          content: `Encontrei uma obra parecida: **${duplicata.nome}**. Quer usar essa em vez de criar uma nova?`,
          card: { kind: "duplicata", obra: duplicata },
        });
      } else {
        pushMessage({ role: "assistant", content: "Qual o tipo da obra?", card: { kind: "tipo" } });
      }
      return;
    }

    if (criacaoObraState.step === "descricao") {
      if (trimmed.length < 10) {
        pushMessage({ role: "assistant", content: "Descreva com mais detalhes (pelo menos 10 caracteres) para eu gerar um bom escopo." });
        return;
      }
      pushMessage({ role: "user", content: trimmed });
      setInput("");
      dispatchCriacao({ type: "informar_descricao", descricao: trimmed });
      void gerarEscopoGuiado(trimmed);
    }
  }, [criacaoObraState.step, obras, pushMessage, gerarEscopoGuiado]);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Reinicia a conversa ao trocar de obra — cada obra tem contexto isolado
  useEffect(() => {
    const criada = (location.state as { obraCriada?: { nome: string; fornecedoresCount: number } } | null)?.obraCriada;

    if (obraId === null) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Olá! 👋 Sou seu assistente de obra.\n\nAinda não vejo nenhuma obra sua. Quer começar uma agora?",
          timestamp: new Date(),
        },
      ]);
      setPendingFiles([]);
      return;
    }

    if (criada) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Obra criada com sucesso! 🎉\n\n"${criada.nome}" está pronta para acompanhamento.${
            criada.fornecedoresCount > 0 ? `\n\nEnviado para ${criada.fornecedoresCount} profissional(is).` : ""
          }\n\nComo posso te ajudar agora?`,
          acoes: [{ label: "Ver Dossiê da Obra", route: `/obras/${obraId}/dossie` }],
          timestamp: new Date(),
        },
      ]);
      setPendingFiles([]);
      return;
    }

    const outrasObras = obras.filter((o) => o.id !== obraId);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: obraAtiva
          ? `Olá! 👋 Sou seu assistente de obra.\n\nEstou te ajudando com a obra **${obraAtiva.nome}**.${outrasObras.length > 0 ? " É essa obra que você quer gerenciar?" : ""}\n\nComo posso te ajudar?`
          : `Olá! 👋 Sou seu assistente de obra.\n\nComo posso te ajudar?`,
        acoes: outrasObras.length > 0
          ? outrasObras.map((o) => ({ label: `Trocar para "${o.nome}"`, route: `/obras/${o.id}/chat` }))
          : undefined,
        timestamp: new Date(),
      },
    ]);
    setPendingFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId, obras.length, location.state]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  const uploadFiles = async (files: PendingFile[]): Promise<{ nome: string; url: string; tipo: string }[]> => {
    if (!user || !obraId) return [];
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

      const { error: insertError } = await supabase.from("documentos").insert({
        obra_id: obraId,
        nome: pf.file.name,
        url: urlData.publicUrl,
        tipo: ext,
        tamanho_bytes: pf.file.size,
        user_id: user.id,
      });
      if (insertError) {
        console.error("Erro ao vincular anexo à obra:", insertError);
        toast.error(`Anexo "${pf.file.name}" enviado, mas não foi vinculado à obra`);
      }
    }

    return uploaded;
  };

  // Core send function — returns the AI response text
  const sendMessage = useCallback(async (text: string, filesToSend?: PendingFile[]): Promise<string> => {
    if (!obraId) return "";
    if (!text.trim() && (!filesToSend || filesToSend.length === 0)) return "";

    let anexos: { nome: string; url: string; tipo: string }[] = [];
    if (filesToSend && filesToSend.length > 0) {
      anexos = await uploadFiles(filesToSend);
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
      const historico = messagesRef.current
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("chat-assistente", {
        body: {
          mensagem: text.trim(),
          obra_id: obraId,
          historico,
          anexos: anexos.map((a) => ({ nome: a.nome, url: a.url })),
        },
      });

      if (error) throw error;

      let responseText = "";

      if (data?.error) {
        toast.error(data.error);
        responseText = `⚠️ ${data.error}`;
      } else {
        responseText = data.resposta || "Não consegui processar sua mensagem.";
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: responseText,
        acoes: data?.acoes?.length > 0 ? data.acoes : undefined,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      return responseText;
    } catch (err) {
      console.error("Chat error:", err);
      const errorText = "❌ Erro ao se comunicar com o assistente. Tente novamente.";
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return errorText;
    } finally {
      setIsTyping(false);
    }
  }, [obraId, user]);

  const emPassoDeTexto = (step: typeof criacaoObraState.step) => step === "nome" || step === "descricao";

  const handleUserSubmit = useCallback((texto: string): Promise<string> => {
    if (criacaoObraState.ativo && emPassoDeTexto(criacaoObraState.step)) {
      handleCriacaoObraTexto(texto);
      return Promise.resolve("");
    }
    return sendMessage(texto);
  }, [criacaoObraState.ativo, criacaoObraState.step, handleCriacaoObraTexto, sendMessage]);

  // Voice loop integration
  const voiceLoop = useVoiceLoop({
    onTranscript: async (text) => {
      return await handleUserSubmit(text);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (criacaoObraState.ativo && emPassoDeTexto(criacaoObraState.step)) {
      handleCriacaoObraTexto(input);
      return;
    }
    const files = pendingFiles.length > 0 ? [...pendingFiles] : undefined;
    setPendingFiles([]);
    sendMessage(input, files);
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

  const toggleVoiceLoop = () => {
    if (voiceLoop.isActive) {
      voiceLoop.stop();
    } else {
      voiceLoop.start();
    }
  };

  const voiceStatusLabel: Record<VoiceLoopStatus, string> = {
    idle: "",
    listening: "🎤 Fale agora...",
    processing: "⏳ Processando...",
    speaking: "🔊 Respondendo...",
  };

  const activeCardMessageId = [...messages].reverse().find((m) => m.card)?.id ?? null;
  const semObraEFluxoInativo = obraId === null && !criacaoObraState.ativo;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)] md:h-[calc(100vh-3.5rem)] max-w-2xl md:max-w-3xl mx-auto">
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
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto max-h-[70vh] px-4 py-4 space-y-3 bg-background">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              }`}
            >
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

              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown>{msg.content.replace(/<\/?[^>]+(>|$)/g, "")}</ReactMarkdown>
              </div>

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

              {msg.card && (
                <CriacaoObraCard
                  card={msg.card}
                  ativo={msg.id === activeCardMessageId}
                  tiposObraOptions={tiposObraOptions}
                  onSelecionarTipo={onSelecionarTipo}
                  onCriarTipo={(nome) => criarTipoObra.mutate(nome)}
                  onSelecionarClassificacao={onSelecionarClassificacao}
                  onUsarDuplicata={onUsarDuplicata}
                  onIgnorarDuplicata={onIgnorarDuplicata}
                  onConfirmarEscopo={onConfirmarEscopo}
                  onEditarDescricao={onEditarDescricao}
                  onRetryEscopo={onRetryEscopo}
                  classificacao={criacaoObraState.classificacao}
                  fornecedoresSelecionados={criacaoObraState.fornecedoresSelecionados}
                  allFornecedores={allFornecedores}
                  addFornecedorId={addFornecedorId}
                  onChangeAddFornecedorId={setAddFornecedorId}
                  onAdicionarFornecedor={onAdicionarFornecedor}
                  onAlternarFornecedor={onAlternarFornecedor}
                  onConfirmarCriacao={executarCriacaoObra}
                />
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

        {messages.length <= 1 && !isTyping && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={iniciarCriacaoObra}
              className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Nova
            </button>
            {obraId && SUGGESTIONS.map((s) => (
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

      {/* Voice loop status bar */}
      {voiceLoop.isActive && (
        <div
          className={`px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium shrink-0 transition-colors ${
            voiceLoop.status === "listening"
              ? "bg-destructive/10 text-destructive"
              : voiceLoop.status === "speaking"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <VoiceWaveform status={voiceLoop.status === "idle" ? "listening" : voiceLoop.status} />
          <span>{voiceStatusLabel[voiceLoop.status]}</span>
          <VoiceWaveform status={voiceLoop.status === "idle" ? "listening" : voiceLoop.status} />
        </div>
      )}

      {criacaoObraState.ativo && (
        <div className="px-4 py-2 border-t bg-primary/5 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">Criando nova obra...</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={cancelarCriacaoObra}>
            Cancelar
          </Button>
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

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t bg-card shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        {obraId && (
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
        )}

        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={semObraEFluxoInativo ? "Clique em \"Nova\" para começar" : "Fale ou digite o que deseja fazer..."}
          className="flex-1 rounded-full h-11 bg-background text-sm"
          disabled={isTyping || voiceLoop.isActive || semObraEFluxoInativo}
        />

        {/* Voice loop toggle button */}
        {voiceLoop.isSupported && !semObraEFluxoInativo && (
          <Button
            type="button"
            size="icon"
            variant={voiceLoop.isActive ? "destructive" : "outline"}
            className={`shrink-0 h-12 w-12 rounded-full transition-all ${
              voiceLoop.status === "listening"
                ? "ring-2 ring-destructive/50 shadow-[0_0_12px_hsl(var(--destructive)/0.4)]"
                : voiceLoop.status === "speaking"
                ? "ring-2 ring-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                : ""
            }`}
            onClick={toggleVoiceLoop}
            disabled={isTyping}
          >
            {voiceLoop.isActive ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        )}

        <Button
          type="submit"
          size="icon"
          disabled={(!input.trim() && pendingFiles.length === 0) || isTyping || voiceLoop.isActive || semObraEFluxoInativo}
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

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireObra obraId={id} pageName="Assistente IA">
      {id && <ChatContent obraId={id} />}
    </RequireObra>
  );
}
