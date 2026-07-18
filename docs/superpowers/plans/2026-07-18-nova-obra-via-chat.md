# Criar obra pelo chat "Assistente de Obra" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a blue "Nova" pill to the chat "Assistente de Obra" that runs the same step-by-step obra-creation flow as the `/nova-obra` wizard (nome → varredura de duplicata → tipo → complexidade → descrição → escopo IA → template → fornecedores → criação), reachable both from an existing obra's chat and from a new `/assistente` onboarding route for tenants with zero obras.

**Architecture:** A pure reducer (`criacaoObraChatFlow.ts`) drives a local state machine inside `Chat.tsx`, independent of the general-purpose `chat-assistente` LLM. Each step pushes a `ChatMessage` (existing model, extended with an optional `card` field) into the existing message list; a new `CriacaoObraCard` component renders the interactive control for the current step. All Supabase calls (Edge Functions, RPCs, table writes) reuse the exact contracts the `/nova-obra` wizard already uses — a new `useCriarObra` hook extracts the wizard's creation mutation so both surfaces share it.

**Tech Stack:** React 18 + TypeScript, TanStack Query, Supabase JS client, Vitest for the two pure-logic modules.

## Global Constraints

- Interface sempre em pt-BR (labels, toasts, mensagens do assistente).
- Nunca editar `src/integrations/supabase/types.ts` (auto-gerado) — usar os mesmos padrões de cast `as any` já existentes em `NovaObra.tsx` para tabelas/RPCs não tipadas (`obra_dossie`, `fn_criar_cotacao_com_fornecedores`).
- Nunca editar arquivos em `supabase/migrations/` manualmente.
- Nunca duplicar componente — reusar `SmartCombobox`, `Select`, `Card`, `Badge`, `Button` de `src/components/ui/*`.
- Nunca quebrar o contrato existente das Edge Functions `gerar-escopo` e `expandir-template`, nem das RPCs `fn_sugerir_top3_fornecedores` e `fn_criar_cotacao_com_fornecedores`.
- Sempre usar `sonner` (`toast.error`/`toast.success`) para erros visíveis ao usuário — nunca falha silenciosa.
- Sempre invalidar queries relacionadas após mutação (`queryClient.invalidateQueries`).
- Não introduzir a tool `criar_obra` do `chat-assistente` nesta feature — o fluxo guiado é local, não passa pela LLM.
- Não persistir rascunho parcial do fluxo de criação (perder progresso ao sair no meio é aceitável, conforme spec).

---

### Task 1: Função pura de detecção de obra similar

**Files:**
- Create: `src/lib/criarObraSimilaridade.ts`
- Test: `src/lib/criarObraSimilaridade.test.ts`

**Interfaces:**
- Produces: `normalizarNomeObra(nome: string): string`, `buscarObraSimilar(nome: string, obras: { id: string; nome: string }[]): { id: string; nome: string } | null` — usados por `Chat.tsx` (Task 5) para a varredura de duplicata.

- [ ] **Step 1: Escrever os testes (falhando)**

```ts
// src/lib/criarObraSimilaridade.test.ts
import { describe, it, expect } from "vitest";
import { normalizarNomeObra, buscarObraSimilar } from "./criarObraSimilaridade";

describe("normalizarNomeObra", () => {
  it("remove acentos, baixa a caixa e colapsa espaços", () => {
    expect(normalizarNomeObra("  Reforma Da Piscína  ")).toBe("reforma da piscina");
  });
});

describe("buscarObraSimilar", () => {
  const obras = [
    { id: "1", nome: "Reforma da Piscina" },
    { id: "2", nome: "Quadra Polesportiva" },
    { id: "3", nome: "Reforma do Telhado" },
  ];

  it("encontra obra com os mesmos tokens significativos, ignorando preposições", () => {
    const resultado = buscarObraSimilar("reforma piscina", obras);
    expect(resultado).toEqual({ id: "1", nome: "Reforma da Piscina" });
  });

  it("é insensível a acento e caixa", () => {
    const resultado = buscarObraSimilar("REFORMA DA PISCÍNA", obras);
    expect(resultado?.id).toBe("1");
  });

  it("não confunde obras com apenas uma palavra em comum", () => {
    const resultado = buscarObraSimilar("Reforma da Cozinha", obras);
    expect(resultado).toBeNull();
  });

  it("retorna null para nome sem nenhuma obra parecida", () => {
    expect(buscarObraSimilar("Muro Novo", obras)).toBeNull();
  });

  it("retorna null quando a lista de obras está vazia", () => {
    expect(buscarObraSimilar("Reforma da Piscina", [])).toBeNull();
  });

  it("em empate de score, prefere a primeira da lista (mais recente, já ordenada por created_at desc)", () => {
    const empatadas = [
      { id: "a", nome: "Portaria Norte" },
      { id: "b", nome: "Portaria Sul" },
    ];
    const resultado = buscarObraSimilar("Portaria", empatadas);
    expect(resultado?.id).toBe("a");
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm run test -- --run src/lib/criarObraSimilaridade.test.ts`
Expected: FAIL — `Cannot find module './criarObraSimilaridade'`

- [ ] **Step 3: Implementar**

```ts
// src/lib/criarObraSimilaridade.ts
const STOPWORDS = new Set(["da", "de", "do", "das", "dos", "a", "o", "e"]);

export function normalizarNomeObra(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(nome: string): string[] {
  return normalizarNomeObra(nome)
    .split(" ")
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * Compara por similaridade de tokens (Jaccard), ignorando preposições.
 * Limiar de 0.5 evita falsos positivos entre obras com só 1 palavra em comum.
 */
export function buscarObraSimilar<T extends { id: string; nome: string }>(
  nome: string,
  obras: T[]
): T | null {
  const inputTokens = new Set(tokens(nome));
  if (inputTokens.size === 0) return null;

  let melhor: { obra: T; score: number } | null = null;

  for (const obra of obras) {
    const obraTokens = new Set(tokens(obra.nome));
    if (obraTokens.size === 0) continue;

    const intersecao = [...inputTokens].filter((t) => obraTokens.has(t)).length;
    const uniao = new Set([...inputTokens, ...obraTokens]).size;
    const score = intersecao / uniao;

    if (score >= 0.5 && (!melhor || score > melhor.score)) {
      melhor = { obra, score };
    }
  }

  return melhor?.obra ?? null;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm run test -- --run src/lib/criarObraSimilaridade.test.ts`
Expected: PASS (7 testes)

- [ ] **Step 5: Commit**

```bash
git add src/lib/criarObraSimilaridade.ts src/lib/criarObraSimilaridade.test.ts
git commit -m "feat: add pure obra-similarity matcher for chat duplicate detection"
```

---

### Task 2: Reducer puro do fluxo de criação (state machine)

**Files:**
- Create: `src/lib/criarObraChatFlow.ts`
- Test: `src/lib/criarObraChatFlow.test.ts`

**Interfaces:**
- Consumes: nenhuma (módulo puro, sem dependências externas).
- Produces: tipos `Complexidade`, `EscopoIA`, `FornecedorSelecionado`, `ObraSimilar`, `CriacaoObraStep`, `CriacaoObraState`, `CriacaoObraAction`, `CriacaoObraCardData`, `ESTADO_INICIAL`, `criacaoObraReducer(state, action): CriacaoObraState`, `classificacoes` (array reaproveitado por `NovaObra.tsx` na Task 3 e por `CriacaoObraCard.tsx` na Task 6) — consumidos por `Chat.tsx` (Tasks 4-10) e `CriacaoObraCard.tsx` (Tasks 5-9).

- [ ] **Step 1: Escrever os testes (falhando)**

