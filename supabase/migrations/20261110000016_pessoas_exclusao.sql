-- =====================================================================
-- 0016 · EXCLUSÃO DE PESSOAS DA EQUIPE
-- Excluir a pessoa remove também o acesso dela ao sistema.
-- Ninguém exclui o próprio cadastro nem o do titular da conta.
-- =====================================================================

create or replace function private.remover_acesso_pessoa()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_papel public.papel_usuario;
begin
  if old.user_id is null then return old; end if;
  if old.user_id = (select auth.uid()) then
    raise exception 'Você não pode excluir o seu próprio cadastro.';
  end if;
  select papel into v_papel from public.empresa_membros where empresa_id = old.empresa_id and user_id = old.user_id;
  if v_papel = 'proprietario' then
    raise exception 'O titular da conta não pode ser excluído.';
  end if;
  delete from public.empresa_membros where empresa_id = old.empresa_id and user_id = old.user_id;
  -- Se esta era a empresa aberta da pessoa, ela deixa de vê-la
  update public.profiles set empresa_atual_id = null where id = old.user_id and empresa_atual_id = old.empresa_id;
  return old;
end $$;

drop trigger if exists remover_acesso on public.pessoas_equipe;
create trigger remover_acesso before delete on public.pessoas_equipe
  for each row execute function private.remover_acesso_pessoa();
