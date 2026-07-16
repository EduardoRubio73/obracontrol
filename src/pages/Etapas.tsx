import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireObra } from "@/components/RequireObra";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, ChevronRight, Pencil, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function EtapaCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );
  const exactMatch = options.some((o) => o.toLowerCase() === search.toLowerCase());

  return (
    <div ref={ref} className="relative">
      <Input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Digite ou selecione..."
        className="h-12 text-base"
        autoComplete="off"
      />
      {open && (filtered.length > 0 || (search.trim() && !exactMatch)) && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover shadow-lg max-h-48 overflow-auto">
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => { onChange(o); setSearch(o); setOpen(false); }}
            >
              {o}
            </button>
          ))}
          {search.trim() && !exactMatch && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-accent transition-colors border-t"
              onClick={() => { onChange(search.trim()); setOpen(false); }}
            >
              + Adicionar "{search.trim()}" como etapa padrão
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EtapaForm({
  initialNome = "",
  onSubmit,
  isPending,
  submitLabel = "Criar etapa",
}: {
  initialNome?: string;
  onSubmit: (nome: string, isNew: boolean) => void;
  isPending: boolean;
  submitLabel?: string;
}) {
  const [nomeCustom, setNomeCustom] = useState(initialNome);

  const { data: etapasPadrao } = useQuery({
    queryKey: ["etapas-padrao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etapas_padrao")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const allOptions = etapasPadrao?.map((e) => e.nome) ?? [];
  const isNewOption = nomeCustom.trim() !== "" && !allOptions.some((o) => o.toLowerCase() === nomeCustom.toLowerCase());

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nomeCustom.trim()) return;
    onSubmit(nomeCustom.trim(), isNewOption);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome da etapa</Label>
        <EtapaCombobox
          value={nomeCustom}
          onChange={setNomeCustom}
          options={allOptions}
        />
        {isNewOption && nomeCustom.trim() && (
          <p className="text-xs text-primary">
            Esta etapa será adicionada às etapas padrão automaticamente.
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full h-14 rounded-2xl font-bold text-lg"
        disabled={isPending || !nomeCustom.trim()}
      >
        {isPending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}

const statusDot: Record<string, string> = {
  pendente: "bg-muted-foreground/40",
  em_andamento: "bg-warning",
  concluido: "bg-success",
};

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

type Fase = {
  id: string;
  nome: string;
  status: string | null;
  progresso: number | null;
  ordem: number | null;
};

function SortableFaseCard({
  fase,
  numero,
  fotoUrl,
  onOpen,
  onEdit,
  onDelete,
}: {
  fase: Fase;
  numero: number;
  fotoUrl?: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fase.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const st = fase.status ?? "pendente";

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className="shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
        onClick={onOpen}
      >
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                type="button"
                className="touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                aria-label="Arrastar para reordenar"
              >
                <GripVertical className="h-5 w-5" />
              </button>
              <span className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 text-primary font-black text-sm sm:text-base flex-shrink-0">
                {numero}
              </span>
              {fotoUrl ? (
                <img src={fotoUrl} alt="" className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className={`h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full shrink-0 ${statusDot[st]}`} />
              )}
              <h3 className="text-base sm:text-xl font-bold text-foreground truncate">
                {fase.nome}
              </h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                aria-label="Editar etapa"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                aria-label="Excluir etapa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Progress
              value={fase.progresso ?? 0}
              className="h-3 sm:h-4 flex-1 rounded-full bg-secondary [&>div]:bg-primary [&>div]:rounded-full"
            />
            <span className="text-sm sm:text-lg font-black tabular-nums w-12 sm:w-14 text-right text-foreground">
              {Math.round(fase.progresso ?? 0)}%
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {statusLabel[st] ?? st}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function EtapasContent({ obraId }: { obraId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editFase, setEditFase] = useState<Fase | null>(null);
  const [deleteFase, setDeleteFase] = useState<Fase | null>(null);

  const { data: obra } = useQuery({
    queryKey: ["obra", obraId],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("nome").eq("id", obraId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: fases, isLoading } = useQuery({
    queryKey: ["obra-fases", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("*")
        .eq("obra_id", obraId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as Fase[];
    },
  });

  const { data: faseFotos } = useQuery({
    queryKey: ["fase-fotos-thumbs", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fase_fotos")
        .select("id, url, fase_id")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const f of data ?? []) {
        if (!map[f.fase_id]) map[f.fase_id] = f.url;
      }
      return map;
    },
  });

  const createFase = useMutation({
    mutationFn: async ({ nome, isNew }: { nome: string; isNew: boolean }) => {
      if (isNew) {
        await supabase.from("etapas_padrao").insert({ nome } as any);
      }
      const { error } = await supabase.from("obra_fases").insert({
        obra_id: obraId,
        nome,
        status: "pendente",
        progresso: 0,
        ordem: (fases?.length ?? 0) + 1,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obra-fases", obraId] });
      queryClient.invalidateQueries({ queryKey: ["etapas-padrao"] });
      toast.success("Etapa criada!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateFase = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from("obra_fases")
        .update({ nome })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obra-fases", obraId] });
      toast.success("Etapa atualizada!");
      setEditFase(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteFaseMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("obra_fases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obra-fases", obraId] });
      toast.success("Etapa excluída!");
      setDeleteFase(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reorderFases = useMutation({
    mutationFn: async (ordered: Fase[]) => {
      await Promise.all(
        ordered.map((f, idx) =>
          supabase.from("obra_fases").update({ ordem: idx + 1 }).eq("id", f.id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obra-fases", obraId] });
      toast.success("Ordem atualizada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !fases) return;
    const oldIndex = fases.findIndex((f) => f.id === active.id);
    const newIndex = fases.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(fases, oldIndex, newIndex);
    queryClient.setQueryData(["obra-fases", obraId], newOrder);
    reorderFases.mutate(newOrder);
  };

  const handleSubmit = (nome: string, isNew: boolean) => {
    createFase.mutate({ nome, isNew });
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <div className="pt-2 sm:pt-4">
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
          Etapas {obra ? `— ${obra.nome}` : "da obra"}
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground mt-1">
          Divida sua obra em partes — arraste para reordenar
        </p>
      </div>

      <Button
        className="w-full h-14 rounded-2xl font-bold text-lg"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-6 w-6" />
        Nova etapa
      </Button>

      {fases && fases.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fases.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fases.map((f, idx) => (
                <SortableFaseCard
                  key={f.id}
                  fase={f}
                  numero={idx + 1}
                  fotoUrl={faseFotos?.[f.id]}
                  onOpen={() => navigate(`/obras/${obraId}/etapas/${f.id}`)}
                  onEdit={() => setEditFase(f)}
                  onDelete={() => setDeleteFase(f)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!isLoading && !fases?.length && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="py-14 text-center">
            <p className="text-xl font-bold text-muted-foreground">
              Você ainda não criou etapas
            </p>
            <p className="text-base text-muted-foreground mt-3">
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova etapa</DialogTitle>
          </DialogHeader>
          <EtapaForm onSubmit={handleSubmit} isPending={createFase.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFase} onOpenChange={(o) => !o && setEditFase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar etapa</DialogTitle>
          </DialogHeader>
          {editFase && (
            <EtapaForm
              initialNome={editFase.nome}
              submitLabel="Salvar alterações"
              onSubmit={(nome) => updateFase.mutate({ id: editFase.id, nome })}
              isPending={updateFase.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFase} onOpenChange={(o) => !o && setDeleteFase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa "{deleteFase?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e removerá também todos os itens, fotos e dados vinculados a esta etapa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteFase && deleteFaseMut.mutate(deleteFase.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Etapas() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireObra obraId={id} pageName="Etapas">
      {id && <EtapasContent obraId={id} />}
    </RequireObra>
  );
}
