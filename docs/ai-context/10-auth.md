# 10 - Authentication

## Provider
- Supabase Auth (email/senha).
- Cliente em `src/integrations/supabase/client.ts` com `persistSession: true` e `localStorage`.

## Fluxo
1. `/login` (`Auth.tsx`) → `supabase.auth.signInWithPassword` / `signUp`.
2. `AuthProvider` (`useAuth.tsx`) escuta `onAuthStateChange` **antes** de `getSession()`.
3. `ProtectedRoute` redireciona para `/login` quando `!user`.
4. `PublicRoute` redireciona para `/` se já autenticado.

## Perfil
- Trigger `handle_new_user` (SECURITY DEFINER) insere linha em `public.profiles` ao criar usuário em `auth.users`.
- Nunca fazer FK para `auth.users` — usar `profiles.id`.

## Roles / Permissões
- **Não existe tabela `user_roles` ainda.** Todos os usuários autenticados têm o mesmo nível.
- RLS por `user_id = auth.uid()` já isola dados por usuário.
- Se admin precisar existir, seguir instrução `<user-roles>` do sistema (tabela separada + enum + `has_role` SECURITY DEFINER). **Nunca guardar role em `profiles`.**

## Portal público de fornecedor
- Rota `/cotacao/:token` fora do guard.
- Backend usa funções `SECURITY DEFINER` que validam `token_publico` e `data_expiracao`.
- Fornecedor não autentica — apenas submete via RPC `submit_public_proposta`.
