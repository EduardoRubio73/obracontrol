# 02 - Project Structure

```
/
├── src/
│   ├── App.tsx                # Router + Providers (Query, Auth, ObraAtiva, Tooltip)
│   ├── main.tsx               # Entry point
│   ├── index.css              # Design tokens (HSL) + Tailwind base
│   ├── App.css
│   ├── vite-env.d.ts
│   ├── assets/                # Logos, imagens estáticas (logo-obracontrol.png)
│   ├── components/
│   │   ├── ui/                # shadcn primitives (button, dialog, smart-combobox, …)
│   │   ├── dashboard/         # Cards e widgets da Dashboard
│   │   ├── financeiro/        # DescricaoCombobox, FileUploadPreview
│   │   ├── produtos/          # ImportarProdutosDialog
│   │   ├── AppLayout.tsx      # Layout autenticado (sidebar + outlet)
│   │   ├── AppSidebar.tsx     # Menu lateral com grupos
│   │   ├── MobileBottomNav.tsx
│   │   ├── ObraContextTabs.tsx
│   │   ├── ObraSelectorVisual.tsx
│   │   ├── ObraPhotoCarousel.tsx
│   │   ├── FasePhotos.tsx
│   │   ├── RequireObra.tsx    # Guard que exige obra ativa selecionada
│   │   ├── VoiceWaveform.tsx
│   │   ├── FloatingZoomTextToolbar.tsx
│   │   └── NavLink.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx        # AuthProvider + useAuth
│   │   ├── useObraAtiva.tsx   # Obra ativa global + lista
│   │   ├── useVoiceCommand.ts
│   │   ├── useVoiceLoop.ts
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── pages/                 # Uma tela por rota (ver 03-routing.md)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts      # Cliente Supabase tipado (auto-gerado)
│   │       └── types.ts       # Database types (auto-gerado — NÃO EDITAR)
│   ├── lib/
│   │   ├── utils.ts           # cn() helper
│   │   ├── regras-decisao.ts  # Regras de negócio para apoio à decisão
│   │   ├── csv.ts             # toCsv/downloadCsv — export CSV compartilhado
│   │   └── pdf.ts             # generatePdfFromHtml/downloadPdfBlob/toBase64 (html2pdf.js)
│   └── test/                  # Setup e testes vitest
│
├── supabase/
│   ├── config.toml            # project_id
│   ├── migrations/            # Migrations SQL (gerenciadas pela tool)
│   └── functions/
│       ├── _shared/           # importer.ts (parsers, matching)
│       ├── apoio-decisao/
│       ├── chat-assistente/
│       ├── commitar-importacao/
│       ├── gerar-escopo/
│       └── importar-documento/
│
├── core/ parsers/ web/        # Protótipo Python legado (referência, NÃO usar)
├── docs/ai-context/           # Este pacote de contexto
├── public/                    # Estáticos públicos
├── index.html                 # Head metadata (title, meta)
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

## Responsabilidades
| Pasta | Responsabilidade |
|-------|------------------|
| `src/pages` | Componentes de topo por rota. Chamam Supabase diretamente via React Query. |
| `src/components/ui` | Primitivos shadcn — **não misturar lógica de negócio aqui.** |
| `src/components/<domínio>` | Componentes específicos (dashboard, financeiro, produtos). |
| `src/hooks` | Providers globais + hooks reutilizáveis. |
| `src/integrations/supabase` | Cliente e tipos — auto-gerados. |
| `src/lib` | Helpers puros e regras de negócio isoladas. |
| `supabase/functions` | Edge Functions Deno. `_shared/` para código comum. |
| `core/ parsers/ web/` | **Legado Python**, mantido só como referência para o pipeline de importação. |
