# 15 - Known Limitations & Technical Debt

## Código morto / não roteado
- `src/pages/Analise.tsx` e `src/pages/Ranking.tsx` — presentes mas **não registrados em `App.tsx`**.
- Tabela `fornecedores_cotacao` — provavelmente substituída por `cotacao_fornecedores`.
- Protótipo Python (`core/`, `parsers/`, `web/`) — mantido apenas como referência do pipeline, **não é executado**.
- Tabela `Atualização_Automatica_n8n` — nome com acento/espaço, evitar em queries; provavelmente experimental.

## Legado tenancy
- `tenant_id`, `current_tenant_id()`, `set_tenant_id`, `set_tenant_from_obra`, `is_admin_global()`, `tenants` — resquícios do modelo multi-tenant antigo. Segurança atual é `user_id = auth.uid()`.
- `log_auditoria` tem fallback hardcoded `'3ea500bb-...'` para `auth.uid()` — **remover em produção**.

## Duplicação
- Dois sistemas de toast: `sonner` (preferido) + shadcn `toaster` legado.
- Duas versões de `gerar_alertas_fase` (uma sem parâmetro, uma com `p_obra_id`).

## Regras potencialmente inativas
- `validar_3_propostas` — trigger existe mas não claro se aplicado.
- `expirar_cotacoes` — precisa scheduler (cron) para rodar; hoje só executa se chamado manualmente.

## Segurança
- Sem tabela `user_roles` ainda — não há papel admin.
- `documentos` e `obras` são buckets **públicos**; URLs de storage não protegidas.
- `log_auditoria` grava `auth.uid()` mas fallback UUID hardcoded expõe risco.

## Frontend
- Não há camada `services/` — Supabase chamado direto nas páginas. Refatorar quando surgir duplicação.
- `recharts` fixo em `2.12.7`. Ao atualizar React, testar antes de subir versão.
- `useObraAtiva` roda `useQuery` sem `staleTime` — refetch frequente.

## Performance
- Muitas queries em Dashboard rodam em paralelo sem batching.
- Sem paginação em listagens (`Compras`, `Fornecedores`, `Produtos`) — limite implícito de 1000 do Supabase.

## Import pipeline
- Sem OCR (PDFs em imagem falham).
- Bundle das Edge Functions de import ~2-3MB (xlsx+mammoth+unpdf).
- Sem retry/idempotency em `commitar-importacao`.

## TODOs conhecidos
- Escolha de obra na revisão de importação — implementada, mas sem histórico de importações.
- Portal do fornecedor não envia notificação por email quando cotação é criada.
