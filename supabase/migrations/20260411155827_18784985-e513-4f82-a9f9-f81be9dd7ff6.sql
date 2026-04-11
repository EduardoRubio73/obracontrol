CREATE OR REPLACE FUNCTION public.get_public_cotacao_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  descricao text,
  data_expiracao timestamp without time zone,
  obra_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.descricao, c.data_expiracao, o.nome AS obra_nome
  FROM public.cotacoes c
  JOIN public.obras o ON o.id = c.obra_id
  WHERE c.token_publico = p_token
    AND (c.data_expiracao IS NULL OR c.data_expiracao >= now())
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_cotacao_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_itens_cotacao_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  nome text,
  quantidade numeric,
  unidade text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.nome, i.quantidade, i.unidade, i.created_at
  FROM public.itens_cotacao i
  JOIN public.cotacoes c ON c.id = i.cotacao_id
  WHERE c.token_publico = p_token
    AND (c.data_expiracao IS NULL OR c.data_expiracao >= now())
  ORDER BY i.created_at
$$;

GRANT EXECUTE ON FUNCTION public.get_public_itens_cotacao_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_public_cotacao_view(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cotacao_fornecedores cf
  SET status = 'visualizado',
      data_visualizacao = now()
  FROM public.cotacoes c
  WHERE c.id = cf.cotacao_id
    AND c.token_publico = p_token
    AND cf.status = 'enviado';
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_public_cotacao_view(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_proposta(
  p_token text,
  p_empresa text,
  p_prazo_dias integer,
  p_itens jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cotacao_id uuid;
  v_fornecedor_id uuid;
  v_proposta_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_public_user_id constant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  IF COALESCE(trim(p_empresa), '') = '' THEN
    RAISE EXCEPTION 'Informe o nome da empresa';
  END IF;

  SELECT c.id
  INTO v_cotacao_id
  FROM public.cotacoes c
  WHERE c.token_publico = p_token
    AND (c.data_expiracao IS NULL OR c.data_expiracao >= now())
  LIMIT 1;

  IF v_cotacao_id IS NULL THEN
    RAISE EXCEPTION 'Cotação não encontrada ou expirada';
  END IF;

  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Proposta sem itens';
  END IF;

  SELECT f.id
  INTO v_fornecedor_id
  FROM public.fornecedores f
  WHERE f.user_id = v_public_user_id
    AND lower(f.nome) = lower(trim(p_empresa))
  ORDER BY f.created_at NULLS LAST
  LIMIT 1;

  IF v_fornecedor_id IS NULL THEN
    INSERT INTO public.fornecedores (nome, user_id)
    VALUES (trim(p_empresa), v_public_user_id)
    RETURNING id INTO v_fornecedor_id;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_total := v_total
      + (COALESCE((v_item ->> 'quantidade')::numeric, 0)
      * COALESCE((v_item ->> 'valor_unitario')::numeric, 0));
  END LOOP;

  INSERT INTO public.propostas (cotacao_id, fornecedor_id, valor, prazo_dias, status)
  VALUES (v_cotacao_id, v_fornecedor_id, v_total, NULLIF(p_prazo_dias, 0), 'recebida')
  RETURNING id INTO v_proposta_id;

  INSERT INTO public.proposta_itens (proposta_id, nome, quantidade, valor_unitario)
  SELECT
    v_proposta_id,
    COALESCE(NULLIF(trim(elem ->> 'nome'), ''), 'Item'),
    COALESCE((elem ->> 'quantidade')::numeric, 0),
    COALESCE((elem ->> 'valor_unitario')::numeric, 0)
  FROM jsonb_array_elements(p_itens) AS elem;

  UPDATE public.cotacao_fornecedores cf
  SET status = 'respondeu',
      data_resposta = now()
  FROM public.cotacoes c
  WHERE c.id = cf.cotacao_id
    AND c.token_publico = p_token
    AND cf.status IN ('enviado', 'visualizado');

  RETURN v_proposta_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_proposta(text, text, integer, jsonb) TO anon, authenticated;