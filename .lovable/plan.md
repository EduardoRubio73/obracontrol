

# Plano: Chat com IA Real + Anexos

## O que existe hoje
- `Chat.tsx`: UI WhatsApp-style com processamento local de keywords (sem IA)
- Edge functions `gerar-escopo` e `apoio-decisao` já usam `LOVABLE_API_KEY` + Lovable AI Gateway
- Bucket `documentos` já existe (privado)
- DB functions: `fn_criar_obra_inteligente`, `fn_criar_cotacao_com_fornecedores`, etc.

## Solução

### 1. Edge Function `chat-assistente`

Novo arquivo `supabase/functions/chat-assistente/index.ts`:

- Recebe: `{ mensagem, obra_id, historico[], anexos[] }`
- Valida JWT em code (extrair user do token)
- System prompt com intents suportadas
- Usa Lovable AI Gateway (`ai.gateway.lovable.dev`) com tool calling
- Tools disponíveis para a IA:
  - `criar_obra(nome, tipo, classificacao)` — chama `fn_criar_obra_inteligente` via Supabase service role
  - `criar_gasto(obra_id, descricao, valor)` — INSERT em `financeiro`
  - `criar_etapa(obra_id, nome)` — INSERT em `obra_fases`
  - `status_obra(obra_id)` — SELECT de fases + financeiro para resumir
  - `responder_texto(resposta, botoes[])` — resposta livre
- Quando a IA chama um tool, a edge function executa via Supabase client (service role) e retorna resultado
- Resposta final: `{ resposta, acoes[], executado }`

### 2. Frontend Chat.tsx — Refatorar

- Remover `processUserMessage` local
- Adicionar estado para anexos (files pendentes)
- `enviarMensagem` chama `supabase.functions.invoke('chat-assistente', { body })` com histórico completo
- Enviar histórico de mensagens para manter contexto
- Renderizar resposta com `react-markdown`
- Botão 📎 para anexar arquivos (aceita jpg, png, pdf, doc)
- Upload de anexos para `supabase.storage.from('documentos').upload(...)` antes de enviar mensagem
- URLs dos anexos enviadas junto com a mensagem

### 3. Anexos — Upload Flow

- No input, adicionar botão de clipe (📎)
- Ao selecionar arquivo: upload para `documentos` bucket, path `chat/{user_id}/{timestamp}_{filename}`
- Exibir preview (miniatura para imagens, ícone para docs)
- Enviar URLs na mensagem para a edge function
- Salvar registro na tabela `documentos` com `obra_id` (se houver obra ativa)

### 4. Markdown nas respostas

- Instalar `react-markdown` (já pode estar disponível, ou adicionar)
- Renderizar `msg.content` com `<ReactMarkdown>` em vez de split por `**`

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/chat-assistente/index.ts` | Criar — edge function com IA real |
| `src/pages/Chat.tsx` | Reescrever — conectar com edge, anexos, markdown |

## Segurança
- Edge function valida JWT do usuário
- Operações de banco usam service role mas filtram por user_id extraído do token
- Anexos salvos com path do user_id
- RLS já protege leitura dos dados

## Sem migrations necessárias
- Tabela `documentos` e bucket `documentos` já existem
- Functions SQL já existem (`fn_criar_obra_inteligente`, etc.)

