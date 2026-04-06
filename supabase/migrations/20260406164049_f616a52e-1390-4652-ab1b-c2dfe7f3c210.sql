
-- Create compras table
CREATE TABLE public.compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  produto_id uuid REFERENCES public.produtos(id),
  descricao text,
  quantidade numeric DEFAULT 1,
  valor_unitario numeric,
  valor_total numeric,
  status text DEFAULT 'pendente',
  observacao text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY compras_select ON public.compras FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY compras_insert ON public.compras FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY compras_update ON public.compras FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY compras_delete ON public.compras FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create etapas_padrao table
CREATE TABLE public.etapas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.etapas_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY etapas_padrao_select ON public.etapas_padrao FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY etapas_padrao_insert ON public.etapas_padrao FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY etapas_padrao_update ON public.etapas_padrao FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY etapas_padrao_delete ON public.etapas_padrao FOR DELETE TO authenticated USING (user_id = auth.uid());
