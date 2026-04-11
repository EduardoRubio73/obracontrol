import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

const PortalFornecedor = () => {
  const { token } = useParams<{ token: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [empresa, setEmpresa] = useState("");
  const [prazo, setPrazo] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});

  // Fetch cotação by token
  const { data: cotacao, isLoading: loadingCotacao, error: cotacaoError } = useQuery({
    queryKey: ["portal-cotacao", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_cotacao_by_token" as any, {
        p_token: token!,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  // Fetch items
  const { data: itens } = useQuery({
    queryKey: ["portal-itens", cotacao?.id],
    enabled: !!cotacao?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_itens_cotacao_by_token" as any, {
        p_token: token!,
      });
      if (error) throw error;
      return data;
    },
  });

  // Track visualização when cotação loads
  useEffect(() => {
    if (!cotacao?.id) return;
    supabase.rpc("track_public_cotacao_view" as any, { p_token: token! }).then(({ error }) => {
        if (error) console.error("tracking view:", error.message);
      });
  }, [cotacao?.id, token]);

  const submitProposta = useMutation({
    mutationFn: async () => {
      if (!cotacao || !itens?.length || !token) throw new Error("Dados inválidos");

      const propostaItens = itens.map((item: any) => ({
        nome: item.nome,
        quantidade: Number(item.quantidade),
        valor_unitario: Number(valores[item.id] || 0),
      }));

      if (!propostaItens.length) {
        throw new Error("Proposta sem itens — não é possível enviar.");
      }

      const { error } = await supabase.rpc("submit_public_proposta" as any, {
        p_token: token,
        p_empresa: empresa.trim(),
        p_prazo_dias: Number(prazo) || null,
        p_itens: propostaItens,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Proposta enviada com sucesso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa.trim()) return toast.error("Informe o nome da empresa");

    const allFilled = itens?.every((item: any) => {
      const v = Number(valores[item.id] || 0);
      return v > 0;
    });
    if (!allFilled) return toast.error("Preencha todos os valores unitários");

    submitProposta.mutate();
  };

  // Expired check
  const isExpired = cotacao?.data_expiracao && new Date(cotacao.data_expiracao) < new Date();

  if (loadingCotacao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (cotacaoError || !token || !cotacao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-bold">Link Inválido</h2>
            <p className="text-muted-foreground text-center">
              ⚠️ Gerando link de acesso... tente novamente em instantes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Clock className="h-12 w-12 text-warning" />
            <h2 className="text-xl font-bold">Cotação Expirada</h2>
            <p className="text-muted-foreground text-center">
              O prazo para envio de propostas encerrou em {cotacao.data_expiracao}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="h-16 w-16 text-success" />
            <h2 className="text-xl font-bold">Proposta Enviada!</h2>
            <p className="text-muted-foreground text-center">
              Sua proposta foi recebida com sucesso. O responsável pela obra entrará em contato.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const total = itens?.reduce((acc, item: any) => {
    const vu = Number(valores[item.id] || 0);
    return acc + vu * Number(item.quantidade);
  }, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Enviar Proposta</h1>
          <p className="text-muted-foreground">{cotacao.descricao}</p>
          <p className="text-sm text-muted-foreground">
            Obra: {(cotacao as any)?.obra_nome ?? "—"}
          </p>
          {cotacao.data_expiracao && (
            <p className="text-xs text-warning">
              Prazo: até {cotacao.data_expiracao}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Razão social ou nome fantasia"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo de Entrega (dias)</Label>
                <Input
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  type="number"
                  placeholder="Ex: 30"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens para Cotação</CardTitle>
            </CardHeader>
            <CardContent>
              {itens?.length ? (
                <div className="space-y-4">
                  {itens.map((item: any) => (
                    <div key={item.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.nome}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.quantidade} {item.unidade}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor Unitário (R$) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0,00"
                          value={valores[item.id] || ""}
                          onChange={(e) =>
                            setValores((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          required
                        />
                        {valores[item.id] && Number(valores[item.id]) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Subtotal: {fmt(Number(valores[item.id]) * Number(item.quantidade))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="flex items-center justify-between rounded-lg bg-muted p-4 font-bold">
                    <span>Total da Proposta</span>
                    <span className="text-primary">{fmt(total)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhum item definido para esta cotação.
                </p>
              )}
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={submitProposta.isPending || !itens?.length}
          >
            {submitProposta.isPending ? "Enviando..." : "Enviar Proposta"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PortalFornecedor;
