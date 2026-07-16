## Objetivo

Substituir o protótipo Flask/SQLite (`core/`, `parsers/`, `web/`) por uma implementação nativa dentro do ObraControl: uma Supabase Edge Function faz parse + classificação + matching, e o modal "Gerenciar produtos" no React vira a UI de upload/revisão/commit, gravando nas tabelas reais (`produtos`, `fornecedores`, `compras`, `cotacoes`, `itens_cotacao`, `cotacao_fornecedores`, `propostas`, `proposta_itens`).

## Arquitetura

```text
Modal "Gerenciar produtos" (Configuracoes.tsx)
        │  1) upload arquivo(s) → Supabase Storage (bucket "documentos")
        ▼
Edge Function  importar-documento  (parse + classify + match)
        │  retorna JSON de preview (fornecedor sugerido, itens, matches)
        ▼
Tela de Revisão (novo componente)
        │  usuário confirma matches + escolhe obra
        ▼
Edge Function  commitar-importacao  (grava nas tabelas)
```

Duas funções separadas para manter o bundle pequeno (parsers PDF/DOCX pesam) e permitir reprocessamento sem re-gravar.

## Passos

### 1. Backend — Edge Functions (TypeScript, Deno)

**`supabase/functions/importar-documento/index.ts`**
- Recebe `{ storage_path }` de arquivo já enviado ao bucket `documentos`.
- Detecta formato pela extensão e faz parse:
  - CSV/TSV: parser manual (split por linha/delim, detecta separador `,` `;` `\t`)
  - XLSX: `npm:xlsx` (SheetJS) — lê primeira planilha, converte em `rows[]`
  - DOCX: `npm:mammoth` → HTML → extrai tabelas + parágrafos de cabeçalho
  - PDF: `npm:unpdf` (Deno-friendly) → texto por linha, reconstrói tabela por heurística de colunas
  - MD/TXT: linhas + detecção de tabela pipe-markdown
- Porta `core/normalize.ts`: `normalize_name`, `normalize_unit`, `parse_decimal_br`, `extract_header_metadata` (regex CNPJ, cidade, nº doc, fornecedor).
- Porta `core/classify.ts`: regras determinísticas (`pedido`/`cotacao`/`ordem_venda`/`lista_precos`) com sinais no texto.
- Porta `core/matching.ts`: fuzzy com Levenshtein/token-set (implementação inline curta, sem `rapidfuzz`), thresholds 90/60. Fornecedor via CNPJ exato quando presente; fallback fuzzy ignorando stopwords ("materiais", "ltda", "eireli", "me"…). Produto por `nome_normalizado + unidade`. Categoria por palavra-chave (Hidráulica, Elétrica, Cimentício, Madeira, Ferragens, EPI, Ferramentas, Acabamento, Alvenaria, Diversos).
- Consulta `produtos`, `fornecedores`, `categorias_produtos`, `unidades_medida` do próprio user (via cliente Supabase com o JWT do chamador) para alimentar o matching.
- Retorna preview JSON: `{ source_file, meta, tipo_documento, confianca, fornecedor_match, items: [{nome_original, nome_normalizado, unidade, quantidade, valor, produto_match:{score,match}, categoria_sugerida, codigo_origem}] }`.

**`supabase/functions/commitar-importacao/index.ts`**
- Recebe `{ preview, decisions, obra_id }`.
- Valida input com Zod. Verifica JWT.
- Aplica lógica de `commit_import` do `pipeline.py`:
  - Cria/reutiliza fornecedor (respeita decision).
  - Para cada item: `link:<id>` reutiliza; `new` cria produto (com categoria+unidade get-or-create); `auto` usa match.
  - Cache local (nome_normalizado, unidade) evita duplicata dentro do mesmo doc.
  - `pedido`/`ordem_venda`/`lista_precos` → grava em `compras` (vinculado a `obra_id`).
  - `cotacao` → cria `cotacoes` (com `obra_id`), `cotacao_fornecedores`, `propostas`, `itens_cotacao`, `proposta_itens`.
- Retorna `{ ok:true, tipo, ids_criados }`.

**Segurança/CORS**: `corsHeaders` de `npm:@supabase/supabase-js@2/cors`, validação JWT em código, `service_role` só internamente. RLS existente das tabelas já cobre o `user_id`.