```ts
// src/lib/criarObraChatFlow.test.ts
import { describe, it, expect } from "vitest";
import { criacaoObraReducer, ESTADO_INICIAL, CriacaoObraState } from "./criarObraChatFlow";

describe("criacaoObraReducer", () => {
  it("iniciar ativa o fluxo e reseta para o estado inicial", () => {
    const sujo: CriacaoObraState = { ...ESTADO_INICIAL, ativo: true, nome: "lixo", step: "fornecedores" };
    const resultado = criacaoObraReducer(sujo, { type: "iniciar" });
    expect(resultado).toEqual({ ...ESTADO_INICIAL, ativo: true });
  });

  it("cancelar desativa e reseta", () => {
    const emAndamento: CriacaoObraState = { ...ESTADO_INICIAL, ativo: true, nome: "Reforma", step: "tipo" };
    const resultado = criacaoObraReducer(emAndamento, { type: "cancelar" });
    expect(resultado.ativo).toBe(false);
    expect(resultado.nome).toBe("");
  });

  it("informar_nome sem duplicata avança direto para tipo", () => {
    const resultado = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true },
      { type: "informar_nome", nome: "Reforma da Garagem", duplicata: null }
    );
    expect(resultado.step).toBe("tipo");
    expect(resultado.nome).toBe("Reforma da Garagem");
    expect(resultado.duplicata).toBeNull();
  });

  it("informar_nome com duplicata pausa no passo duplicata", () => {
    const duplicata = { id: "1", nome: "Reforma da Garagem" };
    const resultado = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true },
      { type: "informar_nome", nome: "reforma garagem", duplicata }
    );
    expect(resultado.step).toBe("duplicata");
    expect(resultado.duplicata).toEqual(duplicata);
  });

  it("ignorar_duplicata segue para tipo e limpa a duplicata", () => {
    const comDuplicata: CriacaoObraState = {
      ...ESTADO_INICIAL, ativo: true, step: "duplicata", duplicata: { id: "1", nome: "X" },
    };
    const resultado = criacaoObraReducer(comDuplicata, { type: "ignorar_duplicata" });
    expect(resultado.step).toBe("tipo");
    expect(resultado.duplicata).toBeNull();
  });

  it("informar_tipo avança para complexidade", () => {
    const resultado = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "tipo" },
      { type: "informar_tipo", tipoObra: "Reforma" }
    );
    expect(resultado.step).toBe("complexidade");
    expect(resultado.tipoObra).toBe("Reforma");
  });

  it("informar_classificacao avança para descricao", () => {
    const resultado = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "complexidade" },
      { type: "informar_classificacao", classificacao: "media" }
    );
    expect(resultado.step).toBe("descricao");
    expect(resultado.classificacao).toBe("media");
  });

  it("gerando_escopo liga carregando e limpa erro; escopo_gerado avança para escopo", () => {
    const escopo = { descricao_estruturada: "x", necessidades: [], profissional_recomendado: "técnico", alertas_seguranca: [] };
    let s = criacaoObraReducer({ ...ESTADO_INICIAL, ativo: true, step: "descricao" }, { type: "gerando_escopo" });
    expect(s.carregando).toBe(true);
    s = criacaoObraReducer(s, { type: "escopo_gerado", escopo });
    expect(s.step).toBe("escopo");
    expect(s.carregando).toBe(false);
    expect(s.escopo).toEqual(escopo);
  });

  it("escopo_falhou guarda o erro e desliga carregando sem mudar de passo", () => {
    const s = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "descricao", carregando: true },
      { type: "escopo_falhou", erro: "boom" }
    );
    expect(s.erro).toBe("boom");
    expect(s.carregando).toBe(false);
    expect(s.step).toBe("descricao");
  });

  it("voltar_para_descricao limpa o escopo e volta o passo", () => {
    const s = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "escopo", escopo: { descricao_estruturada: "x", necessidades: [], profissional_recomendado: "y", alertas_seguranca: [] } },
      { type: "voltar_para_descricao" }
    );
    expect(s.step).toBe("descricao");
    expect(s.escopo).toBeNull();
  });

  it("confirmar_escopo avança para template; confirmar_template avança para fornecedores", () => {
    let s = criacaoObraReducer({ ...ESTADO_INICIAL, ativo: true, step: "escopo" }, { type: "confirmar_escopo" });
    expect(s.step).toBe("template");
    s = criacaoObraReducer(s, { type: "confirmar_template" });
    expect(s.step).toBe("fornecedores");
  });

  it("alternar_fornecedor adiciona, remove, e respeita o limite de 3", () => {
    const f1 = { id: "1", nome: "A", categoria: null };
    const f2 = { id: "2", nome: "B", categoria: null };
    const f3 = { id: "3", nome: "C", categoria: null };
    const f4 = { id: "4", nome: "D", categoria: null };

    let s = { ...ESTADO_INICIAL, ativo: true, step: "fornecedores" as const };
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f1 });
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f2 });
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f3 });
    expect(s.fornecedoresSelecionados).toHaveLength(3);

    // 4º é ignorado (limite atingido)
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f4 });
    expect(s.fornecedoresSelecionados).toHaveLength(3);
    expect(s.fornecedoresSelecionados.find((f) => f.id === "4")).toBeUndefined();

    // remove um já selecionado
    s = criacaoObraReducer(s, { type: "alternar_fornecedor", fornecedor: f1 });
    expect(s.fornecedoresSelecionados).toHaveLength(2);
    expect(s.fornecedoresSelecionados.find((f) => f.id === "1")).toBeUndefined();
  });

  it("criando_obra -> obra_criada finaliza em sucesso com o id", () => {
    let s = criacaoObraReducer({ ...ESTADO_INICIAL, ativo: true, step: "fornecedores" }, { type: "criando_obra" });
    expect(s.step).toBe("criando");
    expect(s.carregando).toBe(true);
    s = criacaoObraReducer(s, { type: "obra_criada", obraId: "obra-1" });
    expect(s.step).toBe("sucesso");
    expect(s.novaObraId).toBe("obra-1");
    expect(s.carregando).toBe(false);
  });

  it("criacao_falhou volta para fornecedores com o erro visível", () => {
    const s = criacaoObraReducer(
      { ...ESTADO_INICIAL, ativo: true, step: "criando", carregando: true },
      { type: "criacao_falhou", erro: "falhou" }
    );
    expect(s.step).toBe("fornecedores");
    expect(s.erro).toBe("falhou");
    expect(s.carregando).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm run test -- --run src/lib/criarObraChatFlow.test.ts`
Expected: FAIL — `Cannot find module './criarObraChatFlow'`

- [ ] **Step 3: Implementar**

```ts
// src/lib/criarObraChatFlow.ts
export type Complexidade = "simples" | "media" | "complexa";

export interface EscopoIA {
  descricao_estruturada: string;
  necessidades: string[];
  profissional_recomendado: string;
  alertas_seguranca: string[];
}

export interface FornecedorSelecionado {
  id: string;
  nome: string;
  categoria: string | null;
  tipo?: string | null;
  score?: number | null;
  telefone?: string | null;
}

export interface ObraSimilar {
  id: string;
  nome: string;
}

export const classificacoes: { value: Complexidade; label: string; desc: string; color: string }[] = [
  { value: "simples", label: "Simples", desc: "Pedreiro / Empreiteiro", color: "from-emerald-400 to-emerald-500" },
  { value: "media", label: "Média", desc: "Empreiteiro + Técnico", color: "from-amber-400 to-orange-500" },
  { value: "complexa", label: "Complexa", desc: "Engenheiro / Arquiteto", color: "from-red-400 to-rose-500" },
];

export type CriacaoObraStep =
  | "nome"
  | "duplicata"
  | "tipo"
  | "complexidade"
  | "descricao"
  | "escopo"
  | "template"
  | "fornecedores"
  | "criando"
  | "sucesso";

export interface CriacaoObraState {
  ativo: boolean;
  step: CriacaoObraStep;
  nome: string;
  duplicata: ObraSimilar | null;
  tipoObra: string;
  classificacao: Complexidade;
  descricao: string;
  escopo: EscopoIA | null;
  templateSelecionado: string | null;
  fornecedoresSelecionados: FornecedorSelecionado[];
  erro: string | null;
  carregando: boolean;
  novaObraId: string | null;
}

export const ESTADO_INICIAL: CriacaoObraState = {
  ativo: false,
  step: "nome",
  nome: "",
  duplicata: null,
  tipoObra: "",
  classificacao: "simples",
  descricao: "",
  escopo: null,
  templateSelecionado: null,
  fornecedoresSelecionados: [],
  erro: null,
  carregando: false,
  novaObraId: null,
};

export type CriacaoObraAction =
  | { type: "iniciar" }
  | { type: "cancelar" }
  | { type: "informar_nome"; nome: string; duplicata: ObraSimilar | null }
  | { type: "ignorar_duplicata" }
  | { type: "informar_tipo"; tipoObra: string }
  | { type: "informar_classificacao"; classificacao: Complexidade }
  | { type: "informar_descricao"; descricao: string }
  | { type: "voltar_para_descricao" }
  | { type: "gerando_escopo" }
  | { type: "escopo_gerado"; escopo: EscopoIA }
  | { type: "escopo_falhou"; erro: string }
  | { type: "confirmar_escopo" }
  | { type: "selecionar_template"; templateId: string | null }
  | { type: "confirmar_template" }
  | { type: "definir_fornecedores_sugeridos"; fornecedores: FornecedorSelecionado[] }
  | { type: "alternar_fornecedor"; fornecedor: FornecedorSelecionado }
  | { type: "criando_obra" }
  | { type: "obra_criada"; obraId: string }
  | { type: "criacao_falhou"; erro: string };

export function criacaoObraReducer(state: CriacaoObraState, action: CriacaoObraAction): CriacaoObraState {
  switch (action.type) {
    case "iniciar":
      return { ...ESTADO_INICIAL, ativo: true };
    case "cancelar":
      return { ...ESTADO_INICIAL, ativo: false };
    case "informar_nome":
      return {
        ...state,
        nome: action.nome,
        duplicata: action.duplicata,
        step: action.duplicata ? "duplicata" : "tipo",
        erro: null,
      };
    case "ignorar_duplicata":
      return { ...state, step: "tipo", duplicata: null };
    case "informar_tipo":
      return { ...state, tipoObra: action.tipoObra, step: "complexidade" };
    case "informar_classificacao":
      return { ...state, classificacao: action.classificacao, step: "descricao" };
    case "informar_descricao":
      return { ...state, descricao: action.descricao };
    case "voltar_para_descricao":
      return { ...state, step: "descricao", escopo: null, erro: null };
    case "gerando_escopo":
      return { ...state, carregando: true, erro: null };
    case "escopo_gerado":
      return { ...state, escopo: action.escopo, step: "escopo", carregando: false };
    case "escopo_falhou":
      return { ...state, erro: action.erro, carregando: false };
    case "confirmar_escopo":
      return { ...state, step: "template" };
    case "selecionar_template":
      return { ...state, templateSelecionado: action.templateId };
    case "confirmar_template":
      return { ...state, step: "fornecedores" };
    case "definir_fornecedores_sugeridos":
      return { ...state, fornecedoresSelecionados: action.fornecedores };
    case "alternar_fornecedor": {
      const existe = state.fornecedoresSelecionados.some((f) => f.id === action.fornecedor.id);
      if (existe) {
        return {
          ...state,
          fornecedoresSelecionados: state.fornecedoresSelecionados.filter((f) => f.id !== action.fornecedor.id),
        };
      }
      if (state.fornecedoresSelecionados.length >= 3) return state;
      return { ...state, fornecedoresSelecionados: [...state.fornecedoresSelecionados, action.fornecedor] };
    }
    case "criando_obra":
      return { ...state, step: "criando", carregando: true, erro: null };
    case "obra_criada":
      return { ...state, step: "sucesso", carregando: false, novaObraId: action.obraId };
    case "criacao_falhou":
      return { ...state, erro: action.erro, carregando: false, step: "fornecedores" };
    default:
      return state;
  }
}

export type CriacaoObraCardData =
  | { kind: "duplicata"; obra: ObraSimilar }
  | { kind: "tipo" }
  | { kind: "complexidade" }
  | { kind: "escopo"; escopo: EscopoIA }
  | { kind: "escopo_erro"; mensagem: string }
  | { kind: "template" }
  | { kind: "fornecedores" }
  | { kind: "criacao_erro"; mensagem: string };
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm run test -- --run src/lib/criarObraChatFlow.test.ts`
Expected: PASS (14 testes)

