-- Corrige perfis ausentes: a tabela profiles nunca teve um trigger que criasse
-- a linha no signup, entao profiles estava com 0 linhas para todos os usuarios.
-- update().eq("id", ...) na tela de Perfil dava "sucesso" sem alterar nada
-- (0 linhas afetadas nao gera erro no Postgrest).
--
-- Complicação: um trigger audit_trigger() esta anexado a profiles e tenta inserir
-- em auditoria.user_id (NOT NULL) usando auth.uid(). Quando o INSERT em profiles
-- vem de um contexto sem JWT autenticado (ex.: SQL Editor com service_role, ou
-- o próprio Supabase Auth criando a linha em auth.users no signup real),
-- auth.uid() retorna NULL, violando a constraint e abortando tudo.
--
-- Solução: desabilitar TRIGGER USER (triggers de usuário) ao redor dos INSERTs
-- de sistema (backfill e handle_new_user). Esses INSERTs nao sao açoes de um
-- usuario autenticado, entao nao faz sentido gerar uma linha de auditoria ali
-- mesmo. Triggers continuam ativos para updates posteriores feitos pelo usuario.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE public.profiles DISABLE TRIGGER USER;
  INSERT INTO public.profiles (id, email, nome)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'nome')
  ON CONFLICT (id) DO NOTHING;
  ALTER TABLE public.profiles ENABLE TRIGGER USER;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.profiles ENABLE TRIGGER USER;
  RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: cria a linha de profile para usuarios existentes que nunca tiveram uma
ALTER TABLE public.profiles DISABLE TRIGGER USER;
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.profiles ENABLE TRIGGER USER;
