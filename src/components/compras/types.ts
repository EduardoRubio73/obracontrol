import type { Tables } from "@/integrations/supabase/types";

export type Compra = Tables<"compras"> & {
  fornecedor_nome?: string;
  produto_nome?: string;
};

export type ViewMode = "cards" | "lista" | "tabela";

export interface CompraItemHandlers {
  onMarcarComprado: (id: string) => void;
  onChangeStatus: (id: string, status: string) => void;
  onEdit: (compra: Compra) => void;
  onDelete: (id: string) => void;
}

export const statusColors: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  comprado: "bg-success/10 text-success",
  cancelado: "bg-destructive/10 text-destructive",
};

export const fmt = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
