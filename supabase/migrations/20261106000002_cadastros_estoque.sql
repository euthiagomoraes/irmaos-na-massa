-- =====================================================================
-- 0002 · CADASTROS E ESTOQUE
-- Unidades e conversões, clientes, fornecedores, insumos, lotes,
-- compras e movimentações de estoque (imutáveis, via funções).
-- Convenção: tabelas filhas usam FK composta (empresa_id, x_id) para
-- impedir vínculos entre empresas diferentes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Unidades de medida (globais)
-- ---------------------------------------------------------------------
create table public.unidades_medida (
  codigo     text primary key,
  nome       text not null,
  grandeza   text not null check (grandeza in ('massa', 'volume', 'unidade')),
  fator_base numeric(18,6) not null check (fator_base > 0)  -- base: g, ml, un
);
insert into public.unidades_medida (codigo, nome, grandeza, fator_base) values
  ('mg', 'Miligrama', 'massa', 0.001),
  ('g', 'Grama', 'massa', 1),
  ('kg', 'Quilograma', 'massa', 1000),
  ('ml', 'Mililitro', 'volume', 1),
  ('l', 'Litro', 'volume', 1000),
  ('cc', 'Colher de chá (5 ml)', 'volume', 5),
  ('cs', 'Colher de sopa (15 ml)', 'volume', 15),
  ('xic', 'Xícara (240 ml)', 'volume', 240),
  ('un', 'Unidade', 'unidade', 1),
  ('dz', 'Dúzia', 'unidade', 12),
  ('cento', 'Cento', 'unidade', 100);

alter table public.unidades_medida enable row level security;
create policy "unidades sao publicas" on public.unidades_medida for select to anon, authenticated using (true);

-- Conversão entre unidades.
-- massa↔volume exige densidade (g/ml); unidade↔massa exige peso unitário (g).
create or replace function public.converter_unidade(
  p_qtd numeric, p_de text, p_para text,
  p_densidade_g_ml numeric default null, p_peso_unitario_g numeric default null)
returns numeric language plpgsql stable set search_path = '' as $$
declare
  d public.unidades_medida%rowtype;
  p public.unidades_medida%rowtype;
  v_base numeric;
  v_g numeric;
begin
  if p_qtd is null then return null; end if;
  if p_de = p_para then return p_qtd; end if;
  select * into d from public.unidades_medida where codigo = p_de;
  select * into p from public.unidades_medida where codigo = p_para;
  if d.codigo is null or p.codigo is null then
    raise exception 'Unidade de medida desconhecida (% → %).', p_de, p_para;
  end if;
  v_base := p_qtd * d.fator_base;
  if d.grandeza = p.grandeza then
    return v_base / p.fator_base;
  end if;
  -- converte origem para gramas
  v_g := case d.grandeza
           when 'massa' then v_base
           when 'volume' then case when p_densidade_g_ml > 0 then v_base * p_densidade_g_ml end
           when 'unidade' then case when p_peso_unitario_g > 0 then v_base * p_peso_unitario_g end
         end;
  if v_g is null then
    raise exception 'Não é possível converter % para % sem regra de conversão (densidade ou peso unitário).', d.nome, p.nome;
  end if;
  return case p.grandeza
           when 'massa' then v_g / p.fator_base
           when 'volume' then case when p_densidade_g_ml > 0 then v_g / p_densidade_g_ml / p.fator_base end
           when 'unidade' then case when p_peso_unitario_g > 0 then v_g / p_peso_unitario_g / p.fator_base end
         end;
end $$;

-- ---------------------------------------------------------------------
-- Clientes e fornecedores
-- ---------------------------------------------------------------------
create table public.clientes (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas (id) on delete cascade,
  nome             text not null check (char_length(btrim(nome)) between 2 and 150),
  telefone         text,
  whatsapp         text,
  email            text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  data_nascimento  date,
  endereco         jsonb not null default '{}'::jsonb,
  observacoes      text,
  preferencias     text[] not null default '{}',
  restricoes       text,
  origem           text,
  indicado_por     uuid,
  ativo            boolean not null default true,
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, indicado_por) references public.clientes (empresa_id, id) on delete set null (indicado_por),
  check (indicado_por is null or indicado_por <> id)
);
create unique index clientes_whatsapp_unq on public.clientes (empresa_id, whatsapp) where whatsapp is not null and ativo;
create index clientes_nome_trgm on public.clientes using gin (nome extensions.gin_trgm_ops);
create index clientes_aniversario_idx on public.clientes (empresa_id, extract(month from data_nascimento), extract(day from data_nascimento));

