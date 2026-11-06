-- =====================================================================
-- 0003 · PRODUTOS, PERSONALIZAÇÃO E FICHAS TÉCNICAS
-- =====================================================================

create table public.categorias_produtos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  nome        text not null,
  slug        text not null check (slug ~ '^[a-z0-9-]+$'),
  descricao   text,
  imagem_url  text,
  ordem       int not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, slug)
);

-- Fichas técnicas (receitas e subpreparações: massas, recheios, coberturas)
create table public.fichas_tecnicas (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresas (id) on delete cascade,
  nome                  text not null check (char_length(btrim(nome)) between 2 and 150),
  tipo                  text not null default 'produto' check (tipo in ('produto', 'subpreparacao')),
  categoria             text,  -- ex.: massa, recheio, cobertura
  descricao             text,
  rendimento            numeric(14,4) not null default 1 check (rendimento > 0),
  unidade_rendimento    text not null default 'un' references public.unidades_medida (codigo),
  peso_unitario_g       numeric(12,4) check (peso_unitario_g > 0),
  tempo_preparo_min     int check (tempo_preparo_min >= 0),
  custo_embalagem       numeric(12,2) not null default 0 check (custo_embalagem >= 0),
  custo_mao_obra        numeric(12,2) not null default 0 check (custo_mao_obra >= 0),
  outros_custos         numeric(12,2) not null default 0 check (outros_custos >= 0),
  margem_desejada_pct   numeric(7,2)  check (margem_desejada_pct >= 0),
  preco_venda           numeric(12,2) check (preco_venda >= 0),
  modo_preparo          text,
  observacoes           text,
  -- Cache calculado (recalculado quando insumos/subfichas mudam de custo)
  custo_ingredientes    numeric(14,4) not null default 0,
  custo_total           numeric(14,4) not null default 0,
  custo_unitario        numeric(14,4) not null default 0,
  custo_calculado_em    timestamptz,
  ativo                 boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (empresa_id, id)
);
create index fichas_nome_trgm on public.fichas_tecnicas using gin (nome extensions.gin_trgm_ops);

create table public.ficha_tecnica_itens (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  ficha_id        uuid not null,
  insumo_id       uuid,
  subficha_id     uuid,
  quantidade      numeric(14,4) not null check (quantidade > 0),
  unidade_codigo  text not null references public.unidades_medida (codigo),
  perda_pct       numeric(5,2) not null default 0 check (perda_pct between 0 and 99),
  ordem           int not null default 0,
  observacao      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (num_nonnulls(insumo_id, subficha_id) = 1),
  check (subficha_id is null or subficha_id <> ficha_id),
  foreign key (empresa_id, ficha_id) references public.fichas_tecnicas (empresa_id, id) on delete cascade,
  foreign key (empresa_id, insumo_id) references public.insumos (empresa_id, id),
  foreign key (empresa_id, subficha_id) references public.fichas_tecnicas (empresa_id, id)
);

create table public.fichas_custos_historico (
  id                  bigint generated always as identity primary key,
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  ficha_id            uuid not null,
  custo_ingredientes  numeric(14,4) not null,
  custo_total         numeric(14,4) not null,
  custo_unitario      numeric(14,4) not null,
  motivo              text,
  created_at          timestamptz not null default now(),
  foreign key (empresa_id, ficha_id) references public.fichas_tecnicas (empresa_id, id) on delete cascade
);
create index fichas_custos_historico_ficha_idx on public.fichas_custos_historico (ficha_id, created_at desc);
create trigger bloquear_alteracao before update or delete on public.fichas_custos_historico
  for each row execute function private.bloquear_alteracao();

-- Impede ciclos entre subpreparações (A usa B que usa A)
create or replace function private.validar_ciclo_ficha()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.subficha_id is null then return new; end if;
  if exists (
    with recursive arvore(id) as (
      select new.subficha_id
      union
      select i.subficha_id from public.ficha_tecnica_itens i join arvore a on i.ficha_id = a.id
      where i.subficha_id is not null
    )
    select 1 from arvore where id = new.ficha_id
  ) then
    raise exception 'Esta subpreparação criaria uma referência circular entre fichas técnicas.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger validar_ciclo before insert or update on public.ficha_tecnica_itens
  for each row execute function private.validar_ciclo_ficha();

