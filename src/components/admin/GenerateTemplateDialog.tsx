import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wand2 } from "lucide-react";

interface GenerateTemplateDialogProps {
  onSuccess?: () => void;
}

export function GenerateTemplateDialog({ onSuccess }: GenerateTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [tipoObra, setTipoObra] = useState("");
  const [ambientes, setAmbientes] = useState<string[]>([]);
  const [descricao, setDescricao] = useState("");

  // Fetch available tipos_obra and ambientes (only while the dialog is open)
  const { data: tiposObraData } = useQuery({
    queryKey: ["catalogo_tipos_obra"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo_tipos_obra")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: ambientesData } = useQuery({
    queryKey: ["catalogo_ambientes"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo_ambientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data || [];
    },
  });

  // Generate template mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "gerar-template-ia",
        {
          body: {
            tipo_obra: tipoObra,
            ambientes: ambientes,
            descricao: descricao,
          },
        }
      );

      if (error) {
        // FunctionsHttpError hides the real response body in error.context
        if (error.context && typeof error.context.json === "function") {
          try {
            const body = await error.context.json();
            throw new Error(body?.error || error.message);
          } catch {
            throw error;
          }
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(`✨ "${data.template_data.nome}" foi criado como draft. Revise em Templates (Draft).`);
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Erro ao gerar template (detalhado):", error);
      const errorMessage = typeof error === "string" ? error : error?.message || "Erro ao gerar template";
      toast.error(errorMessage);
    },
  });

  const resetForm = () => {
    setTipoObra("");
    setAmbientes([]);
    setDescricao("");
  };

  const handleAmbienteToggle = (ambiente: string) => {
    setAmbientes((prev) =>
      prev.includes(ambiente) ? prev.filter((a) => a !== ambiente) : [...prev, ambiente]
    );
  };

  const isValid =
    tipoObra && ambientes.length > 0 && descricao.trim().length > 10;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 className="mr-2 h-4 w-4" />
          Gerar com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>✨ Gerar Template com IA</DialogTitle>
          <DialogDescription>
            Descreva seu projeto e Claude gerará um template estruturado com
            serviços, etapas e tarefas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tipo de Obra */}
          <div>
            <label className="text-sm font-medium">Tipo de Obra *</label>
            <Select value={tipoObra} onValueChange={setTipoObra}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione um tipo de obra" />
              </SelectTrigger>
              <SelectContent>
                {tiposObraData?.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.nome}>
                    {tipo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ambientes */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Ambientes * (Selecione pelo menos 1)
            </label>
            <div className="grid grid-cols-2 gap-3 p-3 border rounded">
              {ambientesData?.map((amb) => (
                <label
                  key={amb.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={ambientes.includes(amb.nome)}
                    onCheckedChange={() => handleAmbienteToggle(amb.nome)}
                  />
                  <span className="text-sm">{amb.nome}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selecionados: {ambientes.length}
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium">
              Descrição do Projeto * (min. 10 caracteres)
            </label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Reforma simples em apartamento com 3 ambientes, precisa de pintura, hidráulica, elétrica e azulejos..."
              rows={4}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {descricao.length} caracteres
            </p>
          </div>

          {/* Status */}
          {generateMutation.isPending && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              ⏳ Gerando template com Claude... (pode levar 30s)
            </div>
          )}

          {/* Error */}
          {generateMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-900">
              ❌ Erro ao gerar. Verifique se a API Key do Claude está configurada.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={generateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!isValid || generateMutation.isPending}
          >
            {generateMutation.isPending ? "Gerando..." : "Gerar Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
