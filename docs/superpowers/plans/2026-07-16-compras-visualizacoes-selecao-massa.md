# Compras — visualizações (cards/lista/tabela) e seleção em massa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 3 modos de visualização (Cards/Lista/Tabela) e seleção em massa com ação "Marcar como comprado" à página de Compras de uma obra.

**Architecture:** Extrair componentes de apresentação do `src/pages/Compras.tsx` monolítico (537 linhas, sem componentes filhos hoje), mantendo queries/mutations/estado de seleção centralizados no componente pai `ComprasContent`, que passa dados e handlers para os componentes filhos via props. A lógica de seleção (toggle/prune/partition de resultados) fica isolada em funções puras testáveis, separadas da árvore de componentes React.

**Tech Stack:** React + TypeScript, TanStack Query, Supabase JS client (`supabase.rpc`), shadcn/ui (`Table`, `ToggleGroup`, `Checkbox`), lucide-react, Vitest (testes unitários das funções puras).

## Global Constraints

- Toda copy de UI (rótulos, toasts, mensagens) em português do Brasil (pt-BR).
- Sem `any` em código novo — usar tipos explícitos (`Compra = Tables<"compras"> & {...}`).
- Erros sempre visíveis ao usuário (toast), nunca falha silenciosa — inclusive falhas parciais na ação em massa.
- YAGNI: sem exclusão em massa, sem persistência de `viewMode` entre sessões, sem endpoint de lote no banco (a RPC `marcar_comprado` só aceita 1 id — a ação em massa dispara N chamadas em paralelo via `Promise.allSettled`).
- Só itens com `status === "pendente"` são selecionáveis/marcáveis; itens comprados/cancelados nunca mostram checkbox.
- Seguir o padrão de mutations já existente em `Compras.tsx` (TanStack Query + `supabase` client, `queryClient.invalidateQueries`).
- Este repositório não tem componentes de teste de UI (`.test.tsx`) para páginas — só há testes unitários puros (`src/lib/etapaPadrao.test.ts`). Não introduzir esse precedente aqui; verificar componentes visuais manualmente (Task 9), e reservar Vitest para a lógica pura extraída (Task 1).
- Comando de typecheck: `npx tsc --noEmit -p tsconfig.app.json`. Baseline atual (antes desta mudança) tem exatamente 2 erros pré-existentes, sem relação com Compras: `src/pages/Configuracoes.tsx(416,25)` e `src/pages/Etapas.tsx(159,14)`. Nenhum passo deste plano deve introduzir novos erros além desses dois.
- Comando de testes: `npx vitest run <arquivo>`.

---

### Task 1: Funções puras de seleção (com testes)

**Files:**
- Create: `src/components/compras/selection.ts`
- Test: `src/components/compras/selection.test.ts`

**Interfaces:**
- Produces (usado pela Task 8): `toggleId(ids: Set<string>, id: string, checked: boolean): Set<string>`, `toggleAll(ids: Set<string>, targetIds: string[], checked: boolean): Set<string>`, `pruneSelection(ids: Set<string>, validIds: string[]): Set<string>`, `partitionSettled(ids: string[], results: PromiseSettledResult<unknown>[]): { succeeded: string[]; failed: string[] }`.

- [ ] **Step 1: Escrever os testes (vão falhar — módulo ainda não existe)**

