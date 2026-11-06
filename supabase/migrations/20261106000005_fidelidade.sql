-- =====================================================================
-- 0005 · FIDELIDADE E CAMPANHAS
-- Saldo de pontos só muda por movimentação auditável.
-- =====================================================================

create table public.programas_fidelidade (
  id                      uuid primary key default gen_random_uuid(),
  empresa_id              uuid not null references public.empresas (id) on delete cascade,
  nome                    text not null check (char_length(btrim(nome)) between 2 and 120),
  descricao               text,
  tipo                    text not null default 'pontos' check (tipo in ('pontos', 'vip', 'indicacao', 'cartao', 'aniversario', 'recompensas')),
  data_inicio             date not null default current_date,
  data_fim                date,
  criterio_participacao   text,
  valor_por_ponto         numeric(12,2) check (valor_por_ponto > 0),   -- R$ 10,00 = 1 ponto
  pontos_por_indicacao    int not null default 0 check (pontos_por_indicacao >= 0),
  pontos_validade_dias    int check (pontos_validade_dias > 0),
  limite_resgates_mes     int check (limite_resgates_mes > 0),
  regras                  text,
  cor                     text,
  ativo                   boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (empresa_id, id),
  check (data_fim is null or data_fim >= data_inicio)
);

create table public.fidelidade_participantes (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references public.empresas (id) on delete cascade,
  programa_id            uuid not null,
  cliente_id             uuid not null,
  saldo_pontos           int not null default 0 check (saldo_pontos >= 0),
  pontos_acumulados      int not null default 0,
  nivel                  text,
  indicado_por_cliente_id uuid,
  data_adesao            date not null default current_date,
  ativo                  boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (empresa_id, id),
  unique (programa_id, cliente_id),
  foreign key (empresa_id, programa_id) references public.programas_fidelidade (empresa_id, id) on delete restrict,
  foreign key (empresa_id, cliente_id) references public.clientes (empresa_id, id) on delete restrict,
  foreign key (empresa_id, indicado_por_cliente_id) references public.clientes (empresa_id, id) on delete set null (indicado_por_cliente_id)
);

create table public.recompensas (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  programa_id         uuid not null,
  nome                text not null,
  descricao           text,
  pontos_necessarios  int not null check (pontos_necessarios > 0),
  produto_id          uuid,
  quantidade_disponivel int check (quantidade_disponivel >= 0),
  imagem_url          text,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, programa_id) references public.programas_fidelidade (empresa_id, id) on delete cascade,
  foreign key (empresa_id, produto_id) references public.produtos (empresa_id, id) on delete set null (produto_id)
);

create table public.resgates (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas (id) on delete cascade,
  participante_id  uuid not null,
  recompensa_id    uuid not null,
  pontos           int not null check (pontos > 0),
  status           text not null default 'solicitado' check (status in ('solicitado', 'entregue', 'cancelado')),
  pedido_id        uuid,
  observacoes      text,
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, participante_id) references public.fidelidade_participantes (empresa_id, id) on delete restrict,
  foreign key (empresa_id, recompensa_id) references public.recompensas (empresa_id, id) on delete restrict,
  foreign key (empresa_id, pedido_id) references public.pedidos (empresa_id, id) on delete set null (pedido_id)
);

create table public.fidelidade_movimentacoes (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  participante_id     uuid not null,
  tipo                text not null check (tipo in ('credito_compra', 'credito_indicacao', 'credito_manual', 'bonus', 'debito_manual', 'resgate', 'expiracao', 'estorno')),
  pontos              int not null check (pontos <> 0),   -- com sinal
  saldo_anterior      int not null,
  saldo_posterior     int not null check (saldo_posterior >= 0),
  pedido_id           uuid,
  resgate_id          uuid,
  motivo              text,
  estorno_de          uuid references public.fidelidade_movimentacoes (id),
  chave_idempotencia  text,
  created_by          uuid default auth.uid(),
  created_at          timestamptz not null default now(),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, participante_id) references public.fidelidade_participantes (empresa_id, id) on delete restrict,
  foreign key (empresa_id, pedido_id) references public.pedidos (empresa_id, id),
  foreign key (empresa_id, resgate_id) references public.resgates (empresa_id, id)
);
create unique index fidelidade_mov_estorno_unq on public.fidelidade_movimentacoes (estorno_de) where estorno_de is not null;
create index fidelidade_mov_participante_idx on public.fidelidade_movimentacoes (participante_id, created_at desc);
create trigger bloquear_alteracao before update or delete on public.fidelidade_movimentacoes
  for each row execute function private.bloquear_alteracao();

create or replace function private.guard_saldo_pontos()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.fidelidade', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.saldo_pontos := 0; new.pontos_acumulados := 0; return new;
  end if;
  if new.saldo_pontos is distinct from old.saldo_pontos or new.pontos_acumulados is distinct from old.pontos_acumulados then
    raise exception 'O saldo de pontos só pode ser alterado por movimentações de fidelidade.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger guard_saldo before insert or update on public.fidelidade_participantes
  for each row execute function private.guard_saldo_pontos();

