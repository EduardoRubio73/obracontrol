import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, AlertTriangle, DollarSign, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoConfig: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  escopo: { label: "Escopo", icon: FileText, color: "text-blue-500" },
  custo: { label: "Custo", icon: DollarSign, color: "text-amber-500" },
  prazo: { label: "Prazo", icon: Clock, color: "text-violet-500" },
  outro: { label: "Outro", icon: AlertTriangle, color: "text-muted-foreground" },
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ObraAlteracoes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: obra } = useQuery({
    queryKey: ["obra-nome", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("nome")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: alteracoes } = useQuery({
    queryKey: ["obra-alteracoes", id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("obra_alteracoes" as any) as any)
        .select("*")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await (supabase
        .from("obra_alteracoes" as any) as any)
        .insert(values);
      if (error) throw error;

      // Register in dossier
      await (supabase.from("obra_dossie" as any) as any).insert({
        obra_id: id,
        user_id: user!.id,
        tipo: "alteracao_registrada",
        titulo: `Alteração: ${values.tipo}`,
        descricao: values.descricao,
        dados: { valor_impacto: values.valor_impacto, justificativa: values.justificativa },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obra-alteracoes", id] });
      toast.success("Alteração registrada!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const valor = fd.get("valor_impacto") as string;
    create.mutate({
      obra_id: id,
      user_id: user!.id,
      tipo: fd.get("tipo"),
      descricao: fd.get("descricao"),
      justificativa: fd.get("justificativa") || null,
      valor_impacto: valor ? Number(valor) : null,
    });
  };

  const totalImpacto = alteracoes?.reduce(
    (acc: number, a: any) => acc + (Number(a.valor_impacto) || 0),
    0
  ) ?? 0;

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-28 px-1">
      <div className="flex items-center gap-3 pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-12 w-12 rounded-xl"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Alterações {obra?.nome ? <>— <span className="text-blue-600 dark:text-blue-400">{obra.nome}</span></> : ""}
          </h1>
        </div>
      </div>

      {totalImpacto !== 0 && (
        <Card className="shadow-sm border-2 border-amber-200/60 bg-amber-50/50 dark:bg-amber-500/10">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Impacto total no custo</p>
            <p className={`text-2xl font-black tabular-nums ${totalImpacto > 0 ? "text-destructive" : "text-success"}`}>
              {totalImpacto > 0 ? "+" : ""}{fmt(totalImpacto)}
            </p>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full h-14 rounded-2xl font-bold text-lg"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-6 w-6" />
        Registrar alteração
      </Button>

      <div className="space-y-3">
        {alteracoes?.map((alt: any) => {
          const config = tipoConfig[alt.tipo] || tipoConfig.outro;
          const Icon = config.icon;
          return (
            <Card key={alt.id} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(alt.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground">{alt.descricao}</p>
                    {alt.justificativa && (
                      <p className="text-sm text-muted-foreground mt-1">{alt.justificativa}</p>
                    )}
                    {alt.valor_impacto && (
                      <p className={`text-sm font-bold mt-1 ${Number(alt.valor_impacto) > 0 ? "text-destructive" : "text-success"}`}>
                        Impacto: {Number(alt.valor_impacto) > 0 ? "+" : ""}{fmt(Number(alt.valor_impacto))}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!alteracoes?.length && (
          <Card className="border-dashed border-2 shadow-none">
            <CardContent className="py-14 text-center text-muted-foreground">
              <p className="text-lg font-medium">Nenhuma alteração registrada</p>
              <p className="text-base mt-2">Registre mudanças de escopo, custo ou prazo</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar alteração</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                name="tipo"
                required
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base"
              >
                <option value="escopo">Escopo</option>
                <option value="custo">Custo</option>
                <option value="prazo">Prazo</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                name="descricao"
                required
                placeholder="O que mudou?"
                className="min-h-[80px] text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Input
                name="justificativa"
                placeholder="Por que mudou?"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Impacto no custo (R$)</Label>
              <Input
                name="valor_impacto"
                type="number"
                step="0.01"
                placeholder="Ex: 1500 (positivo = aumento)"
                className="h-12 text-base"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg"
              disabled={create.isPending}
            >
              {create.isPending ? "Salvando..." : "Salvar alteração"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
