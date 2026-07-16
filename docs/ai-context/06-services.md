# 06 - Services

**Não há uma camada dedicada `services/`.** As páginas chamam Supabase diretamente via `supabase.from(...)` / `supabase.functions.invoke(...)` dentro de hooks `useQuery` / `useMutation`.

## Padrão de acesso a dados
```ts
const { data } = useQuery({
  queryKey: ["compras", filtroObraId],
  enabled: !isAll && !!filtroObraId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .eq("obra_id", filtroObraId!);
    if (error) throw error;
    return data;
  },
});
```

## Chamadas a Edge Functions
Via `supabase.functions.invoke("<nome>", { body })`:

| Função | Payload | Retorno |
|--------|---------|---------|
| `chat-assistente` | `{ messages, obraId? }` | `{ reply }` streaming/JSON |
| `apoio-decisao` | `{ obraId, contexto }` | `{ sugestoes }` |
| `gerar-escopo` | `{ nome, tipo, classificacao }` | `{ fases, itens }` |
| `importar-documento` | `{ storage_path }` | `{ meta, tipo_documento, confianca, fornecedor_match, items[] }` |
| `commitar-importacao` | `{ preview, decisions, obra_id }` | `{ ok, ids }` |

## Tratamento de erro
- Erros do Supabase têm `error.message` — exibir com `toast.error(error.message)`.
- Erros de Edge Function retornam `{ error }` em body; verificar com `if (error) throw new Error(...)`.
