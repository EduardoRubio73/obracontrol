
-- Set default for token_publico so future cotações always get a token
ALTER TABLE public.cotacoes
  ALTER COLUMN token_publico SET DEFAULT gen_random_uuid()::text;
