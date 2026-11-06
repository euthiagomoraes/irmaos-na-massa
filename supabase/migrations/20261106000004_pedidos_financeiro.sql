-- =====================================================================
-- 0004 · PEDIDOS E FINANCEIRO
-- Faturamento (pedidos confirmados) ≠ recebimento (lançamentos de caixa).
-- Pagamentos e lançamentos são imutáveis; correções via estorno.
-- =====================================================================

create table public.formas_pagamento (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas (id) on delete cascade,
  nome              text not null,
  tipo              text not null check (tipo in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto', 'outro')),
  taxa_percentual   numeric(5,2) not null default 0 check (taxa_percentual between 0 and 100),
  dias_recebimento  int not null default 0 check (dias_recebimento >= 0),
  ordem             int not null default 0,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, nome)
);

create table public.categorias_financeiras (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  nome        text not null,
  tipo        text not null check (tipo in ('receita', 'despesa')),
  grupo       text,   -- ex.: custo variável, custo fixo, receita operacional
  sistema     boolean not null default false,  -- usada por automações; não pode ser excluída
  ordem       int not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, tipo, nome)
);

create type public.status_pedido as enum (
  'orcamento', 'aguardando_confirmacao', 'confirmado', 'aguardando_producao',
  'em_producao', 'pronto', 'saiu_entrega', 'entregue', 'cancelado');

create table public.pedidos (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresas (id) on delete cascade,
  numero                bigint not null,
  cliente_id            uuid,
  status                public.status_pedido not null default 'orcamento',
  origem                text not null default 'balcao' check (origem in ('balcao', 'whatsapp', 'instagram', 'site', 'telefone', 'outro')),
  data_pedido           date not null default current_date,
  data_entrega          date,
  horario_entrega       time,
  tipo_entrega          text not null default 'retirada' check (tipo_entrega in ('retirada', 'entrega')),
  endereco_entrega      jsonb not null default '{}'::jsonb,
  subtotal              numeric(12,2) not null default 0 check (subtotal >= 0),
  desconto              numeric(12,2) not null default 0 check (desconto >= 0),
  taxa_entrega          numeric(12,2) not null default 0 check (taxa_entrega >= 0),
  total                 numeric(12,2) generated always as (subtotal - desconto + taxa_entrega) stored,
  valor_pago            numeric(12,2) not null default 0,
  saldo                 numeric(12,2) generated always as (subtotal - desconto + taxa_entrega - valor_pago) stored,
  forma_pagamento_id    uuid,
  observacoes           text,
  observacoes_internas  text,
  referencia_imagem_url text,
  validade_orcamento    date,
  solicitacao_id        uuid,
  confirmado_em         timestamptz,
  producao_iniciada_em  timestamptz,
  concluido_em          timestamptz,
  entregue_em           timestamptz,
  cancelado_em          timestamptz,
  motivo_cancelamento   text,
  estoque_baixado_em    timestamptz,
  created_by            uuid default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, numero),
  check (desconto <= subtotal + taxa_entrega),
  foreign key (empresa_id, cliente_id) references public.clientes (empresa_id, id) on delete restrict,
  foreign key (empresa_id, forma_pagamento_id) references public.formas_pagamento (empresa_id, id) on delete set null (forma_pagamento_id)
);
create index pedidos_status_idx on public.pedidos (empresa_id, status);
create index pedidos_entrega_idx on public.pedidos (empresa_id, data_entrega) where status not in ('cancelado', 'entregue');
create index pedidos_data_idx on public.pedidos (empresa_id, data_pedido);

create table public.pedido_itens (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references public.empresas (id) on delete cascade,
  pedido_id          uuid not null,
  produto_id         uuid,
  variacao_id        uuid,
  descricao          text not null,
  quantidade         numeric(12,3) not null check (quantidade > 0),
  preco_unitario     numeric(12,2) not null check (preco_unitario >= 0),
  acrescimos         numeric(12,2) not null default 0 check (acrescimos >= 0),
  desconto           numeric(12,2) not null default 0 check (desconto >= 0),
  total              numeric(12,2) generated always as (round(quantidade * (preco_unitario + acrescimos), 2) - desconto) stored,
  -- Snapshot de custo no momento do pedido (preserva histórico)
  ficha_tecnica_id   uuid,
  custo_unitario     numeric(14,4) not null default 0,
  ficha_snapshot     jsonb,
  ordem              int not null default 0,
  observacoes        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (empresa_id, id),
  check (desconto <= round(quantidade * (preco_unitario + acrescimos), 2)),
  foreign key (empresa_id, pedido_id) references public.pedidos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, produto_id) references public.produtos (empresa_id, id) on delete set null (produto_id),
  foreign key (empresa_id, variacao_id) references public.variacoes_produtos (empresa_id, id) on delete set null (variacao_id),
  foreign key (empresa_id, ficha_tecnica_id) references public.fichas_tecnicas (empresa_id, id) on delete set null (ficha_tecnica_id)
);

