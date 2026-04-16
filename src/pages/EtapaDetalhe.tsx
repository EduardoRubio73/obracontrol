import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, CalendarDays, Clock, GripVertical } from "lucide-react";
import { FasePhotos } from "@/components/FasePhotos";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Diferença em dias entre duas datas (yyyy-mm-dd) */
function diffDays(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.ceil((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

/** Status visual de uma tarefa pelo executar_em */
function getTarefaUrgencia(executarEm?: string | null) {
  if (!executarEm) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const exec = new Date(executarEm + "T00:00:00");
  const diff = Math.ceil((exec.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Atrasada ${Math.abs(diff)}d`, className: "bg-destructive/15 text-destructive border-destructive/30" };
  if (diff === 0) return { label: "Hoje", className: "bg-destructive/10 text-destructive border-destructive/30" };
  if (diff <= 3) return { label: `Em ${diff}d`, className: "bg-warning/15 text-warning border-warning/30" };
  return { label: `Em ${diff}d`, className: "bg-success/10 text-success border-success/30" };
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

interface SortableTaskProps {
  item: any;
  onToggle: () => void;
}

function SortableTask({ item, onToggle }: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isDone = item.status === "concluido";
  const urg = !isDone ? getTarefaUrgencia(item.executar_em) : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "shadow-sm transition-colors",
        isDone && "opacity-60",
        isDragging && "ring-2 ring-primary z-10"
      )}
    >
      <CardContent className="p-5 flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1 mt-0.5"
          aria-label="Arrastar"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <Checkbox
          checked={isDone}
          onCheckedChange={onToggle}
          className="h-7 w-7 rounded-lg border-2 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-semibold text-lg",
              isDone ? "line-through text-muted-foreground" : "text-foreground"
            )}
          >
            {item.nome}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {item.executar_em && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {fmtDate(item.executar_em)}
              </span>
            )}
            {urg && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${urg.className}`}>
                {urg.label}
              </span>
            )}
            {item.criado_em && (
              <span className="text-[10px] text-muted-foreground">
                criado {new Date(item.criado_em).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EtapaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedTarefas, setSelectedTarefas] = useState<string[]>([]);
  const [customNome, setCustomNome] = useState("");
  const [executarEm, setExecutarEm] = useState("");

  const { data: fase } = useQuery({
    queryKey: ["fase", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("*, obras(id)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const obraId = (fase as any)?.obras?.id ?? (fase as any)?.obra_id;
  const duracaoFase = diffDays(fase?.data_inicio, fase?.data_fim);

  const { data: itens } = useQuery({
    queryKey: ["fase-itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_itens")
        .select("*")
        .eq("fase_id", id!)
        .order("ordem", { ascending: true, nullsFirst: false })
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: tarefasPadrao } = useQuery({
    queryKey: ["tarefas-padrao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas_padrao" as any)
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; nome: string }[];
    },
  });

  const total = itens?.length ?? 0;
  const done = itens?.filter((i: any) => i.status === "concluido").length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const existingNames = new Set(itens?.map((i: any) => i.nome.toLowerCase()) ?? []);

  const createItems = useMutation({
    mutationFn: async ({ nomes, executar_em }: { nomes: string[]; executar_em: string | null }) => {
      const baseOrdem = (itens?.length ?? 0);
      for (let i = 0; i < nomes.length; i++) {
        const nome = nomes[i];
        const exists = tarefasPadrao?.some(
          (e) => e.nome.toLowerCase() === nome.toLowerCase()
        );
        if (!exists) {
          await supabase.from("tarefas_padrao" as any).insert({ nome } as any);
        }
        const { error } = await supabase.from("fase_itens").insert({
          fase_id: id!,
          nome,
          status: "pendente",
          executar_em,
          ordem: baseOrdem + i,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fase-itens", id] });
      queryClient.invalidateQueries({ queryKey: ["tarefas-padrao"] });
      toast.success("Tarefas adicionadas!");
      setOpen(false);
      setSelectedTarefas([]);
      setSearchValue("");
      setCustomNome("");
      setExecutarEm("");
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

  const reorderItems = useMutation({
    mutationFn: async (ordered: any[]) => {
      const updates = ordered.map((it, idx) =>
        supabase.from("fase_itens").update({ ordem: idx } as any).eq("id", it.id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onMutate: async (ordered: any[]) => {
      await queryClient.cancelQueries({ queryKey: ["fase-itens", id] });
      const previous = queryClient.getQueryData(["fase-itens", id]);
      queryClient.setQueryData(["fase-itens", id], ordered);
      return { previous };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["fase-itens", id], ctx.previous);
      toast.error("Erro ao reordenar: " + e.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["fase-itens", id] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !itens) return;
    const oldIndex = itens.findIndex((i: any) => i.id === active.id);
    const newIndex = itens.findIndex((i: any) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(itens, oldIndex, newIndex);
    reorderItems.mutate(newOrder);
  };

  const toggleSelection = (nome: string) => {
    setSelectedTarefas((prev) =>
      prev.includes(nome) ? prev.filter((n) => n !== nome) : [...prev, nome]
    );
  };

  const handleAddCustom = () => {
    const nome = customNome.trim();
    if (!nome) return;
    if (!selectedTarefas.includes(nome)) {
      setSelectedTarefas((prev) => [...prev, nome]);
    }
    setCustomNome("");
  };

  const handleSubmit = () => {
    if (selectedTarefas.length === 0) {
      toast.error("Selecione pelo menos uma tarefa");
      return;
    }
    createItems.mutate({ nomes: selectedTarefas, executar_em: executarEm || null });
  };

  const filteredTarefas = tarefasPadrao?.filter(
    (e) =>
      e.nome.toLowerCase().includes(searchValue.toLowerCase()) &&
      !existingNames.has(e.nome.toLowerCase())
  );

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

      {/* Datas/Duração da fase */}
      {(fase?.data_inicio || fase?.data_fim) && (
        <Card className="shadow-sm">
          <CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Início:</span>
              <span className="font-semibold">{fmtDate(fase?.data_inicio)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fim:</span>
              <span className="font-semibold">{fmtDate(fase?.data_fim)}</span>
            </div>
            {duracaoFase !== null && (
              <Badge variant="secondary" className="ml-auto">
                <Clock className="h-3 w-3 mr-1" />
                {duracaoFase} dia(s)
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Checklist com drag-and-drop */}
      {itens && itens.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itens.map((i: any) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {itens.map((item: any) => (
                <SortableTask
                  key={item.id}
                  item={item}
                  onToggle={() =>
                    toggleItem.mutate({
                      itemId: item.id,
                      currentStatus: item.status,
                    })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

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

      {/* Photos */}
      {obraId && id && <FasePhotos faseId={id} obraId={obraId} faseNome={fase?.nome} />}

      {/* Dialog multi-select */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSelectedTarefas([]);
            setSearchValue("");
            setCustomNome("");
            setExecutarEm("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar tarefas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefa..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selection list */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[35vh] border rounded-lg p-2">
              {filteredTarefas?.map((t) => {
                const isSelected = selectedTarefas.includes(t.nome);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleSelection(t.nome)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="h-5 w-5 rounded pointer-events-none"
                    />
                    <span className="text-base font-medium">{t.nome}</span>
                  </button>
                );
              })}
              {filteredTarefas?.length === 0 && !searchValue.trim() && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tarefa padrão cadastrada
                </p>
              )}
              {filteredTarefas?.length === 0 && searchValue.trim() && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tarefa encontrada
                </p>
              )}
            </div>

            {/* Custom add */}
            <div className="flex gap-2">
              <Input
                placeholder="Ou digite uma nova tarefa..."
                value={customNome}
                onChange={(e) => setCustomNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustom())}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddCustom}
                disabled={!customNome.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Executar em (data) */}
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Executar em (opcional)
              </Label>
              <Input
                type="date"
                value={executarEm}
                onChange={(e) => setExecutarEm(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Data prevista para execução. Aplica a todas as tarefas adicionadas.
              </p>
            </div>

            {/* Selected summary */}
            {selectedTarefas.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedTarefas.length} tarefa(s) selecionada(s)
              </div>
            )}

            <Button
              onClick={handleSubmit}
              className="w-full h-14 rounded-2xl font-bold text-lg"
              disabled={createItems.isPending || selectedTarefas.length === 0}
            >
              {createItems.isPending
                ? "Adicionando..."
                : `Adicionar ${selectedTarefas.length} tarefa(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
