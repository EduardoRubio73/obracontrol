# 05 - Hooks

## `useAuth()` — `src/hooks/useAuth.tsx`
Provider global de autenticação.

Retorno:
```ts
{ session: Session | null; user: User | null; loading: boolean; signOut(): Promise<void> }
```
Comportamento:
- Inscreve `supabase.auth.onAuthStateChange` **antes** de chamar `getSession()` (padrão obrigatório do Supabase).
- Não persiste manualmente — `supabase.auth` já usa `localStorage`.

## `useObraAtiva()` — `src/hooks/useObraAtiva.tsx`
Estado global da obra selecionada + lista de obras do usuário.

Retorno:
```ts
{
  obraAtivaId: string | null,     // uuid ou "all"
  setObraAtivaId: (id: string | null) => void,
  obraAtiva: Obra | null,          // null quando isAll
  obras: Obra[],
  isLoading: boolean,
  isAll: boolean,                  // true quando obraAtivaId === "all"
  filtroObraId: string | null,     // null quando isAll, senão o uuid
}
```
Comportamento:
- Auto-seleciona a primeira obra se nenhuma estiver escolhida.
- Persiste em `localStorage["obra_ativa_id"]`.
- **REGRA CORE:** quando `isAll`, páginas que dependem de UUID de obra devem bloquear queries e mostrar `ObraSelectorVisual`.

## `useVoiceCommand()` / `useVoiceLoop()`
Encapsulam Web Speech API para captura de voz e envio ao chat/comandos. Retornam `start()`, `stop()`, `transcript`, `isListening`.

## `use-mobile.tsx`
`useIsMobile(): boolean` — media-query `(max-width: 768px)`.

## `use-toast.ts`
Bridge legada para o `toaster` shadcn (mantida — Sonner é o preferido).
