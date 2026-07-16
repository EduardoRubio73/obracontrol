# 14 - Workflows

## Criar obra (wizard)
```
NovaObra (formulário)
   ↓ fn_criar_obra_inteligente(nome, tipo, classificacao, descricao)
   ├─► INSERT obras
   ├─► INSERT obra_fases (4 fases padrão conforme tipo)
   ├─► fn_criar_cotacao_automatica → INSERT cotacoes + cotacao_fornecedores (top3)
   └─► INSERT voz_comandos_log
   ↓
setObraAtivaId(novaObra.id)
   ↓
navigate("/etapas")
```

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

## Chat assistente
```
Chat (input)
   ↓ invoke('chat-assistente', { messages, obraId })
   ↓ Fetch Lovable AI Gateway com contexto da obra
   ↓ Retorno renderizado com react-markdown
```
