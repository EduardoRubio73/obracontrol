# Assistente IA por obra (via URL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move o Assistente IA de uma rota global `/chat` (dependente de um
context de "obra ativa" órfão, sem UI para trocar) para `/obras/:id/chat`,
seguindo o padrão URL-first já usado por Etapas, Financeiro, Dashboard etc.

**Architecture:** Reaproveita o mecanismo existente de rotas por obra
(`RequireObra`, `LegacyObraRedirect`, `useParams`) que já cobre as outras
seções. `Chat.tsx` passa a receber o id da obra por prop (vindo da URL) em
vez de ler `useObraAtiva().obraAtivaId`. Nenhuma mudança de schema ou de
edge function é necessária.

**Tech Stack:** React 18 + TypeScript + Vite, React Router v6, TanStack
Query, Supabase Edge Functions.

## Global Constraints

- Não reintroduzir nenhum seletor de obra dropdown/dialog (decisão do spec).
- Não alterar `supabase/functions/chat-assistente/index.ts` — a validação de
  posse da obra (`userOwnsObra`) já existe e independe da origem do
  `obra_id`.
- Histórico da conversa reinicia ao trocar de obra (decisão confirmada no
  spec) — cada obra tem conversa isolada.
- UI copy em pt-BR (padrão do projeto).
- Este projeto não tem testes de componente para páginas (`src/test/` só
  tem um exemplo de smoke test). A verificação desta mudança é feita por
  `tsc`/build/lint + navegação manual no navegador (via skill
  `webapp-testing`), não por testes automatizados fabricados para a
  ocasião — não há nada de "TDD" aplicável a um remapeamento de rotas
  JSX sem lógica de negócio nova.

---

### Task 1: Rota `/obras/:id/chat` + redirect legado em `App.tsx`

**Files:**
- Modify: `src/App.tsx:109-130`

**Interfaces:**
- Consumes: `Chat` (default export de `src/pages/Chat.tsx`, já importado
  em `App.tsx:34`), `LegacyObraRedirect` (já importado em `App.tsx:9`,
  aceita props `section: string` e `sub?: (params) => string`).
- Produces: rota `/obras/:id/chat` renderizando `<Chat />`; rota `/chat`
  redirecionando para `/obras/:id/chat` via `LegacyObraRedirect`.

- [ ] **Step 1: Adicionar a rota nova por obra**

Em `src/App.tsx`, logo depois da linha `<Route path="/obras/:id/documentos" element={<Documentos />} />` (linha 109), adicionar:

```tsx
              <Route path="/obras/:id/chat" element={<Chat />} />
```

- [ ] **Step 2: Trocar a rota antiga `/chat` por um redirect legado**

Em `src/App.tsx`, na linha 130, substituir:

```tsx
              <Route path="/chat" element={<Chat />} />
```

por:

```tsx
              <Route path="/chat" element={<LegacyObraRedirect section="chat" />} />
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build conclui sem erros de TypeScript nem de rota duplicada.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: rota /obras/:id/chat + redirect legado para /chat"
```

---

### Task 2: Mover "Assistente IA" para a seção "Gestão da Obra" na sidebar

**Files:**
- Modify: `src/components/AppSidebar.tsx:25-41`

**Interfaces:**
- Consumes: `gestaoObraSections` (array local, cada item vira
  `{ title, emoji, url: \`/obras/${obraIdFromUrl}/${segment}\` }` em
  `renderItems`, linhas 55-59).
- Produces: item de menu "Assistente IA" só visível quando
  `hasObraSelected` é `true` (linha 52/124), apontando para
  `/obras/${obraIdFromUrl}/chat`.

- [ ] **Step 1: Adicionar "Assistente IA" a `gestaoObraSections`**

Em `src/components/AppSidebar.tsx`, substituir o array (linhas 25-34):

```tsx
const gestaoObraSections = [
  { title: "Dashboard", segment: "dashboard", emoji: "📊" },
  { title: "Etapas", segment: "etapas", emoji: "📋" },
  { title: "Fornecedores", segment: "fornecedores", emoji: "👥" },
  { title: "Compras", segment: "compras", emoji: "🛒" },
  { title: "Financeiro", segment: "financeiro", emoji: "💰" },
  { title: "Cotações", segment: "cotacoes", emoji: "📝" },
  { title: "Galeria", segment: "galeria", emoji: "🖼️" },
  { title: "Documentos", segment: "documentos", emoji: "📁" },
];
```

