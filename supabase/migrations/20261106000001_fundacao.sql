-- =====================================================================
-- 0001 · FUNDAÇÃO
-- Empresas (multi-tenant), perfis, papéis de acesso, configurações,
-- auditoria, sequências numéricas e funções utilitárias de segurança.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated, anon;

create type public.papel_usuario as enum ('proprietario', 'administrador', 'gerente', 'atendente', 'producao');

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function private.uuid_seguro(p text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

create or replace function private.somente_digitos(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '')
$$;

create or replace function private.slugify(p text)
returns text language sql stable set search_path = '' as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(p, ''))), '[^a-z0-9]+', '-', 'g'))
$$;

-- Bloqueia UPDATE/DELETE em tabelas de histórico (rastreabilidade)
create or replace function private.bloquear_alteracao()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.excluir_empresa', true), '') = 'on' then
    return old;
  end if;
  raise exception 'Registros de "%" são imutáveis. Para corrigir, registre um estorno.', tg_table_name
    using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------
-- Empresas, perfis e membros
-- ---------------------------------------------------------------------
create table public.empresas (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null check (char_length(btrim(nome)) between 2 and 120),
  nome_fantasia   text,
  documento       text,
  slug            text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'),
  telefone        text,
  whatsapp        text,
  email           text,
  instagram       text,
  endereco        jsonb not null default '{}'::jsonb,
  logo_url        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.empresas is 'Confeitarias (tenants). Todos os dados de negócio são isolados por empresa_id.';

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  nome             text,
  telefone         text,
  avatar_url       text,
  empresa_atual_id uuid references public.empresas (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.empresa_membros (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  papel       public.papel_usuario not null default 'atendente',
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (empresa_id, user_id)
);
create index empresa_membros_user_idx on public.empresa_membros (user_id) where ativo;

create table public.configuracoes (
  empresa_id                 uuid primary key references public.empresas (id) on delete cascade,
  custo_hora_mao_obra        numeric(12,2) not null default 0 check (custo_hora_mao_obra >= 0),
  margem_lucro_padrao        numeric(6,2)  not null default 100 check (margem_lucro_padrao >= 0),
  dias_alerta_validade       int  not null default 7 check (dias_alerta_validade between 0 and 365),
  baixa_estoque_no_status    text not null default 'em_producao' check (baixa_estoque_no_status in ('em_producao', 'pronto')),
  permitir_estoque_negativo  boolean not null default false,
  antecedencia_minima_horas  int  not null default 48 check (antecedencia_minima_horas >= 0),
  taxa_entrega_padrao        numeric(12,2) not null default 0 check (taxa_entrega_padrao >= 0),
  validade_orcamento_dias    int  not null default 7 check (validade_orcamento_dias > 0),
  fuso_horario               text not null default 'America/Belem',
  updated_at                 timestamptz not null default now()
);

-- Numeração sequencial por empresa (pedidos, solicitações...)
create table public.sequencias (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome       text not null,
  valor      bigint not null default 0,
  primary key (empresa_id, nome)
);

-- Log de operações relevantes
create table public.logs_operacoes (
  id           bigint generated always as identity primary key,
  empresa_id   uuid references public.empresas (id) on delete cascade,
  user_id      uuid,
  tabela       text not null,
  registro_id  text,
  acao         text not null,
  dados_antes  jsonb,
  dados_depois jsonb,
  created_at   timestamptz not null default now()
);
create index logs_operacoes_empresa_idx on public.logs_operacoes (empresa_id, created_at desc);
create index logs_operacoes_registro_idx on public.logs_operacoes (tabela, registro_id);

-- ---------------------------------------------------------------------
-- Funções de segurança (usadas nas políticas RLS)
-- ---------------------------------------------------------------------
create or replace function private.is_membro(p_empresa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.empresa_membros m
    where m.empresa_id = p_empresa and m.user_id = (select auth.uid()) and m.ativo
  )
$$;

create or replace function private.tem_papel(p_empresa uuid, p_papeis public.papel_usuario[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.empresa_membros m
    where m.empresa_id = p_empresa and m.user_id = (select auth.uid()) and m.ativo
      and m.papel = any (p_papeis)
  )
$$;

create or replace function private.is_admin(p_empresa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.tem_papel(p_empresa, array['proprietario', 'administrador']::public.papel_usuario[])
$$;

create or replace function private.is_gestor(p_empresa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.tem_papel(p_empresa, array['proprietario', 'administrador', 'gerente']::public.papel_usuario[])
$$;

create or replace function private.exigir_membro(p_empresa uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.is_membro(p_empresa) then
    raise exception 'Acesso negado a esta empresa.' using errcode = '42501';
  end if;
end $$;

create or replace function private.proximo_numero(p_empresa uuid, p_nome text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v bigint;
begin
  insert into public.sequencias (empresa_id, nome, valor) values (p_empresa, p_nome, 1)
  on conflict (empresa_id, nome) do update set valor = public.sequencias.valor + 1
  returning valor into v;
  return v;
end $$;

-- Auditoria genérica
create or replace function private.auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb; v_new jsonb; v_emp uuid;
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and (v_old - 'updated_at') = (v_new - 'updated_at') then
    return new;
  end if;
  if tg_table_name = 'empresas' then
    v_emp := coalesce(v_new ->> 'id', v_old ->> 'id')::uuid;
  else
    v_emp := coalesce(v_new ->> 'empresa_id', v_old ->> 'empresa_id')::uuid;
  end if;
  if tg_op = 'DELETE' and tg_table_name <> 'empresas'
     and not exists (select 1 from public.empresas where id = v_emp) then
    return old; -- empresa sendo excluída
  end if;
  insert into public.logs_operacoes (empresa_id, user_id, tabela, registro_id, acao, dados_antes, dados_depois)
  values (case when tg_op = 'DELETE' and tg_table_name = 'empresas' then null else v_emp end,
          auth.uid(), tg_table_name, coalesce(v_new ->> 'id', v_old ->> 'id'), lower(tg_op), v_old, v_new);
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------
-- Novo usuário → profile
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, nullif(btrim(coalesce(new.raw_user_meta_data ->> 'nome', '')), ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------
-- Triggers e RLS da fundação
-- ---------------------------------------------------------------------
create trigger set_updated_at before update on public.empresas        for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.profiles        for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.empresa_membros for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.configuracoes   for each row execute function private.set_updated_at();
create trigger auditar after insert or update or delete on public.empresas        for each row execute function private.auditar();
create trigger auditar after insert or update or delete on public.empresa_membros for each row execute function private.auditar();
create trigger auditar after update on public.configuracoes for each row execute function private.auditar();
create trigger bloquear_alteracao before update or delete on public.logs_operacoes for each row execute function private.bloquear_alteracao();

alter table public.empresas        enable row level security;
alter table public.profiles        enable row level security;
alter table public.empresa_membros enable row level security;
alter table public.configuracoes   enable row level security;
alter table public.sequencias      enable row level security;
alter table public.logs_operacoes  enable row level security;

create policy "membros veem a empresa" on public.empresas
  for select to authenticated using (private.is_membro(id));
create policy "admins editam a empresa" on public.empresas
  for update to authenticated using (private.is_admin(id)) with check (private.is_admin(id));

create policy "usuario ve o proprio perfil e colegas" on public.profiles
  for select to authenticated using (
    id = (select auth.uid())
    or exists (
      select 1 from public.empresa_membros a
      join public.empresa_membros b on b.empresa_id = a.empresa_id
      where a.user_id = (select auth.uid()) and b.user_id = profiles.id and a.ativo
    )
  );
create policy "usuario edita o proprio perfil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and (empresa_atual_id is null or private.is_membro(empresa_atual_id)));

create policy "membros veem a equipe" on public.empresa_membros
  for select to authenticated using (user_id = (select auth.uid()) or private.is_membro(empresa_id));
create policy "admins gerenciam a equipe" on public.empresa_membros
  for update to authenticated using (private.is_admin(empresa_id)) with check (private.is_admin(empresa_id));

create policy "membros veem configuracoes" on public.configuracoes
  for select to authenticated using (private.is_membro(empresa_id));
create policy "gestores editam configuracoes" on public.configuracoes
  for update to authenticated using (private.is_gestor(empresa_id)) with check (private.is_gestor(empresa_id));

create policy "admins consultam logs" on public.logs_operacoes
  for select to authenticated using (private.is_admin(empresa_id));
-- sequencias: sem políticas (acesso apenas via funções security definer)
