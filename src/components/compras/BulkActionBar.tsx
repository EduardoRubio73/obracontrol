import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, X } from "lucide-react";

export function BulkActionBar({
  count,
  pending,
  onConfirm,
  onCancel,
}: {
  count: number;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/50 px-4 py-3">
      <span className="text-sm font-semibold text-foreground">
        {count} {count === 1 ? "selecionado" : "selecionados"}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          <X className="h-4 w-4 mr-1" /> Cancelar seleção
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-1" />
          )}
          Marcar como comprado
        </Button>
      </div>
    </div>
  );
}
