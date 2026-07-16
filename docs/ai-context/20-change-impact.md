# 20 - Change Impact

## Alterar banco de dados
| Mudança | Impactos |
|---------|----------|
| Adicionar coluna | `types.ts` regenera; queries antigas continuam OK. Verificar `select("*")` em páginas. |
| Renomear coluna | **Breaking** — todas as queries que a referenciam quebram. Buscar por `.column_name` em `src/`. |
| Adicionar tabela | Precisa GRANT+RLS+policies na mesma migration. Atualizar `08-database.md` e `17-file-map.md`. |
| Alterar trigger de progresso | Impacta `EtapaDetalhe`, `Dashboard*` (progresso), alertas. |
| Alterar RLS | Pode quebrar leituras em todas as páginas — testar `filtroObraId`. |

## Alterar autenticação
- `useAuth` é consumido por `App.tsx` (guards) e toda página. Manter contrato `{ session, user, loading, signOut }`.
- Se introduzir roles: seguir padrão user_roles + `has_role`. Atualizar `10-auth.md` e todos os guards.

## Alterar `useObraAtiva`
**Alto impacto** — consumido por sidebar, dashboard widgets, dezenas de páginas. Manter shape do retorno.

## Alterar componente `ui/*`
- Baseia toda UI. Testar em Dialog, Form, Combobox (smart-combobox usado em Produtos/Configurações).

## Alterar Edge Function
- Mudar payload/response = **breaking** para o frontend. Preferir campos opcionais aditivos.
- `importar-documento` e `commitar-importacao` compartilham shape de `preview` — mudar em ambos.

## Alterar rotas
- Só via `src/App.tsx`. Atualizar `03-routing.md` e `AppSidebar.tsx` (menu).

## Alterar bucket de storage
- `obras` (fotos) e `documentos` — ambos públicos. Mudança para privado exige URLs assinadas em todas as leituras.

## Deletar/renomear página
- Remover de `App.tsx` E do `AppSidebar.tsx` E do `MobileBottomNav`.

## Regra geral
Antes de deletar qualquer arquivo, `rg` pelo nome do símbolo em `src/` e `supabase/`.
