-- Adiciona suporte a itens de "mão de obra" (serviço) nas cotações, distintos
-- de itens de produto/material.
--
-- itens_cotacao.tipo: 'produto' (default, comportamento atual) | 'mao_de_obra'.
-- itens_cotacao.escopo: descrição do serviço pedido (só relevante para mao_de_obra).
--
-- Não é criada nenhuma coluna nova em proposta_itens/propostas: os campos já
-- existentes propostas.prazo_dias e propostas.observacoes passam a ser usados
-- (obrigatórios no client) como "prazo de execução" e "garantia/observações
-- do serviço" quando a cotação tem item de mão de obra — evita duplicar
-- semântica com uma coluna nova por item.

ALTER TABLE public.itens_cotacao
  ADD COLUMN tipo text NOT NULL DEFAULT 'produto' CHECK (tipo IN ('produto', 'mao_de_obra')),
  ADD COLUMN escopo text NULL;

-- Recria a function pública que expõe itens_cotacao para o portal do
-- fornecedor, agora incluindo tipo/escopo. DROP é necessário porque Postgres
-- não permite CREATE OR REPLACE mudar as colunas de retorno de uma function
-- RETURNS TABLE.
DROP FUNCTION IF EXISTS public.get_public_itens_cotacao_by_token(text);

CREATE FUNCTION public.get_public_itens_cotacao_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  nome text,
  quantidade numeric,
  unidade text,
  tipo text,
  escopo text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.nome, i.quantidade, i.unidade, i.tipo, i.escopo, i.created_at
  FROM public.itens_cotacao i
  JOIN public.cotacoes c ON c.id = i.cotacao_id
  WHERE c.token_publico = p_token
    AND (c.data_expiracao IS NULL OR c.data_expiracao >= now())
  ORDER BY i.created_at
$$;

GRANT EXECUTE ON FUNCTION public.get_public_itens_cotacao_by_token(text) TO anon, authenticated;

-- Adiciona p_observacoes (aditivo, DEFAULT NULL) para o portal público poder
-- enviar garantia/observações do serviço junto da proposta.
CREATE OR REPLACE FUNCTION public.submit_public_proposta(
  p_token text,
  p_empresa text,
  p_prazo_dias integer,
  p_itens jsonb,
  p_observacoes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cotacao_id uuid;
  v_owner_user_id uuid;
  v_fornecedor_id uuid;
  v_proposta_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_itens_validos integer;
  v_itens_esperados integer;
BEGIN
  IF COALESCE(trim(p_empresa), '') = '' THEN
    RAISE EXCEPTION 'Informe o nome da empresa';
  END IF;

  SELECT c.id, o.user_id
  INTO v_cotacao_id, v_owner_user_id
  FROM public.cotacoes c
  JOIN public.obras o ON o.id = c.obra_id
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
  WHERE f.user_id = v_owner_user_id
    AND lower(f.nome) = lower(trim(p_empresa))
  ORDER BY f.created_at NULLS LAST
  LIMIT 1;

  IF v_fornecedor_id IS NULL THEN
    INSERT INTO public.fornecedores (nome, user_id)
    VALUES (trim(p_empresa), v_owner_user_id)
    RETURNING id INTO v_fornecedor_id;
  END IF;

  -- Bloqueia reenvio: mesma empresa ja respondeu esta cotacao.
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

  INSERT INTO public.propostas (cotacao_id, fornecedor_id, valor, prazo_dias, observacoes, status)
  VALUES (v_cotacao_id, v_fornecedor_id, v_total, NULLIF(p_prazo_dias, 0), NULLIF(trim(p_observacoes), ''), 'recebida')
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

GRANT EXECUTE ON FUNCTION public.submit_public_proposta(text, text, integer, jsonb, text) TO anon, authenticated;
