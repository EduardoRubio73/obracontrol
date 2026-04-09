import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { toast } from "sonner";
import { ArrowLeft, Plus, ChevronsUpDown, Check } from "lucide-react";
import { FasePhotos } from "@/components/FasePhotos";
import { z } from "zod";
import { cn } from "@/lib/utils";

const tarefaSchema = z.object({
  nome: z.string().min(1, "Obrigatório"),
});

export default function EtapaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedNome, setSelectedNome] = useState("");
  const [searchValue, setSearchValue] = useState("");

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

  const { data: tarefasPadrao } = useQuery({
    queryKey: ["tarefas-padrao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas_padrao" as any)
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const total = itens?.length ?? 0;
  const done = itens?.filter((i) => i.status === "concluido").length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const createItem = useMutation({
    mutationFn: async (nome: string) => {
      // Auto-insert into tarefas_padrao if new
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
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fase-itens", id] });
      queryClient.invalidateQueries({ queryKey: ["tarefas-padrao"] });
      toast.success("Tarefa adicionada!");
      setOpen(false);
      setSelectedNome("");
      setSearchValue("");
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
    const result = tarefaSchema.safeParse({ nome: selectedNome });
    if (!result.success) {
      toast.error("Preencha o nome da tarefa");
      return;
    }
    createItem.mutate(result.data.nome);
  };

  const isNewValue =
    searchValue.trim().length > 0 &&
    !tarefasPadrao?.some(
      (e) => e.nome.toLowerCase() === searchValue.trim().toLowerCase()
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

      {/* Photos */}
      {obraId && id && <FasePhotos faseId={id} obraId={obraId} />}

      {/* Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSelectedNome("");
            setSearchValue("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Nome da tarefa
              </label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="w-full h-12 justify-between text-base font-normal"
                  >
                    {selectedNome || "Selecione ou digite..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar tarefa..."
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {searchValue.trim() ? null : "Nenhuma tarefa cadastrada"}
                      </CommandEmpty>
                      <CommandGroup>
                        {tarefasPadrao
                          ?.filter((e) =>
                            e.nome
                              .toLowerCase()
                              .includes(searchValue.toLowerCase())
                          )
                          .map((e) => (
                            <CommandItem
                              key={e.id}
                              onSelect={() => {
                                setSelectedNome(e.nome);
                                setSearchValue(e.nome);
                                setComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedNome === e.nome
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {e.nome}
                            </CommandItem>
                          ))}
                        {isNewValue && (
                          <CommandItem
                            onSelect={() => {
                              setSelectedNome(searchValue.trim());
                              setComboOpen(false);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4 text-primary" />
                            <span>
                              Adicionar "
                              <span className="font-semibold">
                                {searchValue.trim()}
                              </span>
                              " como nova tarefa padrão
                            </span>
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg"
              disabled={createItem.isPending || !selectedNome.trim()}
            >
              {createItem.isPending ? "Adicionando..." : "Adicionar tarefa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