create table public.fornecedores (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas (id) on delete cascade,
  nome         text not null check (char_length(btrim(nome)) between 2 and 150),
  documento    text,
  contato      text,
  telefone     text,
  whatsapp     text,
  email        text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  endereco     jsonb not null default '{}'::jsonb,
  observacoes  text,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (empresa_id, id)
);
create index fornecedores_nome_trgm on public.fornecedores using gin (nome extensions.gin_trgm_ops);

-- Normaliza telefones (somente dígitos)
create or replace function private.normalizar_contato()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.telefone := private.somente_digitos(new.telefone);
  new.whatsapp := private.somente_digitos(new.whatsapp);
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.nome := btrim(new.nome);
  return new;
end $$;
create trigger normalizar before insert or update on public.clientes     for each row execute function private.normalizar_contato();
create trigger normalizar before insert or update on public.fornecedores for each row execute function private.normalizar_contato();

-- ---------------------------------------------------------------------
-- Insumos
-- ---------------------------------------------------------------------
create table public.categorias_insumos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  nome        text not null,
  ordem       int not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, nome)
);

create table public.insumos (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresas (id) on delete cascade,
  categoria_id          uuid,
  nome                  text not null check (char_length(btrim(nome)) between 2 and 120),
  codigo                text,
  unidade_codigo        text not null references public.unidades_medida (codigo),
  quantidade_atual      numeric(14,4) not null default 0,
  estoque_minimo        numeric(14,4) not null default 0 check (estoque_minimo >= 0),
  custo_unitario        numeric(14,6) not null default 0 check (custo_unitario >= 0),  -- custo atual por unidade de estoque
  custo_medio           numeric(14,6) not null default 0 check (custo_medio >= 0),
  fornecedor_padrao_id  uuid,
  local_armazenamento   text,
  densidade_g_ml        numeric(10,4) check (densidade_g_ml > 0),
  peso_unitario_g       numeric(12,4) check (peso_unitario_g > 0),
  controla_validade     boolean not null default false,
  e_embalagem           boolean not null default false,
  observacoes           text,
  ativo                 boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, categoria_id) references public.categorias_insumos (empresa_id, id) on delete set null (categoria_id),
  foreign key (empresa_id, fornecedor_padrao_id) references public.fornecedores (empresa_id, id) on delete set null (fornecedor_padrao_id)
);
create unique index insumos_nome_unq on public.insumos (empresa_id, lower(nome)) where ativo;
create index insumos_nome_trgm on public.insumos using gin (nome extensions.gin_trgm_ops);
create index insumos_estoque_baixo_idx on public.insumos (empresa_id) where ativo and quantidade_atual <= estoque_minimo;

create table public.insumos_custos_historico (
  id              bigint generated always as identity primary key,
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  insumo_id       uuid not null,
  custo_anterior  numeric(14,6),
  custo_novo      numeric(14,6) not null,
  origem          text not null default 'manual',
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  foreign key (empresa_id, insumo_id) references public.insumos (empresa_id, id) on delete cascade
);
create index insumos_custos_historico_insumo_idx on public.insumos_custos_historico (insumo_id, created_at desc);

-- Saldo e custo médio só mudam através de movimentações
create or replace function private.guard_saldo_insumo()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.movimentacao', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.quantidade_atual := 0;
    new.custo_medio := new.custo_unitario;
    return new;
  end if;
  if new.quantidade_atual is distinct from old.quantidade_atual
     or new.custo_medio is distinct from old.custo_medio then
    raise exception 'O saldo do insumo só pode ser alterado por movimentações de estoque.' using errcode = 'P0001';
  end if;
  if new.unidade_codigo <> old.unidade_codigo and old.quantidade_atual <> 0 then
    raise exception 'Não é possível trocar a unidade de um insumo com saldo. Zere o estoque por ajuste antes.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger guard_saldo before insert or update on public.insumos for each row execute function private.guard_saldo_insumo();

