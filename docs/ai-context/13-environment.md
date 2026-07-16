# 13 - Environment

## Frontend (.env — auto-populado pelo Lovable)
| Variável | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key (safe no cliente) |
| `VITE_SUPABASE_PROJECT_ID` | Ref do projeto |

**Nunca colocar `SERVICE_ROLE_KEY` no frontend.**

## Edge Functions (Supabase Secrets)
Configurados no dashboard (`Secrets`):

| Secret | Uso |
|--------|-----|
| `SUPABASE_URL` | Auto |
| `SUPABASE_ANON_KEY` | Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrita privilegiada (bypass RLS) |
| `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEYS` | Auto |
| `SUPABASE_SECRET_KEYS` | Auto |
| `SUPABASE_JWKS` | Verificação JWT |
| `SUPABASE_DB_URL` | Conexão direta Postgres |
| **`LOVABLE_API_KEY`** | Autenticação com Lovable AI Gateway |

Acesso via `Deno.env.get("<NAME>")`.

## Config
- `supabase/config.toml` — `project_id = "xsqnkptdbabnvjcrvaob"`.
- Não há `.env.local` — Lovable gerencia.
