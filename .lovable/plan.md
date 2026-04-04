

# Plano: Tela de Seleção de Fornecedores (Step 5 do Wizard)

## Visao Geral

Reformular o Step 5 do wizard `/nova-obra` para ser uma tela completa de seleção de fornecedores com: sugestões automáticas via `fn_sugerir_top3_fornecedores`, remoção/adição manual, validação (min 1, max 3), card de resumo, e criação de cotação com fornecedores escolhidos via nova função DB.

## O que ja existe

- Step 5 em `NovaObra.tsx` (linhas 453-531): lista todos os fornecedores ativos com checkboxes, destaca recomendados
- Função DB `fn_sugerir_top3_fornecedores(complexidade)` que retorna top 3 baseado em categoria
- Lógica de criação de cotação inline no `criarObra` mutation (linhas 153-196)

## O que muda

### 1. Nova função DB: `fn_criar_cotacao_com_fornecedores`

```sql
fn_criar_cotacao_com_fornecedores(
  p_obra_id uuid,
  p_descricao text,
  p_fornecedores_ids uuid[]
) RETURNS uuid
```

- Cria cotação com status `enviada` e token público
- Vincula cada fornecedor via `cotacao_fornecedores`
- Retorna o `cotacao_id`

Substitui a lógica inline que existe hoje no frontend.

### 2. Reformular Step 5 em `NovaObra.tsx`

**Header**: "Selecionar Fornecedores" + subtítulo "Selecionamos os melhores profissionais para sua obra"

**Carga inicial**: Chamar `fn_sugerir_top3_fornecedores(classificacao)` via RPC para pré-selecionar automaticamente os fornecedores sugeridos. Exibir esses como lista pré-selecionada.

**Card de fornecedor**: Exibir nome, categoria, tipo (badge), score, telefone. Botão "Remover" (❌) em vez de checkbox.

**Card "Adicionar Fornecedor"**: Select/autocomplete que busca de `fornecedores` (filtra os já selecionados). Botão adicionar.

**Validação**: Min 1, max 3. Mostrar aviso visual.

**Card Resumo**: Total selecionados + mensagem "Você pode enviar para até 3 fornecedores".

**Botão principal**: "Enviar Cotação" — chama `fn_criar_cotacao_com_fornecedores` via RPC.

### 3. Ajuste no fluxo `criarObra`

- Separar criação da obra (step 5 → cria obra) da criação da cotação (novo step intermediário ou ação do botão "Enviar Cotação")
- Após envio: redirecionar para `/cotacoes` (ou página de acompanhamento)

### 4. Após envio

- Registrar no dossiê: `solicitacao_enviada`
- Redirecionar para `/cotacoes` ou tela de acompanhamento

## Detalhes Tecnicos

- **Migration**: 1 nova função `fn_criar_cotacao_com_fornecedores` (SECURITY DEFINER para poder ler `obras.user_id`)
- **Frontend**: Reescrever step 5 em `NovaObra.tsx` com nova UX (cards com remove, autocomplete para add, resumo, validação)
- **RPC**: `supabase.rpc('fn_criar_cotacao_com_fornecedores', { p_obra_id, p_descricao, p_fornecedores_ids })`
- **Query inicial**: `supabase.rpc('fn_sugerir_top3_fornecedores', { p_complexidade: classificacao })` para auto-selecionar

## Ordem

1. Migration: criar `fn_criar_cotacao_com_fornecedores`
2. Reescrever Step 5 UI com auto-seleção, add/remove, validação, resumo
3. Integrar RPC no fluxo de criação
4. Registrar dossiê + redirect pós-envio

