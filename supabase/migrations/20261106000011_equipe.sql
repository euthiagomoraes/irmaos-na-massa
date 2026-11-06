-- =====================================================================
-- 0011 · EQUIPE
-- Adicionar membros por e-mail (a pessoa cria a conta antes) e alterar
-- perfil/situação com regras: só admins; ninguém mexe no proprietário
-- nem promove alguém a proprietário; ninguém altera o próprio acesso.
-- =====================================================================

create or replace function public.adicionar_membro(p_empresa uuid, p_email text, p_papel public.papel_usuario)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_id uuid;
begin
  if not private.is_admin(p_empresa) then
    raise exception 'Apenas proprietário ou administradores podem adicionar membros.' using errcode = '42501';
  end if;
  if p_papel = 'proprietario' then raise exception 'Só existe um proprietário por empresa.'; end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if v_user is null then
    raise exception 'Nenhuma conta com o e-mail %. Peça para a pessoa criar a conta no sistema e tente novamente.', btrim(p_email)
      using errcode = 'P0001';
  end if;
  insert into public.empresa_membros (empresa_id, user_id, papel, ativo)
  values (p_empresa, v_user, p_papel, true)
  on conflict (empresa_id, user_id) do update set papel = excluded.papel, ativo = true
  where public.empresa_membros.papel <> 'proprietario'
  returning id into v_id;
  if v_id is null then raise exception 'Esta pessoa já é a proprietária da empresa.'; end if;
  -- Se a pessoa ainda não tem empresa selecionada, já entra nesta
  update public.profiles set empresa_atual_id = p_empresa where id = v_user and empresa_atual_id is null;
  return v_id;
end $$;

create or replace function public.alterar_membro(p_membro uuid, p_papel public.papel_usuario default null, p_ativo boolean default null)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.empresa_membros%rowtype;
begin
  select * into m from public.empresa_membros where id = p_membro for update;
  if not found then raise exception 'Membro não encontrado.'; end if;
  if not private.is_admin(m.empresa_id) then
    raise exception 'Apenas proprietário ou administradores podem alterar a equipe.' using errcode = '42501';
  end if;
  if m.user_id = (select auth.uid()) then raise exception 'Você não pode alterar o seu próprio acesso.'; end if;
  if m.papel = 'proprietario' then raise exception 'O acesso do proprietário não pode ser alterado.'; end if;
  if p_papel = 'proprietario' then raise exception 'Só existe um proprietário por empresa.'; end if;
  update public.empresa_membros
     set papel = coalesce(p_papel, papel), ativo = coalesce(p_ativo, ativo)
   where id = m.id;
end $$;

-- Alterações de equipe passam a ser feitas só pelas funções acima
drop policy if exists "admins gerenciam a equipe" on public.empresa_membros;

revoke execute on function public.adicionar_membro(uuid, text, public.papel_usuario), public.alterar_membro(uuid, public.papel_usuario, boolean) from public, anon;
grant execute on function public.adicionar_membro(uuid, text, public.papel_usuario), public.alterar_membro(uuid, public.papel_usuario, boolean) to authenticated;