create table public.pedido_personalizacoes (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas (id) on delete cascade,
  pedido_item_id    uuid not null,
  grupo             text not null,
  opcao_id          uuid,
  descricao         text not null,
  acrescimo         numeric(12,2) not null default 0 check (acrescimo >= 0),
  ficha_tecnica_id  uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (empresa_id, pedido_item_id) references public.pedido_itens (empresa_id, id) on delete cascade,
  foreign key (empresa_id, opcao_id) references public.opcoes_personalizacao (empresa_id, id) on delete set null (opcao_id),
  foreign key (empresa_id, ficha_tecnica_id) references public.fichas_tecnicas (empresa_id, id) on delete set null (ficha_tecnica_id)
);

create table public.pedido_status_historico (
  id               bigint generated always as identity primary key,
  empresa_id       uuid not null references public.empresas (id) on delete cascade,
  pedido_id        uuid not null,
  status_anterior  public.status_pedido,
  status_novo      public.status_pedido not null,
  observacao       text,
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  foreign key (empresa_id, pedido_id) references public.pedidos (empresa_id, id) on delete cascade
);
create index pedido_status_historico_pedido_idx on public.pedido_status_historico (pedido_id, created_at);

-- ---------------------------------------------------------------------
-- Contas a receber / a pagar
-- ---------------------------------------------------------------------
create table public.contas_receber (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  pedido_id       uuid,
  cliente_id      uuid,
  categoria_id    uuid,
  descricao       text not null,
  valor           numeric(12,2) not null check (valor > 0),
  valor_recebido  numeric(12,2) not null default 0,
  vencimento      date not null,
  competencia     date not null default current_date,
  status          text not null default 'aberta' check (status in ('aberta', 'parcial', 'quitada', 'cancelada')),
  observacoes     text,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, pedido_id) references public.pedidos (empresa_id, id) on delete restrict,
  foreign key (empresa_id, cliente_id) references public.clientes (empresa_id, id) on delete set null (cliente_id),
  foreign key (empresa_id, categoria_id) references public.categorias_financeiras (empresa_id, id)
);
create unique index contas_receber_pedido_unq on public.contas_receber (pedido_id) where pedido_id is not null and status <> 'cancelada';
create index contas_receber_venc_idx on public.contas_receber (empresa_id, vencimento) where status in ('aberta', 'parcial');

create table public.despesas_recorrentes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  descricao       text not null,
  categoria_id    uuid not null,
  fornecedor_id   uuid,
  valor           numeric(12,2) not null check (valor > 0),
  frequencia      text not null default 'mensal' check (frequencia in ('semanal', 'mensal', 'bimestral', 'trimestral', 'anual')),
  dia_vencimento  int not null check (dia_vencimento between 1 and 31),
  data_inicio     date not null default current_date,
  data_fim        date,
  ultima_geracao  date,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, categoria_id) references public.categorias_financeiras (empresa_id, id),
  foreign key (empresa_id, fornecedor_id) references public.fornecedores (empresa_id, id) on delete set null (fornecedor_id)
);