create or replace function private.registrar_custo_insumo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.custo_unitario is distinct from old.custo_unitario then
    insert into public.insumos_custos_historico (empresa_id, insumo_id, custo_anterior, custo_novo, origem)
    values (new.empresa_id, new.id, case when tg_op = 'UPDATE' then old.custo_unitario end, new.custo_unitario,
            case when coalesce(current_setting('app.movimentacao', true), '') = 'on' then 'entrada_estoque'
                 when tg_op = 'INSERT' then 'cadastro' else 'manual' end);
  end if;
  return new;
end $$;
create trigger registrar_custo after insert or update of custo_unitario on public.insumos
  for each row execute function private.registrar_custo_insumo();

-- ---------------------------------------------------------------------
-- Lotes
-- ---------------------------------------------------------------------
create table public.lotes_insumos (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  insumo_id           uuid not null,
  codigo_lote         text,
  data_fabricacao     date,
  data_validade       date,
  quantidade_inicial  numeric(14,4) not null check (quantidade_inicial > 0),
  quantidade_atual    numeric(14,4) not null check (quantidade_atual >= 0),
  custo_unitario      numeric(14,6) not null default 0,
  fornecedor_id       uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, insumo_id) references public.insumos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, fornecedor_id) references public.fornecedores (empresa_id, id) on delete set null (fornecedor_id)
);
create index lotes_validade_idx on public.lotes_insumos (empresa_id, data_validade) where quantidade_atual > 0;

create or replace function private.guard_saldo_lote()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.movimentacao', true), '') = 'on' then return new; end if;
  if new.quantidade_atual is distinct from old.quantidade_atual
     or new.quantidade_inicial is distinct from old.quantidade_inicial
     or new.insumo_id is distinct from old.insumo_id then
    raise exception 'O saldo do lote só pode ser alterado por movimentações de estoque.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger guard_saldo before update on public.lotes_insumos for each row execute function private.guard_saldo_lote();

-- ---------------------------------------------------------------------
-- Compras
-- ---------------------------------------------------------------------
create table public.compras (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas (id) on delete cascade,
  numero            bigint,
  fornecedor_id     uuid,
  data_compra       date not null default current_date,
  numero_documento  text,
  valor_frete       numeric(12,2) not null default 0 check (valor_frete >= 0),
  valor_total       numeric(12,2) not null default 0 check (valor_total >= 0),
  status            text not null default 'rascunho' check (status in ('rascunho', 'confirmada', 'cancelada')),
  observacoes       text,
  confirmada_em     timestamptz,
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, numero),
  foreign key (empresa_id, fornecedor_id) references public.fornecedores (empresa_id, id) on delete set null (fornecedor_id)
);

create table public.compra_itens (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  compra_id       uuid not null,
  insumo_id       uuid not null,
  quantidade      numeric(14,4) not null check (quantidade > 0),
  unidade_codigo  text not null references public.unidades_medida (codigo),
  custo_unitario  numeric(14,6) not null check (custo_unitario >= 0),  -- por unidade informada
  valor_total     numeric(14,2) generated always as (round(quantidade * custo_unitario, 2)) stored,
  codigo_lote     text,
  data_validade   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (empresa_id, compra_id) references public.compras (empresa_id, id) on delete cascade,
  foreign key (empresa_id, insumo_id) references public.insumos (empresa_id, id)
);

create or replace function private.atribuir_numero_compra()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.numero := private.proximo_numero(new.empresa_id, 'compra');
  return new;
end $$;
create trigger atribuir_numero before insert on public.compras for each row execute function private.atribuir_numero_compra();

-- Compras confirmadas não podem ter itens alterados
create or replace function private.guard_compra_itens()
returns trigger language plpgsql set search_path = '' as $$
declare v_status text;
begin
  select status into v_status from public.compras where id = coalesce(new.compra_id, old.compra_id);
  if v_status <> 'rascunho' and coalesce(current_setting('app.excluir_empresa', true), '') <> 'on' then
    raise exception 'A compra já foi %; os itens não podem ser alterados.', v_status using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
create trigger guard_itens before insert or update or delete on public.compra_itens
  for each row execute function private.guard_compra_itens();

