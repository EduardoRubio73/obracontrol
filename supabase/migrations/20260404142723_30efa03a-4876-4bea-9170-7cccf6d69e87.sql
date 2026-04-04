-- Drop old tenant policies
DROP POLICY IF EXISTS "tenant_access_obra_fases" ON public.obra_fases;
DROP POLICY IF EXISTS "tenant_access_fase_itens" ON public.fase_itens;

-- New user-based policies
CREATE POLICY "obra_fases_user" ON public.obra_fases FOR ALL
USING (EXISTS (SELECT 1 FROM obras o WHERE o.id = obra_fases.obra_id AND o.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM obras o WHERE o.id = obra_fases.obra_id AND o.user_id = auth.uid()));

CREATE POLICY "fase_itens_user" ON public.fase_itens FOR ALL
USING (EXISTS (
  SELECT 1 FROM obra_fases f JOIN obras o ON o.id = f.obra_id
  WHERE f.id = fase_itens.fase_id AND o.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM obra_fases f JOIN obras o ON o.id = f.obra_id
  WHERE f.id = fase_itens.fase_id AND o.user_id = auth.uid()
));

-- Make tenant_id nullable since we don't use it
ALTER TABLE public.obra_fases ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.fase_itens ALTER COLUMN tenant_id DROP NOT NULL;