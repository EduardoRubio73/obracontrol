-- Remove duplicatas (mesmo user_id + nome normalizado) em unidades_medida,
-- produtos, fornecedores, etapas_padrao, tarefas_padrao e tipos_obra --
-- mesmo padrão já usado em 20260716222404_dedupe_categorias_produtos.sql.
-- Antes de excluir cada linha órfã, remapeia as FKs conhecidas (produtos,
-- compras, fornecedor_metricas, financeiro, cotacao_fornecedores, propostas,
-- fornecedores_cotacao, tarefas_padrao) para a linha mantida (created_at mais
-- recente), para não deixar nenhum registro relacionado órfão.
-- Verificado em 17/07/2026: nenhuma duplicata existe hoje nessas tabelas —
-- esta migration é uma rede de segurança + a fonte dos índices únicos abaixo.

-- ============ unidades_medida (sem FK de outras tabelas conhecida) ============
alter table unidades_medida disable trigger user;

with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from unidades_medida
)
delete from unidades_medida u
using duplicadas d
where u.id = d.id and d.rn > 1;

alter table unidades_medida enable trigger user;

create unique index if not exists unidades_medida_user_nome_unq
  on unidades_medida (user_id, lower(trim(nome)));

-- ============ produtos (dedupe por user_id + nome + categoria_id) ============
with duplicadas as (
  select id, user_id, categoria_id, lower(trim(nome)) as nome_norm,
    row_number() over (
      partition by user_id, lower(trim(nome)), categoria_id
      order by created_at desc
    ) as rn
  from produtos
),
mantidas as (
  select user_id, nome_norm, categoria_id, id as id_manter
  from duplicadas where rn = 1
),
remover as (
  select d.id as id_remover, m.id_manter
  from duplicadas d
  join mantidas m
    on m.user_id = d.user_id and m.nome_norm = d.nome_norm
    and m.categoria_id is not distinct from d.categoria_id
  where d.rn > 1
)
update compras c
set produto_id = r.id_manter
from remover r
where c.produto_id = r.id_remover;

alter table produtos disable trigger user;

with duplicadas as (
  select id, user_id, categoria_id, lower(trim(nome)) as nome_norm,
    row_number() over (
      partition by user_id, lower(trim(nome)), categoria_id
      order by created_at desc
    ) as rn
  from produtos
)
delete from produtos p
using duplicadas d
where p.id = d.id and d.rn > 1;

alter table produtos enable trigger user;

create unique index if not exists produtos_user_nome_categoria_unq
  on produtos (user_id, lower(trim(nome)), categoria_id);

-- ============ fornecedores (dedupe por user_id + nome) ============
with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from fornecedores
),
mantidas as (
  select user_id, nome_norm, id as id_manter from duplicadas where rn = 1
),
remover as (
  select d.id as id_remover, m.id_manter
  from duplicadas d
  join mantidas m on m.user_id = d.user_id and m.nome_norm = d.nome_norm
  where d.rn > 1
)
update compras c set fornecedor_id = r.id_manter from remover r where c.fornecedor_id = r.id_remover;

with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from fornecedores
),
mantidas as (
  select user_id, nome_norm, id as id_manter from duplicadas where rn = 1
),
remover as (
  select d.id as id_remover, m.id_manter
  from duplicadas d
  join mantidas m on m.user_id = d.user_id and m.nome_norm = d.nome_norm
  where d.rn > 1
)
update fornecedor_metricas fm set fornecedor_id = r.id_manter from remover r where fm.fornecedor_id = r.id_remover;

with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from fornecedores
),
mantidas as (
  select user_id, nome_norm, id as id_manter from duplicadas where rn = 1
),
remover as (
  select d.id as id_remover, m.id_manter
  from duplicadas d
  join mantidas m on m.user_id = d.user_id and m.nome_norm = d.nome_norm
  where d.rn > 1
)
update financeiro f set fornecedor_id = r.id_manter from remover r where f.fornecedor_id = r.id_remover;

