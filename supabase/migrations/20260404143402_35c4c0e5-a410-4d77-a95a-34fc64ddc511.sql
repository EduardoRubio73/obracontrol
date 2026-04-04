-- Add user_id to alertas_sistema
ALTER TABLE public.alertas_sistema ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.alertas_sistema ALTER COLUMN tenant_id DROP NOT NULL;

-- Fix RLS
DROP POLICY IF EXISTS "tenant_access_alertas" ON public.alertas_sistema;
CREATE POLICY "alertas_sistema_user" ON public.alertas_sistema FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Purchase suggestion view
DROP VIEW IF EXISTS public.vw_sugestao_compra;
CREATE VIEW public.vw_sugestao_compra
WITH (security_invoker = true)
AS
SELECT
  fi.id,
  f.obra_id,
  f.nome AS fase,
  fi.nome AS item,
  fi.valor_previsto,
  fi.valor_real,
  fi.valor_real - fi.valor_previsto AS diferenca,
  CASE
    WHEN fi.valor_real > fi.valor_previsto * 1.2 THEN 'renegociar'
    WHEN fi.valor_real > fi.valor_previsto THEN 'revisar'
    WHEN fi.valor_real = 0 AND fi.valor_previsto > 0 THEN 'comprar'
    ELSE 'ok'
  END AS acao
FROM fase_itens fi
JOIN obra_fases f ON f.id = fi.fase_id;

-- Function to generate system alerts
CREATE OR REPLACE FUNCTION public.gerar_alertas_sistema(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO alertas_sistema (user_id, entidade, entidade_id, tipo, mensagem)
  SELECT p_user_id, 'fase', f.id, 'atraso',
    'Fase "' || f.nome || '" está atrasada (prazo: ' || f.data_fim::text || ')'
  FROM obra_fases f
  JOIN obras o ON o.id = f.obra_id
  WHERE o.user_id = p_user_id
    AND f.status NOT IN ('concluido', 'cancelado')
    AND f.data_fim IS NOT NULL AND f.data_fim < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM alertas_sistema a
      WHERE a.entidade_id = f.id AND a.tipo = 'atraso' AND a.resolvido = false
    );

  INSERT INTO alertas_sistema (user_id, entidade, entidade_id, tipo, mensagem)
  SELECT p_user_id, 'obra', o.id, 'orcamento',
    'Obra "' || o.nome || '" gastou ' || ROUND(COALESCE(tot.gasto, 0) / NULLIF(o.valor_previsto, 0) * 100) || '% do orçamento'
  FROM obras o
  LEFT JOIN (SELECT obra_id, SUM(valor) AS gasto FROM financeiro WHERE tipo = 'despesa' GROUP BY obra_id) tot ON tot.obra_id = o.id
  WHERE o.user_id = p_user_id AND o.valor_previsto > 0
    AND COALESCE(tot.gasto, 0) / o.valor_previsto > 0.9
    AND NOT EXISTS (
      SELECT 1 FROM alertas_sistema a
      WHERE a.entidade_id = o.id AND a.tipo = 'orcamento' AND a.resolvido = false
    );

  INSERT INTO alertas_sistema (user_id, entidade, entidade_id, tipo, mensagem)
  SELECT p_user_id, 'fase', f.id, 'parada',
    'Fase "' || f.nome || '" está parada (0% de progresso)'
  FROM obra_fases f
  JOIN obras o ON o.id = f.obra_id
  WHERE o.user_id = p_user_id AND f.status = 'em_andamento'
    AND COALESCE(f.progresso, 0) = 0
    AND f.data_inicio IS NOT NULL AND f.data_inicio <= CURRENT_DATE - 7
    AND NOT EXISTS (
      SELECT 1 FROM alertas_sistema a
      WHERE a.entidade_id = f.id AND a.tipo = 'parada' AND a.resolvido = false
    );
END;
$$;