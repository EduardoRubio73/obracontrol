

# Plano: Refatoração UI/UX — Sistema ObraControl

Este e um plano extenso com 5 frentes. Recomendo implementar em etapas para manter estabilidade.

---

## Etapa 1 — Reestruturação do Sidebar

**Arquivo:** `src/components/AppSidebar.tsx`

Reorganizar os 3 grupos de menu:

```text
📌 Principal
  ├── Dashboard    /dashboard
  └── Obras        /obras

🏗️ Gestão da Obra (quando obra selecionada)
  ├── Etapas       /etapas
  ├── Compras      /compras
  ├── Financeiro   /financeiro
  ├── Cotações     /cotacoes
  ├── Galeria      /galeria
  └── Documentos   /documentos

⚙️ Gestão
  ├── Assistente IA   /chat
  ├── Perfil          /perfil
  ├── Relatórios      /relatorios
  └── Config. Sistema /configuracoes
```

Remover Fornecedores e Produtos como itens de sidebar — migram para dentro de Configuracoes.

---

## Etapa 2 — Refatorar Configuracoes com novas abas agrupadas

**Arquivo:** `src/pages/Configuracoes.tsx`

Reorganizar as tabs:

| Aba | Conteudo |
|-----|---------|
| **Materiais** | Unidades de Medida, Categorias de Produto, Produtos (CRUD completo) |
| **Fornecedores** | Tipos de Fornecedor, Fornecedores (lista completa com CRUD) |
| **Etapas & Tarefas** | Etapas Padrao, Tarefas Padrao |
| **Tipos de Obra** | Tipos de Obra (manter) |

Cada aba tera sub-secoes com titulo e o CrudTabContent existente. A aba Materiais incluira tambem uma versao inline do cadastro de Produtos. A aba Fornecedores incluira a listagem de fornecedores.

---

## Etapa 3 — Combobox padrao + Validacao anti-duplicidade + Tooltips

**Novo componente:** `src/components/ui/smart-combobox.tsx`

- Input de texto com dropdown filtrado
- Opcao "Criar novo" quando digitado nao existe
- Verificacao em tempo real contra lista existente (badge "Ja existe" se duplicado)
- Usado em: modal Novo Produto (campo Categoria, campo Unidade), Etapas, Compras, etc.

**Tooltips:** Adicionar `<Tooltip>` do shadcn/ui (ja existe no projeto) nos campos de formularios com textos explicativos. Aplicar progressivamente nas paginas principais (Produtos, Etapas, Financeiro, Compras).

**Placeholders:** Revisar e padronizar placeholders descritivos em todos os campos de input.

---

## Etapa 4 — Refatorar pagina Produtos

**Arquivo:** `src/pages/Produtos.tsx`

- Remover botao "Nova Categoria" e card de categorias da pagina
- Manter apenas: search bar + filtro por categoria (dropdown) + grid de produtos
- Modal Novo Produto: campo Unidade carrega dinamicamente da tabela `unidades_medida`
- Campo Categoria usa o SmartCombobox

---

## Etapa 5 — Logica de Datas e Prazos

### 5a. Cards de Obra (`src/pages/Obras.tsx`, `src/pages/Index.tsx`)
- Calcular e exibir "Faltam X dias" com base em `data_prevista_conclusao`
- Badge colorido: verde (>30d), amarelo (7-30d), vermelho (<7d), cinza (sem data)

### 5b. Etapas (`src/pages/EtapaDetalhe.tsx`)
- Exibir duracao calculada (data_fim - data_inicio) em dias
- No modal Adicionar Tarefa: campo `executar_em` (date input)
- Exibir datas das tarefas nos cards

### 5c. Migration SQL
```sql
ALTER TABLE fase_itens ADD COLUMN IF NOT EXISTS executar_em date;
ALTER TABLE fase_itens ADD COLUMN IF NOT EXISTS criado_em timestamptz DEFAULT now();
```

---

## Etapa 6 — Gestao de Midia (Timestamps e Contexto)

### Fotos (`src/components/FasePhotos.tsx`, galeria)
- Exibir timestamp (`created_at`) no modal de visualizacao
- Exibir nome da obra e nome da etapa no modal

### Documentos (`src/pages/Documentos.tsx`)
- Exibir data/hora de upload na tabela e no modal de visualizacao
- Exibir nome da obra associada

---

## Arquivos Criados/Modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | `fase_itens`: add `executar_em`, `criado_em` |
| `src/components/ui/smart-combobox.tsx` | Novo componente padrao |
| `src/components/AppSidebar.tsx` | Reorganizar grupos |
| `src/pages/Configuracoes.tsx` | Novas abas agrupadas |
| `src/pages/Produtos.tsx` | Remover categorias, add search + filtro |
| `src/pages/Obras.tsx` / `Index.tsx` | Contador regressivo |
| `src/pages/EtapaDetalhe.tsx` | Datas, duracao, campo executar_em |
| `src/pages/Documentos.tsx` | Timestamps |
| `src/components/FasePhotos.tsx` | Contexto obra/etapa no modal |

---

## Ordem de Implementacao Sugerida

1. Migration SQL (base para tudo)
2. Sidebar (navegacao)
3. SmartCombobox (componente reutilizavel)
4. Configuracoes (abas agrupadas)
5. Produtos (refatoracao)
6. Datas e prazos
7. Gestao de midia

