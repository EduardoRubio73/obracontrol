# 16 - Coding Rules & Conventions

## Estrutura
- Uma tela por arquivo em `src/pages/`. Componentes específicos vão em `src/components/<dominio>/`.
- Primitivos em `src/components/ui/` (shadcn) — **não misturar lógica de negócio**.
- Hooks globais em `src/hooks/`.
- Regras isoladas e puras em `src/lib/`.

## Design system
- **Nunca** usar cores hard-coded (`text-white`, `bg-[#...]`) — usar tokens semânticos definidos em `src/index.css` (HSL).
- Fonte: **Nunito**, base 18px.
- Emojis são usados intencionalmente na sidebar/botões.

## Estado / dados
- Toda leitura de Supabase via `useQuery` com `queryKey` estável.
- Toda escrita via `useMutation` + `invalidateQueries`.
- Realtime dentro de `useEffect` com cleanup (`removeChannel`).

## Filtragem por obra
- Sempre respeitar `useObraAtiva()`:
  - Se `isAll` e a query exige UUID → não habilitar (`enabled: false`) e renderizar `ObraSelectorVisual` (via `RequireObra`).
- Persistência de escolha: `localStorage["obra_ativa_id"]`.

## Formulários
- `react-hook-form` + `zod`. Mensagens em PT-BR.

## CRUD-first
- Toda página de dados administrativos deve ter **criar/editar/excluir** — não apenas listar.

## Nomenclatura
- Arquivos de página: `PascalCase.tsx` (`Compras.tsx`).
- Componentes: `PascalCase`. Hooks: `useAlgo`.
- Colunas Supabase: `snake_case`.

## Migrations
- Sempre usar a ferramenta `supabase--migration` — nunca editar `supabase/migrations/*.sql` à mão.
- Toda `CREATE TABLE public.x` deve ser seguida de `GRANT` + `ENABLE RLS` + `CREATE POLICY` na mesma migration.

## Autenticação
- `onAuthStateChange` **antes** de `getSession()`.
- Nunca FK direta para `auth.users` — usar `profiles.id`.

## Toasts
- Usar `sonner` (`toast.success/error/info`), não `useToast` legado.

## PT-BR
- Interface, labels, mensagens de erro e commits em português brasileiro.
