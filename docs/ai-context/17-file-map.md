# 17 - File Map

> Apenas arquivos relevantes. Ver `02-project-structure.md` para árvore geral.

## Entry
- `src/main.tsx` — bootstrap React.
- `src/App.tsx` — Providers + Routes (**único ponto de rotas**).
- `index.html` — head metadata.

## Integração
- `src/integrations/supabase/client.ts` — cliente tipado (auto-gerado).
- `src/integrations/supabase/types.ts` — tipos DB (**NÃO EDITAR**).

## Hooks
- `src/hooks/useAuth.tsx` — AuthProvider + `useAuth`.
- `src/hooks/useObraAtiva.tsx` — ObraAtivaProvider + `useObraAtiva`.
- `src/hooks/useVoiceCommand.ts`, `useVoiceLoop.ts` — voz.
- `src/hooks/use-mobile.tsx`, `use-toast.ts`.

## Libs
- `src/lib/utils.ts` — `cn()`.
- `src/lib/regras-decisao.ts` — regras usadas em `apoio-decisao`.

## Layout / navegação
- `src/components/AppLayout.tsx`, `AppSidebar.tsx`, `MobileBottomNav.tsx`, `NavLink.tsx`.
- `src/components/ObraSelectorVisual.tsx`, `ObraContextTabs.tsx`, `RequireObra.tsx`.
- `src/components/ObraPhotoCarousel.tsx`, `FasePhotos.tsx`, `VoiceWaveform.tsx`, `FloatingZoomTextToolbar.tsx`.

## Dashboard widgets
- `src/components/dashboard/Dashboard*.tsx` (12 arquivos).

## Domínio
- `src/components/financeiro/DescricaoCombobox.tsx`, `FileUploadPreview.tsx`.
- `src/components/produtos/ImportarProdutosDialog.tsx`.

## Páginas (rotas em 03-routing.md)
Todas em `src/pages/`: `Auth, Index, Dashboard, Hoje, Obras, NovaObra, Etapas, EtapaDetalhe, Compras, Financeiro, Cotacoes, Comparacao, Fornecedores, Produtos, Galeria, Materiais, Documentos, Dossie, ObraAlteracoes, Perfil, Relatorios, Configuracoes, Auditoria, Chat, PortalFornecedor, NotFound`.
Não roteadas (código morto): `Analise.tsx`, `Ranking.tsx`.

## Edge Functions
- `supabase/functions/_shared/importer.ts` — parsing + matching.
- `supabase/functions/chat-assistente/index.ts`
- `supabase/functions/apoio-decisao/index.ts`
- `supabase/functions/gerar-escopo/index.ts`
- `supabase/functions/importar-documento/index.ts`
- `supabase/functions/commitar-importacao/index.ts`

## Config
- `tailwind.config.ts`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `postcss.config.js`.
- `supabase/config.toml`.

## Legado (não usar)
- `core/`, `parsers/`, `web/` — protótipo Python.