**Sem mudanças de schema** — as tabelas já existem. Apenas confirmar que `compras.obra_id`, `cotacoes.obra_id` aceitam o vínculo (já aceitam).

### 2. Frontend — Modal e tela de revisão

Editar `src/pages/Configuracoes.tsx`:
- Modal "Gerenciar produtos" hoje vazio → passar a ter:
  - Dropzone (drag-and-drop + botão) aceitando `.csv .xlsx .docx .pdf .md .txt` (limite 20 MB, múltiplos arquivos).
  - Upload para `documentos` bucket (path: `imports/{user_id}/{uuid}-{filename}`).
  - Chama `supabase.functions.invoke('importar-documento', { body: { storage_path } })`.
  - Mostra spinner + progresso arquivo-a-arquivo.

Novo componente `src/components/produtos/RevisaoImportacaoDialog.tsx`:
- Recebe o preview retornado.
- Cabeçalho: tipo detectado (badge), confiança, fornecedor detectado (com match + botão "criar novo/vincular a existente").
- **Select obrigatório de Obra** (usa `obras` do hook `useObraAtiva`, default = obra ativa se houver).
- Tabela de itens: nome original, unidade, qtd, valor, categoria sugerida, e coluna "Decisão" com `Select`:
  - "Vincular a: <produto match>" (default se score ≥ 90)
  - "Revisar → escolher produto existente" (Combobox listando `produtos`)
  - "Criar novo produto"
- Botão "Confirmar importação" → `supabase.functions.invoke('commitar-importacao', { body: { preview, decisions, obra_id } })`.
- Toast de sucesso + invalidação das queries de produtos/fornecedores/compras/cotações.

### 3. Limpeza

- Manter arquivos Python em `core/`, `parsers/`, `web/` intactos (o usuário disse que já estão no GitHub) — apenas ignorar do build (já estão fora de `src/`, Vite não toca).
- Adicionar comentário no `README.md` do projeto apontando que o pipeline foi portado para as edge functions.

## Fora do escopo (para conversas futuras)

- OCR / PDFs escaneados (imagem) — README diz "adicionar depois".
- Fallback LLM de classificação para documentos sem sinal explícito.
- Embeddings/pgvector para matching de produto em escala.
- Import em lote (mais de 1 arquivo por commit) — MVP faz um por vez.
- Botão de download do modelo CSV e "importar catálogo de fornecedor" (placeholders atuais).

## Detalhes técnicos

- **Deps das edge functions** (via `npm:` specifiers, sem `deno.json`): `xlsx`, `mammoth`, `unpdf`, `zod`, `@supabase/supabase-js`. Bundle previsto ~2-3 MB, abaixo do limite de 5 MB. Se `mammoth` estourar, cair para parse XML manual do `word/document.xml` (é ZIP).
- **Fuzzy inline**: implementação leve de Levenshtein + token-set ratio (30 linhas), thresholds do README (≥90 auto, 60-90 revisão, <60 novo).
- **Normalização BR**: `parse_decimal_br("1.234,56") → 1234.56`, unidades canônicas (`un`, `kg`, `m`, `m2`, `m3`, `l`, `pc`, `sc`, `cx`, `pct`, `rl`, `br`, `pa`).
- **Header metadata**: regex para CNPJ (`\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}`), cidade (padrão "Cidade/UF"), nº documento ("Pedido nº", "Cotação nº", "OV").
- **CORS**: preflight `OPTIONS` respondido; headers em todas as respostas (inclusive erro).
- **Erros do provedor**: cada erro retorna `{ error, status, details }` com o body do parser para debug.
- **Grants**: nenhuma tabela nova; não há GRANT novo.

## Arquivos afetados

- Novos: `supabase/functions/importar-documento/index.ts`, `supabase/functions/commitar-importacao/index.ts`, `src/components/produtos/RevisaoImportacaoDialog.tsx`, `src/components/produtos/UploadDropzone.tsx`.
- Editados: `src/pages/Configuracoes.tsx` (preenche modal "Gerenciar produtos" e liga ao fluxo).
- Intocados: `core/`, `parsers/`, `web/` (Python continua no repo como referência).
