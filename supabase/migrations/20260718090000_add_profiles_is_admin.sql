-- Flag de admin em profiles, necessária para as policies de escrita do
-- catálogo mestre (templates/serviços/etapas/tarefas/insumos): somente
-- admin escreve, todos os usuários autenticados leem.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Função helper para as policies (evita repetir subquery em cada CREATE POLICY)
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION public.fn_is_admin() TO authenticated;