por:

```tsx
const gestaoObraSections = [
  { title: "Dashboard", segment: "dashboard", emoji: "📊" },
  { title: "Etapas", segment: "etapas", emoji: "📋" },
  { title: "Fornecedores", segment: "fornecedores", emoji: "👥" },
  { title: "Compras", segment: "compras", emoji: "🛒" },
  { title: "Financeiro", segment: "financeiro", emoji: "💰" },
  { title: "Cotações", segment: "cotacoes", emoji: "📝" },
  { title: "Galeria", segment: "galeria", emoji: "🖼️" },
  { title: "Documentos", segment: "documentos", emoji: "📁" },
  { title: "Assistente IA", segment: "chat", emoji: "🤖" },
];
```

- [ ] **Step 2: Remover "Assistente IA" de `configItems`**

Em `src/components/AppSidebar.tsx`, substituir (linhas 36-41):

```tsx
const configItems = [
  { title: "Assistente IA", url: "/chat", emoji: "🤖" },
  { title: "Perfil", url: "/perfil", emoji: "👤" },
  { title: "Relatórios", url: "/relatorios", emoji: "📈" },
  { title: "Config. Sistema", url: "/configuracoes", emoji: "⚙️" },
];
```

por:

```tsx
const configItems = [
  { title: "Perfil", url: "/perfil", emoji: "👤" },
  { title: "Relatórios", url: "/relatorios", emoji: "📈" },
  { title: "Config. Sistema", url: "/configuracoes", emoji: "⚙️" },
];
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppSidebar.tsx
git commit -m "feat: mover Assistente IA para a secao Gestao da Obra na sidebar"
```

---

### Task 3: `Chat.tsx` passa a resolver a obra pela URL, não pelo context

**Files:**
- Modify: `src/pages/Chat.tsx`

**Interfaces:**
- Consumes: `RequireObra` (componente em `src/components/RequireObra.tsx`,
  props `{ children, obraId: string | null | undefined, pageName?: string }`
  — mesmo componente usado por `src/pages/Etapas.tsx:532`),
  `useParams<{ id: string }>()` de `react-router-dom`, `useObraAtiva()`
  (agora só para ler `obras: Obra[]`, não mais `obraAtivaId`).
- Produces: `export default function Chat()` — sem props, lido pela rota
  `/obras/:id/chat`. Internamente, o conteúdo atual vira
  `function ChatContent({ obraId }: { obraId: string })`.

- [ ] **Step 1: Trocar os imports**

Em `src/pages/Chat.tsx`, linha 7, substituir:

```tsx
import { useObraAtiva } from "@/hooks/useObraAtiva";
```

por:

```tsx
import { useParams } from "react-router-dom";
import { useObraAtiva } from "@/hooks/useObraAtiva";
import { RequireObra } from "@/components/RequireObra";
```

(A linha 2 já importa `useNavigate` de `react-router-dom` — juntar os dois
imports do mesmo módulo em um só: `import { useNavigate, useParams } from "react-router-dom";`.)

- [ ] **Step 2: Renomear o componente e receber `obraId` por prop**

Em `src/pages/Chat.tsx`, linha 37, substituir:

```tsx
export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { obraAtiva, obraAtivaId } = useObraAtiva();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Olá! 👋 Sou seu assistente de obra.\n\n${obraAtiva ? `Obra ativa: **${obraAtiva.nome}**\n\n` : ""}Como posso te ajudar?`,
      timestamp: new Date(),
    },
  ]);
