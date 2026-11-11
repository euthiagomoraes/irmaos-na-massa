-- =====================================================================
-- 0015 · SÓCIOS E EQUIPE COM ACESSO AO SISTEMA
-- O cadastro da pessoa passa a ter e-mail. Com e-mail, a pessoa ganha
-- acesso automaticamente: Sócio → administrador · Colaborador → atendente.
-- Se ainda não tiver conta, o acesso é liberado quando ela se cadastrar
-- com o mesmo e-mail. Desativar a pessoa retira o acesso.
-- =====================================================================

alter table public.pessoas_equipe
  add column if not exists email   text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists pessoas_equipe_email_unq on public.pessoas_equipe (empresa_id, lower(email)) where email is not null;
create unique index if not exists pessoas_equipe_user_unq  on public.pessoas_equipe (empresa_id, user_id) where user_id is not null;

-- Mantém empresa_membros em sincronia com o cadastro da pessoa
create or replace function private.sincronizar_acesso_pessoa()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_user  uuid;
  v_papel public.papel_usuario := case when new.tipo = 'socio' then 'administrador' else 'atendente' end;
  v_atual public.papel_usuario;
begin
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  if new.email is not null then
    select id into v_user from auth.users where lower(email) = new.email limit 1;
  end if;

  -- Ninguém tira ou reduz o próprio acesso
  if tg_op = 'UPDATE' and old.user_id is not null and old.user_id = (select auth.uid())
     and (v_user is distinct from old.user_id or not new.ativo or new.tipo <> old.tipo) then
    raise exception 'Você não pode alterar o seu próprio acesso (e-mail, função ou situação).';
  end if;

  -- E-mail trocado ou removido: o acesso da conta antiga é retirado (exceto do titular)
  if tg_op = 'UPDATE' and old.user_id is not null and old.user_id is distinct from v_user then
    update public.empresa_membros set ativo = false
     where empresa_id = old.empresa_id and user_id = old.user_id and papel <> 'proprietario';
  end if;

  new.user_id := v_user;
  if v_user is null then return new; end if;

  select papel into v_atual from public.empresa_membros where empresa_id = new.empresa_id and user_id = v_user;
  if v_atual = 'proprietario' then
    if new.tipo <> 'socio' or not new.ativo then
      raise exception 'O titular da conta precisa continuar como sócio ativo.';
    end if;
    return new;
  end if;

  insert into public.empresa_membros (empresa_id, user_id, papel, ativo)
  values (new.empresa_id, v_user, v_papel, new.ativo)
  on conflict (empresa_id, user_id) do update set papel = excluded.papel, ativo = excluded.ativo;

  if new.ativo then
    update public.profiles set empresa_atual_id = new.empresa_id where id = v_user and empresa_atual_id is null;
  end if;
  return new;
end $$;

drop trigger if exists sincronizar_acesso on public.pessoas_equipe;
create trigger sincronizar_acesso before insert or update of email, tipo, ativo on public.pessoas_equipe
  for each row execute function private.sincronizar_acesso_pessoa();

-- Quem se cadastra com um e-mail já registrado na equipe ganha o acesso na hora
create or replace function private.vincular_pessoa_ao_cadastrar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null then
    update public.pessoas_equipe set email = email
     where lower(email) = lower(new.email) and user_id is null;
  end if;
  return new;
end $$;

drop trigger if exists vincular_pessoa_equipe on auth.users;
create trigger vincular_pessoa_equipe after insert on auth.users
  for each row execute function private.vincular_pessoa_ao_cadastrar();
