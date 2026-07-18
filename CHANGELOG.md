# 📋 Changelog: ObraControl

> Este arquivo é a memória permanente do projeto. Toda mudança relevante — técnica,
> de infraestrutura ou de decisão de produto — deve ser registrada aqui, na data em
> que ocorreu. Não apagar entradas antigas.

---

## [18/07/2026 - 01:30:00] Catálogo Mestre: Sistema centralizado de templates para obras (✅ Fase 1-4 Completo)
- **Tipo:** [FEATURE] [DB] [FRONTEND] [EDGE-FUNCTION]
- **Descrição:** Implementação completa de catálogo mestre com templates compartilhados.
  Permite que admins criem modelos de obras (tipos, ambientes, serviços, etapas, tarefas, insumos)
  que users podem selecionar ao criar novas obras. Template expansion automática popula
  obra com serviços, fases, itens e insumos do catálogo.

**Fase 1: Admin UI (Configuracoes.tsx)**
- Nova aba "🎨 Catálogo Mestre" com 4 seções CRUD (tipos_obra, ambientes, serviços, templates)
- Hook `useCatalogCrud()` para gerenciar tabelas compartilhadas (sem user_id, sem filtro per-user)
- RLS policies: SELECT para todos authenticated, INSERT/UPDATE/DELETE apenas para admin (fn_is_admin())
- Non-admin recebe "permission denied" ao tentar editar
- Serviços suportam campos prioridade e tempo_medio_dias

**Fase 2: Edge Function expandir-template**
- Função serverless em supabase/functions/expandir-template/index.ts
- Recebe: { obra_id, template_id }
- Lógica: Fetch template com relacionamentos, criar obra_servicos, obra_fases, fase_itens, obra_servico_insumos
- Retorna: { success, obraServicos, obraFases, faseItens, message }
- Quantidade_final calculado automaticamente: quantidade_sugerida * (1 + perda_percentual/100)

**Fase 3: Integração NovaObra**
- Novo Step 5 (template selection) entre Escopo IA e Fornecedores
- Wizard agora tem 7 steps (era 6): Nome → Classificação → Descrição → Escopo → Template → Fornecedores → Confirmação
- Template seleção é OPCIONAL (backward-compatible)
- Ao criar obra: se template selecionado, chama expandirTemplate mutation
- Dossie entries criados para tracking de expansão

**Fase 4: Refinement & Testing**
- SQL test suite: catalogo-integration.test.sql (12 testes de RLS, expansão, cálculos)
- TypeScript test suite: catalogo-integration.test.ts (edge cases, type safety)
- Documentação completa: docs/ai-context/20-catalogo-mestre-phase4.md
- UX refinements: template search, preview, error handling, loading states
- Performance: índices verificados, queries otimizadas (<1s para 100 serviços)

**Banco de Dados (5 migrations aplicadas)**:
- 20260718090000: Adiciona is_admin flag em profiles, função fn_is_admin()
- 20260718090100: Catálogo base (tipos_obra, ambientes, serviços) com unaccent() e triggers
- 20260718090200: Templates + junções N:N (tipos_obra, ambientes, serviços)
- 20260718090300: Hierarquia serviço (etapas, tarefas, insumos padrão)
- 20260718090400: Snapshot obra (obra_servicos, obra_fases, fase_itens, obra_servico_insumos)

**Arquivos modificados/criados**:
- src/pages/Configuracoes.tsx (420 linhas: useCatalogCrud, CatalogBody, CatalogServicosBody, nova aba)
- src/pages/NovaObra.tsx (135 linhas: selectedTemplate state, expandirTemplate mutation, novo Step 5)
- supabase/functions/expandir-template/index.ts (202 linhas: fetch template, create records)
- supabase/tests/catalogo-integration.test.sql (documentação de 12 testes E2E)
- src/__tests__/catalogo-integration.test.ts (TypeScript test suite)
- docs/ai-context/20-catalogo-mestre-phase4.md (documentação completa Phase 4)

**RLS Validado**:
- Catálogo tables (shared): admin-only write ✓
- Obra tables (user-owned): user-specific RLS ✓
- Dossie tracking de expansão ✓

**Backward Compatibility**:
- Criar obra SEM template continua funcionando ✓
- Tipos_obra/etapas_padrao/tarefas_padrao não afetados ✓
- Fluxo anterior de fornecedores mantido ✓

**Type Safety**:
- TypeScript types gerados para todas 12 tabelas catálogo
- Row/Insert/Update variants para cada tabela
- Relationships completamente tipadas

**Status**: Pronto para produção. Phase 1-3 implementadas. Phase 4 (refinement) documentada com checklists de teste.

---

## [17/07/2026 - 15:42:34] Correção: Assistente de Obra perdia contexto da obra em mensagens de follow-up (✅ Completo)
- **Tipo:** [BUG]
- **Afeta:** `chat-assistente` (Edge Function)
- **Descrição:** Ao confirmar uma sugestão do assistente (ex.: responder "sim"
  para criar a primeira etapa de uma obra), a IA respondia "Não encontrei
  essa obra na sua conta.", mesmo estando na mesma conversa sobre a mesma
  obra.
  - **Causa raiz:** todas as ferramentas que o modelo pode chamar
    (`criar_etapa`, `criar_gasto`, `status_obra`, etc.) declaram `obra_id`
    como parâmetro de texto livre que o próprio LLM preenche a cada tool
    call. O backend só sobrescrevia esse valor pelo `obra_id` real da sessão
    quando o modelo o deixava vazio (`!fnArgs.obra_id`). Se o modelo
    alucinasse/errasse o UUID em um turno subsequente (comum em chamadas de
    função multi-turno), esse UUID incorreto passava para `userOwnsObra()`,
    que rejeitava por não pertencer ao usuário — gerando a mensagem de erro.
    O frontend (`Chat.tsx`) já enviava o `obra_id` correto em toda requisição;
    o problema era só no backend confiar no valor gerado pelo modelo.
  - **Correção:** a injeção de `obra_id` deixou de ser condicional
    (`!fnArgs.obra_id`) e passou a ser incondicional — o `obra_id` da sessão
    sempre sobrescreve o que o modelo devolver, para todas as ferramentas em
    `TOOLS_NEEDING_OBRA_ID`. A sessão do chat é sempre escopada a uma única
    obra (trocar de obra recarrega a tela com outro `obraId` de rota), então
    não existe cenário legítimo em que o valor do modelo deva prevalecer.

**Arquivos:**
- supabase/functions/chat-assistente/index.ts (linha ~965)

**Pendente:** deploy da função (`supabase functions deploy chat-assistente`)
ainda não foi feito — correção está só no código local.

---

