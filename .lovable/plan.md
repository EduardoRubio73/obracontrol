

# Plano: Seletor Visual de Obras com Cards e Imagem

## Resumo
Substituir o dropdown `<Select>` na página Index por um seletor visual baseado em cards com imagem da obra, grid expansível e collapse automático.

---

## 1. Migration SQL — Coluna `main_image` na tabela `obras`

```sql
ALTER TABLE obras ADD COLUMN IF NOT EXISTS main_image text;
```

Sem imagem obrigatória — fallback: buscar a primeira foto de `fase_fotos` para a obra, ou mostrar placeholder.

## 2. Atualizar `useObraAtiva` — Incluir `main_image`

- Adicionar `main_image: string | null` na interface `Obra`
- Incluir `main_image` no select da query: `.select("id, nome, valor_previsto, status, main_image")`

## 3. Novo Componente `ObraSelectorVisual`

Componente independente em `src/components/ObraSelectorVisual.tsx`:

- **Props**: `obras`, `selectedId`, `onSelect`
- **State**: `expanded` (boolean)
- **Header fixo**: Texto "Para onde vamos agora?"
- **Card selecionado** (sempre visível): mostra imagem (thumbnail 40x40), nome e status. Clique toggle expand.
- **Grid expandido**: `grid-cols-1 md:grid-cols-3`, cada card com imagem no topo (h-28 object-cover), nome centralizado abaixo
- **Regra de imagem**: Para obras sem `main_image`, buscar a primeira `fase_fotos.url` via query separada. Se nenhuma imagem existir, mostrar placeholder com ícone 🏗️
- **Opção "Todas as Obras"**: Manter como primeiro card especial (ícone de grid, sem foto)
- **Animação**: CSS transition para expand/collapse suave
- **Ao selecionar**: chama `onSelect(id)`, fecha grid

## 4. Atualizar `Index.tsx`

- Remover imports do `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` e `Building2`
- Substituir o bloco do dropdown (linhas ~167-198) pelo `<ObraSelectorVisual>`
- Passar `obras`, `obraAtivaId`, `setObraAtivaId`

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | `ALTER TABLE obras ADD COLUMN main_image text` |
| `src/hooks/useObraAtiva.tsx` | Adicionar `main_image` ao select e interface |
| `src/components/ObraSelectorVisual.tsx` | Novo componente visual |
| `src/pages/Index.tsx` | Trocar dropdown pelo seletor visual |

