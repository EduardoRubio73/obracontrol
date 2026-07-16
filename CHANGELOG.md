# 📋 Changelog: ObraControl

> Este arquivo é a memória permanente do projeto. Toda mudança relevante — técnica,
> de infraestrutura ou de decisão de produto — deve ser registrada aqui, na data em
> que ocorreu. Não apagar entradas antigas.

---

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
- **⚠️ Pendente de ação manual:** a migration `20260716132938_fix_portal_publico_seguranca.sql`
  foi criada no repo mas **ainda não foi aplicada** ao banco Supabase remoto
  (`xsqnkptdbabnvjcrvaob`) — não há conexão MCP/CLI ativa com esse projeto nesta
  sessão. Aplicar via dashboard do Supabase (SQL editor) ou `supabase db push` assim
  que possível. Até lá, `get_public_fornecedor_nome(uuid)` (assinatura antiga) ainda
  está ativo no banco em produção.
- **Arquivos:** `supabase/functions/chat-assistente/index.ts`,
  `supabase/functions/commitar-importacao/index.ts`,
  `supabase/migrations/20260716132938_fix_portal_publico_seguranca.sql`,
  `src/pages/PortalFornecedor.tsx`, `src/pages/Fornecedores.tsx`, `src/pages/Chat.tsx`,
  `src/hooks/useVoiceCommand.ts`, `src/lib/regras-decisao.ts`
