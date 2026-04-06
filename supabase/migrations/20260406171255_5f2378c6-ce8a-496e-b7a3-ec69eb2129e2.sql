
-- 1. Recreate the function
CREATE OR REPLACE FUNCTION public.set_tenant_from_obra()
RETURNS trigger AS $$
DECLARE
  obra_tenant uuid;
BEGIN
  IF NEW.obra_id IS NOT NULL THEN
    SELECT tenant_id INTO obra_tenant FROM public.obras WHERE id = NEW.obra_id;
    NEW.tenant_id = obra_tenant;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop any existing triggers
DROP TRIGGER IF EXISTS trg_set_tenant_compras ON public.compras;
DROP TRIGGER IF EXISTS trg_set_tenant_financeiro ON public.financeiro;

-- 3. Create triggers
CREATE TRIGGER trg_set_tenant_compras
  BEFORE INSERT OR UPDATE ON public.compras
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_from_obra();

CREATE TRIGGER trg_set_tenant_financeiro
  BEFORE INSERT OR UPDATE ON public.financeiro
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_from_obra();

-- 4. Drop old problematic functions (CASCADE drops their triggers too)
DROP FUNCTION IF EXISTS public.validar_tenant_integridade() CASCADE;
DROP FUNCTION IF EXISTS public.validate_obra_tenant() CASCADE;
DROP FUNCTION IF EXISTS public.validar_tenant_fase() CASCADE;
