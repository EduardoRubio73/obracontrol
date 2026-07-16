# Grupo de Tarefas Padrão por Etapa Padrão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir vincular Tarefas Padrão a uma Etapa Padrão, para que criar uma etapa numa obra com esse nome já ofereça carregar todas as tarefas do grupo de uma vez.

**Architecture:** Uma coluna nullable `etapa_padrao_id` em `tarefas_padrao` (FK para `etapas_padrao`, `ON DELETE SET NULL`). Tela de Configurações ganha um seletor de grupo no formulário de Tarefa Padrão + contador por Etapa Padrão. Tela de criar etapa (`Etapas.tsx`) ganha um checkbox que, quando marcado, insere em lote os `fase_itens` correspondentes às tarefas do grupo logo após criar a `obra_fases`.

**Tech Stack:** React 18 + TypeScript + Vite, TanStack Query, Supabase (Postgres + RLS), shadcn/ui, Vitest (para a lógica pura extraída).

## Global Constraints

- Todo texto de UI em português do Brasil (pt-BR).
- Nunca editar `src/integrations/supabase/types.ts` à mão — sempre regenerar via CLI/MCP do Supabase após aplicar migration.
- Migrations sempre como arquivo em `supabase/migrations/`, nunca SQL solto rodado ad-hoc sem arquivo correspondente versionado.
- RLS nunca é bypassado a partir do frontend; esta mudança não adiciona política nova (só uma coluna numa tabela já protegida por RLS existente).
- Para colunas/tabelas ainda não presentes no `types.ts` gerado, seguir o padrão já usado no código (`supabase.from("tarefas_padrao" as any)`) em vez de esperar a regeneração de tipos para poder compilar — assim o código desta feature compila independente da ordem de aplicação da migration.
- `npx tsc --noEmit` e `npm run build` devem passar sem erros novos ao final de cada task que mexe em código.
- Aplicar uma migration em produção é uma ação de alto impacto — sempre pedir confirmação explícita ao usuário antes de rodar `apply_migration` (MCP) ou pedir que ele aplique via SQL Editor, nunca rodar direto sem aviso.

---

### Task 1: Migration — coluna `etapa_padrao_id` em `tarefas_padrao`

**Files:**
- Create: `supabase/migrations/20260717090000_add_etapa_padrao_id_tarefas_padrao.sql`

