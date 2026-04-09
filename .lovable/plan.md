

# Plano: Status automático, Dashboard por obra e melhorias

## 1. Status automático da obra

Criar um trigger no banco que muda o status da obra de "planejamento" para "execução" quando houver movimentação em `compras` ou `financeiro`.

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.auto_status_obra_execucao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE obras SET status = 'execução'
  WHERE id = NEW.obra_id AND status = 'planejamento';
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_compras_auto_status
  AFTER INSERT ON compras
  FOR EACH ROW EXECUTE FUNCTION auto_status_obra_execucao();

CREATE TRIGGER trg_financeiro_auto_status
  AFTER INSERT ON financeiro
  FOR EACH ROW EXECUTE FUNCTION auto_status_obra_execucao();
```

## 2. Status da obra no dropdown do selector

**`src/hooks/useObraAtiva.tsx`:**
- Adicionar `status` ao interface `Obra` e à query (`select("id, nome, valor_previsto, status")`)

**`src/pages/Index.tsx`** (obra selector):
- Exibir status como badge ao lado do nome: `Reforma Portaria • Execução`

## 3. Dashboard — Nome da obra no título + filtro "Todas"

**`src/pages/Dashboard.tsx`:**
- No header, ao lado de "Dashboard", mostrar o nome da obra ativa (ex: "Dashboard — Reforma Portaria")
- Adicionar opção "Todas as obras" no selector (setar `obraAtivaId = null` temporariamente ou usar estado local `filtroId`)
- Adicionar um `Select` no header para alternar entre obras e "Todas"

## 4. Cards do Dashboard correspondentes à obra filtrada

**`src/pages/Dashboard.tsx`:**
- O card "Total Obras" mostra 1 quando filtrado por obra, ou total quando "Todas"
- "Em Andamento" mostra fases em andamento da obra filtrada (não obras em andamento)
- "Total Investido" já filtra por `filtroId` — manter
- "Alertas" filtrar por obra quando selecionada

**`src/components/dashboard/DashboardSummaryCards.tsx`:**
- Ajustar props para receber dados já filtrados corretamente

## 5. Pills de status clicáveis

**`src/pages/Dashboard.tsx`:**
- Abaixo do header, renderizar pills/badges para cada status: Planejamento, Execução, Concluído, Pausado, Cancelado
- A pill ativa (status atual da obra) fica destacada
- Ao clicar em outra pill, chama `supabase.from("obras").update({ status }).eq("id", obraAtivaId)` e invalida queries
- Só aparece quando uma obra específica está selecionada

## Arquivos a editar

| Arquivo | Ação |
|---|---|
| Migration SQL | Trigger auto status em compras/financeiro |
| `src/hooks/useObraAtiva.tsx` | Adicionar `status` ao tipo e query |
| `src/pages/Index.tsx` | Exibir status no dropdown |
| `src/pages/Dashboard.tsx` | Nome da obra no título, filtro Todas/Obra, cards filtrados, pills de status |
| `src/components/dashboard/DashboardSummaryCards.tsx` | Ajustar para dados filtrados por obra |

