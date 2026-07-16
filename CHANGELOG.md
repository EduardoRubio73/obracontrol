# 📋 Changelog: ObraControl

> Este arquivo é a memória permanente do projeto. Toda mudança relevante — técnica,
> de infraestrutura ou de decisão de produto — deve ser registrada aqui, na data em
> que ocorreu. Não apagar entradas antigas.

---

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