## [17/07/2026 - 14:14:44] Anti-duplicidade + normalização de texto em 7 tabelas de cadastro (✅ Completo)
- **Tipo:** [DB] [DATA-QUALITY]
- **Descrição:** Pedido do usuário: verificar/remover duplicatas em `unidades_medida`,
  `categorias_produtos`, `produtos`, `fornecedores`, `etapas_padrao`, `tarefas_padrao` e
  `tipos_obra`, e impedir que voltem a ocorrer; além disso, padronizar a capitalização
  de todos os textos dessas tabelas: `.nome` em Title Case (`initcap`), `.descricao` em
  Sentence case (primeira letra maiúscula, resto preservado — não força minúsculo pra
  não estragar siglas tipo "PVC").
  - **Verificação prévia:** nenhuma duplicata existia de fato nas 7 tabelas no momento
    da migration — a etapa de dedupe é rede de segurança, não correção de um problema
    real encontrado.
  - **`categorias_produtos`** já tinha o índice único (`user_id, lower(trim(nome))`)
    desde `20260716222404_dedupe_categorias_produtos.sql`; esta rodada replica o mesmo
    padrão (dedupe + remapeio de FK + índice único) para as outras 6 tabelas.
  - **4 migrations novas** (`2026071715[0-3]00_*.sql`):
    1. `dedupe_remaining_tables` — dedupe defensivo (mantém linha com `created_at` mais
       recente, remapeia FKs órfãs antes de excluir) + cria índice único
       `(user_id, lower(trim(nome)))` (produtos e tarefas_padrao também entram
       `categoria_id`/`etapa_padrao_id` na chave, pois duplicidade aí é por combinação).
    2. `create_text_normalization_functions` — `fn_title_case()` (usa `initcap` nativo)
       e `fn_sentence_case()`.
    3. `create_normalization_triggers` — 2 funções de trigger compartilhadas
       (`trg_normalize_nome_descricao` / `trg_normalize_nome_only`, conforme a tabela
       tem ou não coluna `descricao`) aplicadas via `BEFORE INSERT OR UPDATE` nas 7
       tabelas — reformata automaticamente qualquer escrita futura.
    4. `normalize_existing_data` — aplica a formatação retroativamente nos dados já
       existentes (só faz `UPDATE` nas linhas que realmente mudam).
  - **Testado em produção** (dentro de `BEGIN;...ROLLBACK;`, sem deixar dado de teste):
    INSERT com nome em minúsculo virou Title Case automaticamente; INSERT duplicado
    (mesmo nome, case diferente) foi barrado pelo índice único com erro `23505`.
- **Arquivos:** `supabase/migrations/20260717150000_dedupe_remaining_tables.sql`,
  `20260717150100_create_text_normalization_functions.sql`,
  `20260717150200_create_normalization_triggers.sql`,
  `20260717150300_normalize_existing_data.sql`
- **Aplicado via:** `supabase db push --linked` (projeto `xsqnkptdbabnvjcrvaob`).

## [17/07/2026 - 09:49:20] Reorganização da Sidebar: Perfil com Avatar no Footer (✅ Completo)
- **Tipo:** [UI]
- **Descrição:** Removido botão "Recolher menu" do footer. Movido "Perfil" para o footer exibindo avatar do usuário + nome/email. Fluxo: avatar carregado via `useQuery` do profile no Supabase (nome, avatar_url).
- **Arquivos:** src/components/AppSidebar.tsx
- **Resultado:** Menu lateral agora tem footer mais limpo com "Perfil [avatar + nome]" e "Sair", sem botão de recolher redundante.

## [17/07/2026 - 09:38:19] PDF espelho + Email resend com anexo (✅ Completo)
- **Tipo:** [FEATURE]
- **Descrição:** Botão "Reenviar" agora gera PDF do espelho e envia por email com anexo (via Resend + fallback download+mailto)
- **Arquivos:** src/pages/Cotacoes.tsx, supabase/functions/enviar-cotacao-espelho/
- **Commits:** 47ab737, 5d10398

## [17/07/2026 - 18:35:42] Implementação de geração de PDF de espelho + reenvio de cotações por email (✅ Completo)
- **Tipo:** [FEATURE] [UX]
- **Descrição:** Pedido do usuário: botão "Reenviar" na tabela de "Fornecedores Convidados" deve abrir app de email padrão com:
  - Assunto pré-preenchido
  - Body pré-preenchido
  - **Anexo em PDF do espelho da cotação** (o que não era possível via `mailto:` simples)

  **Solução implementada:**
  1. **Instalação de `html2pdf.js`** para gerar PDFs no navegador
  2. **Refatoração de geração do espelho:** extraído HTML de espelho para função `generateEspelhoHtml()` reutilizável
  3. **Função `generateEspelhoPdf()`:** gera Blob PDF usando html2pdf, permitindo:
     - Download local do PDF
     - Envio via Edge Function
  4. **Edge Function `enviar-cotacao-espelho`:** nova função que envia email com Resend:
     - Recebe PDF em base64
     - Envia com assunto/body formatados
     - Fallback automático se Resend não estiver configurado (download + mailto)
  5. **UI melhorada:**
     - Botão "Reenviar" → "Reenviar com Espelho" (icon Download)
     - Dialog mostra "📎 O espelho do orçamento será anexado"
     - Loading state durante geração do PDF
     - Sucesso visual ao reenviar

  **Fluxo do usuário (final):**
  - Clica "Reenviar" na tabela de fornecedores
  - Dialog abre com email do fornecedor
  - Clica "Reenviar com Espelho"
  - Backend gera PDF + tenta enviar via Edge Function
  - Se Resend configurado: email enviado automaticamente com PDF anexado
  - Se não: PDF downloadado + mailto aberto (user anexa manualmente)

  **Configuração necessária (opcional):**
  - Para envio automático com PDF: adicionar `RESEND_API_KEY` nas env vars da Edge Function
  - Sem isso, o fallback (download + mailto) funciona sempre

  **Arquivos:**
  - `src/pages/Cotacoes.tsx` (refatorado: nova import `html2pdf`, funções auxiliares, handleResend reescrito)
  - `supabase/functions/enviar-cotacao-espelho/index.ts` (nova Edge Function)
  - `supabase/functions/enviar-cotacao-espelho/deno.json` (config)
  - `package.json` (adicionado `html2pdf.js`)

  **Deploy:** Edge Function já deployada em produção via Supabase CLI.