**Interfaces:**
- Produces: coluna `tarefas_padrao.etapa_padrao_id` (`uuid`, nullable, FK → `etapas_padrao.id`, `ON DELETE SET NULL`) — usada pelas Tasks 2 e 3.

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- Vincula opcionalmente uma Tarefa Padrão a uma Etapa Padrão (grupo).
-- Permite carregar todas as tarefas do grupo de uma vez ao criar uma etapa
-- numa obra com o mesmo nome padrão. ON DELETE SET NULL: excluir a etapa
-- padrão desvincula as tarefas em vez de apagá-las.
ALTER TABLE public.tarefas_padrao
  ADD COLUMN etapa_padrao_id uuid REFERENCES public.etapas_padrao(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tarefas_padrao_etapa_padrao_id
  ON public.tarefas_padrao (etapa_padrao_id);
```

- [ ] **Step 2: Pedir confirmação ao usuário e aplicar a migration**

Esta etapa muda o schema do banco de produção (`xsqnkptdbabnvjcrvaob`) — **pare aqui e confirme com o usuário** antes de aplicar. Duas formas de aplicar, dependendo do que estiver disponível na sessão:
- Se o MCP do Supabase estiver conectado a este projeto: usar a tool de aplicar migration com o SQL acima.
- Caso contrário: pedir para o usuário rodar o conteúdo do arquivo no SQL Editor do Supabase (mesmo fluxo já usado para a migration `20260716132938_fix_portal_publico_seguranca.sql`).

Confirmar com `SELECT column_name FROM information_schema.columns WHERE table_name = 'tarefas_padrao' AND column_name = 'etapa_padrao_id';` (deve retornar 1 linha) antes de prosseguir para a Task 2.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260717090000_add_etapa_padrao_id_tarefas_padrao.sql
git commit -m "feat: adicionar etapa_padrao_id em tarefas_padrao (grupo de tarefas por etapa)"
```

---

### Task 2: Lógica pura de correspondência de nome (com teste)

**Files:**
- Create: `src/lib/etapaPadrao.ts`
- Test: `src/lib/etapaPadrao.test.ts`

**Interfaces:**
- Produces: `findEtapaPadraoPorNome(nome: string, opcoes: EtapaPadraoOption[]): EtapaPadraoOption | undefined` e o tipo `EtapaPadraoOption = { id: string; nome: string }` — usados na Task 4 (`Etapas.tsx`).

- [ ] **Step 1: Escrever o teste (deve falhar — o módulo ainda não existe)**

```typescript
// src/lib/etapaPadrao.test.ts
import { describe, it, expect } from "vitest";
import { findEtapaPadraoPorNome } from "./etapaPadrao";

describe("findEtapaPadraoPorNome", () => {
  const opcoes = [
    { id: "1", nome: "Demolição" },
    { id: "2", nome: "Fundação" },
  ];

  it("encontra por nome exato", () => {
    expect(findEtapaPadraoPorNome("Demolição", opcoes)?.id).toBe("1");
  });

  it("encontra ignorando maiúsculas/minúsculas e espaços nas pontas", () => {
    expect(findEtapaPadraoPorNome("  demolição  ", opcoes)?.id).toBe("1");
  });

  it("retorna undefined quando não encontra correspondência", () => {
    expect(findEtapaPadraoPorNome("Pintura", opcoes)).toBeUndefined();
  });

  it("retorna undefined para nome vazio ou só espaços", () => {
    expect(findEtapaPadraoPorNome("   ", opcoes)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/lib/etapaPadrao.test.ts`
Expected: FAIL — `Cannot find module './etapaPadrao'` ou similar.

- [ ] **Step 3: Implementar a função**

```typescript
// src/lib/etapaPadrao.ts
export interface EtapaPadraoOption {
  id: string;
  nome: string;
}

export function findEtapaPadraoPorNome(
  nome: string,
  opcoes: EtapaPadraoOption[]
): EtapaPadraoOption | undefined {
  const alvo = nome.trim().toLowerCase();
  if (!alvo) return undefined;
  return opcoes.find((o) => o.nome.trim().toLowerCase() === alvo);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/lib/etapaPadrao.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/etapaPadrao.ts src/lib/etapaPadrao.test.ts
git commit -m "feat: extrair findEtapaPadraoPorNome com testes"
```

---

### Task 3: Configurações — grupo na Tarefa Padrão + contador na Etapa Padrão

**Files:**
- Modify: `src/pages/Configuracoes.tsx`

**Interfaces:**
- Consumes: `useCrudTab(table: string)` já existente no próprio arquivo (linha ~89), que retorna `{ items, isLoading, add, update, del }`.
- Produces: nada consumido por outras tasks — mudança isolada nesta tela.

Esta task depende da coluna existir no banco (Task 1) para funcionar de ponta a ponta, mas o código compila independente disso (usa `as any` como o resto do arquivo já faz para `table as any`).

- [ ] **Step 1: Ampliar `useCrudTab`'s `add`/`update` para aceitar campos extras**

Em `src/pages/Configuracoes.tsx`, dentro de `useCrudTab` (linha ~103-133), trocar as duas mutations por:

```typescript
  const add = useMutation({
    mutationFn: async ({ nome, descricao, extra }: { nome: string; descricao?: string; extra?: Record<string, unknown> }) => {
      const dup = (items ?? []).find((i) => (i.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim());
      if (dup) throw new Error(`Já existe um item com o nome "${nome}".`);
      const { error } = await supabase.from(table as any).insert({ nome, descricao: descricao || null, user_id: user!.id, ...extra } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Adicionado!");
    },
    onError: (e: any) => {
      if (e.message?.includes("violates foreign key") || e.message?.includes("RESTRICT")) {
        toast.error("Não é possível: este item está sendo usado em outro cadastro.");
      } else toast.error(e.message);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, nome, descricao, extra }: { id: string; nome: string; descricao?: string; extra?: Record<string, unknown> }) => {
      const dup = (items ?? []).find((i) => i.id !== id && (i.nome ?? "").toLowerCase().trim() === nome.toLowerCase().trim());
      if (dup) throw new Error(`Já existe outro item com o nome "${nome}".`);
      const { error } = await supabase.from(table as any).update({ nome, descricao: descricao || null, ...extra } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, user?.id] });
      toast.success("Atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });
```

(Só adiciona o campo opcional `extra` em cada assinatura e espalha `...extra` no payload — os 4 outros usos existentes de `useCrudTab`/`CrudBody` continuam chamando sem `extra` e seguem funcionando idênticos.)

- [ ] **Step 2: Ampliar o tipo `CrudItem`**

Trocar (linha ~31):
```typescript
type CrudItem = { id: string; nome: string; descricao?: string | null };
```
por:
```typescript
type CrudItem = { id: string; nome: string; descricao?: string | null; etapa_padrao_id?: string | null };
```

- [ ] **Step 3: Criar `TarefaPadraoBody` (substitui o uso genérico de `CrudBody` para `tarefas_padrao`)**

Adicionar logo depois da função `CrudBody` (após a linha ~249):

```typescript
/* ----------------- Tarefa Padrão body (com grupo/etapa) ----------------- */
function TarefaPadraoBody() {
  const { items, isLoading, add, update, del } = useCrudTab("tarefas_padrao");
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoEtapaId, setNovoEtapaId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [editingDescricao, setEditingDescricao] = useState("");
  const [editingEtapaId, setEditingEtapaId] = useState("");

  const { data: etapasPadrao } = useQuery({
    queryKey: ["etapas_padrao-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("etapas_padrao").select("id, nome").order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const etapaNomeById = (id?: string | null) => etapasPadrao?.find((e) => e.id === id)?.nome ?? null;
  const dupName = !!items?.find((i) => (i.nome ?? "").toLowerCase().trim() === novoNome.toLowerCase().trim());

  const handleAdd = () => {
    if (!novoNome.trim() || dupName) return;
    add.mutate(
      { nome: novoNome.trim(), descricao: novaDescricao.trim(), extra: { etapa_padrao_id: novoEtapaId || null } },
      { onSuccess: () => { setNovoNome(""); setNovaDescricao(""); setNovoEtapaId(""); } }
    );
  };

  const startEdit = (item: CrudItem) => {
    setEditingId(item.id);
    setEditingNome(item.nome);
    setEditingDescricao(item.descricao ?? "");
    setEditingEtapaId(item.etapa_padrao_id ?? "");
  };
  const cancelEdit = () => { setEditingId(null); setEditingNome(""); setEditingDescricao(""); setEditingEtapaId(""); };
  const saveEdit = () => {
    if (!editingNome.trim() || !editingId) return;
    update.mutate(
      { id: editingId, nome: editingNome.trim(), descricao: editingDescricao.trim(), extra: { etapa_padrao_id: editingEtapaId || null } },
      { onSuccess: cancelEdit }
    );
  };

  const EtapaSelect = ({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger className={className}><SelectValue placeholder="Pertence à etapa (opcional)" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhuma (tarefa avulsa)</SelectItem>
        {(etapasPadrao ?? []).map((e) => (
          <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-2">
        <Input placeholder="Nova tarefa padrão..." value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        {dupName && novoNome.trim() && <p className="text-xs text-warning">⚠️ Já existe "{novoNome}"</p>}
        <Input placeholder="Descrição (opcional)" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <EtapaSelect value={novoEtapaId} onChange={setNovoEtapaId} />
        <Button onClick={handleAdd} disabled={!novoNome.trim() || dupName || add.isPending} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="space-y-1">
        {isLoading && <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>}
        {!isLoading && !items?.length && (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma tarefa padrão cadastrada.</p>
        )}
        {items?.map((item) => (
          <div key={item.id} className="flex items-start justify-between py-2 px-2 border-b last:border-0 hover:bg-muted/50 rounded-lg transition-colors">
            {editingId === item.id ? (
              <div className="flex flex-col gap-2 flex-1 mr-2">
                <Input value={editingNome} onChange={(e) => setEditingNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  className="h-9" autoFocus placeholder="Nome" />
                <Input value={editingDescricao} onChange={(e) => setEditingDescricao(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  className="h-9" placeholder="Descrição (opcional)" />
                <EtapaSelect value={editingEtapaId} onChange={setEditingEtapaId} className="h-9" />
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={saveEdit} disabled={!editingNome.trim()} className="text-primary shrink-0">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={cancelEdit} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span className="font-semibold text-sm text-foreground">{item.nome}</span>
                  {item.descricao && <p className="text-xs text-muted-foreground mt-0.5">{item.descricao}</p>}
                  {etapaNomeById(item.etapa_padrao_id) && (
                    <Badge variant="outline" className="text-xs mt-1">{etapaNomeById(item.etapa_padrao_id)}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-8 w-8">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(item.id)} disabled={del.isPending} className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Criar `EtapaPadraoBody` (substitui o uso genérico de `CrudBody` para `etapas_padrao`, com contador de tarefas)**

Adicionar logo após `TarefaPadraoBody`:

```typescript
/* ----------------- Etapa Padrão body (com contagem de tarefas do grupo) ----------------- */
function EtapaPadraoBody() {
  const { items, isLoading, add, update, del } = useCrudTab("etapas_padrao");
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [editingDescricao, setEditingDescricao] = useState("");

  const { data: contagemPorEtapa } = useQuery({
    queryKey: ["tarefas-padrao-contagem-por-etapa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas_padrao" as any)
        .select("etapa_padrao_id")
        .not("etapa_padrao_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { etapa_padrao_id: string }[]) {
        counts[row.etapa_padrao_id] = (counts[row.etapa_padrao_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  const dupName = !!items?.find((i) => (i.nome ?? "").toLowerCase().trim() === novoNome.toLowerCase().trim());

  const handleAdd = () => {
    if (!novoNome.trim() || dupName) return;
    add.mutate({ nome: novoNome.trim(), descricao: novaDescricao.trim() }, {
      onSuccess: () => { setNovoNome(""); setNovaDescricao(""); },
    });
  };

  const startEdit = (item: CrudItem) => {
    setEditingId(item.id);
    setEditingNome(item.nome);
    setEditingDescricao(item.descricao ?? "");
  };
  const cancelEdit = () => { setEditingId(null); setEditingNome(""); setEditingDescricao(""); };
  const saveEdit = () => {
    if (!editingNome.trim() || !editingId) return;
    update.mutate({ id: editingId, nome: editingNome.trim(), descricao: editingDescricao.trim() }, { onSuccess: cancelEdit });
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-2">
        <Input placeholder="Nova etapa padrão..." value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        {dupName && novoNome.trim() && <p className="text-xs text-warning">⚠️ Já existe "{novoNome}"</p>}
        <Input placeholder="Descrição (opcional)" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <Button onClick={handleAdd} disabled={!novoNome.trim() || dupName || add.isPending} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="space-y-1">
        {isLoading && <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>}
        {!isLoading && !items?.length && (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma etapa padrão cadastrada.</p>
        )}
        {items?.map((item) => (
          <div key={item.id} className="flex items-start justify-between py-2 px-2 border-b last:border-0 hover:bg-muted/50 rounded-lg transition-colors">
            {editingId === item.id ? (
              <div className="flex flex-col gap-2 flex-1 mr-2">
                <Input value={editingNome} onChange={(e) => setEditingNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  className="h-9" autoFocus placeholder="Nome" />
                <Input value={editingDescricao} onChange={(e) => setEditingDescricao(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  className="h-9" placeholder="Descrição (opcional)" />
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={saveEdit} disabled={!editingNome.trim()} className="text-primary shrink-0">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={cancelEdit} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span className="font-semibold text-sm text-foreground">{item.nome}</span>
                  {item.descricao && <p className="text-xs text-muted-foreground mt-0.5">{item.descricao}</p>}
                  {!!contagemPorEtapa?.[item.id] && (
                    <Badge variant="secondary" className="text-xs mt-1">{contagemPorEtapa[item.id]} tarefa(s)</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-8 w-8">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(item.id)} disabled={del.isPending} className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Criar os wrappers com contador no cabeçalho e usá-los na aba**

Adicionar após `EtapaPadraoBody`:

```typescript
function EtapasPadraoCollapsible() {
  const { user } = useAuth();
  const { data: items } = useQuery({
    queryKey: ["etapas_padrao", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("etapas_padrao").select("id");
      return data ?? [];
    },
  });
  return (
    <CollapsibleCard
      title="Etapas Padrão"
      icon="📋"
      tooltip="Modelos de etapas reutilizadas ao criar novas obras. O contador mostra quantas tarefas padrão já estão vinculadas a cada uma."
      count={items?.length}
    >
      <EtapaPadraoBody />
    </CollapsibleCard>
  );
}

function TarefasPadraoCollapsible() {
  const { user } = useAuth();
  const { data: items } = useQuery({
    queryKey: ["tarefas_padrao", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("tarefas_padrao").select("id");
      return data ?? [];
    },
  });
  return (
    <CollapsibleCard
      title="Tarefas Padrão"
      icon="✅"
      tooltip="Tarefas frequentes que aparecem ao adicionar itens a uma etapa. Vincule a uma etapa padrão para poder carregar todas de uma vez ao criar uma etapa com esse nome."
      count={items?.length}
    >
      <TarefaPadraoBody />
    </CollapsibleCard>
  );
}
```

Depois, trocar dentro de `<TabsContent value="etapas" ...>` (linha ~661-676):
```typescript
        <TabsContent value="etapas" className="space-y-3 mt-4">
          <EtapasPadraoCollapsible />
          <TarefasPadraoCollapsible />
        </TabsContent>
```//
(removendo os dois `<CrudCollapsible table="etapas_padrao" .../>` e `<CrudCollapsible table="tarefas_padrao" .../>` que estavam ali antes).

- [ ] **Step 6: Type-check e build**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run build`
Expected: build concluído sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Configuracoes.tsx
git commit -m "feat: permitir vincular Tarefa Padrão a uma Etapa Padrão (grupo) na tela de Configurações"
```

---

### Task 4: Etapas.tsx — checkbox de carregar tarefas do grupo ao criar etapa

**Files:**
- Modify: `src/pages/Etapas.tsx`

**Interfaces:**
- Consumes: `findEtapaPadraoPorNome` e `EtapaPadraoOption` de `src/lib/etapaPadrao.ts` (Task 2).
- Produces: nada consumido por outras tasks.

- [ ] **Step 1: Importar o helper e o `Checkbox`**

No topo do arquivo (perto da linha 8-9), adicionar:
```typescript
import { Checkbox } from "@/components/ui/checkbox";
```
E perto da linha 45 (após os imports de `@dnd-kit`), adicionar:
```typescript
import { findEtapaPadraoPorNome } from "@/lib/etapaPadrao";
```

- [ ] **Step 2: Atualizar `EtapaForm` para expor o grupo de tarefas**

Substituir a função `EtapaForm` inteira (linhas 116-174) por:

```typescript
function EtapaForm({
  initialNome = "",
  onSubmit,
  isPending,
  submitLabel = "Criar etapa",
  allowTarefasPadrao = true,
}: {
  initialNome?: string;
  onSubmit: (nome: string, isNew: boolean, tarefasParaCarregar: { id: string; nome: string }[]) => void;
  isPending: boolean;
  submitLabel?: string;
  allowTarefasPadrao?: boolean;
}) {
  const [nomeCustom, setNomeCustom] = useState(initialNome);
  const [carregarTarefas, setCarregarTarefas] = useState(true);

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
  const matchedEtapaPadrao = findEtapaPadraoPorNome(nomeCustom, etapasPadrao ?? []);

  const { data: tarefasDoGrupo } = useQuery({
    queryKey: ["tarefas-padrao-do-grupo", matchedEtapaPadrao?.id],
    enabled: allowTarefasPadrao && !!matchedEtapaPadrao,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas_padrao" as any)
        .select("id, nome")
        .eq("etapa_padrao_id", matchedEtapaPadrao!.id);
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  useEffect(() => {
    setCarregarTarefas(true);
  }, [matchedEtapaPadrao?.id]);

  const temGrupoDeTarefas = allowTarefasPadrao && (tarefasDoGrupo?.length ?? 0) > 0;

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nomeCustom.trim()) return;
    const tarefasParaCarregar = temGrupoDeTarefas && carregarTarefas ? (tarefasDoGrupo ?? []) : [];
    onSubmit(nomeCustom.trim(), isNewOption, tarefasParaCarregar);
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
      {temGrupoDeTarefas && (
        <label className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer">
          <Checkbox
            checked={carregarTarefas}
            onCheckedChange={(v) => setCarregarTarefas(!!v)}
            className="mt-0.5"
          />
          <span className="text-sm">
            Carregar as {tarefasDoGrupo!.length} tarefa(s) padrão desse grupo
          </span>
        </label>
      )}
      <Button
        type="submit"
        className="w-full h-14 rounded-2xl font-bold text-lg"
        disabled={isPending || !nomeCustom.trim()}
      >
        {isPending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Atualizar `createFase` para inserir as tarefas em lote**

Dentro de `EtapasContent`, substituir a mutation `createFase` (linhas 336-357) por:

```typescript
  const createFase = useMutation({
    mutationFn: async ({ nome, isNew, tarefasParaCarregar }: { nome: string; isNew: boolean; tarefasParaCarregar: { id: string; nome: string }[] }) => {
      if (isNew) {
        await supabase.from("etapas_padrao").insert({ nome } as any);
      }
      const { data: novaFase, error } = await supabase.from("obra_fases").insert({
        obra_id: obraId,
        nome,
        status: "pendente",
        progresso: 0,
        ordem: (fases?.length ?? 0) + 1,
      } as any).select("id").single();
      if (error) throw error;

      let tarefasCarregadas = 0;
      let tarefasErro = false;
      if (tarefasParaCarregar.length > 0) {
        const itens = tarefasParaCarregar.map((t) => ({
          fase_id: (novaFase as any).id,
          nome: t.nome,
          status: "pendente",
        }));
        const { error: itensError } = await supabase.from("fase_itens").insert(itens as any);
        if (itensError) tarefasErro = true;
        else tarefasCarregadas = tarefasParaCarregar.length;
      }

      return { tarefasCarregadas, tarefasErro };
    },
    onSuccess: ({ tarefasCarregadas, tarefasErro }) => {
      queryClient.invalidateQueries({ queryKey: ["obra-fases", obraId] });
      queryClient.invalidateQueries({ queryKey: ["etapas-padrao"] });
      if (tarefasErro) {
        toast.error("Etapa criada, mas houve um erro ao carregar as tarefas padrão.");
      } else if (tarefasCarregadas > 0) {
        toast.success(`Etapa criada com ${tarefasCarregadas} tarefa(s) padrão!`);
      } else {
        toast.success("Etapa criada!");
      }
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });
```

- [ ] **Step 4: Atualizar `handleSubmit` e os dois usos de `EtapaForm`**

Substituir (linha ~419-421):
```typescript
  const handleSubmit = (nome: string, isNew: boolean) => {
    createFase.mutate({ nome, isNew });
  };
```
por:
```typescript
  const handleSubmit = (nome: string, isNew: boolean, tarefasParaCarregar: { id: string; nome: string }[]) => {
    createFase.mutate({ nome, isNew, tarefasParaCarregar });
  };
```

No dialog de "Nova etapa" (linha ~481-488), manter `onSubmit={handleSubmit}` (já compatível).

No dialog de "Editar etapa" (linha ~490-504), adicionar `allowTarefasPadrao={false}` para não mostrar o checkbox ao editar o nome de uma etapa já criada:
```typescript
            <EtapaForm
              initialNome={editFase.nome}
              submitLabel="Salvar alterações"
              allowTarefasPadrao={false}
              onSubmit={(nome) => updateFase.mutate({ id: editFase.id, nome })}
              isPending={updateFase.isPending}
            />
```

- [ ] **Step 5: Type-check e build**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run build`
Expected: build concluído sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Etapas.tsx
git commit -m "feat: carregar tarefas padrao do grupo ao criar etapa a partir de uma etapa padrao"
```

---

### Task 5: Regenerar types.ts e verificação manual completa

**Files:**
- Modify: `src/integrations/supabase/types.ts` (via regeneração, nunca à mão)

- [ ] **Step 1: Regenerar os tipos do Supabase**

Se o MCP do Supabase estiver conectado a este projeto, usar a tool de gerar tipos TypeScript. Caso contrário, rodar localmente (requer Supabase CLI autenticado):
```bash
npx supabase gen types typescript --project-id xsqnkptdbabnvjcrvaob --schema public > src/integrations/supabase/types.ts
```
Confirmar no diff que `tarefas_padrao.Row/Insert/Update` agora incluem `etapa_padrao_id`.

- [ ] **Step 2: Type-check e build final**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 3: QA manual (roteiro da spec)**

1. Em Configurações → Etapas & Tarefas: criar uma Tarefa Padrão vinculando-a a uma Etapa Padrão existente (ex: "Demolição"); confirmar que o badge com o nome da etapa aparece na lista de tarefas, e que o contador na linha da Etapa Padrão correspondente mostra a contagem certa.
2. Editar essa tarefa e trocar o grupo; confirmar que o badge e os contadores das duas etapas (antiga e nova) atualizam.
3. Numa obra qualquer, ir em Etapas → "Nova etapa", digitar o nome exato dessa Etapa Padrão; confirmar que o checkbox "Carregar as N tarefa(s) padrão desse grupo" aparece marcado.
4. Confirmar a criação com o checkbox marcado; abrir a etapa recém-criada e confirmar que as tarefas aparecem no checklist sem precisar adicionar manualmente; toast deve dizer "Etapa criada com N tarefa(s) padrão!".
5. Repetir criando outra etapa com o mesmo nome, desta vez desmarcando o checkbox antes de confirmar; abrir a etapa e confirmar que ela foi criada vazia (sem tarefas).
6. Criar uma etapa com um nome novo (não cadastrado como padrão); confirmar que o checkbox não aparece e o fluxo é idêntico ao de antes desta feature.
7. Editar o nome de uma etapa já existente (dialog "Editar etapa") escolhendo um nome com grupo de tarefas; confirmar que o checkbox NÃO aparece nesse fluxo (edição não deve carregar tarefas).
8. Excluir a Etapa Padrão usada no teste (em Configurações); confirmar que a Tarefa Padrão vinculada não é apagada, só perde o vínculo (badge some, mas a tarefa continua na lista).

- [ ] **Step 4: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "chore: regenerar types.ts apos migration de etapa_padrao_id"
```

---

## Self-Review Notes

- **Cobertura da spec:** modelo de dados → Task 1; UI de Configurações (seletor + badge + contador) → Task 3; fluxo de criação de etapa com checkbox → Task 4; regeneração de tipos e verificação → Task 5. Lógica de correspondência de nome isolada e testada → Task 2.
- **Consistência de tipos:** `EtapaPadraoOption`/`findEtapaPadraoPorNome` (Task 2) usados exatamente com essa assinatura na Task 4. `tarefasParaCarregar: { id: string; nome: string }[]` usado de forma consistente entre `EtapaForm.onSubmit`, `handleSubmit` e `createFase.mutate` (Task 4).
- **Sem placeholders:** todos os steps têm código completo, sem "TBD" ou "similar à Task N".