```

por:

```tsx
function ChatContent({ obraId }: { obraId: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { obras } = useObraAtiva();
  const obraAtiva = obras.find((o) => o.id === obraId) ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
```

- [ ] **Step 3: Resetar a conversa quando a obra muda**

Em `src/pages/Chat.tsx`, logo após o bloco (originalmente linhas 57-60):

```tsx
  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
```

adicionar:

```tsx
  // Reinicia a conversa ao trocar de obra — cada obra tem contexto isolado
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Olá! 👋 Sou seu assistente de obra.\n\n${obraAtiva ? `Obra ativa: **${obraAtiva.nome}**\n\n` : ""}Como posso te ajudar?`,
        timestamp: new Date(),
      },
    ]);
    setPendingFiles([]);
  }, [obraId]);
```

- [ ] **Step 4: Trocar as referências a `obraAtivaId` por `obraId`**

Em `src/pages/Chat.tsx`, na função `uploadFiles`, substituir:

```tsx
      if (obraAtivaId && obraAtivaId !== "all") {
        const { error: insertError } = await supabase.from("documentos").insert({
          obra_id: obraAtivaId,
```

por:

```tsx
      const { error: insertError } = await supabase.from("documentos").insert({
          obra_id: obraId,
```

Removendo o `if` e seu fechamento `}` correspondente (o insert passa a
rodar sempre, já que a rota garante uma obra válida via `RequireObra`).

Em `sendMessage`, substituir:

```tsx
      const { data, error } = await supabase.functions.invoke("chat-assistente", {
        body: {
          mensagem: text.trim(),
          obra_id: obraAtivaId,
```

por:

```tsx
      const { data, error } = await supabase.functions.invoke("chat-assistente", {
        body: {
          mensagem: text.trim(),
          obra_id: obraId,
```

E no array de dependências do `useCallback` de `sendMessage`, substituir:

```tsx
  }, [obraAtivaId, user]);
```

por:

```tsx
  }, [obraId, user]);
```

- [ ] **Step 5: Adicionar o wrapper `RequireObra` e o novo default export**

Ao final de `src/pages/Chat.tsx`, depois do fechamento de `ChatContent`
(a antiga chave de fechamento da função `Chat`), adicionar:

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

- [ ] **Step 6: Verificar que compila e lint passa**

Run: `npm run build && npm run lint`
Expected: ambos concluem sem erros. Se o lint acusar
`react-hooks/exhaustive-deps` no novo `useEffect` do Step 3 por não incluir
`obraAtiva`, isso é esperado e intencional — o efeito deve rodar só quando
`obraId` muda, não a cada nova referência de `obras`; adicionar um
comentário `// eslint-disable-next-line react-hooks/exhaustive-deps` na
linha do array de dependências se o lint bloquear o build.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Chat.tsx
git commit -m "feat: Chat.tsx resolve obra pela URL e reinicia conversa ao trocar"
```

---

### Task 4: Verificação manual end-to-end no navegador

**Files:** nenhum (task de verificação, sem alteração de código).

- [ ] **Step 1: Subir o servidor de dev**

Run: `npm run dev`
Expected: servidor sobe sem erro (porta padrão do Vite, ex. `5173`).

- [ ] **Step 2: Fluxo com obra selecionada**

No navegador (via skill `webapp-testing`): logar, abrir uma obra
(`/obras/:id/dashboard`), confirmar que "Assistente IA" 🤖 aparece na
sidebar dentro de "Gestão da Obra", clicar nele.
Expected: URL vira `/obras/:id/chat`; header mostra "Assistente de Obra"
e o nome da obra atual; mensagem de boas-vindas menciona essa obra.

- [ ] **Step 3: Enviar uma mensagem e trocar de obra**

Enviar uma mensagem de teste no chat da obra A. Depois, navegar para o
dashboard de uma obra B diferente e abrir o Assistente IA dela.
Expected: o chat da obra B mostra só a mensagem de boas-vindas nova
(mencionando a obra B), sem o histórico da obra A.

- [ ] **Step 4: Testar o link legado `/chat`**

Navegar diretamente para `/chat` na barra de endereço.
Expected: redireciona automaticamente para `/obras/:id/chat` usando a
última obra visitada (sem tela de erro).

- [ ] **Step 5: Testar sem obra selecionada / sem obras**

Se a conta de teste não tiver nenhuma obra cadastrada, navegar para
`/obras/<uuid-invalido>/chat`.
Expected: tela "Obra não encontrada" (do `RequireObra`), sem crash.

- [ ] **Step 6: Encerrar o servidor de dev**

Run: encerrar o processo do `npm run dev` iniciado no Step 1.
