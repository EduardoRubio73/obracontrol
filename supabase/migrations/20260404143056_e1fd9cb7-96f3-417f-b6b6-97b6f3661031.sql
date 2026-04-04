-- Drop existing view first
DROP VIEW IF EXISTS public.vw_fases_previsao;

-- Smart alerts function
CREATE OR REPLACE FUNCTION public.gerar_alertas_fase(p_obra_id uuid)
RETURNS TABLE (
  fase_id uuid,
  nome text,
  tipo text,
  mensagem text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.nome, 'atraso'::text,
    ('Fase atrasada — prazo era ' || f.data_fim::text)::text
  FROM obra_fases f
  WHERE f.obra_id = p_obra_id
    AND f.status NOT IN ('concluido', 'cancelado')
    AND f.data_fim IS NOT NULL
    AND f.data_fim < CURRENT_DATE
  UNION ALL
  SELECT f.id, f.nome, 'parada'::text,
    'Fase em andamento mas com 0% de progresso'::text
  FROM obra_fases f
  WHERE f.obra_id = p_obra_id
    AND f.status = 'em_andamento'
    AND (f.progresso IS NULL OR f.progresso = 0)
  UNION ALL
  SELECT f.id, f.nome, 'risco'::text,
    ('Progresso baixo (' || COALESCE(f.progresso, 0) || '%) — mais da metade do prazo já passou')::text
  FROM obra_fases f
  WHERE f.obra_id = p_obra_id
    AND f.status = 'em_andamento'
    AND f.data_inicio IS NOT NULL AND f.data_fim IS NOT NULL
    AND f.data_fim > f.data_inicio
    AND (CURRENT_DATE - f.data_inicio)::numeric / NULLIF((f.data_fim - f.data_inicio)::numeric, 0) > 0.5
    AND COALESCE(f.progresso, 0) < 30
  UNION ALL
  SELECT f.id, f.nome, 'aviso'::text,
    'Fase pendente sem data de início definida'::text
  FROM obra_fases f
  WHERE f.obra_id = p_obra_id
    AND f.status = 'pendente'
    AND f.data_inicio IS NULL
  UNION ALL
  SELECT f.id, f.nome, 'urgente'::text,
    ('Prazo termina em ' || (f.data_fim - CURRENT_DATE) || ' dias')::text
  FROM obra_fases f
  WHERE f.obra_id = p_obra_id
    AND f.status NOT IN ('concluido', 'cancelado')
    AND f.data_fim IS NOT NULL
    AND f.data_fim >= CURRENT_DATE
    AND f.data_fim <= CURRENT_DATE + 7;
END;
$$;

-- Prediction view with security_invoker
CREATE VIEW public.vw_fases_previsao
WITH (security_invoker = true)
AS
SELECT
  f.id,
  f.obra_id,
  f.nome,
  COALESCE(f.progresso, 0) AS progresso,
  CASE
    WHEN f.data_inicio IS NULL OR f.data_fim IS NULL OR f.data_fim <= f.data_inicio THEN NULL
    ELSE LEAST(ROUND(((CURRENT_DATE - f.data_inicio)::numeric / NULLIF((f.data_fim - f.data_inicio)::numeric, 0)) * 100, 1), 100)
  END AS progresso_esperado,
  CASE
    WHEN f.data_inicio IS NULL OR f.data_fim IS NULL OR f.data_fim <= f.data_inicio THEN NULL
    ELSE ROUND(COALESCE(f.progresso, 0) - LEAST(((CURRENT_DATE - f.data_inicio)::numeric / NULLIF((f.data_fim - f.data_inicio)::numeric, 0)) * 100, 100), 1)
  END AS diferenca_progresso,
  CASE
    WHEN f.data_inicio IS NULL OR f.data_fim IS NULL OR f.data_fim <= f.data_inicio THEN false
    ELSE COALESCE(f.progresso, 0) < LEAST(((CURRENT_DATE - f.data_inicio)::numeric / NULLIF((f.data_fim - f.data_inicio)::numeric, 0)) * 100, 100)
  END AS atrasado,
  f.status,
  f.data_inicio,
  f.data_fim
FROM obra_fases f
WHERE f.status NOT IN ('concluido', 'cancelado');