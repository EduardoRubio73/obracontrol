

# Plano: Combobox com Zod, Ordem do Dashboard, Título Dinâmico e Lançamento Financeiro Automático

## Resumo

4 frentes: (1) Combobox com validação Zod no modal de Nova Tarefa (EtapaDetalhe), (2) reordenar botões do Dashboard para Início primeiro sempre, (3) garantir títulos dinâmicos, (4) "Marcar comprado" cria lançamento no financeiro via RPC transacional.

---

## 1. Migration: RPC `marcar_comprado`

Criar function SQL transacional que:
- Atualiza `compras.status = 'comprado'`
- Insere registro em `financeiro` com tipo `despesa`, valor total, `obra_id`, `user_id`
- Se qualquer operação falhar, faz rollback

```sql
CREATE OR REPLACE FUNCTION public.marcar_comprado(p_compra_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_compra RECORD;
BEGIN
  SELECT * INTO v_compra FROM compras WHERE id = p_compra_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compra não encontrada'; END IF;

  UPDATE compras SET status = 'comprado' WHERE id = p_compra_id;

  INSERT INTO financeiro (obra_id, user_id, tenant_id, descricao, valor, tipo, data_transacao)
  VALUES (
    v_compra.obra_id, v_compra.user_id, v_compra.tenant_id,
    'Compra: ' || COALESCE(v_compra.descricao, 'Material'),
    COALESCE(v_compra.valor_total, 0), 'despesa', CURRENT_DATE
  );
END; $$;
```

## 2. `src/pages/EtapaDetalhe.tsx` — Combobox + Zod no modal Nova Tarefa

- Substituir `<Input name="nome">` por `EtapaCombobox` (reutilizar do Etapas.tsx ou extrair componente compartilhado)
- Query `etapas_padrao` para alimentar opções
- Zod schema: `z.object({ nome: z.string().min(1, "Obrigatório") })`
- Se valor novo, inserir em `etapas_padrao` antes de criar `fase_itens`
- Botão desabilitado enquanto campo vazio

## 3. `src/pages/Index.tsx` — Reordenar botões

- Remover lógica condicional `orderedMenu` (linhas 142-144) que coloca Etapas primeiro quando não há alertas
- Sempre usar `menuItems` na ordem original: Início, Etapas, Compras, Financeiro, Contatos

## 4. `src/pages/Compras.tsx` — Marcar comprado com financeiro

- Substituir `toggleStatus.mutate({ id, status: "comprado" })` por chamada RPC `marcar_comprado`
- Toast: "Compra registrada e lançada no financeiro com sucesso!"
- Invalidar queries de `compras` e `financeiro`

## 5. Títulos dinâmicos (já implementados)

Os títulos em Etapas, Compras, Financeiro, Cotações já mostram `— {obraAtiva.nome}`. Nenhuma mudança necessária.

---

## Arquivos a editar

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar RPC `marcar_comprado` |
| `src/pages/EtapaDetalhe.tsx` | Combobox + Zod no modal Nova Tarefa |
| `src/pages/Index.tsx` | Remover reordenação condicional dos botões |
| `src/pages/Compras.tsx` | Usar RPC `marcar_comprado` + toast + invalidar financeiro |