-- Produtos
create table public.produtos (
  id                   uuid primary key default gen_random_uuid(),
  empresa_id           uuid not null references public.empresas (id) on delete cascade,
  categoria_id         uuid,
  nome                 text not null check (char_length(btrim(nome)) between 2 and 150),
  slug                 text not null check (slug ~ '^[a-z0-9-]+$'),
  tipo                 text not null default 'outro' check (tipo in (
                         'bolo_personalizado', 'bolo_tradicional', 'docinho', 'doce_fino', 'cupcake',
                         'mini_bolo', 'brownie', 'kit', 'sobremesa', 'outro')),
  descricao            text,
  foto_url             text,
  unidade_venda        text not null default 'un' references public.unidades_medida (codigo),
  quantidade_minima    numeric(12,2) check (quantidade_minima > 0),
  preco_sugerido       numeric(12,2) check (preco_sugerido >= 0),
  preco_sob_consulta   boolean not null default false,
  tempo_producao_min   int check (tempo_producao_min >= 0),
  ficha_tecnica_id     uuid,
  personalizavel       boolean not null default false,
  disponivel_encomenda boolean not null default true,
  ativo                boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, slug),
  foreign key (empresa_id, categoria_id) references public.categorias_produtos (empresa_id, id) on delete set null (categoria_id),
  foreign key (empresa_id, ficha_tecnica_id) references public.fichas_tecnicas (empresa_id, id) on delete set null (ficha_tecnica_id)
);
create index produtos_nome_trgm on public.produtos using gin (nome extensions.gin_trgm_ops);

-- Variações (tamanho × faixa de recheio, peso, camadas) com preço próprio
create table public.variacoes_produtos (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas (id) on delete cascade,
  produto_id        uuid not null,
  nome              text not null,
  tamanho           text,
  faixa             text,     -- ex.: tradicional, especial, com frutas
  peso_g            numeric(12,2) check (peso_g > 0),
  camadas           int check (camadas between 1 and 20),
  rendimento_fatias int check (rendimento_fatias > 0),
  preco             numeric(12,2) not null check (preco >= 0),
  ficha_tecnica_id  uuid,
  ordem             int not null default 0,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, produto_id) references public.produtos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, ficha_tecnica_id) references public.fichas_tecnicas (empresa_id, id) on delete set null (ficha_tecnica_id)
);

-- Opções de personalização (massas, recheios, coberturas, decoração, temas)
create table public.opcoes_personalizacao (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas (id) on delete cascade,
  grupo             text not null check (grupo in ('massa', 'recheio', 'cobertura', 'decoracao', 'tema', 'topper', 'embalagem', 'outro')),
  nome              text not null,
  faixa             text,
  descricao         text,
  acrescimo         numeric(12,2) not null default 0 check (acrescimo >= 0),
  ficha_tecnica_id  uuid,
  imagem_url        text,
  ordem             int not null default 0,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, grupo, nome),
  foreign key (empresa_id, ficha_tecnica_id) references public.fichas_tecnicas (empresa_id, id) on delete set null (ficha_tecnica_id)
);

create table public.produtos_opcoes (
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  produto_id  uuid not null,
  opcao_id    uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (produto_id, opcao_id),
  foreign key (empresa_id, produto_id) references public.produtos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, opcao_id) references public.opcoes_personalizacao (empresa_id, id) on delete cascade
);

create table public.produtos_imagens (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  produto_id  uuid not null,
  url         text not null,
  legenda     text,
  ordem       int not null default 0,
  principal   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (empresa_id, produto_id) references public.produtos (empresa_id, id) on delete cascade
);
create unique index produtos_imagens_principal_unq on public.produtos_imagens (produto_id) where principal;

-- ---------------------------------------------------------------------
-- Cálculo de custos das fichas
-- ---------------------------------------------------------------------
-- Custo atual de uma ficha (recursivo nas subpreparações), por rendimento total.
create or replace function private.calcular_custo_ingredientes(p_ficha uuid, p_profundidade int default 0)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare
  v_total numeric := 0;
  r record;
  v_sub public.fichas_tecnicas%rowtype;
  v_qtd_sub numeric;