with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from fornecedores
),
mantidas as (
  select user_id, nome_norm, id as id_manter from duplicadas where rn = 1
),
remover as (
  select d.id as id_remover, m.id_manter
  from duplicadas d
  join mantidas m on m.user_id = d.user_id and m.nome_norm = d.nome_norm
  where d.rn > 1
)
update cotacao_fornecedores cf set fornecedor_id = r.id_manter from remover r where cf.fornecedor_id = r.id_remover;

with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from fornecedores
),
mantidas as (
  select user_id, nome_norm, id as id_manter from duplicadas where rn = 1
),
remover as (
  select d.id as id_remover, m.id_manter
  from duplicadas d
  join mantidas m on m.user_id = d.user_id and m.nome_norm = d.nome_norm
  where d.rn > 1
)
update propostas p set fornecedor_id = r.id_manter from remover r where p.fornecedor_id = r.id_remover;

with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from fornecedores
),
mantidas as (
  select user_id, nome_norm, id as id_manter from duplicadas where rn = 1
),
remover as (
  select d.id as id_remover, m.id_manter
  from duplicadas d
  join mantidas m on m.user_id = d.user_id and m.nome_norm = d.nome_norm
  where d.rn > 1
)
update fornecedores_cotacao fc set fornecedor_id = r.id_manter from remover r where fc.fornecedor_id = r.id_remover;

alter table fornecedores disable trigger user;

with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from fornecedores
)
delete from fornecedores f
using duplicadas d
where f.id = d.id and d.rn > 1;

alter table fornecedores enable trigger user;

create unique index if not exists fornecedores_user_nome_unq
  on fornecedores (user_id, lower(trim(nome)));

-- ============ etapas_padrao (dedupe por user_id + nome; remapear tarefas_padrao) ============
with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from etapas_padrao
),
mantidas as (
  select user_id, nome_norm, id as id_manter from duplicadas where rn = 1
),
remover as (
  select d.id as id_remover, m.id_manter
  from duplicadas d
  join mantidas m on m.user_id = d.user_id and m.nome_norm = d.nome_norm
  where d.rn > 1
)
update tarefas_padrao tp set etapa_padrao_id = r.id_manter from remover r where tp.etapa_padrao_id = r.id_remover;

alter table etapas_padrao disable trigger user;

with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from etapas_padrao
)
delete from etapas_padrao e
using duplicadas d
where e.id = d.id and d.rn > 1;

alter table etapas_padrao enable trigger user;

create unique index if not exists etapas_padrao_user_nome_unq
  on etapas_padrao (user_id, lower(trim(nome)));

-- ============ tarefas_padrao (dedupe por user_id + nome + etapa_padrao_id) ============
alter table tarefas_padrao disable trigger user;

with duplicadas as (
  select id, user_id, etapa_padrao_id, lower(trim(nome)) as nome_norm,
    row_number() over (
      partition by user_id, lower(trim(nome)), etapa_padrao_id
      order by created_at desc
    ) as rn
  from tarefas_padrao
)
delete from tarefas_padrao t
using duplicadas d
where t.id = d.id and d.rn > 1;

alter table tarefas_padrao enable trigger user;

create unique index if not exists tarefas_padrao_user_nome_etapa_unq
  on tarefas_padrao (user_id, lower(trim(nome)), etapa_padrao_id);

-- ============ tipos_obra (sem FK de outras tabelas conhecida) ============
alter table tipos_obra disable trigger user;

with duplicadas as (
  select id, user_id, lower(trim(nome)) as nome_norm,
    row_number() over (partition by user_id, lower(trim(nome)) order by created_at desc) as rn
  from tipos_obra
)
delete from tipos_obra t
using duplicadas d
where t.id = d.id and d.rn > 1;

alter table tipos_obra enable trigger user;

create unique index if not exists tipos_obra_user_nome_unq
  on tipos_obra (user_id, lower(trim(nome)));
