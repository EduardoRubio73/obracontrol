# 14 - Workflows

## Criar obra (wizard — 7 passos)
```
NovaObra (/nova-obra)
   1. Nome + Tipo (tipos_obra, SmartCombobox)
   2. Classificação (simples/media/complexa)
   3. Planejamento: data_inicio (obrig.), data_prevista_conclusao (opc.),
      valor_previsto (opc.), localizacao (opc., p/ clima)
   4. Descrição livre → invoke('gerar-escopo', { descricao, tipo_obra,
      classificacao, data_inicio, data_prevista_conclusao, valor_previsto, localizacao })
   5. Revisão do escopo IA: cronograma calculado no cliente (date-fns, durações
      sequenciais), etapas+tarefas, materiais, mão de obra, alertas (prazo/clima/orçamento/segurança)
   6. Fornecedores em 2 seções: profissionais (fn_sugerir_top3_fornecedores,
      filtro tipo='profissional') e lojas (top3 client-side por score, tipo != 'profissional')
   7. Confirmação
   ↓ useCriarObra.mutate
   ├─► INSERT obras (com data_inicio, data_prevista_conclusao — informada ou
   │    calculada da soma das durações —, valor_previsto, localizacao, escopo_ia)
   ├─► INSERT obra_fases (sequenciais: fase N começa no dia seguinte ao fim da N-1)
   │    └─► INSERT fase_itens (executar_em = data_inicio da fase)
   ├─► INSERT obra_dossie 'obra_criada'
   ├─► se lojas: fn_criar_cotacao_com_fornecedores → itens_cotacao tipo='produto'
   │    (de escopo.materiais; fallback necessidades) + dossiê 'solicitacao_enviada'
   └─► se profissionais: fn_criar_cotacao_com_fornecedores → itens_cotacao
        tipo='mao_de_obra' (servico+escopo) + dossiê 'solicitacao_enviada'
```
O fluxo de chat (Chat.tsx) usa o mesmo hook com `fornecedoresLojas: []` e sem datas
(→ sem fases automáticas); escopos antigos sem `mao_de_obra` caem no fallback de
cotação única com `necessidades` como produto.

## Concluir item de fase
```
Toggle item (fase_itens.status=concluido)
   ↓ trigger fn_atualizar_progresso_fase → recalcula progresso
   ↓ trigger fn_status_fase → atualiza status da fase
   ↓ trigger fn_alerta_atraso → cria alerta se necessário
   ↓ auto_status_obra_execucao → obra 'planejamento' → 'execução'
   ↓ Query invalidation → UI atualiza
```

## Enviar cotação
```
Cotacoes (selecionar fornecedores + itens)
   ↓ fn_criar_cotacao_com_fornecedores(obra_id, descricao, [forn_ids])
   ├─► INSERT cotacoes (status='enviada', token_publico=uuid)
   └─► INSERT cotacao_fornecedores (status='enviado')
   ↓
Fornecedor abre /cotacao/:token
   ↓ track_public_cotacao_view → status='visualizado'
   ↓ Preenche proposta e envia
   ↓ submit_public_proposta → INSERT propostas + proposta_itens
   ↓ trigger_ranking → atualiza fornecedor_metricas
   ↓ trigger_avaliacao → atualiza fornecedores.score/status
```

## Importar documento
```
ImportarProdutosDialog (upload)
   ↓ Storage.upload(documentos/...)
   ↓ invoke('importar-documento', { storage_path })
   ├─► Parse (xlsx/mammoth/unpdf/csv/md/txt)
   ├─► Classify (pedido/cotacao/ordem_venda)
   └─► Match fuzzy (fornecedor + produtos + categorias)
   ↓ Preview + decisões do usuário + escolha da obra
   ↓ invoke('commitar-importacao', { preview, decisions, obra_id })
   ├─► INSERT compras/financeiro OU
   └─► INSERT cotacoes+itens_cotacao+propostas+proposta_itens
```

## Marcar compra como comprada
```
Compras (botão)
   ↓ rpc('marcar_comprado', { p_compra_id })
   ├─► UPDATE compras.status='comprado'
   └─► INSERT financeiro (despesa)
   ↓ Query invalidation
```

## Gerar relatório por obra
```
Relatorios (/obras/:id/relatorios)
   ↓ Tabs: Gerencial | Materiais | Financeiro | Dossiê
   ├─► Gerencial: vw_fases_previsao + vw_fase_eficiencia (por fase)
   ├─► Materiais: fase_itens (planejado) + compras (registrado, join produtos/fornecedores)
   ├─► Financeiro: vw_resumo_financeiro (resumo) + financeiro (transações)
   └─► Dossiê: obra_dossie (CSV) + link para /obras/:id/dossie (timeline completa)
   ↓ Export CSV → src/lib/csv.ts (downloadCsv)
   ↓ Export PDF → src/lib/pdf.ts (generatePdfFromHtml + html2pdf.js) → download ou anexo
```

## Chat assistente
```
Chat (input)
   ↓ invoke('chat-assistente', { messages, obraId })
   ↓ Fetch Lovable AI Gateway com contexto da obra
   ↓ Retorno renderizado com react-markdown
```
