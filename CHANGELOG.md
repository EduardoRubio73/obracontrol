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
  Achados críticos de segurança identificados e ainda **não corrigidos** — ver seção
  "Pendências críticas" abaixo. Resumo completo do relatório disponível na conversa
  do Claude Code desta data.
- **Arquivos:** N/A (somente leitura/análise)

---

## 🔴 Pendências críticas em aberto (atualizar quando resolvidas)

1. **IDOR no assistente de chat** — `supabase/functions/chat-assistente/index.ts`
   (linhas 426-443, 499-524, 588-631, 678-712, 797-818): várias tool-calls usam
   `service_role` filtrando só por `obra_id` (vindo da conversa/LLM) sem checar que a
   obra pertence ao `user_id` autenticado. Outros handlers no mesmo arquivo já fazem
   `.eq("user_id", userId)` corretamente — padronizar todos.
2. **IDOR de escrita na importação** — `supabase/functions/commitar-importacao/index.ts:57-140`:
   `fornecedor_id`/`produto_id` vindos como `link:<uuid>` no payload não são validados
   contra o dono antes de usar.
3. **Portal público vaza nome de fornecedor** — função `get_public_fornecedor_nome`
   (migration `20260411164012_...sql`) aceita qualquer UUID sem exigir o
   `token_publico` da cotação.
4. **`submit_public_proposta` sem validação** — migration `20260411155827_...sql`:
   aceita itens arbitrários do cliente anônimo sem validar contra `itens_cotacao`, e
   sem trava de reenvio duplicado.

## 🟡 Pendências importantes em aberto

- `src/pages/Fornecedores.tsx:160-172` — query quebra silenciosamente quando
  `obraAtivaId === "all"` (uuid inválido, erro engolido).
- `src/pages/Chat.tsx:96-104` — upload de anexo falha silenciosamente no mesmo cenário.
- `src/hooks/useVoiceCommand.ts:146-150` — bug de closure trava o hook em "listening".
