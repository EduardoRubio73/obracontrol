

# Simplificar Segurança para `user_id = auth.uid()`

## Problema Atual
Várias tabelas usam `tenant_id` com `current_tenant_id()` para RLS, mas o JWT não tem `tenant_id` configurado, o que bloqueia o acesso aos dados. O usuário quer simplificar para usar apenas `user_id = auth.uid()`.

## Plano

### 1. Migração SQL — Ajustar tabelas e políticas

**Tabelas que precisam de `user_id`** (não têm ainda):
- `financeiro` — adicionar coluna `user_id uuid not null default auth.uid()`
- `cotacoes` — já tem RLS via join com `obras.user_id`, manter assim
- `propostas` — já tem RLS via join com `obras.user_id`, manter assim

**Remover políticas baseadas em tenant** de todas as tabelas:
- `obras`: drop `obras_policy`, `tenant_only_obras` (manter `obras_all`)
- `cotacoes`: drop `cotacoes_policy` (manter `cotacoes_all`)
- `financeiro`: drop `financeiro_policy`, criar nova policy `user_id = auth.uid()`
- `fornecedores`: drop `fornecedores_policy` (manter `fornecedores_all` ou `fornecedores_user`)
- `propostas`: drop `propostas_policy` (manter `propostas_all`)
- `auditoria`: drop `auditoria_policy`, criar policy `user_id = auth.uid()`

### 2. Código — Garantir `user_id` nos inserts

- **Financeiro.tsx**: Adicionar `user_id: user!.id` no insert e importar `useAuth`
- **Dashboard (Index.tsx)**: Nenhuma mudança necessária (só leitura, RLS filtra)
- **Obras.tsx**: Já envia `user_id` ✓
- **Fornecedores.tsx**: Já envia `user_id` ✓
- **Cotacoes.tsx**: Sem insert direto, OK

### Resumo das mudanças
- 1 migração SQL (add `user_id` ao `financeiro`, drop ~6 tenant policies, criar 2 novas policies)
- 1 arquivo editado: `src/pages/Financeiro.tsx` (adicionar `useAuth` e `user_id` no insert)