create table public.contas_pagar (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references public.empresas (id) on delete cascade,
  fornecedor_id          uuid,
  categoria_id           uuid not null,
  compra_id              uuid,
  despesa_recorrente_id  uuid,
  descricao              text not null,
  valor                  numeric(12,2) not null check (valor > 0),
  valor_pago             numeric(12,2) not null default 0,
  vencimento             date not null,
  competencia            date not null default current_date,
  status                 text not null default 'aberta' check (status in ('aberta', 'parcial', 'quitada', 'cancelada')),
  documento              text,
  observacoes            text,
  created_by             uuid default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (empresa_id, id),
  unique (despesa_recorrente_id, competencia),
  foreign key (empresa_id, fornecedor_id) references public.fornecedores (empresa_id, id) on delete set null (fornecedor_id),
  foreign key (empresa_id, categoria_id) references public.categorias_financeiras (empresa_id, id),
  foreign key (empresa_id, compra_id) references public.compras (empresa_id, id) on delete restrict,
  foreign key (empresa_id, despesa_recorrente_id) references public.despesas_recorrentes (empresa_id, id) on delete set null (despesa_recorrente_id)
);
create index contas_pagar_venc_idx on public.contas_pagar (empresa_id, vencimento) where status in ('aberta', 'parcial');
create index contas_pagar_comp_idx on public.contas_pagar (empresa_id, competencia);

-- ---------------------------------------------------------------------
-- Pagamentos de pedidos e lançamentos de caixa (imutáveis)
-- ---------------------------------------------------------------------
create table public.pagamentos (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  pedido_id           uuid not null,
  conta_receber_id    uuid,
  tipo                text not null check (tipo in ('sinal', 'parcial', 'final', 'estorno')),
  valor               numeric(12,2) not null check (valor <> 0),   -- negativo em estornos
  forma_pagamento_id  uuid,
  data_pagamento      date not null default current_date,
  observacoes         text,
  estorno_de          uuid references public.pagamentos (id),
  chave_idempotencia  text,
  created_by          uuid default auth.uid(),
  created_at          timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, pedido_id) references public.pedidos (empresa_id, id) on delete restrict,
  foreign key (empresa_id, conta_receber_id) references public.contas_receber (empresa_id, id),
  foreign key (empresa_id, forma_pagamento_id) references public.formas_pagamento (empresa_id, id)
);
create unique index pagamentos_estorno_unq on public.pagamentos (estorno_de) where estorno_de is not null;

create table public.lancamentos_financeiros (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  tipo                text not null check (tipo in ('entrada', 'saida')),
  valor               numeric(12,2) not null check (valor > 0),
  data_lancamento     date not null default current_date,
  descricao           text not null,
  categoria_id        uuid,
  forma_pagamento_id  uuid,
  conta_receber_id    uuid,
  conta_pagar_id      uuid,
  pagamento_id        uuid,
  pedido_id           uuid,
  estorno_de          uuid references public.lancamentos_financeiros (id),
  chave_idempotencia  text,
  created_by          uuid default auth.uid(),
  created_at          timestamptz not null default now(),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, categoria_id) references public.categorias_financeiras (empresa_id, id),
  foreign key (empresa_id, forma_pagamento_id) references public.formas_pagamento (empresa_id, id),
  foreign key (empresa_id, conta_receber_id) references public.contas_receber (empresa_id, id),
  foreign key (empresa_id, conta_pagar_id) references public.contas_pagar (empresa_id, id),
  foreign key (empresa_id, pagamento_id) references public.pagamentos (empresa_id, id),
  foreign key (empresa_id, pedido_id) references public.pedidos (empresa_id, id)
);
create unique index lancamentos_estorno_unq on public.lancamentos_financeiros (estorno_de) where estorno_de is not null;
create index lancamentos_data_idx on public.lancamentos_financeiros (empresa_id, data_lancamento);

create trigger bloquear_alteracao before update or delete on public.pagamentos
  for each row execute function private.bloquear_alteracao();
create trigger bloquear_alteracao before update or delete on public.lancamentos_financeiros
  for each row execute function private.bloquear_alteracao();
create trigger bloquear_alteracao before update or delete on public.pedido_status_historico
  for each row execute function private.bloquear_alteracao();

