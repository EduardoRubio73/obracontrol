

# ObraControl — Plano de Implementação

## Visão Geral
Sistema de gestão de obras com dashboard, controle financeiro, cotações, fornecedores e perfil de usuário. Tema azul (#0B5FFF) com fundo claro (#F5F7FA), cantos arredondados (12px). Logo do ObraControl incluída.

## Autenticação
- Tela de login/cadastro com email e senha usando Supabase Auth
- Proteção de rotas (redireciona para login se não autenticado)
- Tenant ID extraído do user_metadata para multi-tenancy

## Layout
- **Desktop**: Sidebar fixa à esquerda com logo ObraControl e links: Dashboard, Obras, Cotações, Financeiro, Fornecedores, Perfil
- **Mobile**: Bottom tab bar com ícones (Dashboard, Obras, Cotações, Financeiro, Perfil)

## Páginas

### 1. Dashboard (`/`)
- Cards de resumo: Valor Previsto, Valor Gasto, Economia (calculada: maior proposta - menor proposta por cotação)
- Gráfico de barras (Recharts) com dados do financeiro (receitas vs despesas)

### 2. Obras (`/obras`)
- Lista de obras com nome, status (badge colorido) e valor previsto
- Botões criar, editar, visualizar
- Formulário modal para criar/editar obra (nome, descrição, valor previsto, datas, localização)

### 3. Cotações (`/cotacoes`)
- Lista de cotações com descrição e status
- Ao clicar, abre detalhe com propostas aninhadas (valor, prazo, status)
- Possibilidade de aceitar proposta

### 4. Financeiro (`/financeiro`)
- Lista de transações (valor, tipo despesa/receita, data)
- Formulário para adicionar nova transação (valor, tipo, descrição, fornecedor)

### 5. Fornecedores (`/fornecedores`)
- Lista com nome, tipo, CNPJ, telefone
- Formulário para cadastro/edição

### 6. Perfil (`/perfil`)
- Exibir e editar nome, email, telefone, avatar

## UX
- Mobile: cards simplificados, botões grandes, fluxo linear
- Desktop: tabelas completas, sidebar fixa, gráficos no dashboard
- Feedback com toasts (sonner) em todas as ações CRUD