-- ---------------------------------------------------------------------
-- Movimentações de estoque (imutáveis)
-- ---------------------------------------------------------------------
create table public.movimentacoes_estoque (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresas (id) on delete cascade,
  insumo_id             uuid not null,
  lote_id               uuid,
  tipo                  text not null check (tipo in ('entrada', 'saida', 'ajuste', 'producao', 'perda', 'estorno')),
  quantidade            numeric(14,4) not null check (quantidade <> 0),   -- com sinal, na unidade do insumo
  quantidade_informada  numeric(14,4),
  unidade_informada     text references public.unidades_medida (codigo),
  saldo_anterior        numeric(14,4) not null,
  saldo_posterior       numeric(14,4) not null,
  custo_unitario        numeric(14,6) not null default 0,
  valor_total           numeric(14,2) not null default 0,
  lotes_consumidos      jsonb not null default '[]'::jsonb,
  motivo                text,
  origem_tipo           text not null default 'manual' check (origem_tipo in ('manual', 'compra', 'pedido', 'producao', 'inventario', 'estorno')),
  origem_id             uuid,
  estorno_de            uuid references public.movimentacoes_estoque (id),
  chave_idempotencia    text,
  created_by            uuid default auth.uid(),
  created_at            timestamptz not null default now(),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, insumo_id) references public.insumos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, lote_id) references public.lotes_insumos (empresa_id, id)
);
create unique index movimentacoes_estorno_unq on public.movimentacoes_estoque (estorno_de) where estorno_de is not null;
create index movimentacoes_insumo_idx on public.movimentacoes_estoque (insumo_id, created_at desc);
create index movimentacoes_origem_idx on public.movimentacoes_estoque (origem_tipo, origem_id);
create index movimentacoes_empresa_data_idx on public.movimentacoes_estoque (empresa_id, created_at desc);
create trigger bloquear_alteracao before update or delete on public.movimentacoes_estoque
  for each row execute function private.bloquear_alteracao();
create trigger bloquear_alteracao before update or delete on public.insumos_custos_historico
  for each row execute function private.bloquear_alteracao();

