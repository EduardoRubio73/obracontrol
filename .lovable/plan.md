

# Plano: Agente Retaguarda (Backoffice)

## Visao Geral

Criar um backoffice completo de gestao profissional, com dashboard, lista de obras com filtros, galeria de fotos, controle de materiais, documentos, configuracoes e auditoria. Boa parte da estrutura ja existe (Obras, Financeiro, Fornecedores, Cotacoes, Etapas, Dossie). O trabalho e expandir e conectar tudo num menu lateral completo.

## O que ja existe vs o que falta

**Ja existe:** Obras (CRUD + lista), Etapas, Financeiro (basico), Compras, Fornecedores, Cotacoes, Comparacao, Dossie/Timeline, Fotos (por fase), Alteracoes, Perfil, Produtos

**Falta criar:**
1. Dashboard de visao geral
2. Galeria centralizada da obra
3. Materiais (controle previsto vs utilizado)
4. Documentos (upload centralizado)
5. Relatorios (exportacao PDF/Excel)
6. Configuracoes (CRUD cadastros)
7. Auditoria (visualizacao do log)
8. Obras expandida (filtros, arquivar, duplicar)
9. Sidebar atualizada com menu completo

---

## Etapas de Implementacao

### 1. Migration: Storage bucket + tabela documentos_obra

- Criar bucket `documentos` (public: false) para uploads
- RLS no bucket: user pode ler/escrever seus proprios arquivos
- A tabela `documentos` ja existe mas sem RLS — adicionar policy `user_id = auth.uid()` e campo `user_id`

### 2. Dashboard (`/dashboard`)

Nova pagina com cards resumo:
- Obras ativas / concluidas / atrasadas (contagem)
- Custo total gasto vs previsto
- Alertas nao resolvidos
- Grafico simples de progresso (recharts 2.12.7)

Queries: agregar dados de `obras`, `financeiro`, `alertas_sistema`, `obra_fases`

### 3. Obras expandida (melhorar `/obras`)

- Adicionar filtros: ativa, concluida, arquivada (novo status)
- Botao "Arquivar" e "Duplicar" nas acoes
- Link para Dossie e Galeria a partir de cada obra
- Adicionar campo de busca

### 4. Galeria da Obra (`/obras/:id/galeria`)

Nova pagina que agrega todas as fotos de `fase_fotos` por obra:
- Filtro por tipo: antes / durante / depois
- Agrupamento por etapa
- Visualizacao em grid com lightbox

### 5. Materiais (`/obras/:id/materiais`)

Nova pagina baseada nos `fase_itens`:
- Lista de materiais com status (pendente / comprado / cancelado)
- Valores previstos vs reais
- Totalizadores

### 6. Documentos (`/obras/:id/documentos`)

Nova pagina:
- Upload de arquivos (PDF, imagens) para o bucket `documentos`
- Lista com nome, tipo, data, tamanho
- Download direto
- Vinculado a obra via `obra_id`

### 7. Relatorios (`/relatorios`)

Nova pagina com botoes de exportacao:
- Financeiro por obra → CSV
- Dossie completo → dados formatados (PDF via edge function futura)
- Por enquanto: exportar como CSV client-side

### 8. Configuracoes (`/configuracoes`)

Nova pagina com tabs:
- Categorias de produtos (CRUD — ja tem tabela `categorias_produtos`)
- Tipos de obra (lista estatica por enquanto)
- Unidades de medida

### 9. Auditoria (`/auditoria`)

Nova pagina que le a tabela `auditoria`:
- Lista cronologica: quem, quando, o que, tabela
- Filtros por data e tabela

### 10. Sidebar completa

Atualizar `AppSidebar.tsx` com menu profissional:

```text
Dashboard
Obras
  └ (sub-rotas: galeria, materiais, documentos, dossie)
Etapas
Financeiro
Compras
Cotacoes
Fornecedores
Relatorios
Configuracoes
Auditoria
Perfil
```

### 11. Routing

Adicionar em `App.tsx`:
- `/dashboard`
- `/obras/:id/galeria`
- `/obras/:id/materiais`
- `/obras/:id/documentos`
- `/relatorios`
- `/configuracoes`
- `/auditoria`

Manter `/` como menu mobile (Index) e `/dashboard` como visao desktop.

---

## Detalhes Tecnicos

- **Storage**: Supabase Storage bucket `documentos`, RLS por user_id no path
- **Graficos**: recharts 2.12.7 (ja instalado) para dashboard
- **Exportacao CSV**: client-side usando Blob + download
- **Auditoria**: tabela `auditoria` ja existe com dados
- **Documentos**: tabela `documentos` ja existe mas precisa de user_id e RLS
- **Animacoes**: mesmo padrao `menu-slide-up` com stagger nas novas paginas

## Ordem de Execucao

1. Migration (storage bucket + documentos RLS + user_id)
2. Dashboard
3. Obras expandida (filtros + acoes)
4. Galeria da Obra
5. Materiais
6. Documentos (upload)
7. Relatorios
8. Configuracoes
9. Auditoria
10. Sidebar + Routing

