import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Sparkles,
  Clock,
  Camera,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Layers,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  Users,
  ShieldAlert,
  Paperclip,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";

/* ── helpers ── */
interface TimelineEvent {
  id: string;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  data: string;
  meta?: Record<string, any>;
}

const tipoConfig: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  fase: { icon: Layers, color: "text-primary", bg: "bg-primary/15" },
  foto: { icon: Camera, color: "text-pink-500", bg: "bg-pink-500/15" },
  alteracao: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-600/15" },
  financeiro: { icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/15" },
  compra: { icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/15" },
  dossie: { icon: Sparkles, color: "text-violet-500", bg: "bg-violet-500/15" },
  default: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
};

const statusBadge = (s: string) => {
  if (s === "concluido") return <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-sm px-3 py-1">Concluído</Badge>;
  if (s === "em_andamento") return <Badge className="bg-blue-500/15 text-blue-600 border-0 text-sm px-3 py-1">Em andamento</Badge>;
  if (s === "comprado") return <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-sm px-3 py-1">Comprado</Badge>;
  if (s === "pendente") return <Badge className="bg-amber-500/15 text-amber-600 border-0 text-sm px-3 py-1">Pendente</Badge>;
  return <Badge variant="secondary" className="text-sm px-3 py-1 capitalize">{s}</Badge>;
};

const Dossie = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── queries ── */
  const { data: obra } = useQuery({
    queryKey: ["obra", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("nome, tipo_obra, classificacao, status")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: obraThumb } = useQuery({
    queryKey: ["obra-thumb", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_fotos")
        .select("url")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.url ?? null;
    },
  });

  const { data: fases } = useQuery({
    queryKey: ["dossie-fases", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("id, nome, status, progresso, data_inicio, data_fim, created_at, ordem")
        .eq("obra_id", id!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: fotos } = useQuery({
    queryKey: ["dossie-fotos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_fotos")
        .select("id, tipo, descricao, url, created_at, fase_id")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: alteracoes } = useQuery({
    queryKey: ["dossie-alteracoes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_alteracoes")
        .select("id, descricao, tipo, justificativa, valor_impacto, created_at")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: financeiro } = useQuery({
    queryKey: ["dossie-financeiro", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("id, descricao, valor, tipo, data_transacao, comprovante_url, created_at")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: compras } = useQuery({
    queryKey: ["dossie-compras", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select("id, descricao, status, valor_total, quantidade, valor_unitario, observacao, created_at, fornecedores(nome)")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: dossieEntries } = useQuery({
    queryKey: ["dossie-entries", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("obra_dossie" as any) as any)
        .select("*")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const fornecedorIdsContatados = useMemo(() => {
    const ids = new Set<string>();
    dossieEntries?.forEach((d) => {
      if (d.tipo === "solicitacao_enviada" && Array.isArray(d.dados?.fornecedor_ids)) {
        d.dados.fornecedor_ids.forEach((fid: string) => ids.add(fid));
      }
    });
    return Array.from(ids);
  }, [dossieEntries]);

  const { data: fornecedoresContatados } = useQuery({
    queryKey: ["dossie-fornecedores-contatados", fornecedorIdsContatados],
    enabled: fornecedorIdsContatados.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome, categoria")
        .in("id", fornecedorIdsContatados);
      if (error) throw error;
      return data;
    },
  });

  /* ── build unified timeline ── */
  const timeline: TimelineEvent[] = [];

  fotos?.forEach((f) =>
    timeline.push({
      id: `foto-${f.id}`,
      tipo: "foto",
      titulo: `Foto (${f.tipo}) adicionada`,
      descricao: f.descricao,
      data: f.created_at,
      meta: { url: f.url, tipo: f.tipo },
    })
  );

  alteracoes?.forEach((a) =>
    timeline.push({
      id: `alt-${a.id}`,
      tipo: "alteracao",
      titulo: `Alteração: ${a.tipo}`,
      descricao: a.descricao,
      data: a.created_at,
      meta: { justificativa: a.justificativa, valor_impacto: a.valor_impacto },
    })
  );

  financeiro?.forEach((f) =>
    timeline.push({
      id: `fin-${f.id}`,
      tipo: "financeiro",
      titulo: f.descricao || `${f.tipo === "despesa" ? "Despesa" : "Receita"} registrada`,
      descricao: `R$ ${Number(f.valor).toFixed(2)} · ${f.tipo}`,
      data: f.created_at,
      meta: { valor: f.valor, tipo_fin: f.tipo, data_transacao: f.data_transacao, comprovante_url: f.comprovante_url },
    })
  );

  compras?.forEach((c) =>
    timeline.push({
      id: `comp-${c.id}`,
      tipo: "compra",
      titulo: c.descricao || "Compra registrada",
      descricao: `${(c.fornecedores as any)?.nome || "Sem fornecedor"} · R$ ${Number(c.valor_total || 0).toFixed(2)}`,
      data: c.created_at!,
      meta: {
        status: c.status,
        quantidade: c.quantidade,
        valor_unitario: c.valor_unitario,
        observacao: c.observacao,
      },
    })
  );

  dossieEntries?.forEach((d: any) =>
    timeline.push({
      id: `dos-${d.id}`,
      tipo: "dossie",
      titulo: d.titulo,
      descricao: d.descricao,
      data: d.created_at,
      meta: { subtipo: d.tipo, dados: d.dados },
    })
  );

  timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  /* ── progress ── */
  const totalFases = fases?.length ?? 0;
  const concluidas = fases?.filter((f) => f.status === "concluido").length ?? 0;
  const progressoGeral = totalFases > 0 ? Math.round((concluidas / totalFases) * 100) : 0;

  const isLoading = !fases && !fotos && !financeiro;

  return (
    <div className="max-w-lg mx-auto pb-32 px-3 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            Dossiê {obra?.nome ? <>— <span className="text-blue-600 dark:text-blue-400">{obra.nome}</span></> : <span className="text-muted-foreground text-base font-normal">Carregando...</span>}
          </h1>
        </div>
      </div>

      {/* Obra info card */}
      {obra && (
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              {obraThumb ? (
                <img src={obraThumb} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{obra.nome}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {obra.tipo_obra} • {obra.classificacao} • {obra.status}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progresso geral</span>
              <span className="font-bold text-foreground">{progressoGeral}%</span>
            </div>
            <Progress
              value={progressoGeral}
              className="h-3 rounded-full bg-secondary [&>div]:bg-primary [&>div]:rounded-full"
            />
          </CardContent>
        </Card>
      )}

      {/* Fases */}
      {fases && fases.length > 0 && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-muted-foreground flex items-center gap-2">
            <Layers className="h-5 w-5" /> Fases da Obra
          </p>
          {fases.map((fase) => (
            <Card
              key={fase.id}
              className="rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/obras/${id}/etapas/${fase.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  fase.status === "concluido" ? "bg-emerald-500/15" : "bg-primary/15"
                }`}>
                  {fase.status === "concluido" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Layers className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base text-foreground">{fase.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {statusBadge(fase.status || "pendente")}
                    <span className="text-xs text-muted-foreground">
                      {Number(fase.progresso || 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-xl gap-2 h-12 text-base"
          onClick={() => navigate(`/obras/${id}/alteracoes`)}
        >
          <AlertTriangle className="h-5 w-5" />
          Alterações
        </Button>
        <Button
          variant="outline"
          className="flex-1 rounded-xl gap-2 h-12 text-base"
          onClick={() => navigate(`/obras/${id}/galeria`)}
        >
          <ImageIcon className="h-5 w-5" />
          Galeria
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <p className="text-base font-semibold text-muted-foreground flex items-center gap-2">
          <Clock className="h-5 w-5" /> Linha do tempo
        </p>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : timeline.length > 0 ? (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {timeline.map((evento) => {
                const config = tipoConfig[evento.tipo] || tipoConfig.default;
                const Icon = config.icon;
                const isExpanded = expandedId === evento.id;
                const handleClick = () => setExpandedId(isExpanded ? null : evento.id);

                return (
                  <div
                    key={evento.id}
                    className="flex gap-4 relative cursor-pointer"
                    onClick={handleClick}
                  >
                    <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center shrink-0 z-10`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <Card className="flex-1 rounded-2xl active:scale-[0.98] transition-transform">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-base text-foreground">{evento.titulo}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(evento.data), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {evento.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{evento.descricao}</p>
                        )}
                        {evento.meta?.status && (
                          <div className="mt-2">{statusBadge(evento.meta.status)}</div>
                        )}
                        {/* Expanded details */}
                        {isExpanded && evento.meta?.url && (
                          <div className="mt-3">
                            <img
                              src={evento.meta.url}
                              alt="Foto"
                              className="rounded-xl w-full max-h-60 object-cover"
                            />
                          </div>
                        )}
                        {isExpanded && evento.meta?.justificativa && (
                          <p className="mt-2 text-sm text-muted-foreground italic">
                            Justificativa: {evento.meta.justificativa}
                          </p>
                        )}
                        {isExpanded && evento.meta?.valor_impacto && (
                          <p className="mt-1 text-sm font-medium text-foreground">
                            Impacto: R$ {Number(evento.meta.valor_impacto).toFixed(2)}
                          </p>
                        )}
                        {isExpanded && evento.tipo === "compra" && (
                          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            {evento.meta?.quantidade != null && evento.meta?.valor_unitario != null && (
                              <p>
                                {evento.meta.quantidade} × R$ {Number(evento.meta.valor_unitario).toFixed(2)}
                              </p>
                            )}
                            {evento.meta?.observacao && <p className="italic">Obs: {evento.meta.observacao}</p>}
                          </div>
                        )}
                        {isExpanded && evento.tipo === "financeiro" && (
                          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            {evento.meta?.data_transacao && (
                              <p>
                                Data da transação:{" "}
                                {format(new Date(evento.meta.data_transacao), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            )}
                            {evento.meta?.comprovante_url && (
                              <a
                                href={evento.meta.comprovante_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-primary underline"
                              >
                                <Paperclip className="h-3.5 w-3.5" /> Ver comprovante
                              </a>
                            )}
                          </div>
                        )}
                        {isExpanded && evento.tipo === "dossie" && evento.meta?.subtipo === "obra_criada" && (
                          <div className="mt-3 space-y-3 text-sm">
                            <div className="flex flex-wrap gap-2">
                              {evento.meta.dados?.tipo_obra && (
                                <Badge variant="secondary" className="capitalize">{evento.meta.dados.tipo_obra}</Badge>
                              )}
                              {evento.meta.dados?.classificacao && (
                                <Badge variant="secondary" className="capitalize">{evento.meta.dados.classificacao}</Badge>
                              )}
                            </div>
                            {evento.meta.dados?.escopo ? (
                              <>
                                {evento.meta.dados.escopo.descricao_estruturada && (
                                  <p className="text-muted-foreground">{evento.meta.dados.escopo.descricao_estruturada}</p>
                                )}
                                {evento.meta.dados.escopo.necessidades?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-foreground mb-1">
                                      Necessidades
                                    </p>
                                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                      {evento.meta.dados.escopo.necessidades.map((n: string, i: number) => (
                                        <li key={i}>{n}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {evento.meta.dados.escopo.profissional_recomendado && (
                                  <p>
                                    <span className="font-medium text-foreground">Profissional recomendado: </span>
                                    <span className="text-muted-foreground">{evento.meta.dados.escopo.profissional_recomendado}</span>
                                  </p>
                                )}
                                {evento.meta.dados.escopo.alertas_seguranca?.length > 0 && (
                                  <div className="rounded-lg bg-amber-500/10 p-3">
                                    <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-amber-600">
                                      <ShieldAlert className="h-3.5 w-3.5" /> Alertas de segurança
                                    </p>
                                    <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-500">
                                      {evento.meta.dados.escopo.alertas_seguranca.map((a: string, i: number) => (
                                        <li key={i}>{a}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="italic text-muted-foreground">Escopo por IA não gerado para esta obra.</p>
                            )}
                          </div>
                        )}
                        {isExpanded && evento.tipo === "dossie" && evento.meta?.subtipo === "solicitacao_enviada" && (
                          <div className="mt-3 space-y-2 text-sm">
                            <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-foreground">
                              <Users className="h-3.5 w-3.5" /> Profissionais contatados
                            </p>
                            {evento.meta.dados?.fornecedor_ids?.length > 0 ? (
                              fornecedoresContatados ? (
                                <ul className="space-y-1">
                                  {evento.meta.dados.fornecedor_ids.map((fid: string) => {
                                    const forn = fornecedoresContatados.find((f) => f.id === fid);
                                    return (
                                      <li key={fid} className="text-muted-foreground">
                                        {forn ? `${forn.nome}${forn.categoria ? " · " + forn.categoria : ""}` : "Fornecedor removido"}
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p className="italic text-muted-foreground">Carregando...</p>
                              )
                            ) : (
                              <p className="italic text-muted-foreground">Nenhum profissional registrado.</p>
                            )}
                          </div>
                        )}
                        <div className="flex justify-end mt-1">
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum evento registrado ainda.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dossie;