-- Registra uma movimentação e atualiza saldo, custo médio e lotes (FEFO).
create or replace function public.movimentar_estoque(
  p_insumo_id       uuid,
  p_tipo            text,
  p_quantidade      numeric,
  p_unidade         text    default null,
  p_custo_unitario  numeric default null,   -- por unidade informada (entradas)
  p_lote_id         uuid    default null,
  p_novo_lote       jsonb   default null,   -- {codigo_lote, data_validade, data_fabricacao, fornecedor_id}
  p_motivo          text    default null,
  p_origem_tipo     text    default 'manual',
  p_origem_id       uuid    default null,
  p_chave           text    default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ins        public.insumos%rowtype;
  v_lote       public.lotes_insumos%rowtype;
  v_unid       text;
  v_qtd        numeric;
  v_custo      numeric;
  v_medio      numeric;
  v_saldo      numeric;
  v_negativo   boolean;
  v_restante   numeric;
  v_consumo    numeric;
  v_consumidos jsonb := '[]'::jsonb;
  v_id         uuid;
begin
  select * into v_ins from public.insumos where id = p_insumo_id for update;
  if not found then raise exception 'Insumo não encontrado.'; end if;
  perform private.exigir_membro(v_ins.empresa_id);

  if p_tipo not in ('entrada', 'saida', 'ajuste', 'producao', 'perda') then
    raise exception 'Tipo de movimentação inválido: %.', p_tipo;
  end if;
  if p_quantidade is null or p_quantidade = 0 then
    raise exception 'Informe uma quantidade diferente de zero.';
  end if;
  if p_tipo in ('saida', 'ajuste', 'perda') and p_origem_tipo = 'manual' and coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Informe o motivo da movimentação.';
  end if;

  if p_chave is not null then
    select id into v_id from public.movimentacoes_estoque
     where empresa_id = v_ins.empresa_id and chave_idempotencia = p_chave;
    if found then return v_id; end if;
  end if;

  v_unid := coalesce(p_unidade, v_ins.unidade_codigo);
  v_qtd := public.converter_unidade(p_quantidade, v_unid, v_ins.unidade_codigo, v_ins.densidade_g_ml, v_ins.peso_unitario_g);
  if p_tipo = 'entrada' then v_qtd := abs(v_qtd);
  elsif p_tipo in ('saida', 'producao', 'perda') then v_qtd := -abs(v_qtd);
  end if;

  v_saldo := v_ins.quantidade_atual + v_qtd;
  select permitir_estoque_negativo into v_negativo from public.configuracoes where empresa_id = v_ins.empresa_id;
  if v_saldo < 0 and not coalesce(v_negativo, false) then
    raise exception 'Estoque insuficiente de "%": disponível % %, necessário % %.',
      v_ins.nome, round(v_ins.quantidade_atual, 3), v_ins.unidade_codigo, round(abs(v_qtd), 3), v_ins.unidade_codigo
      using errcode = 'P0001';
  end if;

  if p_tipo = 'entrada' and p_custo_unitario is not null then
    if p_custo_unitario < 0 then raise exception 'O custo não pode ser negativo.'; end if;
    v_custo := p_custo_unitario / public.converter_unidade(1, v_unid, v_ins.unidade_codigo, v_ins.densidade_g_ml, v_ins.peso_unitario_g);
    v_medio := case when v_ins.quantidade_atual > 0
                    then (v_ins.quantidade_atual * v_ins.custo_medio + v_qtd * v_custo) / (v_ins.quantidade_atual + v_qtd)
                    else v_custo end;
  else
    v_custo := coalesce(nullif(v_ins.custo_medio, 0), v_ins.custo_unitario);
    v_medio := v_ins.custo_medio;
  end if;

  perform set_config('app.movimentacao', 'on', true);

  if p_tipo = 'entrada' and (p_novo_lote is not null or v_ins.controla_validade) and p_lote_id is null then
    insert into public.lotes_insumos (empresa_id, insumo_id, codigo_lote, data_validade, data_fabricacao,
                                      quantidade_inicial, quantidade_atual, custo_unitario, fornecedor_id)
    values (v_ins.empresa_id, v_ins.id,
            nullif(p_novo_lote ->> 'codigo_lote', ''),
            nullif(p_novo_lote ->> 'data_validade', '')::date,
            nullif(p_novo_lote ->> 'data_fabricacao', '')::date,
            v_qtd, v_qtd, v_custo,
            private.uuid_seguro(nullif(p_novo_lote ->> 'fornecedor_id', '')))
    returning id into p_lote_id;
    v_consumidos := jsonb_build_array(jsonb_build_object('lote_id', p_lote_id, 'quantidade', v_qtd));
  elsif p_lote_id is not null then
    select * into v_lote from public.lotes_insumos where id = p_lote_id and insumo_id = v_ins.id for update;
    if not found then raise exception 'O lote informado não pertence a este insumo.'; end if;
    if v_lote.quantidade_atual + v_qtd < 0 then
      raise exception 'Quantidade maior que o saldo do lote (% %).', round(v_lote.quantidade_atual, 3), v_ins.unidade_codigo;
    end if;
    update public.lotes_insumos set quantidade_atual = quantidade_atual + v_qtd where id = p_lote_id;
    v_consumidos := jsonb_build_array(jsonb_build_object('lote_id', p_lote_id, 'quantidade', v_qtd));
  elsif v_qtd < 0 then
    -- Consumo automático: primeiro o que vence primeiro (FEFO)
    v_restante := -v_qtd;
    for v_lote in
      select * from public.lotes_insumos
       where insumo_id = v_ins.id and quantidade_atual > 0
       order by data_validade nulls last, created_at
       for update
    loop
      exit when v_restante <= 0;
      v_consumo := least(v_restante, v_lote.quantidade_atual);
      update public.lotes_insumos set quantidade_atual = quantidade_atual - v_consumo where id = v_lote.id;
      v_consumidos := v_consumidos || jsonb_build_object('lote_id', v_lote.id, 'quantidade', -v_consumo);
      v_restante := v_restante - v_consumo;
    end loop;
  end if;

  update public.insumos
     set quantidade_atual = v_saldo,
         custo_medio = round(coalesce(v_medio, 0), 6),
         custo_unitario = case when p_tipo = 'entrada' and p_custo_unitario is not null then round(v_custo, 6) else custo_unitario end
   where id = v_ins.id;

  insert into public.movimentacoes_estoque (
    empresa_id, insumo_id, lote_id, tipo, quantidade, quantidade_informada, unidade_informada,
    saldo_anterior, saldo_posterior, custo_unitario, valor_total, lotes_consumidos,
    motivo, origem_tipo, origem_id, chave_idempotencia)
  values (
    v_ins.empresa_id, v_ins.id, p_lote_id, p_tipo, v_qtd, p_quantidade, v_unid,
    v_ins.quantidade_atual, v_saldo, round(coalesce(v_custo, 0), 6), round(abs(v_qtd) * coalesce(v_custo, 0), 2), v_consumidos,
    nullif(btrim(coalesce(p_motivo, '')), ''), p_origem_tipo, p_origem_id, p_chave)
  returning id into v_id;

  perform set_config('app.movimentacao', 'off', true);
  return v_id;
end $$;

-- Estorna uma movimentação (gera a movimentação inversa e restaura lotes).
create or replace function public.estornar_movimentacao(p_movimentacao_id uuid, p_motivo text, p_chave text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_mov   public.movimentacoes_estoque%rowtype;
  v_ins   public.insumos%rowtype;
  v_item  jsonb;
  v_saldo numeric;
  v_id    uuid;
begin
  select * into v_mov from public.movimentacoes_estoque where id = p_movimentacao_id;
  if not found then raise exception 'Movimentação não encontrada.'; end if;
  perform private.exigir_membro(v_mov.empresa_id);
  if v_mov.tipo = 'estorno' then raise exception 'Não é possível estornar um estorno.'; end if;
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'Informe o motivo do estorno.'; end if;
  if p_chave is not null then
    select id into v_id from public.movimentacoes_estoque where empresa_id = v_mov.empresa_id and chave_idempotencia = p_chave;
    if found then return v_id; end if;
  end if;
  if exists (select 1 from public.movimentacoes_estoque where estorno_de = v_mov.id) then
    raise exception 'Esta movimentação já foi estornada.';
  end if;

  select * into v_ins from public.insumos where id = v_mov.insumo_id for update;
  v_saldo := v_ins.quantidade_atual - v_mov.quantidade;
  if v_saldo < 0 and not coalesce((select permitir_estoque_negativo from public.configuracoes where empresa_id = v_mov.empresa_id), false) then
    raise exception 'O estorno deixaria o estoque de "%" negativo (saldo atual: % %).', v_ins.nome, round(v_ins.quantidade_atual, 3), v_ins.unidade_codigo;
  end if;

  perform set_config('app.movimentacao', 'on', true);
  for v_item in select * from jsonb_array_elements(v_mov.lotes_consumidos) loop
    update public.lotes_insumos
       set quantidade_atual = greatest(quantidade_atual - (v_item ->> 'quantidade')::numeric, 0)
     where id = (v_item ->> 'lote_id')::uuid;
  end loop;
  update public.insumos set quantidade_atual = v_saldo where id = v_ins.id;

  insert into public.movimentacoes_estoque (
    empresa_id, insumo_id, lote_id, tipo, quantidade, quantidade_informada, unidade_informada,
    saldo_anterior, saldo_posterior, custo_unitario, valor_total, lotes_consumidos,
    motivo, origem_tipo, origem_id, estorno_de, chave_idempotencia)
  select v_mov.empresa_id, v_mov.insumo_id, v_mov.lote_id, 'estorno', -v_mov.quantidade, v_mov.quantidade_informada, v_mov.unidade_informada,
         v_ins.quantidade_atual, v_saldo, v_mov.custo_unitario, v_mov.valor_total,
         coalesce((select jsonb_agg(jsonb_build_object('lote_id', e ->> 'lote_id', 'quantidade', -(e ->> 'quantidade')::numeric))
                     from jsonb_array_elements(v_mov.lotes_consumidos) e), '[]'::jsonb),
         btrim(p_motivo), 'estorno', v_mov.id, v_mov.id, p_chave
  returning id into v_id;
  perform set_config('app.movimentacao', 'off', true);
  return v_id;
end $$;
