# Design: Criar obra pelo chat "Assistente de Obra" (pill "Nova")

## Contexto

O wizard `NovaObra.tsx` (`/nova-obra`, 7 passos) já orquestra toda a criação de
obra: Nome/Tipo (`tipos_obra`), Complexidade, Descrição, geração de escopo por
IA (Edge Function `gerar-escopo`, Gemini via Lovable AI Gateway), seleção de
template (`catalogo_templates` → expandido na criação via Edge Function
`expandir-template`) e seleção de até 3 fornecedores (sugeridos pela RPC
`fn_sugerir_top3_fornecedores`, confirmados via RPC
`fn_criar_cotacao_com_fornecedores`).

O chat "Assistente de Obra" (`Chat.tsx`, rota `/obras/:id/chat`) é hoje sempre
escopado a uma obra existente — `RequireObra` bloqueia o acesso se o tenant
não tiver nenhuma obra. As pills de sugestão (`SUGGESTIONS`) são uma lista
fixa (Adicionar gasto, Ver andamento, Nova etapa, Registrar compra, Ver
financeiro, Fornecedores, Ajuda). Uma pill "Criar obra" existiu e foi removida
no commit `26bf6d4`, com a justificativa "o chat agora é escopado por obra...
não faz sentido sugerir criar obra nova de dentro do assistente de uma obra
já existente" — essa spec reintroduz a capacidade, mas resolvendo o motivo
da remoção: agora ela permite trocar para uma obra existente em vez de criar
duplicata, e cobre também o caso de tenant sem nenhuma obra.

A Edge Function `chat-assistente` já tem uma tool `criar_obra`, mas rasa (só
chama a RPC `fn_criar_obra_inteligente`, sem escopo por IA, template ou
fornecedores). Essa spec não mexe nela — o fluxo guiado desta feature é
paralelo e não passa pela LLM de propósito geral do chat.

## Objetivo

Permitir criar uma obra nova de dentro do chat "Assistente de Obra", seguindo
a mesma sequência de perguntas do wizard `/nova-obra`, com:
- detecção de obra parecida já existente (varredura) logo após o nome, com
  opção de usar a existente em vez de criar duplicata;
- acesso tanto para quem já tem obras (pill dentro do chat de uma obra) quanto
  para quem ainda não tem nenhuma (nova rota de onboarding).

## Não-objetivos

- Não altera a tool `criar_obra` nem qualquer outra tool do `chat-assistente`.
- Não permite responder fora de ordem em texto livre (não é um parser de
  linguagem natural) — é um fluxo guiado passo a passo, como o wizard.
- Não persiste rascunho do fluxo em criação — sair no meio descarta o
  progresso.
- Não introduz LLM na varredura de duplicata (é busca textual direta).

## Mudanças

### 1. Roteamento e pontos de entrada

- **Chat de obra existente** (`/obras/:id/chat`): pill azul **"Nova"** entra em
  `SUGGESTIONS` (`Chat.tsx`), com a mesma regra de visibilidade das demais
  pills (aparecem quando `messages.length <= 1`, ou seja, no início da
  conversa). Clicar ativa o modo local de criação (ver seção 3).
- **Onboarding sem obra**: nova rota `/assistente`, renderizando `Chat.tsx`
  **sem** `RequireObra`. Mostra saudação de onboarding ("Ainda não vejo
  nenhuma obra sua. Quer começar uma agora?") e apenas a pill "Nova" (as
  demais pills não fazem sentido sem `obra_id`). Novo item no menu lateral
  (`AppSidebar.tsx`) apontando para `/assistente`, sempre visível (diferente
  das seções de `gestaoObraSections`, que só aparecem com obra selecionada).
- Ao concluir a criação (passo 8), o app navega para `/obras/:id/chat` da
  obra recém-criada, que passa a ser o chat normal dali em diante.
- `LegacyObraRedirect` (rota `/chat`): quando não há nenhuma obra, passa a
  redirecionar para `/assistente` em vez de `/obras` (lista vazia).

### 2. Fluxo da conversa (state machine local em `Chat.tsx`)

Reducer local (`criacaoObraState`), independente do histórico normal de
mensagens da IA — não passa pelo `chat-assistente`. Uma pergunta por vez,
com pills de resposta rápida quando aplicável:

1. **Nome** — texto livre. Ao responder, roda a varredura (seção 4). Se
   encontrar obra parecida: cartão com o nome encontrado + botões **"Usar
   essa obra"** (troca o chat para ela — mesmo mecanismo das pills "Trocar
   para X" — e encerra o fluxo de criação) e **"Criar mesmo assim"** (segue
   para o passo 2). Sem match, segue direto.
