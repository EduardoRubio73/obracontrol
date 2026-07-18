import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropostaItem {
  nome: string;
  quantidade: number;
  valor_unitario: number;
}

interface PropostaComItens {
  id: string;
  valor: number;
  prazo_dias: number | null;
  observacoes: string | null;
  fornecedor: { nome: string } | null;
  itens: PropostaItem[];
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Analise = () => {
  const { id: cotacaoId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: cotacao } = useQuery({
    queryKey: ["cotacao-detalhe", cotacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("descricao, obras(nome)")
        .eq("id", cotacaoId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: propostas, isLoading } = useQuery({
    queryKey: ["analise-propostas", cotacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select(`
          id, valor, prazo_dias, observacoes,
          fornecedor:fornecedor_id(nome),
          itens:proposta_itens(nome, quantidade, valor_unitario)
        `)
        .eq("cotacao_id", cotacaoId!);
      if (error) throw error;
      return data as unknown as PropostaComItens[];
    },
  });

  const { data: hasLabor } = useQuery({
    queryKey: ["analise-tem-mao-de-obra", cotacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_cotacao")
        .select("id")
        .eq("cotacao_id", cotacaoId!)
        .eq("tipo", "mao_de_obra")
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Carregando análise...</p>
      </div>
    );
  }

  if (!propostas || propostas.length < 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cotacoes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Análise IA</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Mínimo 2 propostas necessárias para análise.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- SCORING LOGIC ---
  const maxPrazo = Math.max(...propostas.map((p) => p.prazo_dias ?? 0)) || 1;
  const maxValor = Math.max(...propostas.map((p) => p.valor)) || 1;

  const scored = propostas
    .map((p) => {
      const forn = (p.fornecedor as any)?.nome ?? "Sem nome";
      const total = p.itens?.reduce((a, i) => a + i.valor_unitario * i.quantidade, 0) ?? p.valor;
      const prazo = p.prazo_dias ?? maxPrazo;

      // Score: lower is better. Normalize to 0-1 range.
      const precoScore = total / maxValor; // 0 = cheapest
      const prazoScore = prazo / maxPrazo; // 0 = fastest
      const score = precoScore * 0.7 + prazoScore * 0.3;

      return { ...p, forn, total, prazo, score };
    })
    .sort((a, b) => a.score - b.score);

  const winner = scored[0];

  // --- PER-ITEM ANALYSIS ---
  const allItems = new Set<string>();
  propostas.forEach((p) => p.itens?.forEach((i) => allItems.add(i.nome)));

  const itemAnalysis = Array.from(allItems).map((nome) => {
    const prices: { forn: string; valor: number }[] = [];
    propostas.forEach((p) => {
      const item = p.itens?.find((i) => i.nome === nome);
      if (item) {
        prices.push({
          forn: (p.fornecedor as any)?.nome ?? "?",
          valor: item.valor_unitario * item.quantidade,
        });
      }
    });

    const valores = prices.map((p) => p.valor);
    const menor = Math.min(...valores);
    const maior = Math.max(...valores);
    const variacao = menor > 0 ? ((maior - menor) / menor) * 100 : 0;
    const missing = propostas.length - prices.length;

    return { nome, prices, menor, maior, variacao, missing };
  });

  // Alerts
  const alerts: { type: "warning" | "error"; msg: string }[] = [];
  itemAnalysis.forEach((item) => {
    if (item.missing > 0) {
      alerts.push({
        type: "error",
        msg: `"${item.nome}" faltando em ${item.missing} proposta(s)`,
      });
    }
    if (item.variacao > 50) {
      alerts.push({
        type: "warning",
        msg: `"${item.nome}" tem variação de ${item.variacao.toFixed(0)}% entre propostas`,
      });
    }
  });

  if (hasLabor) {
    propostas.forEach((p) => {
      const forn = (p.fornecedor as any)?.nome ?? "Sem nome";
      if (!p.prazo_dias) {
        alerts.push({ type: "warning", msg: `${forn}: prazo de execução não informado` });
      }
      if (!p.observacoes) {
        alerts.push({ type: "warning", msg: `${forn}: garantia/observações do serviço não informadas` });
      }
    });
  }

  const economia = scored[scored.length - 1].total - scored[0].total;
  const obraNome = (cotacao?.obras as { nome?: string } | null)?.nome;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cotacoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Análise Inteligente {obraNome ? <>— <span className="text-blue-600 dark:text-blue-400">{obraNome}</span></> : ""}
          </h1>
          <p className="text-sm text-muted-foreground">{cotacao?.descricao}</p>
        </div>
      </div>

      {/* Recommendation */}
      <Card className="border-2 border-success/50 bg-success/5">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/15">
            <Trophy className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-xs font-medium text-success uppercase tracking-wide">
              🟢 Fornecedor Recomendado
            </p>
            <p className="mt-1 text-xl font-bold">{winner.forn}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <span>Total: <strong className="text-success">{fmt(winner.total)}</strong></span>
              <span>Prazo: <strong>{winner.prazo} dias</strong></span>
              <span>Score: <strong>{(100 - winner.score * 100).toFixed(0)}/100</strong></span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Score = 70% preço + 30% prazo (quanto maior, melhor)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertas ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-lg p-3 text-sm",
                  a.type === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/10 text-warning"
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {a.msg}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ranking Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scored.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-4",
                  i === 0 && "border-success/50 bg-success/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                      i === 0
                        ? "bg-success text-success-foreground"
                        : i === scored.length - 1
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}º
                  </span>
                  <div>
                    <p className="font-medium">{s.forn}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.prazo} dias • Score: {(100 - s.score * 100).toFixed(0)}
                    </p>
                  </div>
                </div>
                <span className="font-bold tabular-nums">{fmt(s.total)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-primary/10 p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Economia potencial</span>
            </div>
            <span className="font-bold text-primary">{fmt(economia)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-Item Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 Análise por Item</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold">Item</th>
                  <th className="px-4 py-3 text-right font-semibold">Menor</th>
                  <th className="px-4 py-3 text-right font-semibold">Maior</th>
                  <th className="px-4 py-3 text-right font-semibold">Variação</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {itemAnalysis.map((item) => (
                  <tr key={item.nome} className="border-b">
                    <td className="px-4 py-3 font-medium">{item.nome}</td>
                    <td className="px-4 py-3 text-right text-success tabular-nums">
                      {fmt(item.menor)}
                    </td>
                    <td className="px-4 py-3 text-right text-destructive tabular-nums">
                      {fmt(item.maior)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.variacao.toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.missing > 0 ? (
                        <Badge variant="destructive" className="text-xs">Incompleto</Badge>
                      ) : item.variacao > 50 ? (
                        <Badge className="bg-warning/10 text-warning text-xs">Alta variação</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {itemAnalysis.map((item) => (
              <div key={item.nome} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.nome}</span>
                  {item.missing > 0 ? (
                    <Badge variant="destructive" className="text-xs">Incompleto</Badge>
                  ) : item.variacao > 50 ? (
                    <Badge className="bg-warning/10 text-warning text-xs">Alta variação</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">OK</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Menor</p>
                    <p className="font-medium text-success">{fmt(item.menor)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Maior</p>
                    <p className="font-medium text-destructive">{fmt(item.maior)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Variação</p>
                    <p className="font-medium">{item.variacao.toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action: go to comparison */}
      <Button
        className="w-full"
        onClick={() => navigate(`/cotacoes/${cotacaoId}/comparar`)}
      >
        <BarChart3 className="mr-2 h-4 w-4" />
        Ver Comparação Detalhada
      </Button>
    </div>
  );
};

export default Analise;
