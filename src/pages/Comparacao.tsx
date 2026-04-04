import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, TrendingDown, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PropostaItem {
  nome: string;
  quantidade: number;
  valor_unitario: number;
}

interface PropostaComItens {
  id: string;
  fornecedor: { nome: string } | null;
  itens: PropostaItem[];
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Comparacao = () => {
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
    queryKey: ["comparacao", cotacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select(`
          id,
          fornecedor:fornecedor_id(nome),
          itens:proposta_itens(nome, quantidade, valor_unitario)
        `)
        .eq("cotacao_id", cotacaoId!);
      if (error) throw error;
      return data as unknown as PropostaComItens[];
    },
  });

  // Build comparison map: { itemName: { fornecedor: totalValue } }
  const montarTabela = (props: PropostaComItens[]) => {
    const mapa: Record<string, Record<string, number>> = {};
    props
      .filter((p) => p.itens && p.itens.length > 0)
      .forEach((p) => {
        const forn = (p.fornecedor as any)?.nome ?? "Sem nome";
        p.itens.forEach((item) => {
          if (!mapa[item.nome]) mapa[item.nome] = {};
          mapa[item.nome][forn] = item.valor_unitario * item.quantidade;
        });
      });
    return mapa;
  };

  const calcularTotais = (props: PropostaComItens[]) =>
    props.map((p) => {
      const forn = (p.fornecedor as any)?.nome ?? "Sem nome";
      const total = (p.itens ?? []).reduce(
        (acc, i) => acc + i.valor_unitario * i.quantidade,
        0
      );
      return { fornecedor: forn, total };
    });

  const fornecedores = propostas
    ? [...new Set(propostas.map((p) => (p.fornecedor as any)?.nome ?? "Sem nome"))]
    : [];

  const tabela = propostas ? montarTabela(propostas) : {};
  const itens = Object.keys(tabela);
  const totais = propostas ? calcularTotais(propostas) : [];
  const menorTotal = totais.length ? Math.min(...totais.map((t) => t.total)) : 0;
  const maiorTotal = totais.length ? Math.max(...totais.map((t) => t.total)) : 0;
  const economia = maiorTotal - menorTotal;
  const vencedor = totais.find((t) => t.total === menorTotal);

  const getCellColor = (itemName: string, fornNome: string) => {
    const linha = tabela[itemName];
    if (!linha || !linha[fornNome]) return "";
    const valores = Object.values(linha);
    const menor = Math.min(...valores);
    const maior = Math.max(...valores);
    if (valores.length < 2) return "";
    if (linha[fornNome] === menor) return "bg-success/15 text-success font-semibold";
    if (linha[fornNome] === maior) return "bg-destructive/10 text-destructive";
    return "";
  };

  const getTotalColor = (total: number) => {
    if (totais.length < 2) return "";
    if (total === menorTotal) return "bg-success/15 text-success font-bold";
    if (total === maiorTotal) return "bg-destructive/10 text-destructive font-semibold";
    return "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Carregando comparação...</p>
      </div>
    );
  }

  const hasData = itens.length > 0 && fornecedores.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cotacoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Comparação de Propostas</h1>
          <p className="text-sm text-muted-foreground">
            {cotacao?.descricao} — {(cotacao?.obras as any)?.nome ?? ""}
          </p>
        </div>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum item de proposta cadastrado para comparar.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione itens nas propostas para visualizar a comparação.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15">
                  <Trophy className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Melhor Proposta</p>
                  <p className="font-bold">{vencedor?.fornecedor}</p>
                  <p className="text-sm font-medium text-success">{fmt(menorTotal)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <TrendingUp className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Maior Total</p>
                  <p className="text-sm font-medium text-destructive">{fmt(maiorTotal)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingDown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Economia Potencial</p>
                  <p className="text-sm font-bold text-primary">{fmt(economia)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop: Excel-style table */}
          <div className="hidden md:block">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detalhamento por Item</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-semibold">
                          Item
                        </th>
                        {fornecedores.map((f) => (
                          <th key={f} className="min-w-[140px] px-4 py-3 text-right font-semibold">
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item, i) => (
                        <tr key={item} className={cn("border-b", i % 2 === 0 ? "" : "bg-muted/20")}>
                          <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium">
                            {item}
                          </td>
                          {fornecedores.map((f) => (
                            <td
                              key={f}
                              className={cn(
                                "px-4 py-3 text-right tabular-nums",
                                getCellColor(item, f)
                              )}
                            >
                              {tabela[item][f] != null ? fmt(tabela[item][f]) : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="border-t-2 border-border font-bold">
                        <td className="sticky left-0 z-10 bg-card px-4 py-3">TOTAL</td>
                        {fornecedores.map((f) => {
                          const t = totais.find((t) => t.fornecedor === f);
                          return (
                            <td
                              key={f}
                              className={cn(
                                "px-4 py-3 text-right tabular-nums",
                                t ? getTotalColor(t.total) : ""
                              )}
                            >
                              {t ? fmt(t.total) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile: Cards with horizontal swipe */}
          <div className="space-y-4 md:hidden">
            {itens.map((item) => (
              <Card key={item}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{item}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory">
                    {fornecedores.map((f) => {
                      const valor = tabela[item][f];
                      const colorClass = getCellColor(item, f);
                      return (
                        <div
                          key={f}
                          className={cn(
                            "flex-shrink-0 snap-start rounded-lg border p-3 min-w-[140px]",
                            colorClass ? colorClass : "bg-card"
                          )}
                        >
                          <p className="text-xs text-muted-foreground truncate">{f}</p>
                          <p className="mt-1 text-lg font-bold tabular-nums">
                            {valor != null ? fmt(valor) : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Mobile totals */}
            <Card className="border-2 border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total por Fornecedor</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory">
                  {totais
                    .sort((a, b) => a.total - b.total)
                    .map((t, i) => (
                      <div
                        key={t.fornecedor}
                        className={cn(
                          "flex-shrink-0 snap-start rounded-lg border p-3 min-w-[140px]",
                          getTotalColor(t.total)
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {i === 0 && <Trophy className="h-3 w-3 text-success" />}
                          <p className="text-xs text-muted-foreground truncate">{t.fornecedor}</p>
                        </div>
                        <p className="mt-1 text-lg font-bold tabular-nums">{fmt(t.total)}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Comparacao;