Criar `src/components/compras/selection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toggleId, toggleAll, pruneSelection, partitionSettled } from "./selection";

describe("toggleId", () => {
  it("adds the id when checked is true", () => {
    const result = toggleId(new Set(["a"]), "b", true);
    expect(result).toEqual(new Set(["a", "b"]));
  });

  it("removes the id when checked is false", () => {
    const result = toggleId(new Set(["a", "b"]), "b", false);
    expect(result).toEqual(new Set(["a"]));
  });

  it("does not mutate the original set", () => {
    const original = new Set(["a"]);
    toggleId(original, "b", true);
    expect(original).toEqual(new Set(["a"]));
  });
});

describe("toggleAll", () => {
  it("adds all target ids when checked is true", () => {
    const result = toggleAll(new Set(["x"]), ["a", "b"], true);
    expect(result).toEqual(new Set(["x", "a", "b"]));
  });

  it("removes all target ids when checked is false, keeping unrelated ids", () => {
    const result = toggleAll(new Set(["x", "a", "b"]), ["a", "b"], false);
    expect(result).toEqual(new Set(["x"]));
  });

  it("returns an equivalent set when targetIds is empty", () => {
    const result = toggleAll(new Set(["a"]), [], true);
    expect(result).toEqual(new Set(["a"]));
  });
});

describe("pruneSelection", () => {
  it("removes ids that are no longer valid", () => {
    const result = pruneSelection(new Set(["a", "b", "c"]), ["a", "c"]);
    expect(result).toEqual(new Set(["a", "c"]));
  });

  it("returns the same reference when nothing is pruned", () => {
    const ids = new Set(["a", "b"]);
    const result = pruneSelection(ids, ["a", "b", "c"]);
    expect(result).toBe(ids);
  });

  it("returns a new set when something is pruned", () => {
    const ids = new Set(["a", "b"]);
    const result = pruneSelection(ids, ["a"]);
    expect(result).not.toBe(ids);
    expect(result).toEqual(new Set(["a"]));
  });
});

describe("partitionSettled", () => {
  it("puts all ids in succeeded when every promise fulfills", () => {
    const results: PromiseSettledResult<void>[] = [
      { status: "fulfilled", value: undefined },
      { status: "fulfilled", value: undefined },
    ];
    const { succeeded, failed } = partitionSettled(["a", "b"], results);
    expect(succeeded).toEqual(["a", "b"]);
    expect(failed).toEqual([]);
  });

  it("puts all ids in failed when every promise rejects", () => {
    const results: PromiseSettledResult<void>[] = [
      { status: "rejected", reason: new Error("x") },
      { status: "rejected", reason: new Error("y") },
    ];
    const { succeeded, failed } = partitionSettled(["a", "b"], results);
    expect(succeeded).toEqual([]);
    expect(failed).toEqual(["a", "b"]);
  });

  it("splits ids according to each promise's outcome, preserving order", () => {
    const results: PromiseSettledResult<void>[] = [
      { status: "fulfilled", value: undefined },
      { status: "rejected", reason: new Error("x") },
      { status: "fulfilled", value: undefined },
    ];
    const { succeeded, failed } = partitionSettled(["a", "b", "c"], results);
    expect(succeeded).toEqual(["a", "c"]);
    expect(failed).toEqual(["b"]);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/components/compras/selection.test.ts`
Expected: FAIL — `Cannot find module './selection'` (ou erro equivalente de módulo inexistente).

- [ ] **Step 3: Implementar `selection.ts`**

Criar `src/components/compras/selection.ts`:

```ts
export function toggleId(ids: Set<string>, id: string, checked: boolean): Set<string> {
  const next = new Set(ids);
  if (checked) next.add(id);
  else next.delete(id);
  return next;
}

export function toggleAll(ids: Set<string>, targetIds: string[], checked: boolean): Set<string> {
  const next = new Set(ids);
  targetIds.forEach((id) => {
    if (checked) next.add(id);
    else next.delete(id);
  });
  return next;
}

export function pruneSelection(ids: Set<string>, validIds: string[]): Set<string> {
  const valid = new Set(validIds);
  const filtered = [...ids].filter((id) => valid.has(id));
  return filtered.length === ids.size ? ids : new Set(filtered);
}

export function partitionSettled(
  ids: string[],
  results: PromiseSettledResult<unknown>[],
): { succeeded: string[]; failed: string[] } {
  const succeeded = ids.filter((_, i) => results[i]?.status === "fulfilled");
  const failed = ids.filter((_, i) => results[i]?.status === "rejected");
  return { succeeded, failed };
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/components/compras/selection.test.ts`
Expected: PASS — 12 testes passando (3 `toggleId` + 3 `toggleAll` + 3 `pruneSelection` + 3 `partitionSettled`), todos verdes.

- [ ] **Step 5: Commit**

```bash
git add src/components/compras/selection.ts src/components/compras/selection.test.ts
git commit -m "feat: funções puras de seleção em massa para Compras"
```

---

### Task 2: Tipos e constantes compartilhadas

**Files:**
- Create: `src/components/compras/types.ts`

**Interfaces:**
- Consumes: nenhum (só depende de `Tables` de `@/integrations/supabase/types`, já existente).
- Produces (usado pelas Tasks 3-8): `type Compra = Tables<"compras"> & { fornecedor_nome?: string; produto_nome?: string }`, `type ViewMode = "cards" | "lista" | "tabela"`, `interface CompraItemHandlers { onMarcarComprado, onChangeStatus, onEdit, onDelete }`, `statusColors: Record<string, string>`, `fmt(v: number | null): string`.

- [ ] **Step 1: Criar o arquivo de tipos**

Criar `src/components/compras/types.ts`:

