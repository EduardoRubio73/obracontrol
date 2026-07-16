# 21 - Data Model (ERD)

```mermaid
erDiagram
  profiles ||--o{ obras : "user_id"
  obras ||--o{ obra_fases : ""
  obras ||--o{ compras : ""
  obras ||--o{ financeiro : ""
  obras ||--o{ cotacoes : ""
  obras ||--o{ documentos : ""
  obras ||--o{ obra_alteracoes : ""
  obras ||--o{ obra_status_historico : ""
  obras ||--|| obra_dossie : ""
  obra_fases ||--o{ fase_itens : ""
  obra_fases ||--o{ fase_fotos : ""

  cotacoes ||--o{ cotacao_fornecedores : ""
  cotacoes ||--o{ itens_cotacao : ""
  cotacoes ||--o{ propostas : ""
  fornecedores ||--o{ cotacao_fornecedores : ""
  fornecedores ||--o{ propostas : ""
  fornecedores ||--|| fornecedor_metricas : ""
  propostas ||--o{ proposta_itens : ""

  produtos ||--o{ compras : ""
  categorias_produtos ||--o{ produtos : ""
  unidades_medida ||--o{ produtos : ""
  tipos_obra ||--o{ obras : ""
  tipos_fornecedor ||--o{ fornecedores : ""

  etapas_padrao ||--o{ tarefas_padrao : ""

  obras ||--o{ alertas_sistema : ""
  obra_fases ||--o{ alertas_sistema : ""

  auditoria }o--|| profiles : "user_id"
```

## Relacionamentos-chave
- `obras.user_id` = `auth.uid()` (não FK para `auth.users`; conceitual via `profiles.id`).
- `fase_itens` dispara triggers que atualizam `obra_fases` e criam `alertas_sistema`.
- `propostas` dispara triggers que atualizam `fornecedor_metricas` e `fornecedores.status`.
- `cotacoes.token_publico` é o único identificador usado pelo portal público.
- `compras.produto_id` → `produtos.id` **ON DELETE RESTRICT** (não permite excluir produto usado).
