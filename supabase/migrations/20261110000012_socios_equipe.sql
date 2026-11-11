-- =====================================================================
-- 0012 · SÓCIOS E EQUIPE (divisão do lucro)
-- Cadastro de proprietário, sócios e colaboradores com participação
-- percentual no lucro e, para colaboradores, valor fixo mensal.
-- Regras: soma das participações ativas ≤ 100%; um único proprietário
-- ativo; somente proprietário/administradores acessam (dados sensíveis).
-- =====================================================================

create table public.pessoas_equipe (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  nome                text not null check (char_length(btrim(nome)) between 2 and 150),
  tipo                text not null check (tipo in ('proprietario', 'socio', 'colaborador')),
  -- percentual: só % do lucro · fixo: só valor mensal · misto: valor fixo + % do lucro
  remuneracao         text not null default 'percentual' check (remuneracao in ('percentual', 'fixo', 'misto')),
  participacao_lucro  numeric(5,2) not null default 0 check (participacao_lucro between 0 and 100),
  valor_fixo          numeric(12,2) check (valor_fixo is null or valor_fixo >= 0),
  telefone            text,
  chave_pix           text,
  observacoes         text,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (empresa_id, id),
  -- Proprietário e sócios participam apenas por percentual
  constraint pessoas_equipe_remuneracao_tipo check (tipo = 'colaborador' or remuneracao = 'percentual'),
  constraint pessoas_equipe_remuneracao_valores check (
    (remuneracao = 'percentual' and valor_fixo is null)
    or (remuneracao = 'fixo' and participacao_lucro = 0 and valor_fixo > 0)
    or (remuneracao = 'misto' and participacao_lucro > 0 and valor_fixo > 0)
  )
);
create index pessoas_equipe_empresa_idx on public.pessoas_equipe (empresa_id) where ativo;
create unique index pessoas_equipe_proprietario_unq on public.pessoas_equipe (empresa_id) where ativo and tipo = 'proprietario';

create trigger set_updated_at before update on public.pessoas_equipe
  for each row execute function private.set_updated_at();
create trigger auditar after insert or update or delete on public.pessoas_equipe
  for each row execute function private.auditar();

-- A soma das participações ativas não pode passar de 100%
create or replace function private.validar_participacao_lucro()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_total numeric;
begin
  if not new.ativo then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('pessoas_equipe:' || new.empresa_id::text, 0));
  select coalesce(sum(participacao_lucro), 0) into v_total
    from public.pessoas_equipe
   where empresa_id = new.empresa_id and ativo and id <> new.id;
  if v_total + new.participacao_lucro > 100 then
    raise exception 'A soma das participações passaria de 100%% (já distribuído: %, disponível: %).',
      replace(rtrim(to_char(v_total, 'FM990.99'), '.'), '.', ',') || '%',
      replace(rtrim(to_char(100 - v_total, 'FM990.99'), '.'), '.', ',') || '%'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger validar_participacao before insert or update of participacao_lucro, ativo, empresa_id on public.pessoas_equipe
  for each row execute function private.validar_participacao_lucro();

-- Segurança: remuneração e participação são visíveis só para administradores
alter table public.pessoas_equipe enable row level security;
create policy "admins consultam" on public.pessoas_equipe for select to authenticated using (private.is_admin(empresa_id));
create policy "admins cadastram" on public.pessoas_equipe for insert to authenticated with check (private.is_admin(empresa_id));
create policy "admins editam" on public.pessoas_equipe for update to authenticated using (private.is_admin(empresa_id)) with check (private.is_admin(empresa_id));
create policy "admins excluem" on public.pessoas_equipe for delete to authenticated using (private.is_admin(empresa_id));

revoke all on public.pessoas_equipe from anon;
