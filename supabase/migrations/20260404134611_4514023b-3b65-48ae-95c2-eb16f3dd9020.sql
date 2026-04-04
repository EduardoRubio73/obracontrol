
-- 1. Add user_id as nullable first
ALTER TABLE public.financeiro ADD COLUMN user_id uuid;

-- 2. Backfill from obras.user_id
UPDATE public.financeiro f SET user_id = o.user_id FROM public.obras o WHERE o.id = f.obra_id;

-- 3. Set default and make NOT NULL
ALTER TABLE public.financeiro ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.financeiro ALTER COLUMN user_id SET NOT NULL;

-- 4. Drop tenant-based policies
DROP POLICY IF EXISTS "obras_policy" ON public.obras;
DROP POLICY IF EXISTS "tenant_only_obras" ON public.obras;
DROP POLICY IF EXISTS "cotacoes_policy" ON public.cotacoes;
DROP POLICY IF EXISTS "financeiro_policy" ON public.financeiro;
DROP POLICY IF EXISTS "fornecedores_policy" ON public.fornecedores;
DROP POLICY IF EXISTS "propostas_policy" ON public.propostas;
DROP POLICY IF EXISTS "auditoria_policy" ON public.auditoria;

-- 5. Create user_id-based policies
CREATE POLICY "financeiro_user" ON public.financeiro FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auditoria_user" ON public.auditoria FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
