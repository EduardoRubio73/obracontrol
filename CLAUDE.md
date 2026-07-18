# CLAUDE.md — ObraControl

Contexto local deste projeto. As instruções gerais de `C:\Users\ACER\CLAUDE.md`
(stack padrão, preferências de desenvolvimento) continuam valendo aqui.

## Antes de qualquer mudança

1. Leia `docs/ai-context/24-ai-index.md` — índice do pacote de documentação de
   arquitetura (24 arquivos numerados: rotas, componentes, banco, regras de negócio,
   regras de desenvolvimento para IA, impacto de mudanças).
2. Leia `CHANGELOG.md` — memória permanente do projeto, sempre atualizada. Contém
   decisões recentes e pendências críticas em aberto.
3. `docs/ai-context/19-ai-development-rules.md` tem a lista vinculante de "nunca
   fazer" / "sempre fazer" para este projeto (não editar `types.ts`, sempre
   GRANT+RLS junto de CREATE TABLE, nunca FK para `auth.users`, etc.).

## Estado da infraestrutura (17/07/2026)

- Desenvolvimento migrou do Lovable para Claude Code local.
- Git: repo local conectado a `github.com/EduardoRubio73/obracontrol` (privado),
  branch `main`. Push para `main` dispara deploy automático na Vercel
  (`vercel.com/eduardos-projects-fb8887bc/obracontrol`).
- Supabase: projeto `xsqnkptdbabnvjcrvaob`. `.env` local tem
  `SUPABASE_SERVICE_ROLE_KEY` (não versionado, não usar em código do frontend/`VITE_`).
- Supabase CLI: instalado globalmente, mas verificar qual conta está logada.
  Token pessoal em `SUPABASE_ACCESS_TOKEN` (`.env`). Pode estar logado em conta errada
  (ex: OCR & ADV em vez de xsqnkptdbabnvjcrvaob). Se `supabase migration list` retornar
  projeto diferente, fazer logout/login com token correto.
- Migrations: sempre via `supabase db push` (Supabase CLI), nunca editar SQL à mão
  (regra de `docs/ai-context/16-coding-rules.md`).

## Segurança — IDORs históricos (resolvidos)

Os 3 IDORs cross-tenant mapeados no changelog (`chat-assistente`,
`commitar-importacao`, portal público de fornecedores) foram corrigidos em
16/07/2026 (entrada "15:05 - Correção de todos os achados do sweep") e
reverificados em 18/07/2026: `chat-assistente` valida posse da obra via
`TOOLS_NEEDING_OBRA_ID` + `userOwnsObra()` antes de qualquer tool-call (cobertura
conferida linha a linha, sem lacunas); `commitar-importacao` valida
`fornecedor_id`/`produto_id` de `link:<uuid>` contra `user_id`; a migration
`20260716132938_fix_portal_publico_seguranca.sql` está aplicada em produção
(confirmado via `supabase migration list`). Sem pendência bloqueante — ao mexer
nessas áreas, manter o mesmo padrão (nunca confiar em `obra_id`/ids vindos do
LLM ou do cliente sem checar `user_id`).

## Supabase CLI — Fluxo de desenvolvimento

A Supabase CLI está instalada globalmente. Antes de usar, **verificar qual conta está
logada**:

```bash
# Verificar qual projeto/conta está logado
supabase projects list

# Deve retornar: ObraControl | xsqnkptdbabnvjcrvaob | South America (São Paulo)
# Se retornar outro projeto, fazer logout e login novamente:
supabase logout
supabase login
```

Comandos principais (após verificar login):

```bash
# Listar status de todas as migrations (local vs remoto)
supabase migration list

# Fazer push de novas migrations para o remoto
supabase db push

# Executar query diretamente no banco remoto
supabase db query "SELECT * FROM sua_tabela LIMIT 5"

# Ver logs de Edge Functions
supabase functions list
```

**Token autenticação**: Configurado em `.env` como `SUPABASE_ACCESS_TOKEN` —
não versionado, não commitar. Usar esse token ao rodar `supabase login`.

## Workflow de commit

Template de commit configurado em `.gitmessage` (`git config commit.template`).
Sempre atualizar `CHANGELOG.md` no mesmo commit (ou logo em seguida) quando a
mudança for relevante — não deixar a documentação dessincronizar do código.