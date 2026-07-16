# 19 - AI Development Rules

Regras vinculantes para qualquer IA que altere este projeto.

## Nunca
- ❌ **Nunca** criar tabela que já existe (ver `08-database.md` + `types.ts`).
- ❌ **Nunca** duplicar componente — reuse `src/components/ui/*` e primitivos existentes.
- ❌ **Nunca** editar `src/integrations/supabase/types.ts` — é auto-gerado.
- ❌ **Nunca** editar arquivos em `supabase/migrations/` manualmente — usar `supabase--migration`.
- ❌ **Nunca** hard-codear cores fora de `src/index.css`.
- ❌ **Nunca** FK para `auth.users` — usar `profiles.id`.
- ❌ **Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- ❌ **Nunca** guardar role em `profiles` — usar tabela `user_roles` separada (quando criada).
- ❌ **Nunca** fazer `.channel(...).subscribe()` fora de `useEffect`.
- ❌ **Nunca** quebrar contrato existente das Edge Functions — mantenha payload/response.
- ❌ **Nunca** reintroduzir dependência em `tenant_id` como filtro primário.

## Sempre
- ✅ **Sempre** reutilizar hooks existentes (`useAuth`, `useObraAtiva`).
- ✅ **Sempre** verificar serviços/queries existentes antes de duplicar.
- ✅ **Sempre** respeitar `useObraAtiva().isAll` — bloquear queries que exigem UUID.
- ✅ **Sempre** preservar tipos gerados em `types.ts`; se novos, gere migration.
- ✅ **Sempre** atualizar esta documentação quando adicionar rota/tabela/endpoint.
- ✅ **Sempre** adicionar `GRANT` + `ENABLE RLS` + `CREATE POLICY` na mesma migration de `CREATE TABLE`.
- ✅ **Sempre** usar `sonner` toast (`toast.success/error`).
- ✅ **Sempre** invalidar queries relacionadas após mutação.
- ✅ **Sempre** manter interface em PT-BR.
- ✅ **Sempre** validar formulários com zod + react-hook-form.
- ✅ **Sempre** garantir CRUD completo em páginas admin (criar/editar/excluir).

## Antes de qualquer mudança
1. Ler `02-project-structure.md` + `17-file-map.md`.
2. Ler `08-database.md` + `types.ts` se envolve dados.
3. Ler `09-business-rules.md` se envolve lógica.
4. Ler `20-change-impact.md` para prever efeitos colaterais.

## Ao adicionar feature
- Documentar em `03-routing.md` (nova rota), `04-components.md`, `08-database.md`, `14-workflows.md`.
- Adicionar no `24-ai-index.md` se criar novo doc.
