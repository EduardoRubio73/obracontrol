

# Plano: Cadastro de Produtos com Categorias + Seleção Multi-Select nos Itens da Cotação

## O que será feito

1. Criar tabelas `categorias_produtos` e `produtos` no banco de dados
2. Criar uma página de gestão de Produtos (CRUD completo) com filtro por categoria
3. Alterar o dialog "Itens da Cotação" para usar um multi-select de produtos cadastrados (em vez de digitar manualmente)

## Detalhes

### 1. Migration SQL — Novas tabelas

```sql
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
```

### 2. Nova página `src/pages/Produtos.tsx`

- Duas seções: **Categorias** (criar/editar/excluir) e **Produtos** (criar/editar/excluir)
- Filtro por categoria
- Campos do produto: nome, unidade, categoria
- Tabela listando todos os produtos com ações de editar/excluir
- Inline dialog para criar/editar categoria e produto

### 3. Rota e navegação

- Adicionar `/produtos` em `App.tsx` (rota protegida)
- Adicionar item "Produtos" no `AppSidebar.tsx` e `MobileBottomNav.tsx` com ícone `Package`

### 4. Alterar dialog "Itens da Cotação" em `Cotacoes.tsx`

- Substituir os inputs manuais por um **multi-select com busca** que lista os produtos cadastrados
- Agrupar por categoria no dropdown
- Ao selecionar produtos, preencher automaticamente nome e unidade
- Manter campo de quantidade editável por item selecionado
- Botão para adicionar todos os selecionados de uma vez à cotação

### Arquivos modificados
- 1 migration SQL (tabelas `categorias_produtos` e `produtos` + RLS)
- `src/pages/Produtos.tsx` (novo — CRUD completo)
- `src/App.tsx` (nova rota `/produtos`)
- `src/components/AppSidebar.tsx` (novo item nav)
- `src/components/MobileBottomNav.tsx` (novo item nav)
- `src/pages/Cotacoes.tsx` (refatorar dialog de itens para multi-select de produtos)

