

# Plano: Corrigir Token Público + Limpar Espelho do Orçamento

## Problema 1: Token Público Nulo
Cotações criadas antes da adição do campo `token_publico` estão com valor `NULL`. O link `/cotacao/:token` quebra porque não encontra a cotação. A criação atual (linha 363) já gera token via `crypto.randomUUID()`, então só precisamos:

1. **Migration**: Adicionar um valor default `gen_random_uuid()` na coluna `token_publico` para que toda cotação futura já tenha token automaticamente.
2. **Backfill**: Atualizar cotações existentes com token nulo (3 registros encontrados).
3. **Fallback no frontend**: No `copyLink` e `handleSendToFornecedores`, se `token_publico` for null, gerar e salvar o token antes de usar.

## Problema 2: Espelho do Orçamento — Poluição Visual

Alterações no `handlePrintEspelho` (linhas 464-569 de Cotacoes.tsx):

1. **Cabeçalho**: Remover o `<h1>ObraControl</h1>` — manter apenas a imagem do logo + título "Espelho do Orçamento" centralizado e em destaque.
2. **Rodapé**: Remover "Documento gerado por ObraControl...". Substituir por linha de assinatura simples.
3. **Tabela**: Adicionar `tr:nth-child(even) { background: #f5f5f5; }` (já existe parcialmente, reforçar contraste). Garantir `width: 100%`.
4. **CSS @media print**: Adicionar regras para remover sombras, botões, fundo branco puro.

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Cotacoes.tsx` | Fallback de geração de token no `copyLink`/`handleSendToFornecedores`; limpar HTML do espelho |
| Migration SQL | Default `gen_random_uuid()` em `token_publico` + backfill cotações existentes |

## Rota Pública
Já está correta — `/cotacao/:token` está fora do `ProtectedRoute` no `App.tsx` (linha 80). O `PortalFornecedor` já busca por `.eq('token_publico', token)`. Nenhuma mudança necessária.

