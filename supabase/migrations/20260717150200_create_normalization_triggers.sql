-- Triggers BEFORE INSERT/UPDATE que formatam nome (Title Case) e descricao
-- (Sentence case) automaticamente, nas 7 tabelas de cadastro/apoio.
-- Duas funções de trigger compartilhadas (mesmas colunas nas tabelas do
-- mesmo grupo, então uma função por grupo evita repetir 7 versões iguais):
--   - trg_normalize_nome_descricao: tabelas com nome + descricao
--   - trg_normalize_nome_only: tabelas só com nome (produtos, fornecedores)

create or replace function trg_normalize_nome_descricao()
returns trigger
language plpgsql
as $$
begin
  new.nome := fn_title_case(new.nome);
  new.descricao := fn_sentence_case(new.descricao);
  return new;
end;
$$;

create or replace function trg_normalize_nome_only()
returns trigger
language plpgsql
as $$
begin
  new.nome := fn_title_case(new.nome);
  return new;
end;
$$;

-- Grupo com nome + descricao
create trigger trg_normalize_unidades_medida
  before insert or update on unidades_medida
  for each row execute function trg_normalize_nome_descricao();

create trigger trg_normalize_categorias_produtos
  before insert or update on categorias_produtos
  for each row execute function trg_normalize_nome_descricao();

create trigger trg_normalize_etapas_padrao
  before insert or update on etapas_padrao
  for each row execute function trg_normalize_nome_descricao();

create trigger trg_normalize_tarefas_padrao
  before insert or update on tarefas_padrao
  for each row execute function trg_normalize_nome_descricao();

create trigger trg_normalize_tipos_obra
  before insert or update on tipos_obra
  for each row execute function trg_normalize_nome_descricao();

-- Grupo só com nome
create trigger trg_normalize_produtos
  before insert or update on produtos
  for each row execute function trg_normalize_nome_only();

create trigger trg_normalize_fornecedores
  before insert or update on fornecedores
  for each row execute function trg_normalize_nome_only();
