# 04 - Components

## Layout & Navegação
| Componente | Propósito | Props relevantes | Depende de |
|-----------|-----------|------------------|-----------|
| `AppLayout` | Wrapper autenticado (sidebar + `<Outlet/>`) | — | `AppSidebar`, `MobileBottomNav`, `useObraAtiva` |
| `AppSidebar` | Menu lateral com grupos e emojis | — | shadcn `sidebar`, `NavLink` |
| `MobileBottomNav` | Nav inferior mobile | — | react-router |
| `NavLink` | Link com estado ativo | `to`, `icon`, `children` | react-router |
| `ObraContextTabs` | Tabs contextuais (galeria/materiais/documentos/…) | `obraId` | react-router |
| `ObraSelectorVisual` | Seletor visual de obra ativa | — | `useObraAtiva` |
| `RequireObra` | Bloqueia UI se `isAll` ou sem obra | `children` | `useObraAtiva` |
| `ObraPhotoCarousel` | Carousel de fotos | `photos` | embla-carousel |
| `FasePhotos` | Grid/upload de fotos por fase | `faseId` | Supabase Storage |
| `VoiceWaveform` | Animação enquanto grava | `active` | — |
| `FloatingZoomTextToolbar` | Ajuste de zoom de texto | — | — |

## Dashboard (`src/components/dashboard/`)
Cada card faz sua própria query (React Query). Componentes:
`DashboardSummaryCards`, `DashboardObrasRecentes`, `DashboardFinanceiroCard`,
`DashboardCotacoesCard`, `DashboardCotacoesDetalhadas`, `DashboardTimeline`,
`DashboardEvolucaoMensal`, `DashboardChartPrevistoGasto`, `DashboardFornecedores`,
`DashboardDocumentos`, `DashboardAlteracoes`, `DashboardAdminSection`.

**Convenção:** todos respeitam `filtroObraId` do `useObraAtiva`. Quando `isAll`, tratar sem filtro por obra ou mostrar estado agregado.

## Domínio
| Componente | Propósito |
|-----------|-----------|
| `financeiro/DescricaoCombobox` | Autocomplete de descrições recorrentes |
| `financeiro/FileUploadPreview` | Upload+preview de anexo em transação |
| `produtos/ImportarProdutosDialog` | Modal completo de importação (upload → preview → decisões → commit) |

## UI Primitives (`src/components/ui/`)
Base shadcn/ui — todos os componentes Radix standard. Destaque:
- **`smart-combobox.tsx`** — combobox com opção de **criar novo item inline** (usado em Unidade, Categoria).
- `sidebar.tsx` — layout de sidebar com colapse.
- `sonner.tsx` + `toaster.tsx` — dois sistemas de toast (Sonner é o preferencial; `toaster` legado).

## Eventos comuns
- Formulários usam `react-hook-form` + `zod`.
- Notificações via `sonner` (`toast.success`, `toast.error`).
- Invalidação de cache: `queryClient.invalidateQueries({ queryKey: [...] })` após mutações.