```ts
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
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: os mesmos 2 erros pré-existentes (`Configuracoes.tsx(416,25)`, `Etapas.tsx(159,14)`), nenhum erro novo em `types.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/components/compras/types.ts
git commit -m "feat: tipos e constantes compartilhadas de Compras"
```

---

### Task 3: Componente CompraViewToggle

**Files:**
- Create: `src/components/compras/CompraViewToggle.tsx`

**Interfaces:**
- Consumes: `ViewMode` (Task 2), `ToggleGroup`/`ToggleGroupItem` de `@/components/ui/toggle-group` (já existente no projeto).
- Produces (usado pela Task 8): `CompraViewToggle({ value: ViewMode, onChange: (value: ViewMode) => void })`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/compras/CompraViewToggle.tsx`:

```tsx
import { LayoutGrid, List, Table2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ViewMode } from "./types";

export function CompraViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ViewMode)}
      className="justify-end"
    >
      <ToggleGroupItem value="cards" aria-label="Ver em cards">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="lista" aria-label="Ver em lista">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="tabela" aria-label="Ver em tabela">
        <Table2 className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: os mesmos 2 erros pré-existentes, nenhum erro novo em `CompraViewToggle.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/compras/CompraViewToggle.tsx
git commit -m "feat: toggle de visualização cards/lista/tabela em Compras"
```

---

### Task 4: Componente CompraCard

**Files:**
- Create: `src/components/compras/CompraCard.tsx`

**Interfaces:**
- Consumes: `Compra`, `CompraItemHandlers`, `statusColors`, `fmt` (Task 2).
- Produces (usado pela Task 8): `CompraCard({ compra: Compra, selected: boolean, onToggleSelected: (id: string, checked: boolean) => void, handlers: CompraItemHandlers })`.

Esta é a extração do `renderCard` atual de `src/pages/Compras.tsx:327-393`, adicionando um checkbox de seleção quando `compra.status === "pendente"`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/compras/CompraCard.tsx`:

```tsx
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
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: os mesmos 2 erros pré-existentes, nenhum erro novo em `CompraCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/compras/CompraCard.tsx
git commit -m "feat: extrai CompraCard com checkbox de seleção"
```

---

### Task 5: Componente CompraListItem

**Files:**
- Create: `src/components/compras/CompraListItem.tsx`

**Interfaces:**
- Consumes: `Compra`, `CompraItemHandlers`, `statusColors`, `fmt` (Task 2).
- Produces (usado pela Task 8): `CompraListItem({ compra: Compra, selected: boolean, onToggleSelected: (id: string, checked: boolean) => void, handlers: CompraItemHandlers })`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/compras/CompraListItem.tsx`:

```tsx
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
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: os mesmos 2 erros pré-existentes, nenhum erro novo em `CompraListItem.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/compras/CompraListItem.tsx
git commit -m "feat: adiciona visualização em lista compacta de Compras"
```

---

### Task 6: Componente CompraTable

**Files:**
- Create: `src/components/compras/CompraTable.tsx`

**Interfaces:**
- Consumes: `Compra`, `CompraItemHandlers`, `statusColors`, `fmt` (Task 2), `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` de `@/components/ui/table` (já existente).
- Produces (usado pela Task 8): `CompraTable({ compras: Compra[], selectable: boolean, selectedIds: Set<string>, onToggleSelected: (id, checked) => void, onToggleSelectAll: (checked) => void, handlers: CompraItemHandlers })`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/compras/CompraTable.tsx`:

```tsx
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
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: os mesmos 2 erros pré-existentes, nenhum erro novo em `CompraTable.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/compras/CompraTable.tsx
git commit -m "feat: adiciona visualização em tabela de Compras"
```

---

### Task 7: Componente BulkActionBar

**Files:**
- Create: `src/components/compras/BulkActionBar.tsx`

**Interfaces:**
- Consumes: nenhum tipo das tasks anteriores (props próprias).
- Produces (usado pela Task 8): `BulkActionBar({ count: number, pending: boolean, onConfirm: () => void, onCancel: () => void })`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/compras/BulkActionBar.tsx`:

