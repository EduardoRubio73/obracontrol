# 07 - API (Edge Functions)

Todas hospedadas em `https://<project-ref>.functions.supabase.co/<nome>` e chamadas via `supabase.functions.invoke`. **CORS liberado** com headers padrão + preflight `OPTIONS`.

Autenticação: header `Authorization: Bearer <access_token>` incluído automaticamente pelo SDK quando o usuário está autenticado. Funções internas usam `SUPABASE_SERVICE_ROLE_KEY` (`Deno.env.get`) — nunca exposto ao frontend.

## `POST /chat-assistente`
Chat com contexto da obra.
- Body: `{ messages: {role, content}[], obraId?: string }`
- Auth: **requer** usuário autenticado.
- Retorno: `{ reply: string }` (não-stream) — usa Lovable AI Gateway.
- Erros: 401 (sem token), 429 (rate), 500 (upstream).

## `POST /apoio-decisao`
Sugestão de fornecedores/decisões com base em `regras-decisao.ts`.
- Body: `{ obraId, contexto }`
- Retorno: `{ sugestoes: [...] }`

## `POST /gerar-escopo`
Gera o escopo completo da obra via IA (Lovable AI Gateway, tool-calling forçado).
- Body: `{ descricao: string (obrigatório), tipo_obra?, classificacao?, data_inicio?, data_prevista_conclusao?, valor_previsto?, localizacao? }`
- Retorno:
```ts
{
  descricao_estruturada: string,
  profissional_recomendado: 'empreiteiro'|'técnico'|'engenheiro'|'arquiteto',
  alertas_seguranca: string[],
  materiais: [{ nome, quantidade, unidade }],       // cotação para lojas
  mao_de_obra: [{ servico, escopo }],               // cotação para profissionais
  etapas: [{ nome, duracao_dias, tarefas: string[] }], // ordem de execução; clima já considerado
  alerta_prazo: string | null,     // viabilidade da pretensão de término do usuário
  alerta_clima: string | null,     // clima da região no período (se localizacao informada)
  alerta_orcamento: string | null, // compatibilidade do valor_previsto com o escopo
  necessidades: string[]           // derivado de materiais (retrocompat com fluxo de chat)
}
```
- A IA **nunca retorna datas** — só durações; o cliente calcula o cronograma (`useCriarObra`).
- Erros: 400 (sem descricao), 429 (rate), 402 (créditos), 500.

## `POST /importar-documento`
Parse + classificação + matching fuzzy.
- Body: `{ storage_path: string }` (path no bucket `documentos`)
- Retorno:
```ts
{
  meta: { fornecedor_nome?, cnpj?, cidade?, numero_documento? },
  tipo_documento: 'pedido' | 'cotacao' | 'ordem_venda' | 'desconhecido',
  confianca: number,
  fornecedor_match: { id?, nome, score } | null,
  items: [{
    nome_original, nome_normalizado, unidade, quantidade, valor,
    produto_match: { id?, nome, score } | null,
    categoria_sugerida?: string
  }]
}
```
- Formatos suportados: CSV, XLSX, DOCX, PDF (texto), MD, TXT (limite 20MB).

## `POST /commitar-importacao`
Persiste decisões da revisão nas tabelas reais.
- Body: `{ preview, decisions, obra_id }`
- Escreve em: `compras` + `financeiro` OU `cotacoes` + `cotacao_fornecedores` + `itens_cotacao` + `propostas` + `proposta_itens` conforme `tipo_documento`.
- **Exige `obra_id`.**

## RPC (via `supabase.rpc(...)`)
Ver `08-database.md` — funções PostgreSQL exportadas:
`fn_criar_obra_inteligente`, `fn_criar_cotacao_com_fornecedores`, `fn_criar_cotacao_automatica`,
`fn_sugerir_fornecedores`, `fn_sugerir_top3_fornecedores`,
`get_public_cotacao_by_token`, `get_public_itens_cotacao_by_token`,
`track_public_cotacao_view`, `submit_public_proposta`, `get_public_fornecedor_nome`,
`marcar_comprado`, `gerar_alertas_fase`, `gerar_alertas_sistema`,
`interpretar_comando_voz`, `mensagem_dia`, `expirar_cotacoes`.