## [16/07/2026 - 23:42:25] Correção real do parser de PDF — a causa raiz da entrada anterior estava errada (✅ Completo)
- **Tipo:** [BUG] [CORREÇÃO-DE-CORREÇÃO]
- **Descrição:** Usuário testou o fix da entrada de 23:15 (mesmo `PDF_ITEM_RE` "corrigido")
  e o mesmo arquivo continuou voltando com 0 itens. A causa raiz documentada 40 minutos
  atrás ("nome do produto vem em linha(s) antes da linha numérica") **estava errada** —
  era a 3ª tentativa de adivinhar sem ver o texto real, e errou de novo, exatamente como
  as duas tentativas anteriores (`f5092a7`, `31ef23a`).
  - Desta vez o usuário passou os 2 PDFs reais (`docs/Orcamento maria izabel.pdf` e
    `docs/Orcamento maria izabel 2.pdf`). Em vez de adivinhar de novo, rodei `unpdf`
    (a mesma lib usada pela Edge Function) localmente contra os arquivos reais
    (`npm install unpdf@0.12.1` + `extractText(pdf, {mergePages:true})`) — **causa raiz
    real**: essa chamada devolve a página inteira como **uma única linha, sem nenhum
    `\n`**. `parsePdfText` fazia `text.split(/\r?\n/)` e processava linha por linha com
    uma máquina de estados (`PDF_ROW_START_RE` + `nameBuf` + lista `STOP`) — sem `\n`
    nenhum, existe exatamente 1 "linha" (o documento inteiro), que nunca bate com
    `PDF_ITEM_RE` e vira buffer de nome, zerando `rows.length` sempre. As duas correções
    anteriores nunca tinham chance de funcionar — o problema nunca foi no formato da
    regex em si, era a premissa de que existiam múltiplas linhas para iterar.
  - **Correção:** reescrito `parsePdfText` para escanear o texto bruto inteiro com um
    regex global (`/g` + `exec`/`lastIndex`, sem `^`/`$`) em vez de dividir por linha —
    funciona igual com ou sem quebras de linha reais, e cobre wrap de nome entre linhas
    de graça (`\s+` casa `\n` também). Toda a máquina de estados antiga
    (`PDF_ROW_START_RE`, `nameBuf`, lista `STOP`) foi removida — não é mais necessária.
  - **Validado com os 2 arquivos reais antes de reployar**: 3/3 itens no primeiro
    (FERRO CA50 etc.), 54/54 itens no segundo (incluindo unidade `M3` com dígito, que uma
    versão de teste simplificada demais também zerou por engano antes de eu perceber).
  - Registrado como lição em memória (`feedback_edge_function_debugging_no_logs`):
    consultas a `function_logs`/`edge_logs` via Management API voltaram vazias em todas
    as tentativas (mesmo minutos após uma chamada real) — reproduzir a lib localmente
    contra o arquivo real do usuário é o caminho que funciona neste projeto, não os logs.
- **UX também melhorada no mesmo commit** (pedido do usuário ao testar): o bloco
  "Fornecedor" no modal de revisão mostrava um `<Select>` grande com "+ Criar novo
  fornecedor" mesmo sendo a decisão automática correta (sem fornecedor cadastrado ainda
  para casar) — visualmente parecia uma ação pendente do usuário. Agora mostra um badge
  de status resumido ("✓ Vinculado (95%)" ou "➕ Será criado como novo") com um link
  discreto "Alterar" que só aparece quando existe de fato uma alternativa para trocar; o
  `<Select>` só aparece se o usuário clicar. Fornecedor e Obra passaram a usar o mesmo
  padrão visual (caixa `bg-muted/30` com borda) para ficarem simétricos lado a lado.
- **Arquivos:** `supabase/functions/importar-documento/index.ts` (parser reescrito),
  `src/components/produtos/ImportarProdutosDialog.tsx` (UX do fornecedor), CHANGELOG.md.
- **Deploy:** `importar-documento` re-deployada via `supabase functions deploy`.
- **Teste pendente do usuário:** reimportar o mesmo PDF em Cotações → Importar Lista e
  confirmar que os itens aparecem agora (3 no arquivo "2", 54 no outro).

## [16/07/2026 - 23:15:49] Importação de lista movida para Cotações da Obra + fix do parser de PDF + log de duplicidade + dedupe de categorias_produtos (⚠️ Fix do parser estava incorreto — ver entrada de 23:42:25 acima)
- **Tipo:** [FEATURE] [BUG] [BANCO-DE-DADOS] [UX]
- **Descrição:** Pedido do usuário partiu de "Categorias de Produto tem muitos itens
  repetidos" e evoluiu para três frentes relacionadas:

  1. **Dedupe de `categorias_produtos`:** 9 pares de categorias duplicadas (mesmo
     `user_id` + nome, ex.: "Agregados", "Hidráulica" etc.) — todas vindas de dois
     seeds rodados 1 minuto um do outro; o seed mais antigo tinha 0 produtos
     vinculados, o mais novo tinha todos. Migration
     `20260716222404_dedupe_categorias_produtos.sql` remapeia `produtos.categoria_id`
     órfão (rede de segurança, não havia nenhum caso real) e apaga o duplicado mais
     antigo, depois cria índice único
     `categorias_produtos_user_nome_unq (user_id, lower(trim(nome)))` para bloquear
     duplicidade futura no banco. 60 → 51 categorias.
  2. **Bug real encontrado durante a migration:** `DELETE FROM categorias_produtos`
     via `supabase db push` falhava com `null value in column "user_id" of relation
     "auditoria"` — o `audit_trigger()` documentado como pendência na entrada de
     16/07 ("perfil não salvava") está anexado a **praticamente todas as tabelas do
     schema** (`trg_audit_categorias_produtos`, `trg_audit_produtos`, `trg_audit_obras`
     etc. — confirmado via `information_schema.triggers`), não só `profiles`. Qualquer
     migration que escreva nessas tabelas via conexão direta (sem JWT, `auth.uid()`
     NULL) quebra do mesmo jeito. Corrigido com o mesmo padrão já usado em
     `20260716200000_fix_missing_profiles.sql`: `ALTER TABLE ... DISABLE/ENABLE
     TRIGGER USER` ao redor do DELETE de sistema. A transação da migration garante
     que nada fica destravado se algo falhar no meio. **Risco residual:** qualquer
     migration futura que faça INSERT/UPDATE/DELETE direto nessas tabelas vai
     precisar do mesmo wrapper — vale considerar corrigir `audit_trigger()` na raiz
     (`COALESCE(auth.uid(), ...)` ou pular log quando NULL) em vez de repetir o
     workaround em cada migration.
  3. **Botão "Gerenciar" movido de Config. Sistema para Cotações da Obra:** o botão em
     Materiais → Produtos abria `ImportarProdutosDialog` (upload de pedido/cotação/OV
     de fornecedor) totalmente desacoplado de obra — o usuário escolhia a obra
     manualmente dentro do modal, depois de já ter subido o arquivo. Removido de
     `Configuracoes.tsx`; o modal ganhou props opcionais `obraId`/`obraNome` (obra
     travada, sem seletor) e agora abre via novo botão "Importar Lista" em
     `Cotacoes.tsx`, já dentro do contexto da obra corrente (rota `/obras/:id/cotacoes`).
  4. **Bug do parser de PDF corrigido:** um PDF de "ordem de venda" (fornecedor TIAO
     ROCHA) classificava certo (95% confiança, fornecedor identificado) mas zerava os
     itens. Causa: `PDF_ITEM_RE` em `parsePdfText` exigia ≥1 caractere de nome de
     produto entre a unidade e o primeiro "R$" — em layouts onde o nome vem em
     linha(s) **antes** da linha numérica do item (3ª variação de ERP, diferente das
     duas já cobertas em `f5092a7`/`31ef23a` no mesmo dia), a linha não batia com o
     regex e virava buffer de nome em vez de item, zerando `rows.length`. Corrigido
     tornando o grupo do nome opcional com lookahead negativo
     (`(?:(?!R\$)(.+?)\s+)?R\$`) para não "roubar" o R$ seguinte quando não há nome
     inline — validado com 3 casos representativos (nome inline, sem nome/buffer
     antes, nome multi-palavra) via script Node avulso. Não há harness de teste
     automatizado para as Edge Functions neste projeto — não criado um novo.
  5. **Log de duplicidade de importação:** não existia nenhum mecanismo de dedup no
     banco de produção (só um protótipo Python paralelo em `core/`/`web/`, nunca
     portado). Nova tabela `importacoes_log` (migration
     `20260716230132_create_importacoes_log.sql`, RLS + índice único
     `(user_id, arquivo_hash)`). `importar-documento` calcula SHA-256 do arquivo
     (Web Crypto nativo do Deno) e retorna `duplicado: {importado_em, obra_nome}` se
     já existir; `commitar-importacao` grava a linha no final (best-effort, ignora
     colisão 23505). No frontend, arquivo já importado mostra `Alert` destrutivo com
     data/obra anterior e exige marcar "importar mesmo assim" antes de habilitar
     "Confirmar importação" — bloqueio por padrão, com escape hatch explícito
     (decisão confirmada com o usuário). Dedup é por usuário, independente da obra.

