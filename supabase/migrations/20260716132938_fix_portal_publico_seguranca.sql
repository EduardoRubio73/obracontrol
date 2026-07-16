-- Corrige duas falhas de seguranca no portal publico de fornecedores:
-- 1) get_public_fornecedor_nome aceitava qualquer uuid, sem exigir o token
--    da cotacao, permitindo enumerar nomes de fornecedores de qualquer usuario.
-- 2) submit_public_proposta aceitava itens arbitrarios (nao validados contra
--    itens_cotacao) e permitia reenvio duplicado pelo mesmo fornecedor/token.

DROP FUNCTION IF EXISTS public.get_public_fornecedor_nome(uuid);

CREATE OR REPLACE FUNCTION public.get_public_fornecedor_nome(p_id uuid, p_token text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.nome::text
  FROM public.fornecedores f
  JOIN public.cotacao_fornecedores cf ON cf.fornecedor_id = f.id
  JOIN public.cotacoes c ON c.id = cf.cotacao_id
  WHERE f.id = p_id
    AND c.token_publico = p_token
    AND (c.data_expiracao IS NULL OR c.data_expiracao >= now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_fornecedor_nome(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_fornecedor_nome(uuid, text) TO authenticated;

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
  v_itens_validos integer;
  v_itens_esperados integer;
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

  -- Todo item enviado precisa corresponder a um item real da cotacao (por nome).
  SELECT count(*) INTO v_itens_esperados FROM public.itens_cotacao WHERE cotacao_id = v_cotacao_id;

  SELECT count(*)
  INTO v_itens_validos
  FROM jsonb_array_elements(p_itens) AS elem
  WHERE EXISTS (
    SELECT 1 FROM public.itens_cotacao ic
    WHERE ic.cotacao_id = v_cotacao_id
      AND lower(trim(ic.nome)) = lower(trim(elem ->> 'nome'))
  );

  IF v_itens_esperados = 0 OR v_itens_validos <> jsonb_array_length(p_itens) THEN
    RAISE EXCEPTION 'Itens da proposta não correspondem aos itens da cotação';
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

  -- Bloqueia reenvio: mesma empresa (fornecedor "publico") ja respondeu esta cotacao.
  IF EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.cotacao_id = v_cotacao_id AND p.fornecedor_id = v_fornecedor_id
  ) THEN
    RAISE EXCEPTION 'Uma proposta desta empresa já foi enviada para esta cotação';
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
