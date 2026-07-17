import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { statusColors, fmt, type Compra, type CompraItemHandlers } from "./types";

export function CompraTable({
  compras,
  selectable,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  handlers,
}: {
  compras: Compra[];
  selectable: boolean;
  selectedIds: Set<string>;
  onToggleSelected: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  handlers: CompraItemHandlers;
}) {
  const allSelected =
    selectable && compras.length > 0 && compras.every((c) => selectedIds.has(c.id));

  return (
    <div className="rounded-xl border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onToggleSelectAll(checked === true)}
                  aria-label="Selecionar todos"
                />
              </TableHead>
            )}
            <TableHead>Item</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Qtd/Preço</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {compras.map((compra) => (
            <TableRow key={compra.id}>
              {selectable && (
                <TableCell>
                  {compra.status === "pendente" && (
                    <Checkbox
                      checked={selectedIds.has(compra.id)}
                      onCheckedChange={(checked) => onToggleSelected(compra.id, checked === true)}
                      aria-label="Selecionar compra"
                    />
                  )}
                </TableCell>
              )}
              <TableCell className="font-medium">
                {compra.produto_nome || compra.descricao || "Compra"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {compra.fornecedor_nome || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {compra.quantidade}x {compra.valor_unitario ? fmt(compra.valor_unitario) : "—"}
              </TableCell>
              <TableCell className="font-bold whitespace-nowrap">
                {compra.valor_total ? fmt(compra.valor_total) : "—"}
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
