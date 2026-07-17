import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { statusColors, fmt, type Compra, type CompraItemHandlers } from "./types";

export function CompraListItem({
  compra,
  selected,
  onToggleSelected,
  handlers,
}: {
  compra: Compra;
  selected: boolean;
  onToggleSelected: (id: string, checked: boolean) => void;
  handlers: CompraItemHandlers;
}) {
  const selectable = compra.status === "pendente";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
      {selectable && (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelected(compra.id, checked === true)}
          aria-label="Selecionar compra"
        />
      )}

      <div className="flex-1 min-w-[10rem]">
        <p className="font-semibold text-foreground truncate">
          {compra.produto_nome || compra.descricao || "Compra"}
        </p>
        {compra.fornecedor_nome && (
          <p className="text-xs text-muted-foreground truncate">{compra.fornecedor_nome}</p>
        )}
      </div>

      <span className="text-sm font-bold text-foreground shrink-0">
        {compra.valor_total ? fmt(compra.valor_total) : "—"}
      </span>

      <select
        value={compra.status ?? "pendente"}
        onChange={(e) => handlers.onChangeStatus(compra.id, e.target.value)}
        className={`text-xs font-semibold rounded-full px-3 py-1 border-0 appearance-none cursor-pointer shrink-0 ${
          statusColors[compra.status ?? "pendente"] ?? "bg-muted"
        }`}
      >
        <option value="pendente">Pendente</option>
        <option value="comprado">Comprado</option>
        <option value="cancelado">Cancelado</option>
      </select>

      <div className="flex items-center gap-1 shrink-0">
        {compra.status === "pendente" && (
          <Button size="sm" variant="ghost" onClick={() => handlers.onMarcarComprado(compra.id)}>
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => handlers.onEdit(compra)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={() => handlers.onDelete(compra.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