-- ---------------------------------------------------------------------
-- Regras de pedidos
-- ---------------------------------------------------------------------
create or replace function private.preparar_pedido()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.numero := private.proximo_numero(new.empresa_id, 'pedido');
    if coalesce(current_setting('app.fluxo_pedido', true), '') <> 'on' then
      if new.status not in ('orcamento', 'aguardando_confirmacao') then
        raise exception 'Novos registros devem começar como orçamento ou aguardando confirmação. Use a confirmação do pedido.' using errcode = 'P0001';
      end if;
      new.valor_pago := 0;
      new.subtotal := 0;
      new.estoque_baixado_em := null;
    end if;
    return new;
  end if;

  if coalesce(current_setting('app.fluxo_pedido', true), '') <> 'on' then
    if new.status is distinct from old.status
       or new.valor_pago is distinct from old.valor_pago
       or new.subtotal is distinct from old.subtotal
       or new.estoque_baixado_em is distinct from old.estoque_baixado_em
       or new.numero is distinct from old.numero then
      raise exception 'Status, valores pagos e baixas do pedido só podem ser alterados pelas ações do fluxo de pedidos.' using errcode = 'P0001';
    end if;
    if old.status in ('entregue', 'cancelado') then
      raise exception 'Pedidos % não podem ser editados.', case old.status when 'entregue' then 'entregues' else 'cancelados' end using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger preparar_pedido before insert or update on public.pedidos
  for each row execute function private.preparar_pedido();

-- Subtotal do pedido = soma dos itens
create or replace function private.atualizar_subtotal_pedido()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pedido uuid := coalesce(new.pedido_id, old.pedido_id);
begin
  perform set_config('app.fluxo_pedido', 'on', true);
  update public.pedidos p
     set subtotal = coalesce((select sum(total) from public.pedido_itens where pedido_id = v_pedido), 0)
   where p.id = v_pedido;
  perform set_config('app.fluxo_pedido', 'off', true);
  return null;
end $$;
create trigger atualizar_subtotal after insert or update or delete on public.pedido_itens
  for each row execute function private.atualizar_subtotal_pedido();

-- Itens só podem mudar enquanto o pedido não entrou em produção;
-- o custo é capturado da ficha técnica no momento da inclusão.
create or replace function private.preparar_item_pedido()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_status public.status_pedido;
  v_ficha uuid;
begin
  select status into v_status from public.pedidos where id = coalesce(new.pedido_id, old.pedido_id);
  if v_status in ('em_producao', 'pronto', 'saiu_entrega', 'entregue', 'cancelado')
     and coalesce(current_setting('app.excluir_empresa', true), '') <> 'on' then
    raise exception 'Itens não podem ser alterados com o pedido em "%".', v_status using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;

  if tg_op = 'INSERT' or new.produto_id is distinct from old.produto_id or new.variacao_id is distinct from old.variacao_id then
    select coalesce(v.ficha_tecnica_id, p.ficha_tecnica_id) into v_ficha
      from public.produtos p
      left join public.variacoes_produtos v on v.id = new.variacao_id
     where p.id = new.produto_id;
    new.ficha_tecnica_id := coalesce(new.ficha_tecnica_id, v_ficha);
  end if;
  if new.ficha_tecnica_id is not null and (tg_op = 'INSERT' or new.ficha_tecnica_id is distinct from old.ficha_tecnica_id) then
    select f.custo_unitario,
           jsonb_build_object('ficha_id', f.id, 'nome', f.nome, 'rendimento', f.rendimento,
                              'unidade_rendimento', f.unidade_rendimento, 'custo_total', f.custo_total,
                              'custo_unitario', f.custo_unitario, 'capturado_em', now())
      into new.custo_unitario, new.ficha_snapshot
      from public.fichas_tecnicas f where f.id = new.ficha_tecnica_id;
  end if;
  return new;
end $$;
create trigger preparar_item before insert or update or delete on public.pedido_itens
  for each row execute function private.preparar_item_pedido();

-- Contas: valores recebidos/pagos só mudam por baixas
create or replace function private.guard_conta()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.baixa_financeira', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    if tg_table_name = 'contas_pagar' then new.valor_pago := 0; else new.valor_recebido := 0; end if;
    new.status := 'aberta';
    return new;
  end if;
  if (tg_table_name = 'contas_pagar' and new.valor_pago is distinct from old.valor_pago)
     or (tg_table_name = 'contas_receber' and new.valor_recebido is distinct from old.valor_recebido)
     or new.status is distinct from old.status then
    raise exception 'Baixas e status de contas só podem ser alterados pelas ações financeiras.' using errcode = 'P0001';
  end if;
  if old.status in ('quitada', 'cancelada') then
    raise exception 'Contas % não podem ser editadas.', old.status || 's' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger guard_conta before insert or update on public.contas_pagar   for each row execute function private.guard_conta();
create trigger guard_conta before insert or update on public.contas_receber for each row execute function private.guard_conta();

-- Lançamentos/pagamentos só via funções (sem políticas de insert).
