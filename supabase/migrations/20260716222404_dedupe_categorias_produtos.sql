-- Remove categorias_produtos duplicadas (mesmo user_id + nome normalizado).
-- Mantém a linha mais recente de cada duplicata (a que já tinha produtos
-- vinculados) e remapeia produtos.categoria_id da linha órfã para a mantida
-- antes de excluir, para não deixar nenhum produto sem categoria.

with duplicadas as (
  select
    id,
    user_id,
    lower(trim(nome)) as nome_norm,
    row_number() over (
      partition by user_id, lower(trim(nome))
      order by created_at desc
    ) as rn
  from categorias_produtos
),
mantidas as (
  select user_id, nome_norm, id as id_manter
  from duplicadas
  where rn = 1
),
remover as (
  select d.id as id_remover, m.id_manter
  from duplicadas d
  join mantidas m
    on m.user_id = d.user_id and m.nome_norm = d.nome_norm
  where d.rn > 1
)
update produtos p
set categoria_id = r.id_manter
from remover r
where p.categoria_id = r.id_remover;

-- trg_audit_categorias_produtos insere em auditoria.user_id (NOT NULL) usando
-- auth.uid(), que retorna NULL num contexto de migration (sem JWT) — desabilitar
-- os triggers de usuário ao redor do DELETE de sistema evita o erro 23502
-- (mesmo padrão já usado em 20260716200000_fix_missing_profiles.sql). A migration
-- inteira roda em uma transação, então se algo falhar aqui o ENABLE é desfeito
-- junto com o resto — os triggers nunca ficam presos desligados.
alter table categorias_produtos disable trigger user;

with duplicadas as (
  select
    id,
    user_id,
    lower(trim(nome)) as nome_norm,
    row_number() over (
      partition by user_id, lower(trim(nome))
      order by created_at desc
    ) as rn
  from categorias_produtos
)
delete from categorias_produtos cp
using duplicadas d
where cp.id = d.id
  and d.rn > 1;

alter table categorias_produtos enable trigger user;

-- Bloqueia duplicidade futura (mesmo nome, ignorando espaços/maiúsculas, por usuário).
create unique index categorias_produtos_user_nome_unq
  on categorias_produtos (user_id, lower(trim(nome)));
