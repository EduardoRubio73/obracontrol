# 01 - System Overview

## Objetivo
**ObraControl** (também referenciado como "IzaObra Control") é um SaaS de gestão de obras civis focado no fluxo brasileiro de reforma/construção. Cobre planejamento por fases, controle financeiro, cotações com fornecedores (com portal público), compras, ranking de fornecedores, dossiê da obra, galeria de fotos, alertas automáticos e um assistente de IA por voz/chat.

## Problema que resolve
- Falta de padronização no acompanhamento de fases e progresso de obra.
- Dificuldade em obter e comparar cotações de 3+ fornecedores.
- Descontrole de gastos vs. orçamento previsto.
- Ausência de auditoria e histórico de alterações.
- Comunicação manual com fornecedores.

## Arquitetura (alto nível)
Client-side SPA (React/Vite) → Supabase (Postgres + Auth + Storage + Edge Functions) → Lovable AI Gateway para funcionalidades de IA.

```
Browser (React SPA)
   │
   ├─► Supabase JS SDK ──► Postgres (RLS) / Storage / Auth
   │
   └─► Edge Functions (Deno) ──► Lovable AI Gateway / Parsers de documento
```

## Tecnologias

### Frontend
- React 18.3, Vite 5, TypeScript 5
- Tailwind CSS v3 + shadcn/ui (Radix)
- React Router 6, TanStack Query 5
- react-hook-form + zod
- recharts **2.12.7 (pinned — não atualizar, quebra com React 18)**
- lucide-react, sonner, date-fns, react-markdown
- @dnd-kit para drag-and-drop

### Backend
- Supabase Postgres (RLS por `user_id = auth.uid()`)
- Supabase Auth (email/senha)
- Supabase Storage (buckets `documentos`, `obras` — públicos)
- Supabase Edge Functions (Deno):
  - `chat-assistente` — chat com contexto da obra via Lovable AI
  - `apoio-decisao` — sugestão de fornecedores/decisões
  - `gerar-escopo` — geração de escopo/fases via IA
  - `importar-documento` — parsing multi-formato + matching fuzzy
  - `commitar-importacao` — persistência de importações revisadas

### Integrações
- **Lovable AI Gateway** (`LOVABLE_API_KEY`) — chat, embeddings, geração de conteúdo.
- Nenhuma integração externa de pagamento/email por enquanto.

### Deploy / Ambiente
- Hospedagem: Lovable (preview + published em `izaobracontrol.lovable.app`).
- Edge Functions publicadas automaticamente pelo Lovable.
- `.env` populado automaticamente com `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## Modelo de tenancy
Legado: existia `tenant_id` + `current_tenant_id()` (ver funções em Postgres).
Atual: RLS simplificado em `user_id = auth.uid()`. Colunas `tenant_id` ainda existem em várias tabelas mas não são o filtro primário.
