-- Aplica a formatação (Title Case em nome, Sentence case em descricao) nos
-- dados já existentes nas 7 tabelas — os triggers criados na migration
-- anterior só cobrem escritas novas a partir de agora.
-- disable/enable trigger user evita o erro 23502 de trg_audit_* (auth.uid()
-- NULL fora de um request com JWT) — mesmo padrão de
-- 20260716222404_dedupe_categorias_produtos.sql. Os índices únicos
-- (user_id, lower(trim(nome)), ...) continuam válidos: lower/trim já
-- ignoravam case e espaços antes desta formatação.

alter table unidades_medida disable trigger user;
update unidades_medida
set nome = fn_title_case(nome), descricao = fn_sentence_case(descricao)
where nome is distinct from fn_title_case(nome)
   or descricao is distinct from fn_sentence_case(descricao);
alter table unidades_medida enable trigger user;

alter table categorias_produtos disable trigger user;
update categorias_produtos
set nome = fn_title_case(nome), descricao = fn_sentence_case(descricao)
where nome is distinct from fn_title_case(nome)
   or descricao is distinct from fn_sentence_case(descricao);
alter table categorias_produtos enable trigger user;

alter table etapas_padrao disable trigger user;
update etapas_padrao
set nome = fn_title_case(nome), descricao = fn_sentence_case(descricao)
where nome is distinct from fn_title_case(nome)
   or descricao is distinct from fn_sentence_case(descricao);
alter table etapas_padrao enable trigger user;

alter table tarefas_padrao disable trigger user;
update tarefas_padrao
set nome = fn_title_case(nome), descricao = fn_sentence_case(descricao)
where nome is distinct from fn_title_case(nome)
   or descricao is distinct from fn_sentence_case(descricao);
alter table tarefas_padrao enable trigger user;

alter table tipos_obra disable trigger user;
update tipos_obra
set nome = fn_title_case(nome), descricao = fn_sentence_case(descricao)
where nome is distinct from fn_title_case(nome)
   or descricao is distinct from fn_sentence_case(descricao);
alter table tipos_obra enable trigger user;

alter table produtos disable trigger user;
update produtos
set nome = fn_title_case(nome)
where nome is distinct from fn_title_case(nome);
alter table produtos enable trigger user;

alter table fornecedores disable trigger user;
update fornecedores
set nome = fn_title_case(nome)
where nome is distinct from fn_title_case(nome);
alter table fornecedores enable trigger user;