- [ ] **Step 5: Commit**

```bash
git add src/lib/criarObraChatFlow.ts src/lib/criarObraChatFlow.test.ts
git commit -m "feat: add pure state machine reducer for guided obra creation"
```

---

### Task 3: Extrair `useCriarObra` e migrar `NovaObra.tsx`

**Files:**
- Create: `src/hooks/useCriarObra.ts`
- Modify: `src/pages/NovaObra.tsx:1-283` (imports, remove local `classificacoes`/`EscopoIA`, trocar mutations locais pelo hook)

**Interfaces:**
- Consumes: `Complexidade`, `EscopoIA`, `FornecedorSelecionado`, `classificacoes` de `src/lib/criarObraChatFlow.ts` (Task 2).
- Produces: `CriarObraInput` (interface), `useCriarObra(): { criarObra: UseMutationResult<string, Error, CriarObraInput>; isPending: boolean }` — consumido por `NovaObra.tsx` (este task) e por `Chat.tsx` (Task 10).

Esta task corrige também um bug latente: a mutation original invalida a query key `["obras"]`, mas `useObraAtiva` (`src/hooks/useObraAtiva.tsx:48`) usa a key `["obras-lista", user?.id]` — ou seja, a lista de obras usada por `RequireObra` e pela sidebar nunca era de fato invalidada após criar uma obra. Corrigido para `["obras-lista"]` (React Query invalida por prefixo, então cobre `["obras-lista", user.id]`). Necessário para a Task 10 funcionar (navegação para `/obras/:id/chat` logo após a criação depende de `RequireObra` enxergar a obra nova).

- [ ] **Step 1: Criar o hook**

```ts
// src/hooks/useCriarObra.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Complexidade, EscopoIA, FornecedorSelecionado } from "@/lib/criarObraChatFlow";

export interface CriarObraInput {
  nome: string;
  tipoObra: string;
  classificacao: Complexidade;
  descricao: string;
  escopo: EscopoIA | null;
  templateId: string | null;
  fornecedores: FornecedorSelecionado[];
  userId: string;
}

export function useCriarObra() {
  const queryClient = useQueryClient();

  const expandirTemplate = useMutation({
    mutationFn: async ({ obraId, templateId }: { obraId: string; templateId: string }) => {
      const { data, error } = await supabase.functions.invoke("expandir-template", {
        body: { obra_id: obraId, template_id: templateId },
      });
      if (error) throw error;
      return data;
    },
  });

  const criarObra = useMutation({
    mutationFn: async (input: CriarObraInput) => {
      const { data: obra, error: obraErr } = await (supabase.from("obras") as any)
        .insert({
          nome: input.nome,
          tipo_obra: input.tipoObra,
          classificacao: input.classificacao,
          descricao: input.escopo?.descricao_estruturada || input.descricao,
          escopo_ia: input.escopo ? JSON.stringify(input.escopo) : null,
          profissional_recomendado: input.escopo?.profissional_recomendado || null,
          user_id: input.userId,
          status: "planejamento",
        })
        .select("id")
        .single();
      if (obraErr) throw obraErr;

      const novaObraId = obra.id as string;

      await (supabase.from("obra_dossie" as any) as any).insert({
        obra_id: novaObraId,
        tipo: "obra_criada",
        titulo: "Obra criada",
        descricao: `Obra "${input.nome}" criada com classificação ${input.classificacao}`,
        dados: { tipo_obra: input.tipoObra, classificacao: input.classificacao, escopo: input.escopo, template_id: input.templateId },
      });

      if (input.templateId) {
        const result = await expandirTemplate.mutateAsync({ obraId: novaObraId, templateId: input.templateId });
        if (result) {
          await (supabase.from("obra_dossie" as any) as any).insert({
            obra_id: novaObraId,
            tipo: "template_expandido",
            titulo: "Template de catálogo aplicado",
            descricao: `${result.obraServicos} serviços, ${result.obraFases} fases, ${result.faseItens} tarefas criados`,
            dados: { template_id: input.templateId, resultado: result },
          });
        }
      }

      if (input.fornecedores.length > 0) {
        const fornIds = input.fornecedores.map((f) => f.id);
        const { data: cotacaoId, error: cotErr } = await supabase.rpc(
          "fn_criar_cotacao_com_fornecedores" as any,
          {
            p_obra_id: novaObraId,
            p_descricao: `Cotação inicial - ${input.nome}`,
            p_fornecedores_ids: fornIds,
          }
        );
        if (cotErr) throw cotErr;

        if (input.escopo?.necessidades && cotacaoId) {
          const itens = input.escopo.necessidades.map((n) => ({
            cotacao_id: cotacaoId,
            nome: n,
            quantidade: 1,
            unidade: "un",
          }));
          await supabase.from("itens_cotacao").insert(itens);
        }

        await (supabase.from("obra_dossie" as any) as any).insert({
          obra_id: novaObraId,
          tipo: "solicitacao_enviada",
          titulo: "Solicitação enviada para profissionais",
          descricao: `Enviada para ${input.fornecedores.length} profissional(is)`,
          dados: { cotacao_id: cotacaoId, fornecedor_ids: fornIds },
        });
      }

      return novaObraId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras-lista"] });
    },
  });

  return {
    criarObra,
    isPending: criarObra.isPending || expandirTemplate.isPending,
  };
}
```

- [ ] **Step 2: Migrar `NovaObra.tsx` para usar o hook**

Em `src/pages/NovaObra.tsx`:

1. Remover a interface local `EscopoIA` (linhas 40-45) e o array local `classificacoes` (linhas 47-66); importar de `@/lib/criarObraChatFlow`:

```ts
import { useCriarObra } from "@/hooks/useCriarObra";
import { classificacoes, type EscopoIA } from "@/lib/criarObraChatFlow";
```

2. Remover as mutations `expandirTemplate` (linhas 184-192) e `criarObra` (linhas 195-283) e substituir por:

```ts
const { criarObra, isPending: criandoObra } = useCriarObra();
```

3. Atualizar o `handleNext` (case `step === 6`) para chamar o hook com o input tipado, guardando o `obraId` retornado em `setObraId`:

```ts
if (step === 6) {
  if (selectedFornecedores.length < 1) {
    toast.error("Selecione pelo menos 1 fornecedor");
    return;
  }
  criarObra.mutate(
    {
      nome,
      tipoObra,
      classificacao: classificacao as Complexidade,
      descricao,
      escopo,
      templateId: selectedTemplate,
      fornecedores: selectedFornecedores,
      userId: user!.id,
    },
    {
      onSuccess: (novaObraId) => {
        setObraId(novaObraId);
        setStep(7);
      },
      onError: (e) => toast.error("Erro ao criar obra: " + (e as Error).message),
    }
  );
  return;
}
```

(Importar `type { Complexidade }` junto de `classificacoes`/`EscopoIA` no passo 1.)

4. Atualizar a barra de ação inferior (linha ~795 e ~803-812) para usar `criandoObra` no lugar de `criarObra.isPending`/`expandirTemplate.isPending`:

```tsx
disabled={!canAdvance() || gerarEscopo.isPending || criandoObra}
```

```tsx
) : criandoObra ? (
  <>
    <Loader2 className="h-5 w-5 animate-spin mr-2" />
    Criando obra...
  </>
) : (
```

(Remove o ramo `expandirTemplate.isPending` — o hook já reporta esse tempo dentro de `isPending`.)

- [ ] **Step 3: Verificação manual do wizard**

