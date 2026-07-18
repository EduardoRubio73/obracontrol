import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireObra } from "@/components/RequireObra";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DescricaoCombobox } from "@/components/financeiro/DescricaoCombobox";
import { FileUploadPreview } from "@/components/financeiro/FileUploadPreview";

const fmt = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinanceiroContent({ obraId }: { obraId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formDefaults, setFormDefaults] = useState<Record<string, string>>({});
  const [descricaoValue, setDescricaoValue] = useState("");

  const { data: obra } = useQuery({
    queryKey: ["obra", obraId],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("nome, valor_previsto").eq("id", obraId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: transacoes, isLoading } = useQuery({
    queryKey: ["financeiro", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("*")
        .eq("obra_id", obraId)
        .order("data_transacao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalGasto =
    transacoes
      ?.filter((t) => t.tipo === "despesa")
      .reduce((a, t) => a + Number(t.valor), 0) ?? 0;

  const valorAprovado = Number(obra?.valor_previsto ?? 0);
  const disponivel = valorAprovado - totalGasto;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["financeiro", obraId] });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editId) {
        const { error } = await supabase.from("financeiro").update(values).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("financeiro").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success(editId ? "Atualizado!" : "Registrado!");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financeiro").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setFormDefaults({});
  };

  const openNew = () => {
    setEditId(null);
    setFormDefaults({});
    setDescricaoValue("");
    setOpen(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setFormDefaults({
      valor: String(t.valor),
      tipo: t.tipo,
      descricao: t.descricao ?? "",
      data_transacao: t.data_transacao ?? "",
    });
    setDescricaoValue(t.descricao ?? "");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    let comprovante_url: string | null = null;

    const file = fd.get("comprovante") as File;
    if (file && file.size > 0) {
      const path = `comprovantes/${user!.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
      if (upErr) {
        toast.error("Erro no upload: " + upErr.message);
        return;
      }
      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);
      comprovante_url = urlData.publicUrl;
    }

    const payload: any = {
      valor: Number(fd.get("valor")),
      tipo: fd.get("tipo"),
      descricao: fd.get("descricao") || null,
      data_transacao: fd.get("data_transacao") || null,
    };

    if (comprovante_url) payload.comprovante_url = comprovante_url;

    if (!editId) {
      payload.obra_id = obraId;
      payload.user_id = user!.id;
    }

    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <div className="pt-2 sm:pt-4">
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
          Financeiro {obra ? <>— <span className="text-blue-600 dark:text-blue-400">{obra.nome}</span></> : ""}
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="shadow-sm border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">📋 Aprovado</p>
            <p className="text-sm sm:text-xl font-black tabular-nums text-primary truncate">
              {fmt(valorAprovado)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-2 border-destructive/20 bg-destructive/5">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">💸 Gasto</p>
            <p className="text-sm sm:text-xl font-black tabular-nums text-destructive truncate">
              {fmt(totalGasto)}
            </p>
          </CardContent>
        </Card>
        <Card className={`shadow-sm border-2 ${disponivel >= 0 ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"}`}>
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">💰 Disponível</p>
            <p className={`text-sm sm:text-xl font-black tabular-nums truncate ${disponivel >= 0 ? "text-success" : "text-destructive"}`}>
              {fmt(disponivel)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Button
        className="w-full h-14 rounded-2xl font-bold text-lg"
        onClick={openNew}
      >
        <Plus className="mr-2 h-6 w-6" />
        Adicionar lançamento
      </Button>

      {transacoes?.map((t) => {
        const isDespesa = t.tipo === "despesa";
        return (
          <Card key={t.id} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-xl tabular-nums text-foreground">
                  {isDespesa ? "−" : "+"} {fmt(t.valor)}
                </p>
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    isDespesa
                      ? "bg-destructive/10 text-destructive"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {isDespesa ? "Saída" : "Entrada"}
                </span>
              </div>
              <p className="text-base text-muted-foreground mt-2">
                {t.descricao ?? "—"}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {t.data_transacao && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(t.data_transacao).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  {t.comprovante_url && (
                    <a
                      href={t.comprovante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      📎 Comprovante
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => delMutation.mutate(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {!isLoading && !transacoes?.length && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="py-14 text-center text-muted-foreground">
            <p className="text-lg">Nenhum lançamento registrado</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  name="valor"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={formDefaults.valor ?? ""}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  name="tipo"
                  required
                  defaultValue={formDefaults.tipo ?? "despesa"}
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base"
                >
                  <option value="despesa">Saída</option>
                  <option value="receita">Entrada</option>
                  <option value="adiantamento">Adiantamento</option>
                  <option value="reembolso">Reembolso</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <DescricaoCombobox
                obraId={obraId}
                value={descricaoValue}
                onChange={setDescricaoValue}
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                name="data_transacao"
                type="date"
                defaultValue={formDefaults.data_transacao ?? ""}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Comprovante / NF</Label>
              <FileUploadPreview name="comprovante" />
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : editId ? "Salvar alterações" : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Financeiro() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireObra obraId={id} pageName="Financeiro">
      {id && <FinanceiroContent obraId={id} />}
    </RequireObra>
  );
}
