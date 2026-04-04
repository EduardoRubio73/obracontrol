import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";

export default function EtapaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: fase } = useQuery({
    queryKey: ["fase", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["fase-itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_itens")
        .select("*")
        .eq("fase_id", id!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const total = itens?.length ?? 0;
  const done = itens?.filter((i) => i.status === "concluido").length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const createItem = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("fase_itens").insert({
        fase_id: id!,
        nome,
        status: "pendente",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fase-itens", id] });
      toast.success("Tarefa adicionada!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleItem = useMutation({
    mutationFn: async ({
      itemId,
      currentStatus,
    }: {
      itemId: string;
      currentStatus: string | null;
    }) => {
      const newStatus =
        currentStatus === "concluido" ? "pendente" : "concluido";
      const { error } = await supabase
        .from("fase_itens")
        .update({ status: newStatus })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fase-itens", id] });
      queryClient.invalidateQueries({ queryKey: ["tarefas-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["progresso-geral"] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createItem.mutate(fd.get("nome") as string);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-28 px-1">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/etapas")}
          className="h-12 w-12 rounded-xl"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {fase?.nome ?? "Carregando..."}
        </h1>
      </div>

      {/* Progress */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <p className="text-base font-semibold text-muted-foreground mb-4">
            📊 Progresso
          </p>
          <div className="flex items-end justify-between mb-3">
            <span className="text-4xl font-black tabular-nums text-foreground">
              {progress}%
            </span>
            <p className="text-sm text-muted-foreground">
              {done} de {total} tarefas
            </p>
          </div>
          <Progress
            value={progress}
            className="h-5 rounded-full bg-secondary [&>div]:bg-primary [&>div]:rounded-full"
          />
        </CardContent>
      </Card>

      {/* New task */}
      <Button
        className="w-full h-14 rounded-2xl font-bold text-lg"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-6 w-6" />
        Nova tarefa
      </Button>

      {/* Checklist */}
      <div className="space-y-3">
        {itens?.map((item) => {
          const isDone = item.status === "concluido";
          return (
            <Card
              key={item.id}
              className={`shadow-sm transition-colors ${isDone ? "opacity-60" : ""}`}
            >
              <CardContent className="p-5 flex items-center gap-5">
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() =>
                    toggleItem.mutate({
                      itemId: item.id,
                      currentStatus: item.status,
                    })
                  }
                  className="h-7 w-7 rounded-lg border-2"
                />
                <p
                  className={`font-semibold text-lg flex-1 ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}
                >
                  {item.nome}
                </p>
              </CardContent>
            </Card>
          );
        })}

        {!itens?.length && (
          <Card className="border-dashed border-2 shadow-none">
            <CardContent className="py-14 text-center text-muted-foreground">
              <p className="text-lg font-medium">Nenhuma tarefa ainda</p>
              <p className="text-base mt-2">
                Adicione tarefas para acompanhar
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da tarefa</Label>
              <Input
                name="nome"
                required
                placeholder="Ex: Cavar vala"
                autoFocus
                className="h-12 text-base"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg"
              disabled={createItem.isPending}
            >
              {createItem.isPending ? "Adicionando..." : "Adicionar tarefa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
