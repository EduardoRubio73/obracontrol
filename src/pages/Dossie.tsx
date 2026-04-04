import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle2,
  Users,
  Sparkles,
  Clock,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoConfig: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  obra_criada: { icon: Sparkles, color: "text-primary", bg: "bg-primary/15" },
  solicitacao_enviada: { icon: Send, color: "text-blue-500", bg: "bg-blue-500/15" },
  retorno_profissional: { icon: Users, color: "text-amber-500", bg: "bg-amber-500/15" },
  escopo_aprovado: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/15" },
  profissional_escolhido: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-600/15" },
  proposta_recebida: { icon: Package, color: "text-violet-500", bg: "bg-violet-500/15" },
  default: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
};

const stagger = (step: number) => ({
  opacity: 0,
  animation: `menu-slide-up 0.45s ease-out ${step * 0.07}s forwards`,
});

const Dossie = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: obra } = useQuery({
    queryKey: ["obra", id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("obras") as any)
        .select("nome, tipo_obra, classificacao, status")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["dossie", id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("obra_dossie" as any) as any)
        .select("*")
        .eq("obra_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="max-w-lg mx-auto pb-32 px-3">
      <style>{`
        @keyframes menu-slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 pt-4 pb-4" style={stagger(0)}>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Dossiê</h1>
          <p className="text-sm text-muted-foreground">{obra?.nome || "Carregando..."}</p>
        </div>
      </div>

      {/* Obra info card */}
      {obra && (
        <Card className="rounded-2xl mb-6" style={stagger(1)}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">{obra.nome}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {obra.tipo_obra} • {obra.classificacao} • {obra.status}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : eventos && eventos.length > 0 ? (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {eventos.map((evento, i) => {
              const config = tipoConfig[evento.tipo] || tipoConfig.default;
              const Icon = config.icon;
              return (
                <div key={evento.id} className="flex gap-4 relative" style={stagger(i + 2)}>
                  <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center shrink-0 z-10`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <Card className="flex-1 rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">{evento.titulo}</p>
                          {evento.descricao && (
                            <p className="text-sm text-muted-foreground mt-1">{evento.descricao}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(evento.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12" style={stagger(2)}>
          <p className="text-muted-foreground">Nenhum evento registrado ainda.</p>
        </div>
      )}
    </div>
  );
};

export default Dossie;
