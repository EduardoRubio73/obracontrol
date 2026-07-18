import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { RequireObra } from "@/components/RequireObra";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { History } from "lucide-react";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  planejamento: "bg-muted text-muted-foreground",
  "execução": "bg-primary/15 text-primary",
  "concluído": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pausado: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelado: "bg-destructive/15 text-destructive",
};

type StatusObra = Database["public"]["Enums"]["status_obra"];

const allStatuses: StatusObra[] = ["planejamento", "execução", "concluído", "pausado", "cancelado"];

const statusLabels: Record<string, string> = {
  planejamento: "Planejamento",
  "execução": "Execução",
  "concluído": "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

function StatusContent({ obraId }: { obraId: string }) {
  const queryClient = useQueryClient();
  const [statusModal, setStatusModal] = useState<{ open: boolean; status: StatusObra | "" }>({ open: false, status: "" });
  const [justificativa, setJustificativa] = useState("");

  const { data: obra } = useQuery({
    queryKey: ["obra-status", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("nome, status, justificativa_status, updated_at")
        .eq("id", obraId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: historico } = useQuery({
    queryKey: ["status-historico", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obra_status_historico")
        .select("id, status_anterior, status_novo, justificativa, created_at")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const changeStatus = useMutation({
    mutationFn: async ({ status, justificativa }: { status: StatusObra; justificativa?: string }) => {
      const statusAnterior = obra?.status ?? null;

      const { error } = await supabase.from("obras").update({
        status,
        justificativa_status: justificativa || null,
      }).eq("id", obraId);
      if (error) throw error;

      const { error: histError } = await supabase.from("obra_status_historico").insert({
        obra_id: obraId,
        status_anterior: statusAnterior,
        status_novo: status,
        justificativa: justificativa || null,
      });
      if (histError) console.error("Erro ao salvar histórico:", histError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obra-status", obraId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-obras"] });
      queryClient.invalidateQueries({ queryKey: ["obras-lista"] });
      queryClient.invalidateQueries({ queryKey: ["status-historico", obraId] });
      toast.success("Status atualizado!");
    },
  });

  const status = obra?.status ?? null;
  const justificativaAtual = obra?.justificativa_status ?? null;
  const ultimaMudanca = historico?.[0]?.created_at ?? obra?.updated_at ?? null;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto pb-28 px-1">
      <div className="pt-2 sm:pt-4">
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
          Status {obra?.nome ? <>— <span className="text-blue-600 dark:text-blue-400">{obra.nome}</span></> : ""}
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground mt-1">
          Acompanhe e altere o andamento da obra
        </p>
      </div>

      {/* Status atual */}
      <Card className="rounded-2xl">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Status atual</p>
              <Badge className={`text-sm border-0 mt-1 ${status ? statusColor[status] ?? "bg-muted" : "bg-muted"}`}>
                {status ? statusLabels[status] ?? status : "—"}
              </Badge>
            </div>
            {ultimaMudanca && (
              <p className="text-xs text-muted-foreground">
                Atualizado em{" "}
                {new Date(ultimaMudanca).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
          {justificativaAtual && (
            <p className="text-sm text-muted-foreground border-t pt-3">{justificativaAtual}</p>
          )}
        </CardContent>
      </Card>

      {/* Pills de status */}
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap gap-2">
          {allStatuses.map((s) => {
            const isActive = status === s;
            const pill = (
              <button
                key={s}
                onClick={() => {
                  if (!isActive) {
                    setJustificativa("");
                    setStatusModal({ open: true, status: s });
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                  isActive
                    ? `${statusColor[s]} border-current ring-2 ring-current/20`
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                }`}
              >
                {statusLabels[s]}
              </button>
            );

            if (isActive && justificativaAtual) {
              return (
                <Tooltip key={s}>
                  <TooltipTrigger asChild>{pill}</TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs font-medium">Justificativa:</p>
                    <p className="text-xs">{justificativaAtual}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }
            return pill;
          })}
        </div>
      </TooltipProvider>

      {/* Modal justificativa de status */}
      <Dialog open={statusModal.open} onOpenChange={(v) => !v && setStatusModal({ open: false, status: "" })}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar para {statusLabels[statusModal.status] ?? statusModal.status}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Justificativa / Observação (opcional)</label>
              <Textarea
                placeholder="Explique o motivo da alteração..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStatusModal({ open: false, status: "" })}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (statusModal.status) {
                    changeStatus.mutate({
                      status: statusModal.status,
                      justificativa: justificativa.trim(),
                    });
                  }
                  setStatusModal({ open: false, status: "" });
                }}
                disabled={changeStatus.isPending}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Histórico de Status */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico de Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(historico ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma alteração registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {(historico ?? []).map((h) => (
                <div key={h.id} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.status_anterior && (
                        <>
                          <Badge className={`text-xs border-0 ${statusColor[h.status_anterior] ?? "bg-muted"}`}>
                            {statusLabels[h.status_anterior] ?? h.status_anterior}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                        </>
                      )}
                      <Badge className={`text-xs border-0 ${statusColor[h.status_novo] ?? "bg-muted"}`}>
                        {statusLabels[h.status_novo] ?? h.status_novo}
                      </Badge>
                    </div>
                    {h.justificativa && (
                      <p className="text-sm text-muted-foreground mt-1">{h.justificativa}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(h.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Status() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireObra obraId={id} pageName="Status">
      <StatusContent obraId={id!} />
    </RequireObra>
  );
}
