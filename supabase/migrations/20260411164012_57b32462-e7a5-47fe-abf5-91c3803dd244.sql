
CREATE OR REPLACE FUNCTION public.get_public_fornecedor_nome(p_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nome::text FROM fornecedores WHERE id = p_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_fornecedor_nome(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_fornecedor_nome(uuid) TO authenticated;
