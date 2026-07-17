-- Funções de normalização de texto reutilizadas pelos triggers de formatação.
-- fn_title_case: "Nome Próprio" — cada palavra com inicial maiúscula (usa o
-- initcap() nativo do Postgres, sem reinventar tokenização).
-- fn_sentence_case: "Frase comum" — só a primeira letra maiúscula, resto como
-- veio (não força minúsculo no restante, para não estragar siglas como "PVC").

create or replace function fn_title_case(txt text)
returns text
language sql
immutable
as $$
  select case
    when txt is null or trim(txt) = '' then txt
    else initcap(trim(txt))
  end;
$$;

create or replace function fn_sentence_case(txt text)
returns text
language sql
immutable
as $$
  select case
    when txt is null or trim(txt) = '' then txt
    else upper(left(trim(txt), 1)) || substring(trim(txt) from 2)
  end;
$$;
