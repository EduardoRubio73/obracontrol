
CREATE OR REPLACE FUNCTION public.fn_criar_cotacao_com_fornecedores(
  p_obra_id uuid,
  p_descricao text,
  p_fornecedores_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cotacao_id uuid;
  v_token text;
  v_forn_id uuid;
BEGIN
  -- Generate public token
  v_token := gen_random_uuid()::text;

  -- Create cotação with status enviada
  INSERT INTO cotacoes (
    obra_id,
    descricao,
    status,
    token_publico,
    data_envio
  )
  VALUES (
    p_obra_id,
    p_descricao,
    'enviada',
    v_token,
    now()
  )
  RETURNING id INTO v_cotacao_id;

  -- Link each fornecedor
  FOREACH v_forn_id IN ARRAY p_fornecedores_ids
  LOOP
    INSERT INTO cotacao_fornecedores (
      cotacao_id,
      fornecedor_id,
      status,
      data_envio
    )
    VALUES (
      v_cotacao_id,
      v_forn_id,
      'enviado',
      now()
    );
  END LOOP;

  RETURN v_cotacao_id;
END;
$$;