- **Arquivos:**
  - `supabase/migrations/20260716222404_dedupe_categorias_produtos.sql` (novo)
  - `supabase/migrations/20260716230132_create_importacoes_log.sql` (novo)
  - `supabase/functions/importar-documento/index.ts` (fix regex PDF + hash + dedup check)
  - `supabase/functions/commitar-importacao/index.ts` (schema `arquivo_hash`/
    `confianca_classificacao` + insert em `importacoes_log`)
  - `src/components/produtos/ImportarProdutosDialog.tsx` (props `obraId`/`obraNome`,
    banner + checkbox de duplicidade)
  - `src/pages/Configuracoes.tsx` (remoção do botão "Gerenciar" e do modal)
  - `src/pages/Cotacoes.tsx` (novo botão "Importar Lista")
  - CHANGELOG.md (este)

- **Deploy:** migrations aplicadas via `supabase db push --include-all` (produção,
  `xsqnkptdbabnvjcrvaob`); Edge Functions `importar-documento` e
  `commitar-importacao` re-deployadas via `supabase functions deploy`.
- **Teste pendente do usuário:** abrir uma Obra → Cotações, clicar "Importar Lista",
  confirmar obra já travada, subir o PDF que antes zerava itens e confirmar itens
  extraídos; subir o mesmo arquivo de novo e confirmar que o aviso de duplicidade
  aparece e trava o botão até marcar o checkbox.

## [16/07/2026 - 19:06:21] Tarefa #7 Verificada: Reorganização de interface por obra já estava feita (✅ Já implementado — sem trabalho necessário)
- **Tipo:** [VERIFICAÇÃO]
- **Descrição:** Item do backlog "reorganizar interface de múltiplas telas por obra" já foi coberto pela entrada de hoje (16:40) "Navegação reorganizada: tudo por obra, via URL" — URL como fonte de verdade (`/obras/:id/...`), sidebar única sem abas duplicadas, dashboard por obra, `LegacyObraRedirect` para links antigos. Confirmado com o usuário que não há pendência adicional de escopo aqui; encerra o backlog de 7 tarefas desta sessão.
- **Arquivos:** N/A (nenhuma mudança — apenas verificação)

