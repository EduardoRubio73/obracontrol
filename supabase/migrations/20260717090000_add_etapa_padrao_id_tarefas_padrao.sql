-- Vincula opcionalmente uma Tarefa Padrão a uma Etapa Padrão (grupo).
-- Permite carregar todas as tarefas do grupo de uma vez ao criar uma etapa
-- numa obra com o mesmo nome padrão. ON DELETE SET NULL: excluir a etapa
-- padrão desvincula as tarefas em vez de apagá-las.
ALTER TABLE public.tarefas_padrao
  ADD COLUMN etapa_padrao_id uuid REFERENCES public.etapas_padrao(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tarefas_padrao_etapa_padrao_id
  ON public.tarefas_padrao (etapa_padrao_id);