Run: `npm run dev`, navegar para `/nova-obra`, preencher os 7 passos com um template e 1 fornecedor, confirmar criação.
Expected: obra criada normalmente, tela de sucesso (passo 7) aparece, "Ver Dossiê da Obra" navega sem erro — comportamento idêntico ao anterior à refatoração.

- [ ] **Step 4: Rodar typecheck e testes**

Run: `npm run build`
Expected: build sem erros de tipo.

Run: `npm run test -- --run`
Expected: todos os testes existentes continuam passando.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCriarObra.ts src/pages/NovaObra.tsx
git commit -m "refactor: extract useCriarObra hook shared by wizard and chat flow"
```

---

### Task 4: Pill "Nova" (azul) + esqueleto do fluxo no chat

**Files:**
- Modify: `src/pages/Chat.tsx:1-478`

**Interfaces:**
- Consumes: `criacaoObraReducer`, `ESTADO_INICIAL`, `CriacaoObraAction` de `src/lib/criarObraChatFlow.ts` (Task 2).
- Produces: `ChatMessage.card?: CriacaoObraCardData` (novo campo, usado pelas Tasks 5-9), `pushMessage(partial)`, `dispatchCriacao`, `criacaoObraState` — usados pelas próximas tasks dentro do mesmo arquivo.

- [ ] **Step 1: Estender `ChatMessage` e importar o reducer**

```ts
import { useReducer } from "react";
import {
  criacaoObraReducer,
  ESTADO_INICIAL,
  type CriacaoObraCardData,
} from "@/lib/criarObraChatFlow";
```

(Adicionar `useReducer` ao import existente de `"react"` na linha 1.)

```ts
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  acoes?: { label: string; route: string }[];
  anexos?: { nome: string; url: string; tipo: string }[];
  card?: CriacaoObraCardData;
  timestamp: Date;
}
```

- [ ] **Step 2: Adicionar reducer, helper `pushMessage` e handlers de iniciar/cancelar**

Dentro de `ChatContent`, logo após a declaração de `messagesRef`:

```ts
const [criacaoObraState, dispatchCriacao] = useReducer(criacaoObraReducer, ESTADO_INICIAL);

const pushMessage = useCallback((partial: Omit<ChatMessage, "id" | "timestamp">) => {
  setMessages((prev) => [...prev, { ...partial, id: crypto.randomUUID(), timestamp: new Date() }]);
}, []);

const iniciarCriacaoObra = useCallback(() => {
  dispatchCriacao({ type: "iniciar" });
  pushMessage({ role: "assistant", content: "Vamos criar uma nova obra! Qual é o nome dela?" });
}, [pushMessage]);

