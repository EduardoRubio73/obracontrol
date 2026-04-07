CREATE OR REPLACE FUNCTION public.marcar_comprado(p_compra_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_compra RECORD;
BEGIN
  SELECT * INTO v_compra FROM compras WHERE id = p_compra_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compra não encontrada'; END IF;

  UPDATE compras SET status = 'comprado' WHERE id = p_compra_id;

  INSERT INTO financeiro (obra_id, user_id, tenant_id, descricao, valor, tipo, data_transacao)
  VALUES (
    v_compra.obra_id, v_compra.user_id, v_compra.tenant_id,
    'Compra: ' || COALESCE(v_compra.descricao, 'Material'),
    COALESCE(v_compra.valor_total, 0), 'despesa', CURRENT_DATE
  );
END; $$;