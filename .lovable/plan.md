

# Plano: Reestruturar Configurações com CRUD Dinâmico e Descrições

## Resumo

Criar tabela `tipos_fornecedor` para CRUD independente, adicionar coluna `descricao` em todas as 5 tabelas de configuração, atualizar UI para suportar descrições e tornar dropdown de etapas 100% dinâmico.

---

## 1. Migration SQL

### 1.1 Criar tabela `tipos_fornecedor`

```sql
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
```

### 1.2 Adicionar coluna `descricao` nas 4 tabelas existentes

```sql
ALTER TABLE categorias_produtos ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE tipos_obra ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE unidades_medida ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE etapas_padrao ADD COLUMN IF NOT EXISTS descricao text;
```

### 1.3 Adicionar FK com RESTRICT em `produtos.categoria_id`

```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_produtos_categoria') THEN
    ALTER TABLE produtos ADD CONSTRAINT fk_produtos_categoria
      FOREIGN KEY (categoria_id) REFERENCES categorias_produtos(id) ON DELETE RESTRICT;
  END IF;
END $$;
```

## 2. Atualizar `src/integrations/supabase/types.ts`

Adicionar tipos para `tipos_fornecedor` e campos `descricao` nas tabelas existentes.

## 3. Refazer `src/pages/Configuracoes.tsx`

### Mudanças:

- **`CrudItem`** passa a ter `descricao?: string`
- **`useCrudTab`**: insert e update incluem `descricao`
- **`CrudTabContent`**: formulário com campo nome + descrição; listagem mostra descrição em `text-sm text-muted-foreground` abaixo do nome; edição inclui campo descrição
- **`FornecedorTiposTab`**: substituída por `<CrudTabContent table="tipos_fornecedor" label="tipo de fornecedor" />`

## 4. Atualizar `src/pages/Etapas.tsx`

- Remover lista estática `["Fundação", "Estrutura", "Acabamento", "Reforma"]`
- Dropdown consome apenas dados da tabela `etapas_padrao`
- Se tabela vazia, dropdown mostra "Nenhuma etapa padrão cadastrada"

---

## Arquivos a editar

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar `tipos_fornecedor`, adicionar `descricao` em 4 tabelas, FK restrict |
| `src/integrations/supabase/types.ts` | Adicionar tipos novos |
| `src/pages/Configuracoes.tsx` | CRUD com descrição, Tipos Fornecedor como CRUD real |
| `src/pages/Etapas.tsx` | Dropdown 100% dinâmico |

