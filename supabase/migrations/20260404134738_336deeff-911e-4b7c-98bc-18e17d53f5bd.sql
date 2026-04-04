
CREATE TABLE public.proposta_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposta_itens_user" ON public.proposta_itens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM propostas p
    JOIN cotacoes c ON c.id = p.cotacao_id
    JOIN obras o ON o.id = c.obra_id
    WHERE p.id = proposta_itens.proposta_id AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM propostas p
    JOIN cotacoes c ON c.id = p.cotacao_id
    JOIN obras o ON o.id = c.obra_id
    WHERE p.id = proposta_itens.proposta_id AND o.user_id = auth.uid()
  )
);
