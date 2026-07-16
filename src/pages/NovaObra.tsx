import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartCombobox } from "@/components/ui/smart-combobox";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Mic,
  MicOff,
  AlertTriangle,
  Sparkles,
  Send,
  Star,
  X,
  Plus,
  Phone,
  Users,
} from "lucide-react";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { profissionaisRecomendados, profissionalLabel, isRecomendado, ALL_CATEGORIAS } from "@/lib/regras-decisao";

/* ── Types ── */
interface EscopoIA {
  descricao_estruturada: string;
  necessidades: string[];
  profissional_recomendado: string;
  alertas_seguranca: string[];
}

const classificacoes = [
  {
    value: "simples",
    label: "Simples",
    desc: profissionalLabel("simples"),
    color: "from-emerald-400 to-emerald-500",
  },
  {
    value: "media",
    label: "Média",
    desc: profissionalLabel("media"),
    color: "from-amber-400 to-orange-500",
  },
  {
    value: "complexa",
    label: "Complexa",
    desc: profissionalLabel("complexa"),
    color: "from-red-400 to-rose-500",
  },
];

const stagger = (step: number) => ({
  opacity: 0,
  animation: `menu-slide-up 0.45s ease-out ${step * 0.07}s forwards`,
});

const NovaObra = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Form state
  const [nome, setNome] = useState("");
  const [tipoObra, setTipoObra] = useState("");
  const [classificacao, setClassificacao] = useState("simples");
  const [descricao, setDescricao] = useState("");
  const [escopo, setEscopo] = useState<EscopoIA | null>(null);
  const [selectedFornecedores, setSelectedFornecedores] = useState<Array<{ id: string; nome: string; categoria: string | null; tipo?: string | null; score?: number | null; telefone?: string | null }>>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [obraId, setObraId] = useState<string | null>(null);
  const [addFornecedorId, setAddFornecedorId] = useState("");

  // Voice
  const { status: voiceStatus, isSupported: voiceSupported, startListening, stopListening } = useVoiceCommand();

  // Fetch all fornecedores for the add-select
  const { data: allFornecedores } = useQuery({
    queryKey: ["fornecedores-lista"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("id, nome, email, tipo, categoria, score, telefone").eq("status", "ativo");
      if (error) throw error;
      return data;
    },
  });

  // Tipos de obra (Supabase, editável em Configurações)
  const { data: tiposObra } = useQuery({
    queryKey: ["tipos_obra"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_obra").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const tiposObraOptions = (tiposObra ?? []).map((t) => ({ value: t.nome, label: t.nome }));

  const createTipoObra = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase.from("tipos_obra").insert({ nome }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (novo: { nome: string }) => {
      queryClient.invalidateQueries({ queryKey: ["tipos_obra"] });
      setTipoObra(novo.nome);
      toast.success("Tipo de obra criado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Load suggestions when entering step 5
  const loadSuggestions = async () => {
    if (suggestionsLoaded) return;
    const { data } = await supabase.rpc("fn_sugerir_top3_fornecedores", { p_complexidade: classificacao });
    if (data && data.length > 0) {
      const enriched = data.map((s: any) => {
        const full = allFornecedores?.find((f) => f.id === s.id);
        return {
          id: s.id,
          nome: s.nome,
          categoria: s.categoria || null,
          tipo: full?.tipo || null,
          score: full?.score || null,
          telefone: full?.telefone || null,
        };
      });
      setSelectedFornecedores(enriched);
    }
    setSuggestionsLoaded(true);
  };

  // Generate escopo via edge function
  const gerarEscopo = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gerar-escopo", {
        body: { descricao, tipo_obra: tipoObra, classificacao },
      });
      if (error) throw error;
      return data as EscopoIA;
    },
    onSuccess: (data) => {
      setEscopo(data);
      setStep(4);
    },
    onError: (e) => {
      toast.error("Erro ao gerar escopo: " + (e as Error).message);
    },
  });

  // Create obra + cotação via RPC
  const criarObra = useMutation({
    mutationFn: async () => {
      // 1. Create obra
      const { data: obra, error: obraErr } = await (supabase
        .from("obras") as any)
        .insert({
          nome,
          tipo_obra: tipoObra,
          classificacao,
          descricao: escopo?.descricao_estruturada || descricao,
          escopo_ia: escopo ? JSON.stringify(escopo) : null,
          profissional_recomendado: escopo?.profissional_recomendado || null,
          user_id: user!.id,
          status: "planejamento",
        })
        .select("id")
        .single();
      if (obraErr) throw obraErr;

      const newObraId = obra.id;
      setObraId(newObraId);

      // 2. Create dossie entry
      await (supabase.from("obra_dossie" as any) as any).insert({
        obra_id: newObraId,
        tipo: "obra_criada",
        titulo: "Obra criada",
        descricao: `Obra "${nome}" criada com classificação ${classificacao}`,
        dados: { tipo_obra: tipoObra, classificacao, escopo },
      });

      // 3. If fornecedores selected, create cotacao via RPC
      if (selectedFornecedores.length > 0) {
        const fornIds = selectedFornecedores.map((f) => f.id);
        const { data: cotacaoId, error: cotErr } = await supabase.rpc(
          "fn_criar_cotacao_com_fornecedores" as any,
          {
            p_obra_id: newObraId,
            p_descricao: `Cotação inicial - ${nome}`,
            p_fornecedores_ids: fornIds,
          }
        );
        if (cotErr) throw cotErr;

        // Add escopo items as cotacao items
        if (escopo?.necessidades && cotacaoId) {
          const itens = escopo.necessidades.map((n) => ({
            cotacao_id: cotacaoId,
            nome: n,
            quantidade: 1,
            unidade: "un",
          }));
          await supabase.from("itens_cotacao").insert(itens);
        }

        // Dossie entry
        await (supabase.from("obra_dossie" as any) as any).insert({
          obra_id: newObraId,
          tipo: "solicitacao_enviada",
          titulo: "Solicitação enviada para profissionais",
          descricao: `Enviada para ${selectedFornecedores.length} profissional(is)`,
          dados: { cotacao_id: cotacaoId, fornecedor_ids: fornIds },
        });
      }

      return newObraId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      setStep(6);
    },
    onError: (e) => {
      toast.error("Erro ao criar obra: " + (e as Error).message);
    },
  });

  const handleVoiceInput = () => {
    if (voiceStatus === "listening") {
      stopListening();
    } else {
      startListening((cmd, raw) => {
        if (step === 1) setNome((prev) => (prev ? prev + " " + raw : raw));
        else if (step === 3) setDescricao((prev) => (prev ? prev + " " + raw : raw));
      });
    }
  };

  const canAdvance = () => {
    if (step === 1) return nome.trim().length >= 3 && tipoObra.trim().length > 0;
    if (step === 3) return descricao.trim().length >= 10;
    if (step === 4) return escopo !== null;
    if (step === 5) return selectedFornecedores.length >= 1;
    return true;
  };

  const handleNext = () => {
    if (step === 3) {
      gerarEscopo.mutate();
      return;
    }
    if (step === 4) {
      setStep(5);
      loadSuggestions();
      return;
    }
    if (step === 5) {
      if (selectedFornecedores.length < 1) {
        toast.error("Selecione pelo menos 1 fornecedor");
        return;
      }
      criarObra.mutate();
      return;
    }
    setStep((s) => s + 1);
  };

  const removeFornecedor = (id: string) => {
    setSelectedFornecedores((prev) => prev.filter((f) => f.id !== id));
  };

  const addFornecedor = () => {
    if (!addFornecedorId || selectedFornecedores.length >= 3) return;
    const forn = allFornecedores?.find((f) => f.id === addFornecedorId);
    if (!forn) return;
    setSelectedFornecedores((prev) => [
      ...prev,
      { id: forn.id, nome: forn.nome, categoria: forn.categoria || null, tipo: forn.tipo, score: forn.score, telefone: forn.telefone },
    ]);
    setAddFornecedorId("");
  };

  return (
    <div className="max-w-lg mx-auto pb-32 px-3">
      <style>{`
        @keyframes menu-slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 pt-4 pb-2" style={stagger(0)}>
        <Button variant="ghost" size="icon" onClick={() => step > 1 && step < 6 ? setStep(step - 1) : navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Nova Obra</h1>
          <p className="text-sm text-muted-foreground">Passo {step} de 6</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full mb-6" style={stagger(0)}>
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      {/* ── STEP 1: Nome e Tipo ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div style={stagger(1)}>
            <label className="text-sm font-semibold text-foreground mb-2 block">Nome da obra</label>
            <div className="flex gap-2">
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Reforma da garagem"
                className="h-12 text-base rounded-xl"
              />
              {voiceSupported && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl shrink-0"
                  onClick={handleVoiceInput}
                >
                  {voiceStatus === "listening" ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>

          <div style={stagger(2)}>
            <label className="text-sm font-semibold text-foreground mb-3 block">Tipo da obra</label>
            <SmartCombobox
              options={tiposObraOptions}
              value={tipoObra}
              onChange={setTipoObra}
              onCreateNew={(label) => createTipoObra.mutate(label)}
              placeholder="Buscar ou selecionar tipo de obra..."
              emptyText="Nenhum tipo de obra cadastrado."
              className="h-12 text-base"
            />
          </div>
        </div>
      )}

      {/* ── STEP 2: Classificação ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div style={stagger(1)}>
            <label className="text-sm font-semibold text-foreground mb-3 block">Complexidade da obra</label>
            <div className="space-y-3">
              {classificacoes.map((c, i) => (
                <button
                  key={c.value}
                  onClick={() => setClassificacao(c.value)}
                  style={stagger(i + 2)}
                  className={`
                    w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200
                    active:scale-[0.97] text-left
                    ${classificacao === c.value
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border bg-card hover:border-primary/40"
                    }
                  `}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center`}>
                    <span className="text-white font-bold text-lg">{c.label[0]}</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{c.label}</p>
                    <p className="text-sm text-muted-foreground">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {classificacao === "complexa" && (
            <div
              className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30"
              style={stagger(5)}
            >
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Atenção</p>
                <p className="text-sm text-destructive/80">
                  Obra complexa requer acompanhamento de engenheiro ou arquiteto.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Descrição ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div style={stagger(1)}>
            <label className="text-sm font-semibold text-foreground mb-2 block">Descreva a obra</label>
            <p className="text-sm text-muted-foreground mb-3">
              Quanto mais detalhe, melhor será o escopo gerado pela IA.
            </p>
            <div className="relative">
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Reforma da garagem com cobertura metálica, piso cerâmico e instalação elétrica..."
                className="min-h-[160px] text-base rounded-xl resize-none"
              />
              {voiceSupported && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-3 right-3 h-10 w-10 rounded-xl"
                  onClick={handleVoiceInput}
                >
                  {voiceStatus === "listening" ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Escopo IA ── */}
      {step === 4 && escopo && (
        <div className="space-y-5">
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/30"
            style={stagger(1)}
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">Escopo gerado pela IA</span>
          </div>

          <Card className="rounded-2xl" style={stagger(2)}>
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground mb-2">Descrição Estruturada</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{escopo.descricao_estruturada}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl" style={stagger(3)}>
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground mb-3">Necessidades / Materiais</h3>
              <div className="flex flex-wrap gap-2">
                {escopo.necessidades.map((n, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full px-3 py-1">
                    {n}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl" style={stagger(4)}>
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground mb-1">Profissional Recomendado</h3>
              <p className="text-lg font-semibold text-primary capitalize">{escopo.profissional_recomendado}</p>
            </CardContent>
          </Card>

          {escopo.alertas_seguranca.length > 0 && (
            <Card className="rounded-2xl border-destructive/30" style={stagger(5)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="font-bold text-destructive">Alertas de Segurança</h3>
                </div>
                <ul className="space-y-1">
                  {escopo.alertas_seguranca.map((a, i) => (
                    <li key={i} className="text-sm text-destructive/80">• {a}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── STEP 5: Selecionar Fornecedores ── */}
      {step === 5 && (
        <div className="space-y-5">
          <div style={stagger(1)}>
            <h3 className="text-lg font-bold text-foreground mb-1">Selecionar Fornecedores</h3>
            <p className="text-sm text-muted-foreground">
              Selecionamos os melhores profissionais para sua obra
            </p>
          </div>

          {/* Recommendation banner */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20"
            style={stagger(2)}
          >
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-primary font-medium">
              Recomendado: {profissionalLabel(classificacao)}
            </span>
          </div>

          {/* Selected fornecedores cards */}
          {selectedFornecedores.length > 0 ? (
            <div className="space-y-3">
              {selectedFornecedores.map((f, i) => {
                const catLabel = ALL_CATEGORIAS.find((c) => c.value === f.categoria)?.label;
                return (
                  <Card key={f.id} className="rounded-2xl" style={stagger(i + 3)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{f.nome}</p>
                          {isRecomendado(f.categoria, classificacao) && (
                            <Badge className="bg-primary/20 text-primary text-xs border-0 shrink-0">
                              <Star className="h-3 w-3 mr-0.5" /> IA
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {catLabel && (
                            <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                              {catLabel}
                            </Badge>
                          )}
                          {f.tipo && (
                            <span className="text-xs text-muted-foreground capitalize">{f.tipo}</span>
                          )}
                          {f.score != null && f.score > 0 && (
                            <span className="text-xs text-muted-foreground">Score: {Number(f.score).toFixed(1)}</span>
                          )}
                          {f.telefone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Phone className="h-3 w-3" /> {f.telefone}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeFornecedor(f.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-2xl border-dashed" style={stagger(3)}>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Nenhum fornecedor selecionado.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {allFornecedores && allFornecedores.length > 0
                    ? "Adicione fornecedores abaixo."
                    : "Cadastre fornecedores primeiro em Fornecedores."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Add fornecedor card */}
          {selectedFornecedores.length < 3 && allFornecedores && allFornecedores.length > 0 && (
            <Card className="rounded-2xl" style={stagger(6)}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-foreground mb-2">Adicionar Fornecedor</p>
                <div className="flex gap-2">
                  <Select value={addFornecedorId} onValueChange={setAddFornecedorId}>
                    <SelectTrigger className="flex-1 h-10 rounded-xl">
                      <SelectValue placeholder="Selecionar fornecedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allFornecedores
                        .filter((f) => !selectedFornecedores.some((s) => s.id === f.id))
                        .map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome} {f.categoria ? `(${ALL_CATEGORIAS.find((c) => c.value === f.categoria)?.label || f.categoria})` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl shrink-0"
                    onClick={addFornecedor}
                    disabled={!addFornecedorId}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary card */}
          <Card className="rounded-2xl bg-muted/50" style={stagger(7)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {selectedFornecedores.length} de 3 selecionado{selectedFornecedores.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Você pode enviar para até 3 fornecedores
                </p>
              </div>
              {selectedFornecedores.length < 1 && (
                <Badge variant="destructive" className="text-xs">Mín. 1</Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STEP 6: Confirmação ── */}
      {step === 6 && (
        <div className="space-y-6 text-center py-8">
          <div
            className="w-20 h-20 mx-auto rounded-full bg-primary/15 flex items-center justify-center"
            style={stagger(1)}
          >
            <Check className="h-10 w-10 text-primary" />
          </div>
          <div style={stagger(2)}>
            <h2 className="text-2xl font-bold text-foreground">Obra criada com sucesso! 🎉</h2>
            <p className="text-muted-foreground mt-2">
              "{nome}" está pronta para acompanhamento.
            </p>
          </div>
          {selectedFornecedores.length > 0 && (
            <div
              className="flex items-center gap-2 justify-center text-sm text-primary"
              style={stagger(3)}
            >
              <Send className="h-4 w-4" />
              <span>Enviado para {selectedFornecedores.length} profissional(is)</span>
            </div>
          )}
          <div className="flex flex-col gap-3 mt-6" style={stagger(4)}>
            <Button
              className="h-12 rounded-2xl font-bold text-base"
              onClick={() => navigate(obraId ? `/obras/${obraId}/dossie` : "/")}
            >
              Ver Dossiê da Obra
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl font-bold text-base"
              onClick={() => navigate("/")}
            >
              Voltar ao Menu
            </Button>
          </div>
        </div>
      )}

      {/* ── Bottom action bar ── */}
      {step < 6 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 md:relative md:bottom-auto md:px-0 md:pb-0 md:mt-8">
          <Button
            onClick={handleNext}
            disabled={!canAdvance() || gerarEscopo.isPending || criarObra.isPending}
            className="w-full h-14 rounded-2xl font-bold text-base shadow-lg active:scale-[0.97] transition-transform"
          >
            {gerarEscopo.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Gerando escopo com IA...
              </>
            ) : criarObra.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Criando obra...
              </>
            ) : step === 3 ? (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Gerar Escopo com IA
              </>
            ) : step === 5 ? (
              <>
                <Send className="h-5 w-5 mr-2" />
                {selectedFornecedores.length > 0 ? `Enviar Cotação (${selectedFornecedores.length})` : "Criar Obra"}
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default NovaObra;
