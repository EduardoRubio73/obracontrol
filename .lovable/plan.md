

# Plano: Incluir Compras Pendentes na Tela "Hoje"

## Problema

A página "Hoje" só verifica pendências em `alertas_sistema` e `fase_itens`. Compras com status "pendente" na tabela `compras` não são consideradas, fazendo o sistema mostrar "Tudo em dia" mesmo com compras pendentes.

## Solução

Adicionar uma query de compras pendentes em `src/pages/Hoje.tsx` e exibir essas compras como pendências na tela.

## Alterações em `src/pages/Hoje.tsx`

1. **Nova query** — buscar compras pendentes:
   ```ts
   const { data: comprasPendentes } = useQuery({
     queryKey: ["compras-pendentes"],
     queryFn: async () => {
       const { data } = await supabase
         .from("compras")
         .select("id, descricao, status, valor_total, fornecedor:fornecedores(nome)")
         .eq("status", "pendente")
         .limit(5);
       return data;
     },
   });
   ```

2. **Atualizar lógica de pendências** — incluir compras no cálculo:
   ```ts
   const hasCompras = (comprasPendentes?.length ?? 0) > 0;
   // "Tudo em dia" só aparece se NÃO há alertas, NEM tarefas, NEM compras
   ```

3. **Nova seção visual** — listar compras pendentes com cards (similar às tarefas), com ícone de carrinho e botão "Marcar comprado" que chama o RPC `marcar_comprado`.

4. **Invalidar** queries de compras ao marcar como comprado.

## Arquivo a editar

| Arquivo | Ação |
|---|---|
| `src/pages/Hoje.tsx` | Adicionar query compras pendentes, atualizar condição "Tudo em dia", renderizar seção de compras |