begin
  if p_profundidade > 10 then raise exception 'Profundidade máxima de subpreparações excedida.'; end if;
  for r in
    select i.*, ins.unidade_codigo as ins_unid, ins.custo_unitario as ins_custo,
           ins.densidade_g_ml, ins.peso_unitario_g
      from public.ficha_tecnica_itens i
      left join public.insumos ins on ins.id = i.insumo_id
     where i.ficha_id = p_ficha
  loop
    if r.insumo_id is not null then
      v_total := v_total + public.converter_unidade(r.quantidade, r.unidade_codigo, r.ins_unid, r.densidade_g_ml, r.peso_unitario_g)
                         * r.ins_custo / (1 - r.perda_pct / 100);
    else
      select * into v_sub from public.fichas_tecnicas where id = r.subficha_id;
      v_qtd_sub := public.converter_unidade(r.quantidade, r.unidade_codigo, v_sub.unidade_rendimento, null, v_sub.peso_unitario_g);
      v_total := v_total + (v_qtd_sub / v_sub.rendimento)
                         * private.calcular_custo_ingredientes(v_sub.id, p_profundidade + 1)
                         / (1 - r.perda_pct / 100);
    end if;
  end loop;
  return round(v_total, 4);
end $$;

create or replace function public.recalcular_custo_ficha(p_ficha uuid, p_motivo text default null)
returns public.fichas_tecnicas language plpgsql security definer set search_path = '' as $$
declare
  f public.fichas_tecnicas%rowtype;
  v_ing numeric; v_total numeric; v_unit numeric;
begin
  select * into f from public.fichas_tecnicas where id = p_ficha for update;
  if not found then raise exception 'Ficha técnica não encontrada.'; end if;
  if (select auth.uid()) is not null then perform private.exigir_membro(f.empresa_id); end if;
  v_ing := private.calcular_custo_ingredientes(f.id);
  v_total := v_ing + f.custo_embalagem + f.custo_mao_obra + f.outros_custos;
  v_unit := round(v_total / f.rendimento, 4);
  if v_ing is distinct from f.custo_ingredientes or v_total is distinct from f.custo_total then
    perform set_config('app.recalculo', 'on', true);
    update public.fichas_tecnicas
       set custo_ingredientes = v_ing, custo_total = v_total, custo_unitario = v_unit, custo_calculado_em = now()
     where id = f.id
     returning * into f;
    perform set_config('app.recalculo', 'off', true);
    insert into public.fichas_custos_historico (empresa_id, ficha_id, custo_ingredientes, custo_total, custo_unitario, motivo)
    values (f.empresa_id, f.id, v_ing, v_total, v_unit, coalesce(p_motivo, 'recalculo'));
    -- propaga para fichas que usam esta como subpreparação
    perform public.recalcular_custo_ficha(i.ficha_id, 'subpreparacao alterada')
       from (select distinct ficha_id from public.ficha_tecnica_itens where subficha_id = f.id) i;
  end if;
  return f;
end $$;

-- Recalcula fichas quando o custo de um insumo muda
create or replace function private.recalcular_fichas_do_insumo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.recalcular_custo_ficha(i.ficha_id, 'custo do insumo ' || new.nome || ' alterado')
     from (select distinct ficha_id from public.ficha_tecnica_itens where insumo_id = new.id) i;
  return new;
end $$;
create trigger recalcular_fichas after update of custo_unitario on public.insumos
  for each row when (new.custo_unitario is distinct from old.custo_unitario)
  execute function private.recalcular_fichas_do_insumo();

-- Recalcula quando itens ou custos adicionais da ficha mudam
create or replace function private.recalcular_ficha_por_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.recalcular_custo_ficha(coalesce(new.ficha_id, old.ficha_id), 'itens alterados');
  return null;
end $$;
create trigger recalcular_ficha after insert or update or delete on public.ficha_tecnica_itens
  for each row execute function private.recalcular_ficha_por_item();

create or replace function private.recalcular_ficha_por_custos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.recalcular_custo_ficha(new.id, 'custos adicionais/rendimento alterados');
  return null;
end $$;
create trigger recalcular_ficha after insert or update of rendimento, unidade_rendimento, custo_embalagem, custo_mao_obra, outros_custos, peso_unitario_g
  on public.fichas_tecnicas for each row execute function private.recalcular_ficha_por_custos();

-- Guard: os campos de custo calculado só são escritos pelo recálculo
create or replace function private.guard_custo_ficha()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.recalculo', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.custo_ingredientes := 0; new.custo_total := 0; new.custo_unitario := 0; new.custo_calculado_em := null;
  else
    new.custo_ingredientes := old.custo_ingredientes; new.custo_total := old.custo_total;
    new.custo_unitario := old.custo_unitario; new.custo_calculado_em := old.custo_calculado_em;
  end if;
  return new;
end $$;
create trigger guard_custo before insert or update on public.fichas_tecnicas
  for each row execute function private.guard_custo_ficha();
