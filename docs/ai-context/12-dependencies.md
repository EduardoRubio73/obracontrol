# 12 - Dependencies

## Runtime
| Pacote | Versão | Motivo |
|--------|--------|--------|
| react / react-dom | ^18.3.1 | Framework UI |
| react-router-dom | ^6.30.1 | Rotas SPA |
| @tanstack/react-query | ^5.83.0 | Data fetching / cache |
| @supabase/supabase-js | ^2.101.1 | Backend SDK |
| react-hook-form | ^7.61.1 | Formulários |
| @hookform/resolvers | ^3.10.0 | Integração zod↔hook-form |
| zod | ^3.25.76 | Validação |
| tailwind-merge / clsx / class-variance-authority | — | Utilitários de classe |
| tailwindcss-animate | ^1.0.7 | Animações Tailwind |
| lucide-react | ^0.462.0 | Ícones |
| **recharts** | **2.12.7 (pinned)** | Gráficos — **NÃO ATUALIZAR** (quebra com React 18) |
| sonner | ^1.7.4 | Toasts |
| date-fns | ^3.6.0 | Datas |
| react-markdown | ^10.1.0 | Renderizar markdown do assistente |
| cmdk | ^1.1.1 | Command palette / combobox |
| @dnd-kit/* | 6.x/10.x | Drag-and-drop |
| embla-carousel-react | ^8.6.0 | Carousels |
| react-day-picker | ^8.10.1 | Calendar picker |
| next-themes | ^0.3.0 | Dark mode |
| vaul | ^0.9.9 | Drawer mobile |
| input-otp | ^1.4.2 | Input OTP |
| react-resizable-panels | ^2.1.9 | Layout resizable |
| @radix-ui/* | várias | Primitivas shadcn |

## Dev
Vite 5.4, TS 5.8, ESLint 9, Vitest 3, Playwright 1.57, Tailwind 3.4, `lovable-tagger`.

## Edge Functions (Deno)
- `xlsx`, `mammoth`, `unpdf` — parsers de importação.
- `zod` — validação.
- `@supabase/supabase-js` — cliente interno.
- Lovable AI Gateway via fetch (sem SDK).
