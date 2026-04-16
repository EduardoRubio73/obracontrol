ALTER TABLE public.fase_itens ADD COLUMN IF NOT EXISTS executar_em date;
ALTER TABLE public.fase_itens ADD COLUMN IF NOT EXISTS criado_em timestamptz DEFAULT now();