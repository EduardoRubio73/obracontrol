

# Plano: Agente IA com CRUD Total — Gestão Completa via Chat

## Resumo
Expandir a edge function `chat-assistente` de 4 tools para ~15 tools cobrindo CRUD completo em todos os módulos: obras, etapas, financeiro, compras, cotações, fornecedores, produtos e documentos.

## Mudanças na Edge Function (`supabase/functions/chat-assistente/index.ts`)

### Novos Tools

**READ (consultas):**
- `consultar_financeiro` — Soma gastos/receitas, saldo, lista movimentações. Responde "quanto gastei?", "qual o saldo?"
- `consultar_compras` — Lista compras por status, totais pendentes
- `consultar_cotacoes` — Lista cotações abertas/fechadas, contagem
- `consultar_documentos` — Lista documentos da obra por nome/tipo
- `consultar_fornecedores` — Lista fornecedores do usuário, filtro por categoria/status
- `consultar_produtos` — Lista produtos cadastrados

**CREATE (novos):**
- `criar_compra` — Registra compra em `compras` (e opcionalmente em `financeiro` se status=comprado)
- `criar_fornecedor` — Cadastra fornecedor em `fornecedores`
- `criar_cotacao` — Cria cotação em `cotacoes` com itens

**UPDATE:**
- `atualizar_etapa` — Muda status/progresso de uma fase por nome. Ex: "marcar Pintura como concluída"
- `atualizar_obra` — Muda status, valor_previsto, datas de uma obra
- `atualizar_compra` — Muda status de compra (pendente → comprado)

**DELETE:**
- `excluir_gasto` — Remove registro do financeiro por descrição
- `excluir_etapa` — Remove etapa por nome

### System Prompt Expandido

Adicionar ao system prompt:
- Mapeamento completo das tabelas e campos disponíveis
- Instruções para usar `consultar_*` ANTES de responder perguntas sobre dados
- Instruções para confirmar ações com ✅ e detalhes
- Regra: sempre usar `user_id` do token autenticado em todas as operações
- Regra: usar `obra_id` do contexto ativo quando não especificado

### Segurança

- Todas as operações INSERT/UPDATE/DELETE usam `supabaseAdmin` com `user_id` do token JWT validado
- Queries de leitura filtram por `user_id = userId` ou via join com `obras.user_id`
- Sem uso de tenant_id (projeto usa `user_id = auth.uid()` conforme mem://features/security)

### Contexto Dinâmico

A função `buildObraContext` já carrega dados reais. Será expandida para incluir também fornecedores e produtos do usuário quando relevante.

## Nenhuma mudança no frontend

O `Chat.tsx` já suporta `acoes` e `executado` — o backend faz todo o trabalho.

## Arquivo Modificado

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/chat-assistente/index.ts` | Expandir de 4 para ~15 tools, atualizar system prompt, adicionar executeTool cases |

