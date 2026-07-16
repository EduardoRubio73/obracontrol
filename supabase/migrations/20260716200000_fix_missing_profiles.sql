-- Corrige perfis ausentes: a tabela profiles nunca teve um trigger que criasse
-- a linha no signup, entao profiles estava com 0 linhas para todos os usuarios,
-- fazendo update().eq("id", ...) na tela de Perfil dar "sucesso" sem alterar nada
-- (0 linhas afetadas nao gera erro no Postgrest).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'nome')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: cria a linha de profile para usuarios existentes que nunca tiveram uma
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