-- Movimenta pontos (créditos positivos, débitos negativos) de forma auditável.
create or replace function public.movimentar_pontos(
  p_participante_id uuid, p_tipo text, p_pontos int, p_motivo text default null,
  p_pedido_id uuid default null, p_resgate_id uuid default null, p_chave text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_part public.fidelidade_participantes%rowtype;
  v_pts int; v_saldo int; v_id uuid;
begin
  select * into v_part from public.fidelidade_participantes where id = p_participante_id for update;
  if not found then raise exception 'Participante não encontrado.'; end if;
  perform private.exigir_membro(v_part.empresa_id);
  if p_tipo not in ('credito_compra', 'credito_indicacao', 'credito_manual', 'bonus', 'debito_manual', 'resgate', 'expiracao') then
    raise exception 'Tipo de movimentação de pontos inválido.';
  end if;
  if coalesce(p_pontos, 0) = 0 then raise exception 'Informe a quantidade de pontos.'; end if;
  if p_tipo in ('credito_manual', 'debito_manual', 'bonus') and coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Movimentações manuais exigem justificativa.';
  end if;
  if p_chave is not null then
    select id into v_id from public.fidelidade_movimentacoes where empresa_id = v_part.empresa_id and chave_idempotencia = p_chave;
    if found then return v_id; end if;
  end if;
  if not v_part.ativo and p_tipo like 'credito%' then raise exception 'Participante inativo no programa.'; end if;

  v_pts := case when p_tipo in ('debito_manual', 'resgate', 'expiracao') then -abs(p_pontos) else abs(p_pontos) end;
  v_saldo := v_part.saldo_pontos + v_pts;
  if v_saldo < 0 then
    raise exception 'Saldo insuficiente: o cliente possui % pontos.', v_part.saldo_pontos using errcode = 'P0001';
  end if;

  perform set_config('app.fidelidade', 'on', true);
  update public.fidelidade_participantes
     set saldo_pontos = v_saldo,
         pontos_acumulados = pontos_acumulados + greatest(v_pts, 0)
   where id = v_part.id;
  perform set_config('app.fidelidade', 'off', true);

  insert into public.fidelidade_movimentacoes (empresa_id, participante_id, tipo, pontos, saldo_anterior, saldo_posterior,
                                               pedido_id, resgate_id, motivo, chave_idempotencia)
  values (v_part.empresa_id, v_part.id, p_tipo, v_pts, v_part.saldo_pontos, v_saldo,
          p_pedido_id, p_resgate_id, nullif(btrim(coalesce(p_motivo, '')), ''), p_chave)
  returning id into v_id;
  return v_id;
end $$;

-- Estorno justificado de uma movimentação de pontos
create or replace function public.estornar_pontos(p_movimentacao_id uuid, p_motivo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_mov public.fidelidade_movimentacoes%rowtype;
  v_part public.fidelidade_participantes%rowtype;
  v_saldo int; v_id uuid;
begin
  select * into v_mov from public.fidelidade_movimentacoes where id = p_movimentacao_id;
  if not found then raise exception 'Movimentação não encontrada.'; end if;
  perform private.exigir_membro(v_mov.empresa_id);
  if not private.is_gestor(v_mov.empresa_id) then raise exception 'Apenas gestores podem estornar pontos.' using errcode = '42501'; end if;
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'O estorno exige justificativa.'; end if;
  if v_mov.tipo = 'estorno' then raise exception 'Não é possível estornar um estorno.'; end if;
  if exists (select 1 from public.fidelidade_movimentacoes where estorno_de = v_mov.id) then
    raise exception 'Esta movimentação já foi estornada.';
  end if;
  select * into v_part from public.fidelidade_participantes where id = v_mov.participante_id for update;
  v_saldo := v_part.saldo_pontos - v_mov.pontos;
  if v_saldo < 0 then raise exception 'O estorno deixaria o saldo negativo (saldo atual: %).', v_part.saldo_pontos; end if;

  perform set_config('app.fidelidade', 'on', true);
  update public.fidelidade_participantes
     set saldo_pontos = v_saldo,
         pontos_acumulados = pontos_acumulados - greatest(v_mov.pontos, 0)
   where id = v_part.id;
  perform set_config('app.fidelidade', 'off', true);

  insert into public.fidelidade_movimentacoes (empresa_id, participante_id, tipo, pontos, saldo_anterior, saldo_posterior,
                                               pedido_id, resgate_id, motivo, estorno_de)
  values (v_mov.empresa_id, v_mov.participante_id, 'estorno', -v_mov.pontos, v_part.saldo_pontos, v_saldo,
          v_mov.pedido_id, v_mov.resgate_id, btrim(p_motivo), v_mov.id)
  returning id into v_id;
  return v_id;
end $$;
