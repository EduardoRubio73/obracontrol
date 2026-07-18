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
| `RequireObra` | Bloqueia UI se `isAll` ou sem obra | `children`, `obraId`, `pageName` | `useObraAtiva` |
| `LegacyObraRedirect` | Redireciona bookmark antigo (`/etapas`, `/relatorios`, …) para `/obras/:id/<section>` usando a última obra ativa | `section`, `sub?`, `emptyFallback?` | `useObraAtiva` |
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

## Padrão de página por obra
Páginas obra-scoped (`Chat`, `Financeiro`, `Materiais`, `Relatorios`, …) seguem o
mesmo split: `XxxContent({ obraId }: { obraId: string })` com a lógica/UI real,
e um `export default function Xxx()` que lê `useParams<{id}>()` e envolve com
`<RequireObra obraId={id} pageName="...">{id && <XxxContent obraId={id} />}</RequireObra>`.
Nome da obra vem de `useObraAtiva().obras.find(o => o.id === obraId)`, nunca do
conceito global (deprecated) de "obra ativa".

## Eventos comuns
- Formulários usam `react-hook-form` + `zod`.
- Notificações via `sonner` (`toast.success`, `toast.error`).
- Invalidação de cache: `queryClient.invalidateQueries({ queryKey: [...] })` após mutações.