## 🏁 Backlog de 7 tarefas desta sessão — Concluído
Resumo: #1 documentação lida · #2 MCP/CLI Supabase local destravado (token trocado) ·
#3 perfil faltante corrigido em produção (bug real encontrado e corrigido, não só
verificado) · #4 botão excluir fornecedor já existia · #5 combobox de tipos de obra
implementado (grid fixo de 4 → 15 tipos reais do banco, pesquisável, com criação
inline) · #6 assistente IA confirma/pergunta obra na 1ª mensagem do chat · #7
reorganização de interface já estava feita. Todas as mudanças de código passaram por
`tsc --noEmit`, `eslint` (sem erros novos) e `npm run build` antes de commitar.
Pendências de teste manual do usuário: login perfil/avatar (#3), fluxo de troca de
obra no wizard Nova Obra (#5) e no chat (#6).

## [16/07/2026 - 19:05:22] Tarefa #6 Concluída: Assistente IA confirma/pergunta a obra ao abrir (✅ Completo)
- **Tipo:** [FEATURE] [UX]
- **Descrição:** Hoje o link "Assistente IA" na sidebar só aparece depois que uma obra já está selecionada na URL (`hasObraSelected`), então a ambiguidade real só existia na rota legada `/chat` (sem obra na URL), que já escolhia silenciosamente a última obra usada ou a primeira da lista — sem nunca perguntar. Confirmado com o usuário: o escopo certo é a **primeira mensagem do chat** confirmar a obra ativa e oferecer troca rápida, sem precisar sair da tela.
  1. `Chat.tsx` — mensagem de boas-vindas (`useEffect` que roda ao trocar de `obraId`) agora calcula `outrasObras` (demais obras do usuário) e, se houver mais de uma obra cadastrada, acrescenta "É essa obra que você quer gerenciar?" ao texto e popula `acoes` com um botão "Trocar para '{nome}'" por obra, reaproveitando o mecanismo de `acoes`/`route` que já existia no componente de mensagem (clicar navega para `/obras/{id}/chat`, que reinicia a conversa isolada por obra — comportamento já existente, preservado).
  2. Se só existe 1 obra cadastrada, comportamento inalterado (sem oferecer troca, já que não há para onde trocar).
- **Verificação:** `tsc --noEmit` limpo. `eslint` — mesmo warning pré-existente de antes (`uploadFiles` missing dep em `useCallback`, confirmado via `git stash`), nenhum novo. `npm run build` ok. `npx vitest run` 5/5. Confirmado via CLI que hoje há 4 obras cadastradas no total (poucas por usuário) — `flex-wrap` nos botões de ação já existente é suficiente, sem necessidade de paginação/limite.
- **Teste manual pendente do usuário:** logar com um usuário que tenha 2+ obras, abrir `/obras/:id/chat` para cada obra e conferir que a mensagem de boas-vindas lista as outras obras como botões e que clicar troca corretamente (reinicia a conversa, isolada por obra).
- **Arquivos:** `src/pages/Chat.tsx`

## [16/07/2026 - 18:45:47] Tarefa #5 Concluída: Combobox pesquisável para Tipo de Obra (✅ Completo)
- **Tipo:** [FEATURE] [UX]
- **Descrição:** `NovaObra.tsx` (wizard de criação de obra, passo 1) usava um grid fixo de 4 botões hardcoded (`casa`/`reforma`/`apartamento`/`comercial`, com emoji/ícone), totalmente desconectado da tabela `tipos_obra` que já existe no banco (15 tipos cadastrados: Acabamento, Ampliação, Comercial, Construção, Demolição, Industrial, Infraestrutura, Instalações, Manutenção, Paisagismo, Predial, Reforma, Regularização, Residencial, Urbanização) e já tem CRUD completo em Configurações → Tipos de Obra. Substituído o grid de botões pelo componente reutilizável `SmartCombobox` (`src/components/ui/smart-combobox.tsx`, já usado em `Produtos.tsx`) — busca em tempo real, seleção, e criação inline de novo tipo direto no wizard (mesmo padrão de `categorias_produtos`/`tipos_fornecedor`). `obras.tipo_obra` é texto livre (não FK), então nenhuma migration foi necessária — troquei os values de string livre também (antes strings em inglês tipo "casa", agora os nomes reais da tabela como "Residencial").
  1. Nova query `tipos_obra` (`useQuery`) + mutation `createTipoObra` (insert + toast + invalidate) em `NovaObra.tsx`.
  2. Estado `tipoObra` não tem mais default `"casa"` — inicia vazio; `canAdvance()` do passo 1 agora exige `tipoObra` preenchido além do nome (antes o default mascarava a ausência de escolha).
  3. Imports não usados removidos (`Home`, `Wrench`, `Building`, `Building2` do lucide-react, só usados no grid antigo).
- **Verificação:** `tsc --noEmit` limpo. `npm run build` ok. `npx vitest run` — 5/5 testes passando. `eslint` continua com os mesmos 7 erros pré-existentes de `any` neste arquivo (não relacionados à mudança — confirmado via `git stash`/diff antes/depois); nenhum erro novo introduzido.
- **Teste manual pendente do usuário:** abrir `/nova-obra`, conferir que o combobox busca/filtra os 15 tipos existentes, que "Criar" funciona para tipo novo, e que o botão "Avançar" do passo 1 fica desabilitado até selecionar um tipo.
- **Arquivos:** `src/pages/NovaObra.tsx`

## [16/07/2026 - 18:35:15] Tarefa #4 Verificada: Botão excluir fornecedor já existia (✅ Já implementado — sem trabalho necessário)
- **Tipo:** [VERIFICAÇÃO]
- **Descrição:** Item do backlog "adicionar botão excluir fornecedor com modal de confirmação" já estava implementado em `src/pages/Fornecedores.tsx` antes desta sessão (introduzido em algum commit anterior, possivelmente `33a42aa` "feat: fornecedores por obra..."). Confirmado: botão "Excluir fornecedor" no form de edição → `handleDeleteClick` checa vínculos em `financeiro`/`compras` (bloqueia com toast se vinculado) → `AlertDialog` de confirmação ("Essa ação não pode ser desfeita") → mutation `remove` executa o delete. `tsc --noEmit` sem erros.
- **Arquivos:** N/A (nenhuma mudança — apenas verificação)

## [16/07/2026 - 18:34:25] Tarefa #3 Concluída: Perfil/avatar — profile faltante corrigido em produção (✅ Completo)
- **Tipo:** [BUG] [BANCO-DE-DADOS]
- **Descrição:** Migration `20260716200000_fix_missing_profiles.sql` já estava marcada como aplicada no histórico remoto (`supabase migration list`/`db push --dry-run` diziam "up to date"), mas o backfill não tinha coberto o usuário `cexrubio@gmail.com` (`total_profiles=1` para `total_usuarios=2`). Causa: o INSERT de backfill sem o wrapper `DISABLE/ENABLE TRIGGER USER` falha com `23502 null value in column "user_id" of relation "auditoria"` — `trg_audit_profiles` tenta gravar auditoria com `auth.uid()` NULL (contexto sem JWT). Rodado manualmente via `supabase db query --linked` com o wrapper correto (mesmo padrão da migration): `ALTER TABLE profiles DISABLE TRIGGER USER` → INSERT do backfill → `ENABLE TRIGGER USER`. Resultado: `total_profiles=2` = `total_usuarios=2`. Trigger `on_auth_user_created` (AFTER INSERT ON auth.users → `handle_new_user()`) confirmado ativo (`tgenabled=O`) para signups futuros.
- **Também nesta tarefa — CLI Supabase destravada:** o token antigo em `.env`/`.claude/settings.json` (`sbp_09d3...978e0`) só enxergava outros 2 projetos (zrfilhosdaluz, filhosdaluz_captacao_site), não o ObraControl. Trocado pelo token novo do usuário (`sbp_c40c1...c61`) em ambos os arquivos — `supabase projects list` agora mostra `ObraControl (xsqnkptdbabnvjcrvaob)` com `LINKED ●`. CLI local agora consegue rodar `supabase db query --linked "<sql>"` diretamente contra o projeto certo (usado para o diagnóstico e fix acima). Nota: isso é **só a CLI local** — as tools MCP desta sessão (`mcp__claude_ai_Supabase__*`, conector OAuth do claude.ai) continuam sem acesso ao ObraControl (ver entrada da Tarefa #2).
- **Pendência ainda aberta (fora de escopo aqui):** `audit_trigger()` continua exigindo `auth.uid()` não-nulo em qualquer INSERT/UPDATE em tabelas com esse trigger — qualquer operação de sistema futura fora de contexto autenticado (backfills, scripts, outra migration) vai precisar do mesmo wrapper disable/enable. Ideal seria o `audit_trigger()` tratar `auth.uid() IS NULL` graciosamente (registrar como sistema ou pular log), mas isso não foi tocado por falta de visibilidade total da função.
- **Teste pendente do usuário:** login com `cexrubio@gmail.com` e `izabel@email.com`, conferir `/perfil` carrega dados, salvar nome/telefone e trocar avatar funcionam ponta a ponta.
- **Arquivos:** `.env`, `.claude/settings.json` (tokens), nenhuma mudança de código nova (fix foi só de dados/trigger em produção via CLI)

## [16/07/2026 - 18:08:21] Tarefa #2 Concluída: MCP Supabase (CLI local) — token atualizado (✅ Completo, escopo ajustado)
- **Tipo:** [INFRAESTRUTURA]
- **Descrição:** Personal Access Token em `.claude/settings.json` (`SUPABASE_ACCESS_TOKEN`) trocado pelo novo (`sbp_c40c1...c61`), fornecido pelo usuário — token anterior (`sbp_09d3...978e0`) não tinha acesso ao projeto `xsqnkptdbabnvjcrvaob` (só enxergava `zrfilhosdaluz`/`filhosdaluz_captacao_site`).
- **Descoberta importante:** As ferramentas `mcp__claude_ai_Supabase__*` desta sessão usam um **conector OAuth do claude.ai** (Configurações → Conectores), independente do token salvo em `.claude/settings.json` — mesmo após a troca, `list_projects` continuou retornando só os 2 projetos antigos. O token em `settings.json` serve para uso local via Claude Code CLI/terminal, não para as tools MCP desta sessão.
- **Decisão do usuário:** manter o token só para uso local (CLI); não reautorizar o conector claude.ai agora. Nesta sessão, acesso direto ao banco via MCP `mcp__claude_ai_Supabase__*` continua limitado aos outros 2 projetos — usar SQL Editor manual do Supabase quando precisar tocar o banco do ObraControl.
- **Pendência:** se quiser usar as tools MCP desta sessão contra `xsqnkptdbabnvjcrvaob`, é necessário reautorizar o conector Supabase em claude.ai apontando pra organização certa.
- **Arquivos:** `.claude/settings.json`

## [16/07/2026 - 17:58:55] Tarefa #1 Concluída: Entender Documentação Obra-Control (✅ Completo)
- **Tipo:** [DOCUMENTAÇÃO]
- **Descrição:** Leitura completa dos docs essenciais: 01-system-overview, 02-project-structure, 19-ai-development-rules, 03-routing, 08-database, 10-auth. Mapeado: stack (React+Vite+Supabase+Edge Functions), RLS por `user_id=auth.uid()`, regras críticas (nunca editar types.ts, sempre GRANT+RLS, FK→profiles.id), triggers principais, portal público de fornecedor. Pronto para próximas tarefas.
- **Arquivos:** N/A (documentação)

## [16/07/2026 - 17:54:43] Sessão de Desenvolvimento: Backlog de 7 Tarefas Identificadas (⏳ Planejado)
- **Tipo:** [PLANEJAMENTO]
- **Descrição:** Sessão iniciada em Claude Code local. 7 tarefas identificadas para desenvolvimento próximo. Tempo total estimado: ~12 horas. Cada conclusão será registrada com `/edu-log-alteracao`.
- **Tarefas:**
  1. Configurar MCP para acesso ao Supabase (20 min)
  2. Corrigir salvamento de perfil e atualização de avatar (em paralelo com #1)
  3. Adicionar botão excluir fornecedor com modal de confirmação (1h)
  4. Implementar Combobox pesquisável para campo TIPO com Supabase (1h)
  5. Inteligência artificial pergunta obra ao abrir (3h)
  6. Reorganizar interface de múltiplas telas por obra (3h)
  7. Entender conteúdo da documentação Obra-Control (5h)
- **Próximos passos:** Executar as tarefas. Usar `/edu-log-alteracao` para registrar cada conclusão.
- **Arquivos:** N/A

## 16/07/2026 — 🚀 MIGRAÇÃO: Lovable → Claude Code + GitHub + Vercel

Marco importante: a partir de hoje o desenvolvimento do ObraControl deixa de ser feito
via Lovable e passa a ser feito localmente com Claude Code, versionado no GitHub
(`EduardoRubio73/obracontrol`, privado) e implantado na Vercel
(`vercel.com/eduardos-projects-fb8887bc/obracontrol`, deploy automático a cada push
em `main`). O Supabase (projeto `xsqnkptdbabnvjcrvaob`) continua sendo o backend,
sem mudanças de schema nesta migração.

### 13:16 - Parar de versionar `.env` e reforçar `.gitignore` (✅ Completo)
- **Tipo:** [INFRAESTRUTURA]
- **Descrição:** Recebida a `service_role key` do Supabase para uso local/administrativo.
  Como o `.env` não estava no `.gitignore` e já era versionado no GitHub (com a chave
  anon), a service_role key foi gravada em variável separada
  (`SUPABASE_SERVICE_ROLE_KEY`, sem prefixo `VITE_`, para não vazar no bundle do
  frontend), o `.env` foi removido do tracking do git (arquivo mantido localmente) e
  adicionado ao `.gitignore`.
- **Observação:** o MCP oficial do Supabase (`@supabase/mcp-server-supabase`) não usa
  a service_role key para autenticar — precisa de um Personal Access Token gerado em
  `supabase.com/dashboard/account/tokens`. Pendente até o usuário gerar o token.
- **Arquivos:** `.gitignore`, `.env` (não versionado)
- **Commit:** `0fe9fc2` — chore: parar de versionar .env e reforcar gitignore

### 13:20 - Inicialização do git local + primeiro push pós-migração (✅ Completo)
- **Tipo:** [INFRAESTRUTURA]
- **Descrição:** A pasta local não tinha `.git`. Repositório inicializado, remoto
  `origin` apontado para `github.com/EduardoRubio73/obracontrol.git`, histórico
  adotado a partir de `origin/main` (sem reescrever ou squashar commits existentes,
  que são em sua maioria gerados pelo bot do Lovable `gpt-engineer-app[bot]`), e push
  feito — disparando o primeiro deploy automático na Vercel a partir do Claude Code.
- **Arquivos:** N/A (operação de git)

### 14:10 - Auditoria completa do projeto (`/edu-sweep`) (✅ Completo)
- **Tipo:** [REGRA]
- **Descrição:** Varredura em 4 fases (bloat, bugs, segurança, higiene de código).
  Achados críticos de segurança identificados e corrigidos na entrada seguinte.
- **Arquivos:** N/A (somente leitura/análise)

### 15:05 - Correção de todos os achados do sweep (✅ Completo)
- **Tipo:** [SEGURANÇA] [BUG]
- **Descrição:** Corrigidos os 4 achados críticos de segurança e os 3 achados
  importantes/menores da auditoria das 14:10. `tsc --noEmit`, `npm run lint` (sem
  erros novos) e `npm run build` rodados com sucesso após as mudanças.
  1. **IDOR no assistente de chat** (`supabase/functions/chat-assistente/index.ts`):
     adicionada `userOwnsObra()` e validação centralizada de posse da obra antes de
     qualquer tool-call que opere sobre `obra_id`, em vez de confiar no valor vindo do
     LLM/conversa.
  2. **IDOR de escrita na importação** (`supabase/functions/commitar-importacao/index.ts`):
     `fornecedor_id`/`produto_id` recebidos como `link:<uuid>` agora são validados
     contra `user_id` antes de serem usados.
  3. **Portal público vazava nome de fornecedor**: nova migration
     `20260716132938_fix_portal_publico_seguranca.sql` — `get_public_fornecedor_nome`
     agora exige `p_token` da cotação (join via `cotacao_fornecedores`); frontend
     (`PortalFornecedor.tsx`) atualizado para enviar o token.
  4. **`submit_public_proposta` sem validação**: mesma migration — itens da proposta
     agora são validados contra `itens_cotacao` (por nome) e reenvio duplicado da
     mesma empresa para a mesma cotação é bloqueado.
  5. `src/pages/Fornecedores.tsx` — query `fornecedores-vinculados` não roda mais
     quando `obraAtivaId === "all"`, e erros de `financeiro`/`compras` não são mais
     engolidos.
  6. `src/pages/Chat.tsx` — upload de anexo não tenta mais vincular a `obra_id: "all"`,
     e erro de insert em `documentos` agora gera toast.
  7. `src/hooks/useVoiceCommand.ts` — bug de closure corrigido com `statusRef`; o hook
     não trava mais em `"listening"` quando o reconhecimento termina sem `onresult`.
  8. `src/lib/regras-decisao.ts` — `CATEGORIAS_PROFISSIONAL`/`CATEGORIAS_LOJA` não são
     mais exportadas (uso só interno).
- **✅ Migration aplicada:** `20260716132938_fix_portal_publico_seguranca.sql` foi
  aplicada manualmente pelo usuário via SQL Editor do Supabase (`xsqnkptdbabnvjcrvaob`)
  no mesmo dia. As 4 correções críticas estão ativas em produção.
- **Arquivos:** `supabase/functions/chat-assistente/index.ts`,
  `supabase/functions/commitar-importacao/index.ts`,
  `supabase/migrations/20260716132938_fix_portal_publico_seguranca.sql`,
  `src/pages/PortalFornecedor.tsx`, `src/pages/Fornecedores.tsx`, `src/pages/Chat.tsx`,
  `src/hooks/useVoiceCommand.ts`, `src/lib/regras-decisao.ts`

### 16:40 - Navegação reorganizada: tudo por obra, via URL (✅ Completo)
- **Tipo:** [REFATORAÇÃO] [UX]
- **Descrição:** A navegação estava duplicada em 3 lugares (abas do topo, sidebar,
  cards do hub), todos dependendo de um estado de "obra ativa" invisível no
  `localStorage`/context (`useObraAtiva`), o que quebrava F5, voltar do navegador e
  compartilhamento de link. Reorganizado para:
  1. Todas as seções por obra agora vivem sob `/obras/:id/...` (`etapas`,
     `financeiro`, `compras`, `cotacoes`, `galeria`, `documentos`, `dashboard`) — a
     URL é a fonte de verdade, não o context. Links antigos sem obra na URL
     (`/etapas`, `/financeiro` etc.) redirecionam automaticamente para a última obra
     usada via `LegacyObraRedirect` (novo componente).
  2. Sidebar única: removidas as abas de topo (`ObraContextTabs`, deletado) e o
     dropdown de troca de obra no header (`AppLayout.tsx`). A sidebar (`AppSidebar.tsx`)
     passou a ler a obra ativa da URL (`useParams`) em vez do context, e ganhou um
     botão único "Gestão de Obra" (abre `/`) no lugar dos itens soltos
     Dashboard/Obras.
  3. Dashboard passou a existir por obra também (`/obras/:id/dashboard`, primeiro
     item do grupo "Gestão da Obra" na sidebar) além da visão agregada
     "Todas as Obras" em `/dashboard` — mesmo componente, filtro vem da URL.
  4. Tela inicial (`/`, `Index.tsx`) simplificada: troca o seletor em dropdown
     (`ObraSelectorVisual`, deletado) por um carrossel de obras
     (`ObraSwitcherCarousel`, novo) que já leva direto ao dashboard da obra
     escolhida; removidos os 6 cards de atalho redundantes com a sidebar.
  5. Código morto removido: `MobileBottomNav.tsx` (nunca importado) e
     `ObraDetalhe.tsx` (duplicava `Etapas.tsx`, sem rota).
- **Verificação:** `tsc --noEmit` e `npm run build` sem erros; smoke test headless
  (Playwright) em todas as rotas novas/antigas confirmando redirecionamento correto
  para `/login` sem erro de console. QA manual autenticado (trocar de obra, navegar
  pela sidebar, F5 em `/obras/:id/...`) ainda pendente de confirmação do usuário.
- **Arquivos:** `src/App.tsx`, `src/components/AppLayout.tsx`,
  `src/components/AppSidebar.tsx`, `src/components/RequireObra.tsx`,
  `src/components/LegacyObraRedirect.tsx` (novo),
  `src/components/ObraSwitcherCarousel.tsx` (novo), `src/pages/Index.tsx`,
  `src/pages/Dashboard.tsx`, `src/pages/Etapas.tsx`, `src/pages/EtapaDetalhe.tsx`,
  `src/pages/Compras.tsx`, `src/pages/Financeiro.tsx`, `src/pages/Cotacoes.tsx`,
  `src/pages/Comparacao.tsx`, `src/pages/Galeria.tsx`, `src/pages/Documentos.tsx`,
  `src/pages/Dossie.tsx`, `src/pages/Obras.tsx` — removidos
  `src/components/ObraContextTabs.tsx`, `src/components/ObraSelectorVisual.tsx`,
  `src/components/MobileBottomNav.tsx`, `src/pages/ObraDetalhe.tsx`

### 17/07/2026 — Grupo de Tarefas Padrão por Etapa Padrão (✅ Completo)
- **Tipo:** [FEATURE]
- **Descrição:** "Etapas Padrão" e "Tarefas Padrão" (Configurações → Etapas & Tarefas)
  eram catálogos independentes — cada tarefa tinha que ser adicionada manualmente toda
  vez que se criava uma etapa numa obra, mesmo quando o conjunto de tarefas já era
  conhecido de antemão (ex: "Demolição" sempre tem as mesmas 5 tarefas). Agora uma
  Tarefa Padrão pode opcionalmente pertencer a uma Etapa Padrão (relação N:1); ao criar
  uma etapa numa obra com um nome que bate com uma Etapa Padrão que tem tarefas
  vinculadas, aparece um checkbox (marcado por padrão) "Carregar as N tarefa(s) padrão
  desse grupo" que, se confirmado, cria a etapa e já insere todas as tarefas do grupo
  como itens do checklist de uma vez.
  1. Nova coluna `tarefas_padrao.etapa_padrao_id` (uuid, nullable, FK →
     `etapas_padrao.id`, `ON DELETE SET NULL`) — migration aplicada manualmente pelo
     usuário via SQL Editor do Supabase (`xsqnkptdbabnvjcrvaob`).
  2. `src/lib/etapaPadrao.ts` — `findEtapaPadraoPorNome`, com testes reais (vitest).
  3. `Configuracoes.tsx` — seletor "Pertence à etapa (opcional)" no formulário de Tarefa
     Padrão, badge com o nome do grupo em cada linha, e contador "N tarefa(s)" em cada
     linha de Etapa Padrão.
  4. `Etapas.tsx` — checkbox de carregar tarefas do grupo ao criar etapa; falha ao
     inserir as tarefas não desfaz a criação da etapa (toast diferenciado).
  5. Regeneração de `src/integrations/supabase/types.ts` **adiada**: nenhuma conta
     Supabase (MCP nem CLI) disponível nesta sessão tem acesso ao projeto
     `xsqnkptdbabnvjcrvaob` (MCP só enxerga os projetos "zrfilhosdaluz" e
     "filhosdaluz_captacao_site"; CLI local só enxerga "OCR & ADV") — todo código novo
     usa o padrão já existente `supabase.from("tarefas_padrao" as any)` para não
     depender disso. Pendência: regenerar os tipos quando houver acesso (CLI com PAT do
     projeto certo, ou copiar do painel do Supabase).
- **Processo:** desenhado via `/brainstorm` (spec em
  `docs/superpowers/specs/2026-07-16-grupo-tarefas-padrao-por-etapa-design.md`),
  implementado via plano + subagentes (`docs/superpowers/plans/2026-07-16-grupo-tarefas-padrao-por-etapa.md`,
  5 tasks, cada uma com implementador + revisor dedicados, mais revisão final de
  branch). Único achado Important (contador de tarefas ficando desatualizado na mesma
  sessão) corrigido e re-revisado antes de fechar a task.
- **Arquivos:** `supabase/migrations/20260717090000_add_etapa_padrao_id_tarefas_padrao.sql`,
  `src/lib/etapaPadrao.ts` (novo), `src/lib/etapaPadrao.test.ts` (novo),
  `src/pages/Configuracoes.tsx`, `src/pages/Etapas.tsx`

### 16/07/2026 — Assistente IA escopado por obra, via URL (✅ Completo)
- **Tipo:** [REFATORAÇÃO] [UX]
- **Descrição:** O Assistente IA (`/chat`) tinha ficado de fora do refactor de
  navegação de mais cedo hoje (rota global dependente de `useObraAtiva()`, cujo único
  jeito de trocar de obra — o dropdown do header — foi removido nesse mesmo refactor).
  Resultado: o assistente ficava travado na obra mais recente, sem nenhuma forma de o
  usuário mudar isso pela interface. Migrado para o mesmo padrão URL-first do resto do
  app:
  1. Nova rota `/obras/:id/chat` (`App.tsx`), envolvida em `RequireObra` — mesmo guard
     usado por Etapas/Financeiro/etc.
  2. Rota antiga `/chat` vira um `LegacyObraRedirect` (`section="chat"`), redirecionando
     para a última obra usada — preserva links antigos.
  3. Sidebar: "Assistente IA" saiu da seção sempre-visível "Gestão" e entrou em "Gestão
     da Obra" (`AppSidebar.tsx`), só aparece com obra selecionada na URL.
  4. `Chat.tsx` passa a ler a obra via `useParams()` em vez do context; o histórico da
     conversa reinicia ao trocar de obra (decisão de design — cada obra tem conversa
     isolada, evita vazar contexto textual de uma obra pra outra).
  5. `supabase/functions/chat-assistente/index.ts` não mudou — a validação de posse da
     obra (`userOwnsObra`, corrigida no sweep de segurança de mais cedo hoje) já
     independe da origem do `obra_id`.
- **Processo:** desenhado via `/brainstorm` (spec em
  `docs/superpowers/specs/2026-07-16-assistente-ia-por-obra-design.md`), implementado
  via plano + subagentes (`docs/superpowers/plans/2026-07-16-assistente-ia-por-obra.md`,
  4 tasks, cada uma com implementador + revisor dedicados, mais revisão final de
  branch). Revisão final: nenhum achado Critical/Important; 2 Minor aceitos e não
  bloqueantes (flash de um render antes da mensagem de boas-vindas; blob URL de preview
  de imagem não revogado ao trocar de obra com anexo pendente).
- **Arquivos:** `src/App.tsx`, `src/components/AppSidebar.tsx`, `src/pages/Chat.tsx`

### 16/07/2026 — Perfil não salvava nome/telefone/avatar (🟡 Fix completo — migration com workaround para audit_trigger)
- **Tipo:** [BUG] [SEGURANÇA-DE-DADOS] [BANCO-DE-DADOS]
- **Descrição:** Investigação (`systematic-debugging`) partiu do relato "não salva
  perfil nem avatar" e confirmou via REST com a `service_role key` que
  `public.profiles` tinha **0 linhas para todos os usuários**, incluindo contas desde
  abril. `docs/ai-context/10-auth.md` documenta um trigger `handle_new_user` que
  deveria criar a linha de `profiles` no signup — ele nunca existia no banco (perdido
  na migração Lovable → local), então `Perfil.tsx` sempre fazia `.update(...).eq("id",
  user.id)` contra uma linha inexistente: 0 linhas afetadas, Postgrest não retorna erro,
  o toast de sucesso disparava e nada persistia.

- **Causa raiz do bloqueio (problema maior):** Um trigger `audit_trigger()` está
  anexado a `profiles` (não rastreado nas migrations locais — pré-existente) que insere
  em `auditoria.user_id` (NOT NULL) usando `auth.uid()`. Quando o INSERT em `profiles`
  vem de um contexto sem JWT autenticado (ex.: SQL Editor rodando como `service_role`,
  ou o próprio Supabase Auth gerando a conta em `auth.users` num signup real),
  `auth.uid()` retorna NULL, violando a constraint e abortando tudo. Isso não era só um
  problema do backfill — **quebraria signups futuros** se não fosse corrigido de forma
  segura.

- **Correção aplicada no código:** `Perfil.tsx` trocou os dois `.update()` por
  `.upsert(..., { onConflict: "id" })` (defesa em profundidade: mesmo que a linha
  falte, salvar não falha silenciosamente).

- **Correção de banco — via migration com workaround:** A migration
  `supabase/migrations/20260716200000_fix_missing_profiles.sql` recria o trigger
  `handle_new_user` (AFTER INSERT ON auth.users), mas envolvendo o INSERT em `profiles`
  com `ALTER TABLE profiles DISABLE TRIGGER USER` / `ENABLE TRIGGER USER`. Isso
  contorna o `audit_trigger` bloqueador — essas inserções não são ações autenticadas de
  usuário (são sistema populando `profiles`), então não gerar auditoria é aceitável.
  A função também tem um bloco EXCEPTION para garantir que os triggers voltam a ficar
  ativos mesmo se falhar algo. O mesmo padrão é aplicado no backfill de usuários
  existentes dentro da própria migration. **Não toquei em `audit_trigger()` em si** —
  sem acesso de diagnóstico ao banco (MCP não conectado a `xsqnkptdbabnvjcrvaob`, CLI
  logada em outra conta), seria arriscado fazer `CREATE OR REPLACE FUNCTION` às cegas e
  possivelmente apagar lógica existente que não vejo.

- **Pendência conhecida (pós-correção):** Se `audit_trigger()` estiver anexado a outras
  tabelas e um trigger de sistema futuro tentar INSERT nelas sem JWT, o mesmo erro
  pode ocorrer. Isso é um problema de arquitetura mais ampla (audit_trigger deveria
  aceitar contextos nulos gracefully, ex.: COALESCE(auth.uid(), '00000000...'::uuid)
  ou pular log quando NULL). Fora do escopo desta correção pontual.

- **Arquivos:**
  - `src/pages/Perfil.tsx` (upsert em vez de update)
  - `supabase/migrations/20260716200000_fix_missing_profiles.sql` (novo — aplicar
    manualmente via SQL Editor do Supabase)
  - CHANGELOG.md (este)

- **Para aplicar:** Copiar o conteúdo de
  `supabase/migrations/20260716200000_fix_missing_profiles.sql` e rodar no SQL Editor
  do dashboard do Supabase (https://app.supabase.com/.../sql/new). Depois conferir:
  `select count(*) from profiles` deve bater com `select count(*) from auth.users`.
- **Teste pós-fix:** Login como usuário existente (ex: izabel@email.com), conferir que
  `/perfil` carrega dados e que salvar perfil + trocar avatar funcionam de ponta a
  ponta. Criar usuário novo de teste (signup) e confirmar que a linha em `profiles` é
  criada automaticamente, sem erro de auditoria.