2. **Tipo da obra** — pills com os tipos de `tipos_obra` + botão "+ Novo
   tipo" (abre campo de texto livre, cria inline — mesma lógica de
   `NovaObra.tsx:130-142`).
3. **Complexidade** — 3 pills fixas: Simples (Pedreiro/Empreiteiro), Média
   (Empreiteiro + Técnico), Complexa (Engenheiro/Arquiteto) — mesmo array
   `classificacoes` de `NovaObra.tsx:47-66`.
4. **Descrição** — texto livre ou voz (`useVoiceCommand`, já usado no chat).
   Botão "Gerar Escopo com IA".
5. **Escopo gerado pela IA** — chama `gerar-escopo` (mesma chamada de
   `NovaObra.tsx:166-181`), mostra loading, depois cartão com Descrição
   Estruturada / Necessidades / Profissional Recomendado / Alertas de
   Segurança. Botões "Continuar" e "Editar descrição" (volta ao passo 4,
   mantendo o texto já digitado).
6. **Template de Serviços** — cartões de `catalogo_templates` (nome +
   contagem de itens) + opção "Nenhum, criar manualmente". Seleção única.
   Botão "Continuar".
7. **Fornecedores** — sugestão via `fn_sugerir_top3_fornecedores`, cartões
   com checkbox (mín. 1, máx. 3) + busca de outro fornecedor. Botão "Criar
   Obra".
8. **Confirmação** — executa a criação (seção 3), cartão de sucesso com "Ver
   Dossiê da Obra"; chat troca automaticamente para a obra criada.

Um botão **"Cancelar"**, visível em todos os passos, aborta o fluxo e volta
às pills normais (`SUGGESTIONS`).

### 3. Reaproveitamento de backend

- **Hook compartilhado `useCriarObra`** (novo — extraído da mutation
  `criarObra` em `NovaObra.tsx:195-283`): recebe nome, tipo, complexidade,
  descrição, escopo, template selecionado (opcional) e fornecedores
  selecionados (opcional), e executa: `insert` em `obras` → `insert` em
  `obra_dossie` → `expandir-template` (Edge Function, se houver template) →
  `fn_criar_cotacao_com_fornecedores` (RPC, se houver fornecedores).
  `NovaObra.tsx` passa a usar esse hook em vez da lógica inline; `Chat.tsx`
  usa o mesmo hook no passo 8. Comportamento idêntico ao atual, sem mudança
  de schema ou de RPCs.
- Tipo/Template/Fornecedores: mesmas queries e RPC que o wizard já usa, sem
  alterações — só chamadas a partir de `Chat.tsx`.
- `gerar-escopo`: chamada idêntica à do wizard, sem mudanças na Edge
  Function.

### 4. Varredura de duplicata

Nova função utilitária `buscarObrasSimilares(nome, tenantId)`: query direta
em `obras` (`ilike` sobre nome normalizado — minúsculo, sem acento) filtrada
por tenant. Sem RPC nova, sem IA. Roda uma vez, logo após o passo 1 (Nome).

### 5. UI: novo tipo de mensagem no chat

`Chat.tsx` passa a suportar, além de mensagens de texto simples, mensagens do
tipo "cartão interativo" (pills de resposta rápida, cartão de duplicata,
cartão de escopo, cartão de template, cartão de fornecedor, cartão de
sucesso), renderizadas na mesma lista de mensagens, mantendo o visual de
conversa contínua.

### 6. Tratamento de erros

Se `gerar-escopo`, `expandir-template` ou `fn_criar_cotacao_com_fornecedores`
falharem, o cartão do passo correspondente mostra o erro de forma visível
(nunca falha silenciosa, conforme padrão do projeto) com botão "Tentar
novamente", preservando os dados já coletados nos passos anteriores.

## Fora de escopo

- Não altera `chat-assistente` (tools, prompt, ou parsing de linguagem
  natural).
- Não salva rascunho parcial do fluxo de criação.
- Não adiciona seletor de obra dropdown/dialog (mantém o padrão URL-first já
  estabelecido em `docs/superpowers/specs/2026-07-16-assistente-ia-por-obra-design.md`).

## Casos extremos

- Usuário sem nenhuma obra acessa `/obras/:id/chat` diretamente (link antigo):
  continua caindo no estado vazio do `RequireObra`, sem mudança — o novo
  caminho para esse usuário é `/assistente`, não uma alteração do guard
  existente.
- Usuário navega para outra tela (ou troca de obra) no meio do fluxo de
  criação: progresso é descartado, sem confirmação — fluxo é curto o
  suficiente para não justificar persistência parcial.
- Varredura encontra mais de uma obra parecida: mostra a mais recente
  (`created_at desc`) como sugestão principal — mesma ordenação já usada em
  `obras-lista`.