```tsx
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
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: os mesmos 2 erros pré-existentes, nenhum erro novo em `BulkActionBar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/compras/BulkActionBar.tsx
git commit -m "feat: barra de ação em massa para marcar compras como compradas"
```

---

### Task 8: Integrar tudo em Compras.tsx

**Files:**
- Modify: `src/pages/Compras.tsx` (múltiplos trechos, listados abaixo)

**Interfaces:**
- Consumes: tudo produzido nas Tasks 1-7 (`toggleId`, `toggleAll`, `pruneSelection`, `partitionSettled` de `selection.ts`; `Compra`, `ViewMode`, `CompraItemHandlers`, `statusColors`, `fmt` de `types.ts`; `CompraViewToggle`, `CompraCard`, `CompraListItem`, `CompraTable`, `BulkActionBar`).
- Produces: nada (arquivo folha, é a página).

Este arquivo hoje (antes desta task) tem 537 linhas. Todas as edições abaixo devem ser feitas com o texto exato mostrado — leia o arquivo primeiro para confirmar que os trechos "antes" ainda batem (nenhuma outra task deste plano toca `Compras.tsx`).

- [ ] **Step 1: Import do `useEffect`**

Trocar em `src/pages/Compras.tsx:1`:

De:
```tsx
import { useState, useMemo } from "react";
```
Para:
```tsx
import { useState, useMemo, useEffect } from "react";
```

- [ ] **Step 2: Import do `Checkbox`**

Trocar em `src/pages/Compras.tsx:7-10`:

De:
```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```
Para:
```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
```

- [ ] **Step 3: Trocar import de ícones e importar os novos componentes/tipos/funções**

Trocar em `src/pages/Compras.tsx:23-24`:

De:
```tsx
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShoppingCart, CheckCircle2, Search, ChevronsUpDown, XCircle } from "lucide-react";
```
Para:
```tsx
import { toast } from "sonner";
import { Plus, ShoppingCart, Search, ChevronsUpDown, XCircle } from "lucide-react";
import { CompraViewToggle } from "@/components/compras/CompraViewToggle";
import { CompraCard } from "@/components/compras/CompraCard";
import { CompraListItem } from "@/components/compras/CompraListItem";
import { CompraTable } from "@/components/compras/CompraTable";
import { BulkActionBar } from "@/components/compras/BulkActionBar";
import { toggleId, toggleAll, pruneSelection, partitionSettled } from "@/components/compras/selection";
import type { Compra, ViewMode, CompraItemHandlers } from "@/components/compras/types";
```

`Pencil`, `Trash2` e `CheckCircle2` deixam de ser usados diretamente neste arquivo (passam a viver dentro de `CompraCard`/`CompraListItem`/`CompraTable`) — por isso saem da lista.

- [ ] **Step 4: Remover `statusColors`/`statusLabel`/`fmt` locais (agora vivem em `types.ts`)**

Trocar em `src/pages/Compras.tsx:26-41`:

De:
```tsx
const statusColors: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  comprado: "bg-success/10 text-success",
  cancelado: "bg-destructive/10 text-destructive",
};

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  comprado: "Comprado",
  cancelado: "Cancelado",
};

const fmt = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ── Searchable Dropdown ── */
```
Para:
```tsx
/* ── Searchable Dropdown ── */
```

- [ ] **Step 5: Adicionar estado de visualização e seleção**

Trocar em `src/pages/Compras.tsx` (dentro de `ComprasContent`, logo após o `useState` de `form`):

De:
```tsx
  const [form, setForm] = useState({
    fornecedor_id: "",
    produto_id: "",
    descricao: "",
    quantidade: "1",
    valor_unitario: "",
    observacao: "",
  });
