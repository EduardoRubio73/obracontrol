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
4. Trabalhando no subsistema de IA (classificação de tipo de obra, planejamento de
   fases/etapas, checklist, materiais sugeridos)? Leia também
   `docs/ai-context/25-ia-classificacao-obras.md` antes de mexer em qualquer tabela
   `*_padrao` ou nas skills dos agentes (`orquestrador.md`, `agente-classificador.md`,
   `agente-planejador-fases.md`, `agente-checklist.md`, `agente-materiais.md`).

## Estado da infraestrutura (16/07/2026)

- Desenvolvimento migrou do Lovable para Claude Code local.
- Git: repo local conectado a `github.com/EduardoRubio73/obracontrol` (privado),
  branch `main`. Push para `main` dispara deploy automático na Vercel
  (`vercel.com/eduardos-projects-fb8887bc/obracontrol`).
- Supabase: projeto `xsqnkptdbabnvjcrvaob`. `.env` local tem
  `SUPABASE_SERVICE_ROLE_KEY` (não versionado, não usar em código do frontend/`VITE_`).
  MCP oficial do Supabase ainda não conectado a este projeto — precisa de Personal
  Access Token (não é a service_role key).
- Migrations: sempre via ferramenta de migration do Supabase, nunca editar SQL à mão
  (regra de `docs/ai-context/16-coding-rules.md`).

## Subsistema de IA (classificação/planejamento de obras)

Camada `*_padrao` (tipos, sinônimos, subtipos, fases, etapas, checklist, materiais)
documentada em `docs/ai-context/25-ia-classificacao-obras.md`. Estado resumido:

- Migrations `01` a `05` (schema + seeds) prontas, aguardando conversão pro formato
  de migration do Supabase e aplicação neste projeto — checar se `01`-`03` já foram
  aplicados antes de rodar `04`/`05`.
- `agente-tipo-novo` citado no `orquestrador.md` mas ainda não implementado.
- `agente-materiais.md` precisa atualização pra usar `materiais_sugeridos_tenant`
  em vez de referenciar `produtos` direto no template global.
- Após aplicar a migration `04`: revisar `obras` com `migracao_tipo_pendente = true`
  (obras cujo `tipo_obra` legado não bateu com confiança ≥0.8 na migração automática).

## Pendências de segurança conhecidas (ver CHANGELOG.md para detalhes)

Antes de expandir features em `chat-assistente`, `commitar-importacao` ou no portal
público de fornecedores, resolver os IDORs já mapeados no changelog — são
falhas de autorização cross-tenant reais, não hipotéticas.

## Workflow de commit

Template de commit configurado em `.gitmessage` (`git config commit.template`).
Sempre atualizar `CHANGELOG.md` no mesmo commit (ou logo em seguida) quando a
mudança for relevante — não deixar a documentação dessincronizar do código.