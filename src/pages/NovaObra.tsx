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
import { addDays, format } from "date-fns";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { profissionaisRecomendados, profissionalLabel, isRecomendado, ALL_CATEGORIAS } from "@/lib/regras-decisao";
import { useCriarObra } from "@/hooks/useCriarObra";
import { classificacoes, type Complexidade, type EscopoIA } from "@/lib/criarObraChatFlow";

const stagger = (step: number) => ({
  opacity: 0,
  animation: `menu-slide-up 0.45s ease-out ${step * 0.07}s forwards`,
});

type FornecedorItem = {
  id: string;
  nome: string;
  categoria: string | null;
  tipo?: string | null;
  score?: number | null;
  telefone?: string | null;
};

const fmtDia = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

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
  const [dataInicio, setDataInicio] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [valorPrevisto, setValorPrevisto] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [escopo, setEscopo] = useState<EscopoIA | null>(null);
  const [lojasSel, setLojasSel] = useState<FornecedorItem[]>([]);
  const [profsSel, setProfsSel] = useState<FornecedorItem[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [obraId, setObraId] = useState<string | null>(null);
  const [addLojaId, setAddLojaId] = useState("");
  const [addProfId, setAddProfId] = useState("");

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

  // Load suggestions when entering the fornecedores step
  const loadSuggestions = async () => {
    if (suggestionsLoaded) return;
    // Profissionais (mão de obra): RPC de sugestão, filtrando tipo 'profissional'
    const { data } = await supabase.rpc("fn_sugerir_top3_fornecedores", { p_complexidade: classificacao });
    if (data && data.length > 0) {
      const enriched: FornecedorItem[] = data
        .map((s: any) => {
          const full = allFornecedores?.find((f) => f.id === s.id);
          return {
            id: s.id,
            nome: s.nome,
            categoria: s.categoria || null,
            tipo: full?.tipo || null,
            score: full?.score || null,
            telefone: full?.telefone || null,
          };
        })
        .filter((f: FornecedorItem) => f.tipo === "profissional");
      setProfsSel(enriched.slice(0, 3));
    }
    // Lojas (materiais): top 3 por score entre os não-profissionais
    const lojas = (allFornecedores ?? [])
      .filter((f) => f.tipo !== "profissional")
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, 3)
      .map((f) => ({ id: f.id, nome: f.nome, categoria: f.categoria || null, tipo: f.tipo, score: f.score, telefone: f.telefone }));
    setLojasSel(lojas);
    setSuggestionsLoaded(true);
  };

  // Generate escopo via edge function
  const gerarEscopo = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gerar-escopo", {
        body: {
          descricao,
          tipo_obra: tipoObra,
          classificacao,
          data_inicio: dataInicio,
          data_prevista_conclusao: dataPrevista || null,
          valor_previsto: valorPrevisto ? Number(valorPrevisto) : null,
          localizacao: localizacao || null,
        },
      });
      if (error) throw error;
      return data as EscopoIA;
    },
    onSuccess: (data) => {
      setEscopo(data);
      setStep(5);
    },
    onError: (e) => {
      toast.error("Erro ao gerar escopo: " + (e as Error).message);
    },
  });

  const { criarObra, isPending: criandoObra } = useCriarObra();

  const handleVoiceInput = () => {
    if (voiceStatus === "listening") {
      stopListening();
    } else {
      startListening((cmd, raw) => {
        if (step === 1) setNome((prev) => (prev ? prev + " " + raw : raw));
        else if (step === 4) setDescricao((prev) => (prev ? prev + " " + raw : raw));
      });
    }
  };

  const canAdvance = () => {
    if (step === 1) return nome.trim().length >= 3 && tipoObra.trim().length > 0;
    if (step === 3) return dataInicio.trim().length > 0 && (!dataPrevista || dataPrevista > dataInicio);
    if (step === 4) return descricao.trim().length >= 10;
    if (step === 5) return escopo !== null;
    if (step === 6) return lojasSel.length + profsSel.length >= 1;
    return true;
  };

  const handleNext = () => {
    if (step === 4) {
      gerarEscopo.mutate();
      return;
    }
    if (step === 5) {
      setStep(6);
      loadSuggestions();
      return;
    }
    if (step === 6) {
      if (lojasSel.length + profsSel.length < 1) {
        toast.error("Selecione pelo menos 1 fornecedor");
        return;
      }
      criarObra.mutate(
        {
          nome,
          tipoObra,
          classificacao: classificacao as Complexidade,
          descricao,
          escopo,
          dataInicio,
          dataPrevista: dataPrevista || null,
          valorPrevisto: valorPrevisto ? Number(valorPrevisto) : null,
          localizacao: localizacao || null,
          fornecedoresLojas: lojasSel,
          fornecedoresProfissionais: profsSel,
          userId: user!.id,
        },
        {
          onSuccess: (novaObraId) => {
            setObraId(novaObraId);
            setStep(7);
          },
          onError: (e) => toast.error("Erro ao criar obra: " + (e as Error).message),
        }
      );
      return;
    }
    setStep((s) => s + 1);
  };

  // Seção reutilizável de seleção de fornecedores (lojas / profissionais)
  const renderFornecedorSection = (
    titulo: string,
    subtitulo: string,
    sel: FornecedorItem[],
    setSel: (updater: (prev: FornecedorItem[]) => FornecedorItem[]) => void,
    addId: string,
    setAddId: (v: string) => void,
    filtro: (f: { tipo?: string | null }) => boolean,
    avisoVazio: string
  ) => {
    const opcoes = (allFornecedores ?? []).filter((f) => filtro(f) && !sel.some((s) => s.id === f.id));
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground">{titulo}</h3>
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
        </div>

        {sel.length > 0 ? (
          <div className="space-y-3">
            {sel.map((f, i) => {
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
                      onClick={() => setSel((prev) => prev.filter((x) => x.id !== f.id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{avisoVazio}</p>
            </CardContent>
          </Card>
        )}

        {sel.length < 3 && opcoes.length > 0 && (
          <div className="flex gap-2">
            <Select value={addId} onValueChange={setAddId}>
              <SelectTrigger className="flex-1 h-10 rounded-xl">
                <SelectValue placeholder="Adicionar fornecedor..." />
              </SelectTrigger>
              <SelectContent>
                {opcoes.map((f) => (
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
              disabled={!addId}
              onClick={() => {
                const forn = allFornecedores?.find((f) => f.id === addId);
                if (!forn) return;
                setSel((prev) => [
                  ...prev,
                  { id: forn.id, nome: forn.nome, categoria: forn.categoria || null, tipo: forn.tipo, score: forn.score, telefone: forn.telefone },
                ]);
                setAddId("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
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
          <p className="text-sm text-muted-foreground">Passo {step} de 7</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full mb-6" style={stagger(0)}>
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(step / 7) * 100}%` }}
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

      {/* ── STEP 3: Planejamento ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div style={stagger(1)}>
            <label className="text-sm font-semibold text-foreground mb-2 block">Data de início da obra</label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-12 text-base rounded-xl"
            />
          </div>

          <div style={stagger(2)}>
            <label className="text-sm font-semibold text-foreground mb-2 block">Previsão de término (opcional)</label>
            <Input
              type="date"
              value={dataPrevista}
              min={dataInicio || undefined}
              onChange={(e) => setDataPrevista(e.target.value)}
              className="h-12 text-base rounded-xl"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Deixe em branco para a IA estimar com base nas etapas.
            </p>
            {dataPrevista && dataInicio && dataPrevista <= dataInicio && (
              <p className="text-xs text-destructive mt-1">A previsão de término deve ser depois do início.</p>
            )}
          </div>

          <div style={stagger(3)}>
            <label className="text-sm font-semibold text-foreground mb-2 block">Orçamento estimado (R$, opcional)</label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={valorPrevisto}
              onChange={(e) => setValorPrevisto(e.target.value)}
              placeholder="Ex: 15000"
              className="h-12 text-base rounded-xl"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Valor de referência para a IA avaliar se o escopo cabe no orçamento.
            </p>
          </div>

          <div style={stagger(4)}>
            <label className="text-sm font-semibold text-foreground mb-2 block">Cidade / Região (opcional)</label>
            <Input
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="Ex: Sorocaba/SP"
              className="h-12 text-base rounded-xl"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Usada para considerar o clima da região no cronograma.
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 4: Descrição ── */}
      {step === 4 && (
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

      {/* ── STEP 5: Revisão do Escopo IA ── */}
      {step === 5 && escopo && (
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

          {/* Cronograma */}
          {dataInicio && (escopo.etapas?.length ?? 0) > 0 && (() => {
            const totalDias = escopo.etapas!.reduce((acc, e) => acc + Math.max(1, e.duracao_dias), 0);
            const [y, m, d] = dataInicio.split("-").map(Number);
            const conclusao = format(addDays(new Date(y, m - 1, d), totalDias - 1), "yyyy-MM-dd");
            return (
              <Card className="rounded-2xl" style={stagger(3)}>
                <CardContent className="p-5">
                  <h3 className="font-bold text-foreground mb-1">Cronograma</h3>
                  <p className="text-sm text-muted-foreground">
                    Início {fmtDia(dataInicio)} → Conclusão estimada {fmtDia(conclusao)} ({totalDias} dias)
                  </p>
                  {dataPrevista && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Sua pretensão de término: {fmtDia(dataPrevista)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {escopo.alerta_prazo && (
            <Card className="rounded-2xl border-amber-500/40 bg-amber-500/5" style={stagger(3)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h3 className="font-bold text-amber-600">Alerta de Prazo</h3>
                </div>
                <p className="text-sm text-muted-foreground">{escopo.alerta_prazo}</p>
              </CardContent>
            </Card>
          )}

          {escopo.alerta_clima && (
            <Card className="rounded-2xl border-sky-500/40 bg-sky-500/5" style={stagger(3)}>
              <CardContent className="p-5">
                <h3 className="font-bold text-sky-600 mb-1">🌧️ Clima da Região</h3>
                <p className="text-sm text-muted-foreground">{escopo.alerta_clima}</p>
              </CardContent>
            </Card>
          )}

          {/* Etapas e tarefas */}
          {(escopo.etapas?.length ?? 0) > 0 && (
            <Card className="rounded-2xl" style={stagger(4)}>
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-3">Etapas da Obra</h3>
                <div className="space-y-3">
                  {escopo.etapas!.map((e, i) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-3">
                      <p className="font-semibold text-foreground text-sm">
                        {i + 1}. {e.nome} <span className="text-muted-foreground font-normal">— {e.duracao_dias} dia{e.duracao_dias !== 1 ? "s" : ""}</span>
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {e.tarefas.map((t, j) => (
                          <li key={j} className="text-xs text-muted-foreground">• {t}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Materiais */}
          {(escopo.materiais?.length ?? 0) > 0 ? (
            <Card className="rounded-2xl" style={stagger(5)}>
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-3">Materiais</h3>
                <div className="space-y-1.5">
                  {escopo.materiais!.map((mat, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{mat.nome}</span>
                      <span className="text-muted-foreground shrink-0 ml-3">{mat.quantidade} {mat.unidade}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : escopo.necessidades.length > 0 && (
            <Card className="rounded-2xl" style={stagger(5)}>
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
          )}

          {/* Mão de obra */}
          {(escopo.mao_de_obra?.length ?? 0) > 0 && (
            <Card className="rounded-2xl" style={stagger(6)}>
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-3">🔨 Mão de Obra</h3>
                <div className="space-y-3">
                  {escopo.mao_de_obra!.map((s, i) => (
                    <div key={i}>
                      <p className="font-semibold text-foreground text-sm">{s.servico}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.escopo}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl" style={stagger(7)}>
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground mb-1">Profissional Recomendado</h3>
              <p className="text-lg font-semibold text-primary capitalize">{escopo.profissional_recomendado}</p>
            </CardContent>
          </Card>

          {escopo.alerta_orcamento && (
            <Card className="rounded-2xl border-destructive/30" style={stagger(8)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="font-bold text-destructive">Alerta de Orçamento</h3>
                </div>
                <p className="text-sm text-destructive/80">{escopo.alerta_orcamento}</p>
              </CardContent>
            </Card>
          )}

          {escopo.alertas_seguranca.length > 0 && (
            <Card className="rounded-2xl border-destructive/30" style={stagger(8)}>
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

      {/* ── STEP 6: Selecionar Fornecedores (lojas + profissionais) ── */}
      {step === 6 && (
        <div className="space-y-6">
          <div style={stagger(1)}>
            <h3 className="text-lg font-bold text-foreground mb-1">Selecionar Fornecedores</h3>
            <p className="text-sm text-muted-foreground">
              Cada grupo recebe sua própria cotação (até 3 por grupo)
            </p>
          </div>

          {/* Profissionais → cotação de mão de obra */}
          {((escopo?.mao_de_obra?.length ?? 0) > 0 || (escopo?.necessidades?.length ?? 0) > 0) && (
            <div className="space-y-3" style={stagger(2)}>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-primary font-medium">
                  Recomendado: {profissionalLabel(classificacao)}
                </span>
              </div>
              {renderFornecedorSection(
                "🔨 Profissionais",
                "Recebem a cotação de mão de obra",
                profsSel,
                setProfsSel,
                addProfId,
                setAddProfId,
                (f) => f.tipo === "profissional",
                "Nenhum profissional selecionado. A cotação de mão de obra não será criada."
              )}
            </div>
          )}

          {/* Lojas → cotação de materiais */}
          {((escopo?.materiais?.length ?? 0) > 0 || (escopo?.necessidades?.length ?? 0) > 0) && (
            <div style={stagger(4)}>
              {renderFornecedorSection(
                "🏪 Lojas de Material",
                "Recebem a cotação de materiais",
                lojasSel,
                setLojasSel,
                addLojaId,
                setAddLojaId,
                (f) => f.tipo !== "profissional",
                "Nenhuma loja selecionada. A cotação de materiais não será criada."
              )}
            </div>
          )}

          {/* Summary card */}
          <Card className="rounded-2xl bg-muted/50" style={stagger(6)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {profsSel.length} profissional(is) · {lojasSel.length} loja(s)
                </p>
                <p className="text-xs text-muted-foreground">
                  Até 3 fornecedores por cotação
                </p>
              </div>
              {lojasSel.length + profsSel.length < 1 && (
                <Badge variant="destructive" className="text-xs">Mín. 1</Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STEP 7: Confirmação ── */}
      {step === 7 && (
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
          {lojasSel.length + profsSel.length > 0 && (
            <div
              className="flex items-center gap-2 justify-center text-sm text-primary"
              style={stagger(3)}
            >
              <Send className="h-4 w-4" />
              <span>
                {profsSel.length > 0 && `Cotação de mão de obra para ${profsSel.length} profissional(is)`}
                {profsSel.length > 0 && lojasSel.length > 0 && " · "}
                {lojasSel.length > 0 && `Cotação de materiais para ${lojasSel.length} loja(s)`}
              </span>
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
      {step < 7 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 md:relative md:bottom-auto md:px-0 md:pb-0 md:mt-8">
          <Button
            onClick={handleNext}
            disabled={!canAdvance() || gerarEscopo.isPending || criandoObra}
            className="w-full h-14 rounded-2xl font-bold text-base shadow-lg active:scale-[0.97] transition-transform"
          >
            {gerarEscopo.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Gerando escopo com IA...
              </>
            ) : criandoObra ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Criando obra...
              </>
            ) : step === 4 ? (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Gerar Escopo com IA
              </>
            ) : step === 6 ? (
              <>
                <Send className="h-5 w-5 mr-2" />
                {lojasSel.length + profsSel.length > 0
                  ? `Criar Obra e Cotações (${(profsSel.length > 0 ? 1 : 0) + (lojasSel.length > 0 ? 1 : 0)})`
                  : "Criar Obra"}
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