```
Para:
```tsx
  const [form, setForm] = useState({
    fornecedor_id: "",
    produto_id: "",
    descricao: "",
    quantidade: "1",
    valor_unitario: "",
    observacao: "",
  });
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
```

- [ ] **Step 6: Tipar `openEdit` com `Compra` em vez de `any`**

Trocar:
```tsx
  const openEdit = (c: any) => {
```
Para:
```tsx
  const openEdit = (c: Compra) => {
```

- [ ] **Step 7: Substituir `empty`/`pendentes`/`comprados`/`renderCard` pela lógica de seleção e pelas novas visualizações**

Trocar o bloco inteiro (originalmente linhas 323-393 — de `const empty = ...` até o fechamento de `renderCard`):

De:
```tsx
  const empty = !isLoading && !compras?.length;
  const pendentes = compras?.filter((c) => c.status === "pendente") ?? [];
  const comprados = compras?.filter((c) => c.status !== "pendente") ?? [];

  const renderCard = (c: any) => {
    const fornNome = fornecedores.find((f) => f.id === c.fornecedor_id)?.nome;
    const prodNome = produtos.find((p) => p.id === c.produto_id)?.nome;
    return (
      <Card key={c.id} className="shadow-sm">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-foreground truncate">
                {prodNome || c.descricao || "Compra"}
              </p>
              {fornNome && (
                <p className="text-sm text-muted-foreground">{fornNome}</p>
              )}
            </div>
            {/* Status dropdown */}
            <select
              value={c.status}
              onChange={(e) => changeStatus.mutate({ id: c.id, status: e.target.value })}
              className={`text-xs font-semibold rounded-full px-3 py-1 border-0 appearance-none cursor-pointer ${statusColors[c.status] ?? "bg-muted"}`}
            >
              <option value="pendente">Pendente</option>
              <option value="comprado">Comprado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {c.quantidade}x {c.valor_unitario ? fmt(c.valor_unitario) : "—"}
            </span>
            {c.valor_total ? (
              <span className="font-bold text-foreground">{fmt(c.valor_total)}</span>
            ) : null}
          </div>

          {c.observacao && (
            <p className="text-sm text-muted-foreground">{c.observacao}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            {c.status === "pendente" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => marcarComprado.mutate(c.id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar comprado
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => del.mutate(c.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
```

Para:
```tsx
  const empty = !isLoading && !compras?.length;

  const comprasEnriched: Compra[] = useMemo(() => {
    return (compras ?? []).map((c) => ({
      ...c,
      fornecedor_nome: fornecedores.find((f) => f.id === c.fornecedor_id)?.nome,
      produto_nome: produtos.find((p) => p.id === c.produto_id)?.nome,
    }));
  }, [compras, fornecedores, produtos]);

  const pendentes = useMemo(
    () => comprasEnriched.filter((c) => c.status === "pendente"),
    [comprasEnriched],
  );
  const comprados = useMemo(
    () => comprasEnriched.filter((c) => c.status !== "pendente"),
    [comprasEnriched],
  );

  useEffect(() => {
    setSelectedIds((prev) => pruneSelection(prev, pendentes.map((c) => c.id)));
  }, [pendentes]);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => toggleId(prev, id, checked));
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => toggleAll(prev, pendentes.map((c) => c.id), checked));
  };

  const allPendentesSelected =
    pendentes.length > 0 && pendentes.every((c) => selectedIds.has(c.id));

  const handleBulkMarcarComprado = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkPending(true);
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const { error } = await supabase.rpc("marcar_comprado", { p_compra_id: id } as any);
        if (error) throw error;
      }),
    );
    setBulkPending(false);

    const { succeeded, failed } = partitionSettled(ids, results);

    queryClient.invalidateQueries({ queryKey: ["compras", obraId] });
    queryClient.invalidateQueries({ queryKey: ["financeiro"] });

    if (succeeded.length > 0) {
      toast.success(
        succeeded.length === 1
          ? "Compra marcada como comprada!"
          : `${succeeded.length} compras marcadas como compradas!`,
      );
    }
    if (failed.length > 0) {
      toast.error(
        failed.length === 1
          ? "1 compra não pôde ser marcada como comprada."
          : `${failed.length} compras não puderam ser marcadas como compradas.`,
      );
    }

    setSelectedIds(new Set(failed));
  };

  const itemHandlers: CompraItemHandlers = {
    onMarcarComprado: (id) => marcarComprado.mutate(id),
    onChangeStatus: (id, status) => changeStatus.mutate({ id, status }),
    onEdit: openEdit,
    onDelete: (id) => del.mutate(id),
  };

  const renderSection = (items: Compra[], selectable: boolean) => {
    if (viewMode === "tabela") {
      return (
        <CompraTable
          compras={items}
          selectable={selectable}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          handlers={itemHandlers}
        />
      );
    }
    if (viewMode === "lista") {
      return (
        <div className="space-y-2">
          {items.map((c) => (
            <CompraListItem
              key={c.id}
              compra={c}
              selected={selectedIds.has(c.id)}
              onToggleSelected={toggleSelected}
              handlers={itemHandlers}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((c) => (
          <CompraCard
            key={c.id}
            compra={c}
            selected={selectedIds.has(c.id)}
            onToggleSelected={toggleSelected}
            handlers={itemHandlers}
          />
        ))}
      </div>
    );
  };
```

- [ ] **Step 8: Atualizar o JSX das seções Pendentes/Comprados**

Trocar (originalmente linhas 414-434):

De:
```tsx
      {pendentes.length > 0 && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-warning flex items-center gap-2">
            🕐 Pendentes ({pendentes.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendentes.map(renderCard)}
          </div>
        </div>
      )}

      {comprados.length > 0 && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-success flex items-center gap-2">
            ✅ Comprados ({comprados.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comprados.map(renderCard)}
          </div>
        </div>
      )}
```

Para:
```tsx
      {!empty && (
        <div className="flex justify-end">
          <CompraViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      )}

      {pendentes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-warning flex items-center gap-2">
              🕐 Pendentes ({pendentes.length})
            </p>
            {viewMode !== "tabela" && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  checked={allPendentesSelected}
                  onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                />
                Selecionar todos
              </label>
            )}
          </div>
          {renderSection(pendentes, true)}
        </div>
      )}

      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          pending={bulkPending}
          onConfirm={handleBulkMarcarComprado}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}

      {comprados.length > 0 && (
        <div className="space-y-3">
          <p className="text-base font-semibold text-success flex items-center gap-2">
            ✅ Comprados ({comprados.length})
          </p>
          {renderSection(comprados, false)}
        </div>
      )}
```

- [ ] **Step 9: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: os mesmos 2 erros pré-existentes (`Configuracoes.tsx`, `Etapas.tsx`), nenhum erro novo em `Compras.tsx` ou nos componentes de `src/components/compras/`.

- [ ] **Step 10: Rodar a suíte de testes existente (regressão)**

Run: `npx vitest run`
Expected: todos os testes passam, incluindo os novos `selection.test.ts` (Task 1) e os pré-existentes (`etapaPadrao.test.ts`, `example.test.ts`).

- [ ] **Step 11: Commit**

```bash
git add src/pages/Compras.tsx
git commit -m "feat: visualizações cards/lista/tabela e seleção em massa em Compras"
```

---

### Task 9: Verificação manual end-to-end

**Files:** nenhum (só verificação, sem alterar código).

Este projeto não tem testes de UI automatizados para páginas — a verificação final é manual, via navegador, usando a skill `webapp-testing` ou o dev server diretamente. Requer login numa conta que tenha ao menos uma obra com compras cadastradas (ou criar compras de teste durante a verificação).

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev`
Expected: servidor sobe em `http://localhost:5173` (ou porta similar) sem erros no terminal.

- [ ] **Step 2: Abrir a página de Compras de uma obra com itens pendentes e comprados**

Navegar para `/obras/:id/compras` (ou o caminho equivalente da rota) logado com uma conta válida.
Expected: comportamento idêntico ao atual — grid de cards em 2 colunas, sem regressão visual, checkbox visível apenas em itens Pendentes.

- [ ] **Step 3: Alternar entre as 3 visualizações**

Clicar nos botões Cards / Lista / Tabela.
Expected: os mesmos itens aparecem nas 3 visualizações, sem duplicar nem sumir; Tabela mostra as colunas Item, Fornecedor, Qtd/Preço, Total, Status, Ações; Lista mostra uma linha compacta por item; em telas estreitas a Tabela tem scroll horizontal em vez de quebrar o layout.

- [ ] **Step 4: Selecionar itens individualmente e via "Selecionar todos"**

Marcar 2-3 checkboxes de itens Pendentes; depois clicar em "Selecionar todos" (ou no checkbox do header da tabela).
Expected: `BulkActionBar` aparece mostrando a contagem correta; itens Comprados/Cancelados nunca mostram checkbox em nenhuma visualização; trocar de visualização (Cards → Lista → Tabela) preserva a seleção.

- [ ] **Step 5: Executar "Marcar como comprado" em massa**

Com 2+ itens selecionados, clicar em "Marcar como comprado" na `BulkActionBar`.
Expected: botão mostra spinner durante a operação; toast de sucesso com a contagem certa; os itens somem da seção Pendentes e aparecem em Comprados; `BulkActionBar` desaparece (seleção limpa); ao checar a página de Financeiro da mesma obra, os lançamentos correspondentes aparecem (mesmo comportamento já existente da ação individual "Marcar comprado").

- [ ] **Step 6: Conferir "Cancelar seleção"**

Selecionar itens e clicar em "Cancelar seleção".
Expected: todos os checkboxes desmarcam, `BulkActionBar` desaparece, nenhuma mutação é disparada.

- [ ] **Step 7: Conferir que criar/editar/excluir/marcar individual continuam funcionando**

Criar uma nova compra, editar uma existente, excluir uma, e marcar uma como comprada individualmente (fora do fluxo de seleção em massa).
Expected: todos os fluxos já existentes continuam funcionando exatamente como antes desta mudança.
