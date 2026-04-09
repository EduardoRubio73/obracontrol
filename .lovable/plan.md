

# Plano: Carrossel de fotos da obra + miniaturas em cards e etapas

## Contexto

As fotos da obra ficam na tabela `fase_fotos` com campos `obra_id`, `fase_id`, `tipo`, `url`, `descricao`. Já existe query para buscar todas as fotos de uma obra. O pedido tem 3 partes:

## 1. Componente `ObraPhotoCarousel` — header visual em páginas da obra

**Novo arquivo: `src/components/ObraPhotoCarousel.tsx`**

- Recebe `obraId` como prop
- Query: `supabase.from("fase_fotos").select("id, url, tipo, descricao, fase_id, obra_fases(nome)").eq("obra_id", obraId).order("created_at", { ascending: false })`
- Renderiza uma faixa horizontal com scroll (CSS `overflow-x: auto`, `snap-x`) mostrando miniaturas em aspect-ratio 16:9 com ~120px de altura
- Auto-scroll com `setInterval` a cada 4s (pausa ao hover/touch)
- Ao clicar numa foto: abre `Dialog` com imagem ampliada + nome da fase (`obra_fases.nome`) + tipo (antes/durante/depois) + descrição se houver
- Se não houver fotos, não renderiza nada (retorna `null`)

**Integração no layout: `src/components/AppLayout.tsx`**
- Importar `ObraPhotoCarousel`
- Renderizar entre o header e o `<main>`, condicionalmente quando `obraAtiva` existe
- Passa `obraId={obraAtiva.id}`

## 2. Miniaturas nos cards de Etapas (`src/pages/Etapas.tsx`)

- Dentro do card de cada fase, buscar a primeira foto dessa fase via query agrupada
- Query extra: `supabase.from("fase_fotos").select("id, url, fase_id").eq("obra_id", obraAtivaId).order("created_at", { ascending: false })`
- Agrupar por `fase_id`, pegar a primeira de cada
- No card, antes do título, renderizar miniatura `48x48` arredondada se existir foto, senão manter o dot de status como está

## 3. Miniaturas nos cards de Obras Recentes (`src/components/dashboard/DashboardObrasRecentes.tsx`)

- Query extra: buscar primeira foto de cada obra (`fase_fotos` agrupada por `obra_id`, limit por obra)
- Na listagem, adicionar miniatura `40x40` arredondada à esquerda de cada obra no card
- Se não houver foto, mostrar ícone `Building2` como fallback

## 4. Miniaturas na lista de Obras (`src/pages/Obras.tsx`)

- Mesma lógica: buscar primeira foto por obra
- Na table row desktop: adicionar coluna "Foto" com miniatura `36x36`
- No mobile card: adicionar miniatura à esquerda

## Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/components/ObraPhotoCarousel.tsx` | Novo componente — carrossel + dialog ampliado |
| `src/components/AppLayout.tsx` | Integrar carrossel abaixo do header |
| `src/pages/Etapas.tsx` | Adicionar miniatura no card de cada fase |
| `src/components/dashboard/DashboardObrasRecentes.tsx` | Miniatura por obra |
| `src/pages/Obras.tsx` | Miniatura na tabela e cards mobile |

Nenhuma migration necessária — usa a tabela `fase_fotos` existente.

