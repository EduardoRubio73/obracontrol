
-- Categorias de produtos
CREATE TABLE public.categorias_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.categorias_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_user" ON public.categorias_produtos FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Produtos
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  categoria_id uuid REFERENCES public.categorias_produtos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  unidade text DEFAULT 'un',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produtos_user" ON public.produtos FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
