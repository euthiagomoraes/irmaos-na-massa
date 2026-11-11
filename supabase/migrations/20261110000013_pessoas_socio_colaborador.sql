-- =====================================================================
-- 0013 · PESSOAS: SOMENTE SÓCIO OU COLABORADOR
-- Remove o tipo "proprietário" do cadastro de sócios e equipe
-- (o dono passa a ser cadastrado como sócio com a sua participação).
-- =====================================================================

update public.pessoas_equipe set tipo = 'socio' where tipo = 'proprietario';

drop index if exists public.pessoas_equipe_proprietario_unq;

alter table public.pessoas_equipe drop constraint if exists pessoas_equipe_tipo_check;
alter table public.pessoas_equipe add constraint pessoas_equipe_tipo_check check (tipo in ('socio', 'colaborador'));
