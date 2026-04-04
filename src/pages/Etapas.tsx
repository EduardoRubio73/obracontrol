import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ChevronRight } from "lucide-react";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};

const statusColors: Record<string, string> = {
  pendente: "bg-secondary text-secondary-foreground",
  em_andamento: "bg-primary/10 text-primary",
  concluido: "bg-emerald-100 text-emerald-700",
};

export default function Etapas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Get user's first obra
  const { data: obra } = useQuery({
    queryKey: ["primeira-obra"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: fases, isLoading } = useQuery({
    queryKey: ["obra-fases", obra?.id],
    enabled: !!obra?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("*")
        .eq("obra_id", obra!.id)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createFase = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("obra_fases").insert({
        obra_id: obra!.id,
        nome,
        status: "pendente",
        progresso: 0,
        ordem: (fases?.length ?? 0) + 1,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obra-fases", obra?.id] });
      toast.success("Etapa criada!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createFase.mutate(fd.get("nome") as string);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-24">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Etapas da obra
        </h1>
        <p className="text-muted-foreground">Divida sua obra em partes</p>
      </div>

      <Button
        className="w-full h-12 rounded-xl font-bold text-base"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-5 w-5" />
        Nova etapa
      </Button>

      {/* Fase cards */}
      {fases?.map((f) => (
        <Card
          key={f.id}
          className="shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => navigate(`/etapas/${f.id}`)}
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{f.nome}</h3>
              <div className="flex items-center gap-2">
                <Badge className={statusColors[f.status ?? "pendente"] ?? statusColors.pendente}>
                  {statusLabels[f.status ?? "pendente"] ?? f.status}
                </Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress
                value={f.progresso ?? 0}
                className="h-3 flex-1 rounded-full bg-secondary [&>div]:bg-primary [&>div]:rounded-full"
              />
              <span className="text-sm font-bold tabular-nums w-10 text-right">
                {f.progresso ?? 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Empty state */}
      {!isLoading && !fases?.length && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-bold text-muted-foreground">
              Você ainda não criou etapas
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Exemplo:
              <br />
              Fundação
              <br />
              Estrutura
              <br />
              Acabamento
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova etapa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da etapa</Label>
              <Input
                name="nome"
                required
                placeholder="Ex: Fundação"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-bold"
              disabled={createFase.isPending}
            >
              {createFase.isPending ? "Criando..." : "Criar etapa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
