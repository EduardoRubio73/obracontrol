import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObraAtiva } from "@/hooks/useObraAtiva";
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
import { toast } from "sonner";
import { Plus, ChevronRight } from "lucide-react";

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

function EtapaForm({ onSubmit, isPending }: { onSubmit: (nome: string, isNew: boolean) => void; isPending: boolean }) {
  const [nomeCustom, setNomeCustom] = useState("");

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
      <input type="hidden" name="nome" value={nomeCustom} />
      <Button
        type="submit"
        className="w-full h-14 rounded-2xl font-bold text-lg"
        disabled={isPending || !nomeCustom.trim()}
      >
        {isPending ? "Criando..." : "Criar etapa"}
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

function EtapasContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { obraAtivaId, obraAtiva } = useObraAtiva();

  const { data: fases, isLoading } = useQuery({
    queryKey: ["obra-fases", obraAtivaId],
    enabled: !!obraAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_fases")
        .select("*")
        .eq("obra_id", obraAtivaId!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createFase = useMutation({
    mutationFn: async ({ nome, isNew }: { nome: string; isNew: boolean }) => {
      // Auto-insert into etapas_padrao if new
      if (isNew) {
        await supabase.from("etapas_padrao").insert({ nome } as any);
      }
      const { error } = await supabase.from("obra_fases").insert({
        obra_id: obraAtivaId!,
        nome,
        status: "pendente",
        progresso: 0,
        ordem: (fases?.length ?? 0) + 1,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obra-fases", obraAtivaId] });
      queryClient.invalidateQueries({ queryKey: ["etapas-padrao"] });
      toast.success("Etapa criada!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (nome: string, isNew: boolean) => {
    createFase.mutate({ nome, isNew });
  };

  return (
    <div className="space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <div className="pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Etapas {obraAtiva ? `— ${obraAtiva.nome}` : "da obra"}
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Divida sua obra em partes
        </p>
      </div>

      <Button
        className="w-full h-14 rounded-2xl font-bold text-lg"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-6 w-6" />
        Nova etapa
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fases?.map((f) => {
        const st = f.status ?? "pendente";
        return (
          <Card
            key={f.id}
            className="shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate(`/etapas/${f.id}`)}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-3.5 w-3.5 rounded-full ${statusDot[st]}`} />
                  <h3 className="text-xl font-bold text-foreground">
                    {f.nome}
                  </h3>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <Progress
                  value={f.progresso ?? 0}
                  className="h-4 flex-1 rounded-full bg-secondary [&>div]:bg-primary [&>div]:rounded-full"
                />
                <span className="text-lg font-black tabular-nums w-14 text-right text-foreground">
                  {f.progresso ?? 0}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {statusLabel[st] ?? st}
              </p>
            </CardContent>
          </Card>
        );
      })}
      </div>

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
    </div>
  );
}

export default function Etapas() {
  return (
    <RequireObra>
      <EtapasContent />
    </RequireObra>
  );
}
