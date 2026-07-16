# Design: Assistente IA escopado por obra (via URL)

## Contexto

O refactor de navegação de hoje (`6ab4ca7`) moveu todas as seções de obra
(Etapas, Financeiro, Compras, Cotações, Galeria, Documentos, Dashboard) para
`/obras/:id/...`, com a URL como fonte de verdade, e removeu o dropdown de
troca de obra que existia no header (`AppLayout.tsx` / `ObraContextTabs`).

O Assistente IA (`/chat`) ficou de fora dessa migração: continua sendo uma
rota global que lê a obra ativa de `useObraAtiva()` (context + `localStorage`).
Como nada na UI chama mais `setObraAtivaId()` (a única forma de trocar era o
dropdown removido), a obra "ativa" do assistente hoje é sempre a primeira da
lista retornada pela query (`obras-lista`, ordenada por `created_at desc` —
ou seja, a obra mais recente), sem nenhuma forma de o usuário mudar isso pela
interface. É o "travado numa obra só" relatado.

## Objetivo

Levar o Assistente IA para o mesmo padrão URL-first do resto do app, em vez
de reintroduzir um seletor separado (dropdown ou pergunta conversacional).

## Mudanças

### 1. Roteamento

- Nova rota `/obras/:id/chat`, renderizando o `Chat` existente envolvido em
  `<RequireObra obraId={id} pageName="Assistente IA">` — o mesmo guard usado
  hoje por `Etapas.tsx` e as demais seções por obra. Cobre os casos "nenhuma
  obra cadastrada" e "obra não encontrada" com o mesmo componente visual já
  existente.
- A rota antiga `/chat` passa a ser um `LegacyObraRedirect` com
  `section="chat"`, redirecionando para `/obras/:id/chat` usando a última
  obra ativa lembrada (mesmo mecanismo já usado por `/etapas`, `/financeiro`
  etc.). Preserva links/favoritos antigos sem quebrar.

### 2. Sidebar (`AppSidebar.tsx`)

- "Assistente IA" 🤖 sai de `configItems` (seção "Gestão", sempre visível) e
  entra em `gestaoObraSections` (seção "Gestão da Obra", visível apenas
  quando há obra selecionada na URL), com `segment: "chat"` — mesma
  construção de URL que as demais seções: `/obras/${obraIdFromUrl}/chat`.
- Consequência: o link só aparece quando o usuário está navegando dentro de
  uma obra, igual a Dashboard/Etapas/Financeiro/etc. Isso é intencional —
  consistente com o resto do menu pós-refactor.

### 3. Componente `Chat.tsx`

- Passa a resolver a obra via `useParams<{ id: string }>()` em vez de
  `useObraAtiva().obraAtivaId`.
- Nome da obra (header, mensagem de boas-vindas) continua vindo de
  `useObraAtiva().obras`, localizado pelo `id` da URL — mesmo padrão já usado
  em `AppSidebar.tsx` (`obras.find(o => o.id === obraIdFromUrl)`).
- `uploadFiles`: a checagem `obraAtivaId && obraAtivaId !== "all"` deixa de
  fazer sentido (a rota é sempre escopada a uma obra válida, garantida pelo
  `RequireObra`) — simplifica para usar o `id` da URL diretamente.
- Chamada a `chat-assistente` envia `obra_id: id` (URL) em vez do valor do
  context.
- **Histórico da conversa reinicia por obra**: ao navegar de
  `/obras/A/chat` para `/obras/B/chat`, o estado de mensagens é resetado
  (nova mensagem de boas-vindas), em vez de manter o histórico da obra
  anterior. Implementado via `useEffect` que reseta `messages` (e
  `pendingFiles`) quando `id` muda. Cada obra tem uma conversa isolada —
  evita que o histórico de uma obra vaze como contexto textual para
  perguntas sobre outra.

### 4. Backend (`supabase/functions/chat-assistente/index.ts`)

- Nenhuma mudança necessária. A função já valida posse da obra via
  `userOwnsObra()` (corrigido no sweep de segurança de ontem, commit
  `f6931b4`) a partir do `obra_id` recebido no corpo da requisição — só muda
  a origem desse valor no frontend (URL em vez de context global).

## Fora de escopo

- Não reintroduz nenhum seletor de obra dropdown/dialog.
- Não altera o schema do banco nem a lógica de tool-calls do assistente.
- Não persiste histórico de chat em banco (continua client-side, por sessão
  de navegador, como hoje).

## Casos extremos

- Usuário sem nenhuma obra cadastrada: `/obras/:id/chat` cai no estado vazio
  padrão do `RequireObra` ("Nenhuma obra cadastrada").
- Link antigo `/chat` sem sessão de obra ativa salva: `LegacyObraRedirect`
  usa `obras[0]` como fallback (mesmo comportamento das outras seções).
