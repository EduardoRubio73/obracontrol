ALTER TABLE public.compras DROP CONSTRAINT IF EXISTS compras_produto_id_fkey;
ALTER TABLE public.compras
  ADD CONSTRAINT compras_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE SET NULL;