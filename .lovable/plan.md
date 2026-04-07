

# Plano: Reestruturação de Navegação e Filtragem por Obra

## Resumo

Adicionar seletor de obra na tela inicial, renomear "Hoje" para "Início", tornar títulos dinâmicos com nome da obra, dividir Fornecedores em "vinculados à obra" e "todos", e substituir categorias estáticas por dados da tabela `tipos_fornecedor`.

---

## 1. Tela Inicial (`src/pages/Index.tsx`)

- Remover botão "Nova Obra" (bloco 3)
- Adicionar Select de obra no topo (usando `useObraAtiva()` — já existe e persiste no localStorage)
- Renomear "Hoje" → "Início" no array `menuItems`
- Manter os 5 botões: Início, Etapas, Compras, Financeiro, Contatos

## 2. Bottom Nav (`src/components/MobileBottomNav.tsx`)

- Renomear "Menu" → "Início"

## 3. Títulos Dinâmicos nas Páginas

Nas páginas Etapas, Compras, Financeiro, Cotações: adicionar título `"[Página] — {obraAtiva.nome}"` no topo, usando `useObraAtiva()`.

Arquivos: `Etapas.tsx`, `Compras.tsx`, `Financeiro.tsx`, `Cotacoes.tsx`

## 4. Fornecedores (`src/pages/Fornecedores.tsx`)

Dividir a listagem em duas seções:

- **Vinculados à Obra**: query que busca `fornecedor_id` distintos das tabelas `financeiro` e `compras` onde `obra_id = obraAtivaId`, e cruza com `fornecedores`
- **Todos os Fornecedores**: listagem atual completa

Substituir `CATEGORIAS_PROFISSIONAL` e `CATEGORIAS_LOJA` estáticas por query à tabela `tipos_fornecedor`. Adicionar máscara no campo telefone.

## 5. Combobox com Auto-cadastro

### 5.1 Etapas (`src/pages/Etapas.tsx`)
- Substituir `<select>` por combobox que permite digitar
- Se valor não existe em `etapas_padrao`, mostrar opção "Adicionar '[valor]' como etapa padrão"
- Ao salvar, inserir na tabela `etapas_padrao` primeiro, depois criar a fase

### 5.2 Fornecedores — campo Categoria
- Substituir select estático por combobox consumindo `tipos_fornecedor`
- Lógica de cadastro rápido: se valor novo, inserir em `tipos_fornecedor` antes de salvar fornecedor

## 6. Telefone com Máscara (`src/pages/Fornecedores.tsx`)
- Aplicar máscara `(XX) XXXXX-XXXX` no campo telefone via `onChange` handler

## 7. Sidebar (`src/components/AppSidebar.tsx`)
- Renomear "Hoje" → "Início" se existir

---

## Arquivos a editar

| Arquivo | Ação |
|---|---|
| `src/pages/Index.tsx` | Remover "Nova Obra", adicionar select obra, renomear Hoje→Início |
| `src/components/MobileBottomNav.tsx` | Renomear Menu→Início |
| `src/components/AppSidebar.tsx` | Renomear Hoje→Início |
| `src/pages/Etapas.tsx` | Título dinâmico, combobox com auto-cadastro |
| `src/pages/Compras.tsx` | Título dinâmico |
| `src/pages/Financeiro.tsx` | Título dinâmico |
| `src/pages/Cotacoes.tsx` | Título dinâmico |
| `src/pages/Fornecedores.tsx` | Seções vinculados/todos, categorias dinâmicas, máscara telefone, combobox categoria |
| `src/components/AppLayout.tsx` | Atualizar `routeLabels` (Hoje→Início) |

Nenhuma migration necessária — todas as tabelas já existem.

