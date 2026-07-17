import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { statusColors, fmt, type Compra, type CompraItemHandlers } from "./types";

export function CompraCard({
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
    <Card className="shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {selectable && (
              <Checkbox
                className="mt-1"
                checked={selected}
                onCheckedChange={(checked) => onToggleSelected(compra.id, checked === true)}
                aria-label="Selecionar compra"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-foreground truncate">
                {compra.produto_nome || compra.descricao || "Compra"}
              </p>
              {compra.fornecedor_nome && (
                <p className="text-sm text-muted-foreground">{compra.fornecedor_nome}</p>
              )}
            </div>
          </div>
          <select
            value={compra.status ?? "pendente"}
            onChange={(e) => handlers.onChangeStatus(compra.id, e.target.value)}
            className={`text-xs font-semibold rounded-full px-3 py-1 border-0 appearance-none cursor-pointer ${
              statusColors[compra.status ?? "pendente"] ?? "bg-muted"
            }`}
          >
            <option value="pendente">Pendente</option>
            <option value="comprado">Comprado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {compra.quantidade}x {compra.valor_unitario ? fmt(compra.valor_unitario) : "—"}
          </span>
          {compra.valor_total ? (
            <span className="font-bold text-foreground">{fmt(compra.valor_total)}</span>
          ) : null}
        </div>

        {compra.observacao && (
          <p className="text-sm text-muted-foreground">{compra.observacao}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          {compra.status === "pendente" && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handlers.onMarcarComprado(compra.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar comprado
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
      </CardContent>
    </Card>
  );
}
