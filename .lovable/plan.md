

# Plano: Criar tabela `tarefas_padrao` e corrigir dropdown

## Problema

O dropdown de "Nova tarefa" dentro de uma etapa está listando as **etapas padrão** (Acabamento, Alvenaria, etc.) em vez de **tarefas**. Etapas e tarefas são conceitos distintos — etapas são fases da obra, tarefas são atividades dentro de cada etapa.

## Alterações

### 1. Migration SQL — criar tabela `tarefas_padrao`

```sql
CREATE TABLE public.tarefas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tarefas_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tarefas_padrao"
  ON public.tarefas_padrao FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 2. `src/pages/EtapaDetalhe.tsx`

- Trocar a query de `etapas_padrao` para `tarefas_padrao`
- No `createItem`, ao adicionar tarefa nova, inserir em `tarefas_padrao` (não em `etapas_padrao`)
- Atualizar textos: "Buscar tarefa..." em vez de "Buscar etapa..."
- Atualizar texto do botão "Adicionar como nova tarefa padrão"

### 3. `src/pages/Configuracoes.tsx`

- Adicionar aba "Tarefas Padrão" com CRUD para a nova tabela `tarefas_padrao`
- Manter a aba "Etapas Padrão" existente para gerenciar etapas

### Resultado

- Dropdown de nova tarefa lista **tarefas padrão** (ex: "Assentar piso", "Passar massa")
- Etapas padrão continuam separadas (ex: "Acabamento", "Alvenaria")
- Ambas gerenciáveis em Configurações