const cancelarCriacaoObra = useCallback(() => {
  dispatchCriacao({ type: "cancelar" });
  pushMessage({ role: "assistant", content: "Ok, cancelei a criação da obra. Como posso ajudar?" });
}, [pushMessage]);
```

- [ ] **Step 3: Adicionar a pill "Nova" (azul) na lista de sugestões**

Substituir o bloco de renderização das sugestões (linhas 341-353) por:

```tsx
{messages.length <= 1 && !isTyping && (
  <div className="flex flex-wrap gap-2 pt-2">
    <button
      onClick={iniciarCriacaoObra}
      className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors"
    >
      Nova
    </button>
    {SUGGESTIONS.map((s) => (
      <button
        key={s.label}
        onClick={() => sendMessage(s.message)}
        className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        {s.label}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 4: Barra "Cancelar criação" visível durante o fluxo**

Logo antes do bloco `{/* Pending files preview */}` (linha ~373), adicionar:

```tsx
{criacaoObraState.ativo && (
  <div className="px-4 py-2 border-t bg-primary/5 flex items-center justify-between shrink-0">
    <span className="text-xs text-muted-foreground">Criando nova obra...</span>
    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={cancelarCriacaoObra}>
      Cancelar
    </Button>
  </div>
)}
```

- [ ] **Step 5: Verificação manual**

Run: `npm run dev`, abrir `/obras/:id/chat` de uma obra existente.
Expected: pill azul "Nova" aparece junto às demais sugestões; ao clicar, aparece a mensagem "Vamos criar uma nova obra! Qual é o nome dela?", as pills somem (mensagem passou de 1), e a barra "Criando nova obra... [Cancelar]" aparece acima do input. Clicar "Cancelar" mostra a mensagem de cancelamento e some a barra.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Chat.tsx
git commit -m "feat: add blue Nova pill and creation-flow skeleton to chat"
```

---

### Task 5: Passo Nome + varredura de duplicata

**Files:**
- Modify: `src/pages/Chat.tsx`
- Create: `src/components/chat/CriacaoObraCard.tsx`

**Interfaces:**
- Consumes: `buscarObraSimilar` (Task 1), `CriacaoObraCardData`, `CriacaoObraState` (Task 2).
- Produces: `CriacaoObraCard` component (props definidos abaixo; será estendido pelas Tasks 6-9 no mesmo arquivo, sempre com o switch completo já existente).

- [ ] **Step 1: Criar `CriacaoObraCard.tsx` com o caso "duplicata"**

```tsx
// src/components/chat/CriacaoObraCard.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CriacaoObraCardData, ObraSimilar } from "@/lib/criarObraChatFlow";

interface CriacaoObraCardProps {
  card: CriacaoObraCardData;
  ativo: boolean;
  onUsarDuplicata: (obra: ObraSimilar) => void;
  onIgnorarDuplicata: () => void;
}

export function CriacaoObraCard({ card, ativo, onUsarDuplicata, onIgnorarDuplicata }: CriacaoObraCardProps) {
  return (
    <div className={ativo ? "" : "opacity-60 pointer-events-none"}>
      {card.kind === "duplicata" && (
        <Card className="rounded-2xl mt-2">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">{card.obra.nome}</p>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-xl flex-1" onClick={() => onUsarDuplicata(card.obra)}>
                Usar essa obra
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={onIgnorarDuplicata}>
                Criar mesmo assim
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire no `Chat.tsx` — texto livre roteado para o fluxo quando `step === "nome"`**

Importar:

```ts
import { buscarObraSimilar } from "@/lib/criarObraSimilaridade";
import { CriacaoObraCard } from "@/components/chat/CriacaoObraCard";
```

Adicionar, depois de `cancelarCriacaoObra`:

```ts
const handleCriacaoObraTexto = useCallback((texto: string) => {
  const trimmed = texto.trim();
  if (!trimmed) return;

  if (criacaoObraState.step === "nome") {
    if (trimmed.length < 3) {
      pushMessage({ role: "assistant", content: "O nome precisa ter pelo menos 3 letras. Como se chama a obra?" });
      return;
    }
    pushMessage({ role: "user", content: trimmed });
    setInput("");
    const duplicata = buscarObraSimilar(trimmed, obras);
    dispatchCriacao({ type: "informar_nome", nome: trimmed, duplicata });
    if (duplicata) {
      pushMessage({
        role: "assistant",
        content: `Encontrei uma obra parecida: **${duplicata.nome}**. Quer usar essa em vez de criar uma nova?`,
        card: { kind: "duplicata", obra: duplicata },
      });
    } else {
      pushMessage({ role: "assistant", content: "Qual o tipo da obra?", card: { kind: "tipo" } });
    }
  }
}, [criacaoObraState.step, obras, pushMessage]);

const onUsarDuplicata = useCallback((obra: { id: string; nome: string }) => {
  dispatchCriacao({ type: "cancelar" });
  navigate(`/obras/${obra.id}/chat`);
}, [navigate]);

const onIgnorarDuplicata = useCallback(() => {
  dispatchCriacao({ type: "ignorar_duplicata" });
  pushMessage({ role: "assistant", content: "Sem problema! Qual o tipo da obra?", card: { kind: "tipo" } });
}, [pushMessage]);
```

Criar um `activeCardMessageId` e mantê-lo sincronizado com a última mensagem que carrega `card`:

```ts
const activeCardMessageId = [...messages].reverse().find((m) => m.card)?.id ?? null;
```

(Coloque essa linha logo antes do `return` do componente — é derivado, não precisa de `useState`/`useEffect`.)

Rotear o envio de texto: substituir `sendMessage(input, files)` em `handleSubmit` (linha 213) e o `onTranscript` do `useVoiceLoop` (linha 205) por uma função unificada:

```ts
const handleUserSubmit = useCallback((texto: string): Promise<string> => {
  if (criacaoObraState.ativo && criacaoObraState.step === "nome") {
    handleCriacaoObraTexto(texto);
    return Promise.resolve("");
  }
  return sendMessage(texto);
}, [criacaoObraState.ativo, criacaoObraState.step, handleCriacaoObraTexto, sendMessage]);
```

Atualizar `voiceLoop`:

```ts
const voiceLoop = useVoiceLoop({
  onTranscript: async (text) => {
    return await handleUserSubmit(text);
  },
});
```

Atualizar `handleSubmit`:

```ts
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (criacaoObraState.ativo && criacaoObraState.step === "nome") {
    handleCriacaoObraTexto(input);
    return;
  }
  const files = pendingFiles.length > 0 ? [...pendingFiles] : undefined;
  setPendingFiles([]);
  sendMessage(input, files);
};
```

Renderizar o card logo abaixo do conteúdo markdown de cada mensagem (dentro do `.map` de `messages`, depois do bloco `{msg.acoes && ...}`, por volta da linha 324):

```tsx
{msg.card && (
  <CriacaoObraCard
    card={msg.card}
    ativo={msg.id === activeCardMessageId}
    onUsarDuplicata={onUsarDuplicata}
    onIgnorarDuplicata={onIgnorarDuplicata}
  />
)}
```

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`. Clicar "Nova", digitar um nome igual (ou bem parecido, ex: "reforma piscina" quando já existe "reforma da piscina") ao de uma obra já existente na conta.
Expected: cartão aparece com o nome da obra encontrada e os dois botões; "Usar essa obra" navega para o chat dela; "Criar mesmo assim" segue para "Qual o tipo da obra?". Testar também um nome sem nenhuma obra parecida — deve pular direto para a pergunta de tipo.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Chat.tsx src/components/chat/CriacaoObraCard.tsx
git commit -m "feat: guided flow step 1 - nome + duplicate detection card"
```

---

### Task 6: Passos Tipo e Complexidade

**Files:**
- Modify: `src/components/chat/CriacaoObraCard.tsx`
- Modify: `src/pages/Chat.tsx`

**Interfaces:**
- Consumes: `classificacoes` (Task 2), `SmartCombobox` (`src/components/ui/smart-combobox.tsx`, já existente).
- Produces: nada novo além do already-declared `CriacaoObraCard` (estende o switch).

- [ ] **Step 1: Estender `CriacaoObraCardProps` e o switch**

```tsx
import { SmartCombobox } from "@/components/ui/smart-combobox";
import { classificacoes, type Complexidade } from "@/lib/criarObraChatFlow";

interface CriacaoObraCardProps {
  card: CriacaoObraCardData;
  ativo: boolean;
  tiposObraOptions: { value: string; label: string }[];
  onSelecionarTipo: (tipo: string) => void;
  onCriarTipo: (nome: string) => void;
  onSelecionarClassificacao: (c: Complexidade) => void;
  onUsarDuplicata: (obra: ObraSimilar) => void;
  onIgnorarDuplicata: () => void;
}
```

Adicionar dentro do `<div className={...}>`, depois do bloco `duplicata`:

```tsx
{card.kind === "tipo" && (
  <Card className="rounded-2xl mt-2">
    <CardContent className="p-4">
      <SmartCombobox
        options={tiposObraOptions}
        value=""
        onChange={onSelecionarTipo}
        onCreateNew={onCriarTipo}
        placeholder="Buscar ou selecionar tipo de obra..."
        emptyText="Nenhum tipo de obra cadastrado."
      />
    </CardContent>
  </Card>
)}

{card.kind === "complexidade" && (
  <div className="space-y-2 mt-2">
    {classificacoes.map((c) => (
      <button
        key={c.value}
        onClick={() => onSelecionarClassificacao(c.value)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-border bg-card hover:border-primary/40 transition-all text-left"
      >
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shrink-0`}>
          <span className="text-white font-bold text-sm">{c.label[0]}</span>
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">{c.label}</p>
          <p className="text-xs text-muted-foreground">{c.desc}</p>
        </div>
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 2: `Chat.tsx` — query de tipos, mutation de criação inline e handlers**

Importar e adicionar a query (reaproveita a mesma `queryKey` de `NovaObra.tsx`, cache compartilhado pelo React Query):

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
```

Dentro de `ChatContent`:

```ts
const queryClient = useQueryClient();

const { data: tiposObra } = useQuery({
  queryKey: ["tipos_obra"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tipos_obra").select("id, nome").order("nome");
    if (error) throw error;
    return data ?? [];
  },
});
const tiposObraOptions = (tiposObra ?? []).map((t) => ({ value: t.nome, label: t.nome }));

const criarTipoObra = useMutation({
  mutationFn: async (nome: string) => {
    const { data, error } = await supabase.from("tipos_obra").insert({ nome }).select().single();
    if (error) throw error;
    return data;
  },
  onSuccess: (novo: { nome: string }) => {
    queryClient.invalidateQueries({ queryKey: ["tipos_obra"] });
    onSelecionarTipo(novo.nome);
  },
  onError: (e: Error) => toast.error(e.message),
});

const onSelecionarTipo = useCallback((tipo: string) => {
  dispatchCriacao({ type: "informar_tipo", tipoObra: tipo });
  pushMessage({ role: "user", content: tipo });
  pushMessage({ role: "assistant", content: "Qual a complexidade da obra?", card: { kind: "complexidade" } });
}, [pushMessage]);

const onSelecionarClassificacao = useCallback((c: Complexidade) => {
  dispatchCriacao({ type: "informar_classificacao", classificacao: c });
  const label = classificacoes.find((x) => x.value === c)?.label ?? c;
  pushMessage({ role: "user", content: label });
  pushMessage({ role: "assistant", content: "Descreva a obra. Quanto mais detalhe, melhor será o escopo gerado pela IA." });
}, [pushMessage]);
```

(Importar `classificacoes, type Complexidade` de `@/lib/criarObraChatFlow` no topo, junto dos outros imports desse módulo já feitos na Task 4.)

Passar as novas props ao `<CriacaoObraCard>` renderizado no passo anterior:

```tsx
<CriacaoObraCard
  card={msg.card}
  ativo={msg.id === activeCardMessageId}
  tiposObraOptions={tiposObraOptions}
  onSelecionarTipo={onSelecionarTipo}
  onCriarTipo={(nome) => criarTipoObra.mutate(nome)}
  onSelecionarClassificacao={onSelecionarClassificacao}
  onUsarDuplicata={onUsarDuplicata}
  onIgnorarDuplicata={onIgnorarDuplicata}
/>
```

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`. Passar pelo fluxo até o tipo: selecionar um tipo existente (avança pergunta de complexidade), depois testar criar um tipo novo pelo combobox ("+ Criar ..."), depois escolher uma das 3 complexidades.
Expected: cada seleção aparece como bolha do usuário (nome do tipo / label da complexidade), seguida da próxima pergunta; tipo novo é criado em `tipos_obra` e aparece disponível também no wizard `/nova-obra` (mesma query key).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Chat.tsx src/components/chat/CriacaoObraCard.tsx
git commit -m "feat: guided flow steps 2-3 - tipo and complexidade"
```

---

### Task 7: Passo Descrição + Gerar Escopo com IA

**Files:**
- Modify: `src/components/chat/CriacaoObraCard.tsx`
- Modify: `src/pages/Chat.tsx`

**Interfaces:**
- Consumes: Edge Function `gerar-escopo` (contrato existente, `supabase/functions/gerar-escopo/index.ts`), `EscopoIA` (Task 2).

- [ ] **Step 1: Estender o card com "escopo" e "escopo_erro"**

```tsx
import { AlertTriangle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
```

Adicionar props:

```tsx
onConfirmarEscopo: () => void;
onEditarDescricao: () => void;
onRetryEscopo: () => void;
```

Adicionar ao switch:

```tsx
{card.kind === "escopo" && (
  <div className="space-y-2 mt-2">
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <h4 className="font-bold text-foreground text-sm mb-1">Descrição Estruturada</h4>
        <p className="text-xs text-muted-foreground whitespace-pre-line">{card.escopo.descricao_estruturada}</p>
      </CardContent>
    </Card>
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <h4 className="font-bold text-foreground text-sm mb-2">Necessidades / Materiais</h4>
        <div className="flex flex-wrap gap-1.5">
          {card.escopo.necessidades.map((n, i) => (
            <Badge key={i} variant="secondary" className="rounded-full text-xs">{n}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <h4 className="font-bold text-foreground text-sm mb-1">Profissional Recomendado</h4>
        <p className="text-sm font-semibold text-primary capitalize">{card.escopo.profissional_recomendado}</p>
      </CardContent>
    </Card>
    {card.escopo.alertas_seguranca.length > 0 && (
      <Card className="rounded-2xl border-destructive/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <h4 className="font-bold text-destructive text-sm">Alertas de Segurança</h4>
          </div>
          <ul className="space-y-0.5">
            {card.escopo.alertas_seguranca.map((a, i) => (
              <li key={i} className="text-xs text-destructive/80">• {a}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )}
    <div className="flex gap-2">
      <Button size="sm" className="rounded-xl flex-1" onClick={onConfirmarEscopo}>
        <Check className="h-4 w-4 mr-1" /> Continuar
      </Button>
      <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={onEditarDescricao}>
        Editar descrição
      </Button>
    </div>
  </div>
)}

{card.kind === "escopo_erro" && (
  <Card className="rounded-2xl border-destructive/30 mt-2">
    <CardContent className="p-4 space-y-2">
      <p className="text-sm text-destructive">{card.mensagem}</p>
      <Button size="sm" variant="outline" className="rounded-xl" onClick={onRetryEscopo}>
        Tentar novamente
      </Button>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 2: `Chat.tsx` — texto livre da descrição + chamada à Edge Function**

```ts
const gerarEscopoGuiado = useCallback(async (descricaoAtual: string) => {
  dispatchCriacao({ type: "gerando_escopo" });
  pushMessage({ role: "assistant", content: "Gerando escopo com IA... ✨" });
  try {
    const { data, error } = await supabase.functions.invoke("gerar-escopo", {
      body: { descricao: descricaoAtual, tipo_obra: criacaoObraState.tipoObra, classificacao: criacaoObraState.classificacao },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const escopo = data as EscopoIA;
    dispatchCriacao({ type: "escopo_gerado", escopo });
    pushMessage({ role: "assistant", content: "Aqui está o escopo gerado pela IA:", card: { kind: "escopo", escopo } });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro ao gerar escopo.";
    dispatchCriacao({ type: "escopo_falhou", erro: mensagem });
    pushMessage({ role: "assistant", content: `⚠️ ${mensagem}`, card: { kind: "escopo_erro", mensagem } });
  }
}, [criacaoObraState.tipoObra, criacaoObraState.classificacao, pushMessage]);

const onConfirmarEscopo = useCallback(() => {
  dispatchCriacao({ type: "confirmar_escopo" });
  pushMessage({ role: "assistant", content: "Selecione um template de serviços ou pule para criar manualmente.", card: { kind: "template" } });
}, [pushMessage]);

const onEditarDescricao = useCallback(() => {
  dispatchCriacao({ type: "voltar_para_descricao" });
  pushMessage({ role: "assistant", content: `Ok! Descreva novamente a obra (você tinha escrito: "${criacaoObraState.descricao}").` });
}, [pushMessage, criacaoObraState.descricao]);

const onRetryEscopo = useCallback(() => {
  void gerarEscopoGuiado(criacaoObraState.descricao);
}, [gerarEscopoGuiado, criacaoObraState.descricao]);
```

(Importar `type { EscopoIA }` de `@/lib/criarObraChatFlow` junto dos demais tipos.)

Atualizar `handleCriacaoObraTexto` (Task 5) adicionando o branch de `descricao` antes do fechamento da função:

```ts
if (criacaoObraState.step === "descricao") {
  if (trimmed.length < 10) {
    pushMessage({ role: "assistant", content: "Descreva com mais detalhes (pelo menos 10 caracteres) para eu gerar um bom escopo." });
    return;
  }
  pushMessage({ role: "user", content: trimmed });
  setInput("");
  dispatchCriacao({ type: "informar_descricao", descricao: trimmed });
  void gerarEscopoGuiado(trimmed);
  return;
}
```

Atualizar `handleUserSubmit`/`handleSubmit` (Task 5) para também rotear o passo `"descricao"`, não só `"nome"` — substituir os dois corpos por completo:

```ts
const emPassoDeTexto = (step: typeof criacaoObraState.step) => step === "nome" || step === "descricao";

const handleUserSubmit = useCallback((texto: string): Promise<string> => {
  if (criacaoObraState.ativo && emPassoDeTexto(criacaoObraState.step)) {
    handleCriacaoObraTexto(texto);
    return Promise.resolve("");
  }
  return sendMessage(texto);
}, [criacaoObraState.ativo, criacaoObraState.step, handleCriacaoObraTexto, sendMessage]);
```

```ts
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (criacaoObraState.ativo && emPassoDeTexto(criacaoObraState.step)) {
    handleCriacaoObraTexto(input);
    return;
  }
  const files = pendingFiles.length > 0 ? [...pendingFiles] : undefined;
  setPendingFiles([]);
  sendMessage(input, files);
};
```

Passar as 3 novas props ao `<CriacaoObraCard>`:

```tsx
onConfirmarEscopo={onConfirmarEscopo}
onEditarDescricao={onEditarDescricao}
onRetryEscopo={onRetryEscopo}
```

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`. Passar até a descrição, digitar um texto com pelo menos 10 caracteres.
Expected: mensagem "Gerando escopo com IA... ✨", depois o cartão com as 4 seções (igual ao wizard). Clicar "Editar descrição" volta para o campo de texto preservando o valor anterior na mensagem; digitar de novo gera escopo outra vez. Clicar "Continuar" avança para o cartão de template.

Para testar o erro: temporariamente derrubar a rede (DevTools offline) e confirmar que aparece o cartão de erro com "Tentar novamente" sem perder nome/tipo/complexidade já coletados.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Chat.tsx src/components/chat/CriacaoObraCard.tsx
git commit -m "feat: guided flow steps 4-5 - descricao and escopo IA"
```

---

### Task 8: Passo Template de Serviços

**Files:**
- Modify: `src/components/chat/CriacaoObraCard.tsx`
- Modify: `src/pages/Chat.tsx`

**Interfaces:**
- Consumes: query `catalogo_templates` (mesmo contrato de `NovaObra.tsx:115-126`).

- [ ] **Step 1: Estender o card com "template"**

Adicionar props:

```tsx
templates: { id: string; nome: string; descricao: string | null; catalogo_template_servicos: { count: number }[] }[] | undefined;
templateSelecionado: string | null;
onSelecionarTemplate: (id: string | null) => void;
onConfirmarTemplate: () => void;
```

```tsx
{card.kind === "template" && (
  <div className="space-y-2 mt-2">
    {templates && templates.length > 0 ? (
      templates.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelecionarTemplate(templateSelecionado === t.id ? null : t.id)}
          className={`w-full flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
            templateSelecionado === t.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">{t.nome}</p>
            {t.descricao && <p className="text-xs text-muted-foreground mt-0.5">{t.descricao}</p>}
            <Badge variant="outline" className="text-xs mt-1.5">
              {(t.catalogo_template_servicos || []).length} serviço(s)
            </Badge>
          </div>
          {templateSelecionado === t.id && <Check className="h-4 w-4 text-primary mt-1 shrink-0" />}
        </button>
      ))
    ) : (
      <p className="text-sm text-muted-foreground">Nenhum template disponível.</p>
    )}
    <p className="text-xs text-muted-foreground">
      {templateSelecionado ? "✓ Template selecionado" : "Nenhum template selecionado - criar obra manualmente"}
    </p>
    <Button size="sm" className="rounded-xl w-full" onClick={onConfirmarTemplate}>
      Continuar
    </Button>
  </div>
)}
```

- [ ] **Step 2: `Chat.tsx` — query de templates + handlers**

```ts
const { data: templates } = useQuery({
  queryKey: ["catalogo_templates"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("catalogo_templates")
      .select("id, nome, descricao, catalogo_template_servicos(count)")
      .eq("ativo", true)
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
});

const onSelecionarTemplate = useCallback((id: string | null) => {
  dispatchCriacao({ type: "selecionar_template", templateId: id });
}, []);

const onConfirmarTemplate = useCallback(() => {
  dispatchCriacao({ type: "confirmar_template" });
  const nomeTemplate = templates?.find((t) => t.id === criacaoObraState.templateSelecionado)?.nome;
  pushMessage({ role: "user", content: nomeTemplate ?? "Nenhum template" });
  void carregarSugestoesFornecedores();
}, [pushMessage, templates, criacaoObraState.templateSelecionado]);
```

(`carregarSugestoesFornecedores` é definida na Task 9 — declare esta função depois dela no arquivo real, ou adicione um `// eslint-disable-next-line @typescript-eslint/no-use-before-define` temporário; a ordem final de declaração é resolvida na Task 9.)

Passar as novas props:

```tsx
templates={templates}
templateSelecionado={criacaoObraState.templateSelecionado}
onSelecionarTemplate={onSelecionarTemplate}
onConfirmarTemplate={onConfirmarTemplate}
```

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`. No cartão de template, selecionar um (fica destacado, some ao clicar de novo — toggle), depois "Continuar".
Expected: bolha do usuário com o nome do template escolhido (ou "Nenhum template"), avança para a etapa seguinte (implementada na Task 9 — até lá, o "Continuar" pode ficar sem próxima pergunta visível; isso é esperado nesta task).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Chat.tsx src/components/chat/CriacaoObraCard.tsx
git commit -m "feat: guided flow step 6 - template de servicos"
```

---

### Task 9: Passo Fornecedores

**Files:**
- Modify: `src/components/chat/CriacaoObraCard.tsx`
- Modify: `src/pages/Chat.tsx`

**Interfaces:**
- Consumes: RPC `fn_sugerir_top3_fornecedores` e query `fornecedores` (mesmo contrato de `NovaObra.tsx:95-102, 145-163`).

- [ ] **Step 1: Estender o card com "fornecedores"**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Phone, Users, Star } from "lucide-react";
import { ALL_CATEGORIAS, isRecomendado } from "@/lib/regras-decisao";
import type { FornecedorSelecionado, Complexidade } from "@/lib/criarObraChatFlow";
```

Adicionar props:

```tsx
classificacao: Complexidade;
fornecedoresSelecionados: FornecedorSelecionado[];
allFornecedores: { id: string; nome: string; email: string; tipo: string; categoria: string | null; score: number | null; telefone: string | null }[] | undefined;
addFornecedorId: string;
onChangeAddFornecedorId: (id: string) => void;
onAdicionarFornecedor: () => void;
onAlternarFornecedor: (f: FornecedorSelecionado) => void;
onConfirmarCriacao: () => void;
```

```tsx
{card.kind === "fornecedores" && (
  <div className="space-y-2 mt-2">
    {fornecedoresSelecionados.length > 0 ? (
      fornecedoresSelecionados.map((f) => {
        const catLabel = ALL_CATEGORIAS.find((c) => c.value === f.categoria)?.label;
        return (
          <Card key={f.id} className="rounded-2xl">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-foreground text-sm truncate">{f.nome}</p>
                  {isRecomendado(f.categoria, classificacao) && (
                    <Badge className="bg-primary/20 text-primary text-[10px] border-0 shrink-0">
                      <Star className="h-2.5 w-2.5 mr-0.5" /> IA
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {catLabel && <span className="text-[11px] text-muted-foreground">{catLabel}</span>}
                  {f.telefone && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                      <Phone className="h-2.5 w-2.5" /> {f.telefone}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => onAlternarFornecedor(f)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        );
      })
    ) : (
      <p className="text-sm text-muted-foreground">Nenhum fornecedor selecionado.</p>
    )}

    {fornecedoresSelecionados.length < 3 && allFornecedores && allFornecedores.length > 0 && (
      <div className="flex gap-2">
        <Select value={addFornecedorId} onValueChange={onChangeAddFornecedorId}>
          <SelectTrigger className="flex-1 h-9 rounded-xl">
            <SelectValue placeholder="Adicionar fornecedor..." />
          </SelectTrigger>
          <SelectContent>
            {allFornecedores
              .filter((f) => !fornecedoresSelecionados.some((s) => s.id === f.id))
              .map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome} {f.categoria ? `(${ALL_CATEGORIAS.find((c) => c.value === f.categoria)?.label || f.categoria})` : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={onAdicionarFornecedor} disabled={!addFornecedorId}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    )}

    <p className="text-xs text-muted-foreground">
      {fornecedoresSelecionados.length} de 3 selecionado{fornecedoresSelecionados.length !== 1 ? "s" : ""} — você pode enviar para até 3
    </p>

    <Button size="sm" className="rounded-xl w-full" onClick={onConfirmarCriacao} disabled={fornecedoresSelecionados.length < 1}>
      Criar Obra
    </Button>
  </div>
)}

{card.kind === "criacao_erro" && (
  <Card className="rounded-2xl border-destructive/30 mt-2">
    <CardContent className="p-4 space-y-2">
      <p className="text-sm text-destructive">{card.mensagem}</p>
      <Button size="sm" variant="outline" className="rounded-xl" onClick={onConfirmarCriacao}>
        Tentar novamente
      </Button>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 2: `Chat.tsx` — fornecedores, sugestão e criação final**

```ts
import { useCriarObra } from "@/hooks/useCriarObra";

const { data: allFornecedores } = useQuery({
  queryKey: ["fornecedores-lista"],
  queryFn: async () => {
    const { data, error } = await supabase.from("fornecedores").select("id, nome, email, tipo, categoria, score, telefone").eq("status", "ativo");
    if (error) throw error;
    return data;
  },
});
const [addFornecedorId, setAddFornecedorId] = useState("");
const { criarObra, isPending: criandoObraGuiada } = useCriarObra();

const carregarSugestoesFornecedores = useCallback(async () => {
  const { data } = await supabase.rpc("fn_sugerir_top3_fornecedores", { p_complexidade: criacaoObraState.classificacao });
  let sugeridos: FornecedorSelecionado[] = [];
  if (data && data.length > 0) {
    sugeridos = data.map((s: any) => {
      const full = allFornecedores?.find((f) => f.id === s.id);
      return {
        id: s.id, nome: s.nome, categoria: s.categoria || null,
        tipo: full?.tipo || null, score: full?.score || null, telefone: full?.telefone || null,
      };
    });
  }
  dispatchCriacao({ type: "definir_fornecedores_sugeridos", fornecedores: sugeridos });
  pushMessage({ role: "assistant", content: "Selecionamos os melhores profissionais para sua obra. Escolha até 3:", card: { kind: "fornecedores" } });
}, [criacaoObraState.classificacao, allFornecedores, pushMessage]);

const onAlternarFornecedor = useCallback((f: FornecedorSelecionado) => {
  dispatchCriacao({ type: "alternar_fornecedor", fornecedor: f });
}, []);

const onAdicionarFornecedor = useCallback(() => {
  if (!addFornecedorId) return;
  const forn = allFornecedores?.find((f) => f.id === addFornecedorId);
  if (!forn) return;
  dispatchCriacao({
    type: "alternar_fornecedor",
    fornecedor: { id: forn.id, nome: forn.nome, categoria: forn.categoria || null, tipo: forn.tipo, score: forn.score, telefone: forn.telefone },
  });
  setAddFornecedorId("");
}, [addFornecedorId, allFornecedores]);

const executarCriacaoObra = useCallback(async () => {
  if (criacaoObraState.fornecedoresSelecionados.length < 1 || !user) return;
  dispatchCriacao({ type: "criando_obra" });
  pushMessage({ role: "assistant", content: "Criando obra... 🏗️" });
  try {
    const novaObraId = await criarObra.mutateAsync({
      nome: criacaoObraState.nome,
      tipoObra: criacaoObraState.tipoObra,
      classificacao: criacaoObraState.classificacao,
      descricao: criacaoObraState.descricao,
      escopo: criacaoObraState.escopo,
      templateId: criacaoObraState.templateSelecionado,
      fornecedores: criacaoObraState.fornecedoresSelecionados,
      userId: user.id,
    });
    dispatchCriacao({ type: "obra_criada", obraId: novaObraId });
    navigate(`/obras/${novaObraId}/chat`, {
      state: {
        obraCriada: { nome: criacaoObraState.nome, fornecedoresCount: criacaoObraState.fornecedoresSelecionados.length },
      },
    });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro ao criar obra.";
    dispatchCriacao({ type: "criacao_falhou", erro: mensagem });
    pushMessage({ role: "assistant", content: `⚠️ ${mensagem}`, card: { kind: "criacao_erro", mensagem } });
  }
}, [criacaoObraState, user, criarObra, navigate, pushMessage]);
```

Mover a definição de `onConfirmarTemplate` (Task 8) para depois de `carregarSugestoesFornecedores` neste arquivo (resolve o forward-reference deixado pendente na Task 8), sem alterar seu corpo.

Passar as novas props ao `<CriacaoObraCard>`:

```tsx
classificacao={criacaoObraState.classificacao}
fornecedoresSelecionados={criacaoObraState.fornecedoresSelecionados}
allFornecedores={allFornecedores}
addFornecedorId={addFornecedorId}
onChangeAddFornecedorId={setAddFornecedorId}
onAdicionarFornecedor={onAdicionarFornecedor}
onAlternarFornecedor={onAlternarFornecedor}
onConfirmarCriacao={executarCriacaoObra}
```

- [ ] **Step 3: Verificação manual — fluxo completo ponta a ponta**

Run: `npm run dev`. Repetir o fluxo inteiro desde "Nova" até o fim: nome novo (sem duplicata) → tipo → complexidade → descrição → escopo → template → selecionar 1-2 fornecedores sugeridos (ou adicionar outro pela busca) → "Criar Obra".
Expected: mensagem "Criando obra... 🏗️", depois navegação automática para `/obras/{novaObraId}/chat`, cuja mensagem de boas-vindas mostra "Obra criada com sucesso! 🎉" com o nome correto e, se houver fornecedores, "Enviado para N profissional(is)". Conferir em `/obras` que a nova obra aparece na lista (confirma o fix da query key da Task 3) e que a cotação foi criada (tela Cotações) quando havia fornecedores.

Testar também o caminho de erro: com 1 fornecedor selecionado, forçar falha (ex.: interceptar a RPC no DevTools Network e abortá-la) e confirmar que aparece o cartão de erro com "Tentar novamente", sem perder a seleção de fornecedores.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Chat.tsx src/components/chat/CriacaoObraCard.tsx
git commit -m "feat: guided flow steps 7-8 - fornecedores and criacao final"
```

---

### Task 10: Onboarding sem obra — rota `/assistente`

**Files:**
- Modify: `src/pages/Chat.tsx` (exportar `ChatContent`, aceitar `obraId: string | null`)
- Create: `src/pages/Assistente.tsx`
- Modify: `src/App.tsx:34, 110-134`
- Modify: `src/components/LegacyObraRedirect.tsx`
- Modify: `src/components/AppSidebar.tsx`

**Interfaces:**
- Consumes: `ChatContent` (Task 4-9, agora exportado com `obraId` opcional).
- Produces: rota `/assistente`, item de sidebar condicional.

- [ ] **Step 1: `Chat.tsx` — `obraId` aceita `null` e exporta `ChatContent`**

Trocar a assinatura:

```ts
export function ChatContent({ obraId }: { obraId: string | null }) {
```

Ajustar `obraAtiva`:

```ts
const obraAtiva = obraId ? obras.find((o) => o.id === obraId) ?? null : null;
```

Ajustar o `useEffect` de boas-vindas (linhas 60-78) para tratar `obraId === null` e o estado de navegação `obraCriada` vindo da Task 9:

```ts
const location = useLocation();

useEffect(() => {
  const criada = (location.state as { obraCriada?: { nome: string; fornecedoresCount: number } } | null)?.obraCriada;

  if (obraId === null) {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Olá! 👋 Sou seu assistente de obra.\n\nAinda não vejo nenhuma obra sua. Quer começar uma agora?",
        timestamp: new Date(),
      },
    ]);
    setPendingFiles([]);
    return;
  }

  if (criada) {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Obra criada com sucesso! 🎉\n\n"${criada.nome}" está pronta para acompanhamento.${
          criada.fornecedoresCount > 0 ? `\n\nEnviado para ${criada.fornecedoresCount} profissional(is).` : ""
        }\n\nComo posso te ajudar agora?`,
        acoes: [{ label: "Ver Dossiê da Obra", route: `/obras/${obraId}/dossie` }],
        timestamp: new Date(),
      },
    ]);
    setPendingFiles([]);
    return;
  }

  const outrasObras = obras.filter((o) => o.id !== obraId);
  setMessages([
    {
      id: "welcome",
      role: "assistant",
      content: obraAtiva
        ? `Olá! 👋 Sou seu assistente de obra.\n\nEstou te ajudando com a obra **${obraAtiva.nome}**.${outrasObras.length > 0 ? " É essa obra que você quer gerenciar?" : ""}\n\nComo posso te ajudar?`
        : `Olá! 👋 Sou seu assistente de obra.\n\nComo posso te ajudar?`,
      acoes: outrasObras.length > 0
        ? outrasObras.map((o) => ({ label: `Trocar para "${o.nome}"`, route: `/obras/${o.id}/chat` }))
        : undefined,
      timestamp: new Date(),
    },
  ]);
  setPendingFiles([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [obraId, obras.length, location.state]);
```

Importar `useLocation` de `react-router-dom` (linha 2, junto de `useNavigate, useParams`).

Ocultar o anexo de arquivo e o input quando não há obra e o fluxo de criação está inativo. Adicionar, no topo do componente:

```ts
const semObraEFluxoInativo = obraId === null && !criacaoObraState.ativo;
```

No botão de anexo (linha ~409-418), envolver com:

```tsx
{obraId && (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="shrink-0 h-11 w-11"
    onClick={() => fileInputRef.current?.click()}
    disabled={isTyping}
  >
    <Paperclip className="h-5 w-5 text-muted-foreground" />
  </Button>
)}
```

No `<Input>` do formulário (linha 420-427), ajustar `disabled` e `placeholder`:

```tsx
<Input
  ref={inputRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  placeholder={semObraEFluxoInativo ? "Clique em \"Nova\" para começar" : "Fale ou digite o que deseja fazer..."}
  className="flex-1 rounded-full h-11 bg-background text-sm"
  disabled={isTyping || voiceLoop.isActive || semObraEFluxoInativo}
/>
```

No botão de voz (linha 430-451), condicionar a renderização: `{voiceLoop.isSupported && !semObraEFluxoInativo && ( ... )}`.

No botão de enviar (linha 453-464), somar `semObraEFluxoInativo` ao `disabled`:

```tsx
disabled={(!input.trim() && pendingFiles.length === 0) || isTyping || voiceLoop.isActive || semObraEFluxoInativo}
```

No bloco de sugestões (Task 4, Step 3), quando `obraId === null` mostrar só a pill "Nova" (sem `SUGGESTIONS`):

```tsx
{messages.length <= 1 && !isTyping && (
  <div className="flex flex-wrap gap-2 pt-2">
    <button onClick={iniciarCriacaoObra} className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors">
      Nova
    </button>
    {obraId && SUGGESTIONS.map((s) => (
      <button key={s.label} onClick={() => sendMessage(s.message)} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
        {s.label}
      </button>
    ))}
  </div>
)}
```

Ao final do arquivo, manter o `export default function Chat()` que envolve `ChatContent` com `RequireObra` (comportamento inalterado para a rota `/obras/:id/chat`):

```tsx
export default function Chat() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireObra obraId={id} pageName="Assistente IA">
      {id && <ChatContent obraId={id} />}
    </RequireObra>
  );
}
```

- [ ] **Step 2: Criar `Assistente.tsx`**

```tsx
// src/pages/Assistente.tsx
import { Navigate } from "react-router-dom";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { ChatContent } from "@/pages/Chat";

export default function Assistente() {
  const { obras, isLoading } = useObraAtiva();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (obras.length > 0) {
    return <Navigate to={`/obras/${obras[0].id}/chat`} replace />;
  }

  return <ChatContent obraId={null} />;
}
```

- [ ] **Step 3: Rota em `App.tsx`**

Adicionar o import (linha 34, junto de `import Chat from "./pages/Chat";`):

```ts
import Assistente from "./pages/Assistente";
```

Adicionar a rota logo após `/hoje` (linha 96, dentro do bloco protegido):

```tsx
<Route path="/assistente" element={<Assistente />} />
```

- [ ] **Step 4: `LegacyObraRedirect` — fallback configurável**

```ts
// src/components/LegacyObraRedirect.tsx
interface LegacyObraRedirectProps {
  section: string;
  sub?: (params: Record<string, string | undefined>) => string;
  /** Para onde ir quando não há nenhuma obra. Default: "/obras". */
  emptyFallback?: string;
}

export function LegacyObraRedirect({ section, sub, emptyFallback = "/obras" }: LegacyObraRedirectProps) {
  const { obraAtivaId, obras, isLoading } = useObraAtiva();
  const params = useParams();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const targetObraId =
    obraAtivaId && obraAtivaId !== "all" && obras.some((o) => o.id === obraAtivaId)
      ? obraAtivaId
      : obras[0]?.id;

  if (!targetObraId) return <Navigate to={emptyFallback} replace />;

  const suffix = sub ? sub(params) : "";
  return <Navigate to={`/obras/${targetObraId}/${section}${suffix}`} replace />;
}
```

Em `App.tsx:132`, atualizar a rota `/chat`:

```tsx
<Route path="/chat" element={<LegacyObraRedirect section="chat" emptyFallback="/assistente" />} />
```

- [ ] **Step 5: Item de sidebar, visível só quando não há obras**

Em `src/components/AppSidebar.tsx`, dentro de `AppSidebar()`, usar `obras.length === 0` (já disponível via `const { obras } = useObraAtiva();`, linha 52) para renderizar um item extra no `SidebarGroup` do topo (logo após o botão "Gestão de Obra", antes do fechamento de `</SidebarGroupContent>` na linha 132):

```tsx
{obras.length === 0 && (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <NavLink
        to="/assistente"
        className="flex items-center gap-3 hover:bg-accent"
        activeClassName="bg-primary/10 text-primary font-medium"
        onClick={handleNav}
      >
        <span className="w-6 text-center text-base shrink-0">🤖</span>
        {!collapsed && <span>Assistente</span>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

- [ ] **Step 6: Verificação manual — onboarding sem obra**

Este passo exige um usuário/tenant sem nenhuma obra para testar de ponta a ponta. Duas opções:
1. Usar uma conta de teste sem obras cadastradas, ou
2. Temporariamente comentar o `.order("created_at desc")`/filtrar a query em `useObraAtiva` para simular lista vazia — reverter depois do teste.

Run: `npm run dev`, acessar `/assistente` diretamente (ou pelo item "🤖 Assistente" na sidebar, que só aparece com 0 obras).
Expected: saudação "Ainda não vejo nenhuma obra sua. Quer começar uma agora?", só a pill "Nova" visível, input desabilitado com placeholder "Clique em \"Nova\" para começar", sem botão de anexo/voz. Clicar "Nova" habilita o input normalmente e roda o fluxo completo (Tasks 5-9). Ao concluir a criação, navega para `/obras/{novaObraId}/chat` mostrando a mensagem de sucesso.

Também verificar: `/chat` (rota legada) sem nenhuma obra redireciona para `/assistente` (não mais para `/obras`); com pelo menos 1 obra, `/assistente` redireciona direto para `/obras/{primeira}/chat`.

- [ ] **Step 7: Rodar build**

Run: `npm run build`
Expected: build sem erros de tipo (checa a nova assinatura `obraId: string | null` em todos os usos).

- [ ] **Step 8: Commit**

```bash
git add src/pages/Chat.tsx src/pages/Assistente.tsx src/App.tsx src/components/LegacyObraRedirect.tsx src/components/AppSidebar.tsx
git commit -m "feat: add /assistente onboarding entry point for tenants with zero obras"
```

---

## Self-Review

**Cobertura da spec:** nome+varredura (Task 5), tipo+complexidade (Task 6), descrição+escopo IA com editar/retry (Task 7), template (Task 8), fornecedores+criação (Task 9), pill azul e cancelar (Task 4), onboarding `/assistente` + sidebar + legacy redirect (Task 10), hook compartilhado + fix de invalidação (Task 3), varredura pura e reducer puro testados (Tasks 1-2). Todas as seções do spec `docs/superpowers/specs/2026-07-18-nova-obra-via-chat-design.md` têm task correspondente.

**Placeholders:** nenhum "TBD"/"implement later" — todo passo de código tem implementação completa. A única referência textual a "task pendente" é o forward-reference documentado entre Task 8 e Task 9 (`carregarSugestoesFornecedores`), resolvido explicitamente no Step 2 da Task 9.

**Consistência de tipos:** `CriacaoObraCardData`, `CriacaoObraState`, `EscopoIA`, `FornecedorSelecionado`, `Complexidade`, `ObraSimilar` e `classificacoes` são definidos uma única vez (Task 2) e importados (nunca redefinidos) nas Tasks 3, 5-10. `ChatMessage.card` (Task 4) é o único novo campo no modelo de mensagem, usado de forma consistente em todas as tasks seguintes.
