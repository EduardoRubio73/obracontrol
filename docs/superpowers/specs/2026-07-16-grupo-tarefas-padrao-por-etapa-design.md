# Grupo de Tarefas Padrão por Etapa Padrão

## Contexto

Hoje "Etapas Padrão" (`etapas_padrao`) e "Tarefas Padrão" (`tarefas_padrao`) são dois
catálogos totalmente independentes, gerenciados na tela Configurações → "Etapas &
Tarefas" (`src/pages/Configuracoes.tsx`). Ao criar uma nova etapa numa obra (ex:
"Demolição"), o usuário precisa depois adicionar manualmente cada tarefa uma a uma —
mesmo quando já sabe de antemão quais tarefas sempre se repetem para aquele tipo de
etapa (ex: "Demolir paredes internas", "Remover entulho", "Desligar hidráulica/elétrica").

O objetivo é permitir agrupar um conjunto de Tarefas Padrão sob uma Etapa Padrão, para
que, ao criar uma nova etapa numa obra a partir desse nome padrão, todas as tarefas do
grupo sejam adicionadas de uma vez.

## Modelo de dados

Nova coluna nullable em `tarefas_padrao`:

```sql
ALTER TABLE public.tarefas_padrao
  ADD COLUMN etapa_padrao_id uuid REFERENCES public.etapas_padrao(id) ON DELETE SET NULL;
```

- Cada tarefa padrão pertence a **no máximo uma** etapa padrão (relação N:1, decisão
  confirmada com o usuário — tarefas normalmente já são escritas pensando numa etapa
  específica).
- Coluna nullable: tarefas sem grupo continuam existindo e funcionando exatamente como
  hoje (aparecem soltas na busca ao adicionar itens a uma etapa em `EtapaDetalhe.tsx`).
- `ON DELETE SET NULL`: excluir uma Etapa Padrão não apaga as tarefas vinculadas, só
  desvincula (evita perda de dados por engano).
- Nenhuma tabela nova, nenhuma policy de RLS nova — RLS já existente em `tarefas_padrao`
  continua valendo por linha; a nova coluna não muda a superfície de acesso.
- Migration vai em `supabase/migrations/`, seguindo o padrão do projeto (nunca editar
  SQL à mão em produção — arquivo de migration + aplicação via SQL Editor do Supabase,
  já que o MCP oficial ainda não está conectado a este projeto). Após aplicar, rodar
  `generate_typescript_types` (ou o fluxo equivalente) para atualizar
  `src/integrations/supabase/types.ts` — nunca editar esse arquivo à mão.

## UI — Configurações (`src/pages/Configuracoes.tsx`)

A aba "Etapas & Tarefas" hoje usa o componente genérico `CrudBody`/`CrudCollapsible`
(nome + descrição) para ambas as tabelas. Para `tarefas_padrao`, precisamos de um campo
extra — então criamos uma variante específica em vez de sobrecarregar o `CrudBody`
genérico usado por outras 4 tabelas:

- Novo componente `TarefaPadraoBody` (baseado em `CrudBody`, mas com um combobox extra
  "Pertence à etapa (opcional)" — reaproveita o padrão de combobox já usado em
  `EtapaCombobox`/`CategoriaCombobox`/`SmartCombobox`). Lista as `etapas_padrao`
  existentes; permite deixar em branco (tarefa avulsa).
- Cada linha da lista de Tarefas Padrão mostra um badge pequeno com o nome da etapa
  vinculada, se houver.
- `CrudCollapsible` para `etapas_padrao` (a lista de Etapas Padrão) ganha, por linha, um
  contador somente-leitura ("3 tarefas") de quantas tarefas padrão apontam para aquele
  id — uma query adicional agrupando `tarefas_padrao` por `etapa_padrao_id`.

## UI — Criar etapa numa obra (`src/pages/Etapas.tsx`)

O `EtapaForm`/`EtapaCombobox` já existente distingue "nome digitado que bate com uma
etapa padrão existente" de "nome novo". Usamos essa mesma distinção:

- Quando o nome escolhido corresponde a uma `etapa_padrao` que tem 1+ tarefas
  vinculadas, o formulário mostra um checkbox **"Carregar as N tarefas padrão desse
  grupo"**, marcado por padrão.
- Se o nome é novo (sem correspondência) ou a etapa padrão não tem tarefas vinculadas,
  o checkbox não aparece — comportamento idêntico ao atual.
- Ao submeter "Criar etapa": a mutation `createFase` primeiro insere a `obra_fases`
  (como já faz hoje); se o checkbox estava marcado, em seguida busca as
  `tarefas_padrao` daquele `etapa_padrao_id` e insere todas em lote como `fase_itens`
  (`status: "pendente"`, sem `executar_em`) — mesmo padrão de insert em lote já usado em
  `EtapaDetalhe.tsx` (`createItems`).
- Toast de sucesso diferencia os dois casos: "Etapa criada!" vs "Etapa criada com N
  tarefas padrão!".
- Falha ao inserir as tarefas em lote não deve desfazer a criação da etapa (a etapa já
  existe e é útil mesmo sem as tarefas); nesse caso mostra um toast de erro específico
  ("Etapa criada, mas houve um erro ao carregar as tarefas padrão") em vez de falhar
  silenciosamente.

## Fora do escopo

- Não altera o fluxo de "Nova tarefa" dentro de `EtapaDetalhe.tsx` (continua mostrando
  todas as tarefas padrão na busca, agrupadas ou não — filtrar essa busca pelo grupo da
  fase atual pode ser um refinamento futuro, não pedido agora).
- Não permite uma tarefa pertencer a múltiplas etapas padrão (decisão confirmada).
- Não mexe em `obra_fases`/`fase_itens` além do insert em lote já descrito.

## Verificação

1. Aplicar a migration (via SQL Editor do Supabase) e regenerar `types.ts`.
2. Em Configurações → Etapas & Tarefas: criar/editar uma Tarefa Padrão vinculando-a a
   uma Etapa Padrão; confirmar que o badge aparece na lista e o contador da Etapa
   Padrão incrementa.
3. Numa obra, em Etapas → Nova etapa: escolher um nome que bate com uma Etapa Padrão
   com tarefas vinculadas; confirmar que o checkbox aparece marcado, e que ao criar, as
   tarefas do grupo aparecem em `EtapaDetalhe.tsx` (checklist) sem precisar adicionar
   manualmente.
4. Desmarcar o checkbox antes de criar e confirmar que a etapa é criada sem as tarefas.
5. Criar uma etapa com nome novo (não cadastrado como padrão) e confirmar que o
   checkbox não aparece e nada muda em relação ao comportamento atual.
6. `tsc --noEmit` e `npm run build` sem erros.
