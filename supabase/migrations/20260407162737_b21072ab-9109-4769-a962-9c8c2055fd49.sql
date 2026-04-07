-- 1. Create tipos_fornecedor table
CREATE TABLE public.tipos_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tipos_fornecedor ENABLE ROW LEVEL SECURITY;
CREATE POLICY tipos_fornecedor_user ON tipos_fornecedor FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. Add descricao column to existing config tables
ALTER TABLE categorias_produtos ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE tipos_obra ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE unidades_medida ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE etapas_padrao ADD COLUMN IF NOT EXISTS descricao text;

-- 3. Add FK with RESTRICT on produtos.categoria_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_produtos_categoria') THEN
    ALTER TABLE produtos ADD CONSTRAINT fk_produtos_categoria
      FOREIGN KEY (categoria_id) REFERENCES categorias_produtos(id) ON DELETE RESTRICT;
  END IF;
END $$;