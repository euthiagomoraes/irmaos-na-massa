-- =====================================================================
-- 0010 · FLUXOS OPERACIONAIS (Fases 2 a 7)
-- Compras → estoque, fluxo de status de pedidos (baixa de insumos e
-- pontos), pagamentos, baixas financeiras, despesas recorrentes,
-- resgates de fidelidade e relatórios gerenciais.
-- Todas as alterações de saldo continuam passando pelas travas
-- (app.movimentacao, app.fluxo_pedido, app.baixa_financeira, app.fidelidade).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Variações: tipo de forma (redonda, quadrada…) — a receita de cada
-- tamanho/forma fica na ficha técnica vinculada à variação.
-- ---------------------------------------------------------------------
alter table public.variacoes_produtos add column if not exists tipo_forma text;

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function private.exigir_gestor(p_empresa uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exigir_membro(p_empresa);
  if not private.is_gestor(p_empresa) then
    raise exception 'Apenas gestores (proprietário, administrador ou gerente) podem realizar esta ação.' using errcode = '42501';
  end if;
end $$;

create or replace function private.status_conta(p_valor numeric, p_baixado numeric)
returns text language sql immutable set search_path = '' as $$
  select case when p_baixado >= p_valor then 'quitada' when p_baixado > 0 then 'parcial' else 'aberta' end
$$;

create or replace function private.categoria_sistema(p_empresa uuid, p_tipo text, p_nome text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.categorias_financeiras
   where empresa_id = p_empresa and tipo = p_tipo and nome = p_nome
   limit 1
$$;

-- =====================================================================
-- COMPRAS
-- =====================================================================
create or replace function private.guard_compra()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.fluxo_compra', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'rascunho'; new.confirmada_em := null; new.valor_total := 0;
    return new;
  end if;
  if new.status is distinct from old.status or new.valor_total is distinct from old.valor_total
     or new.confirmada_em is distinct from old.confirmada_em then
    raise exception 'Use as ações "Confirmar" ou "Cancelar" para alterar o status da compra.' using errcode = 'P0001';
  end if;
  if old.status <> 'rascunho' and (new.fornecedor_id is distinct from old.fornecedor_id
     or new.data_compra is distinct from old.data_compra or new.valor_frete is distinct from old.valor_frete) then
    raise exception 'Compras % não podem ter fornecedor, data ou frete alterados.', old.status || 's' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger guard_compra before insert or update on public.compras
  for each row execute function private.guard_compra();

create or replace function private.proteger_exclusao_compra()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.excluir_empresa', true), '') = 'on' then return old; end if;
  if old.status <> 'rascunho' then
    raise exception 'Somente rascunhos podem ser excluídos. Compras confirmadas devem ser canceladas.' using errcode = 'P0001';
  end if;
  return old;
end $$;
create trigger proteger_exclusao before delete on public.compras
  for each row execute function private.proteger_exclusao_compra();

-- Confirma a compra: dá entrada de cada item no estoque (frete rateado no custo)
-- e, opcionalmente, gera a conta a pagar (já quitada, se p_pago).
create or replace function public.confirmar_compra(
  p_compra uuid, p_gerar_conta boolean default true, p_vencimento date default null,
  p_pago boolean default false, p_forma_pagamento uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.compras%rowtype;
  i record;
  v_itens numeric;
  v_qtd_itens int;
  v_fator numeric;
  v_total numeric;
  v_conta uuid;
begin
  select * into c from public.compras where id = p_compra for update;
  if not found then raise exception 'Compra não encontrada.'; end if;
  perform private.exigir_membro(c.empresa_id);
  if c.status <> 'rascunho' then raise exception 'Esta compra já foi %.', c.status; end if;

  select coalesce(sum(valor_total), 0), count(*) into v_itens, v_qtd_itens from public.compra_itens where compra_id = c.id;
  if v_qtd_itens = 0 then raise exception 'Adicione ao menos um item à compra.'; end if;
  v_fator := case when v_itens > 0 then 1 + c.valor_frete / v_itens else 1 end;
  v_total := v_itens + c.valor_frete;

  for i in select * from public.compra_itens where compra_id = c.id order by created_at loop
    perform public.movimentar_estoque(
      i.insumo_id, 'entrada', i.quantidade, i.unidade_codigo, round(i.custo_unitario * v_fator, 6), null,
      case when i.codigo_lote is not null or i.data_validade is not null
           then jsonb_build_object('codigo_lote', i.codigo_lote, 'data_validade', i.data_validade, 'fornecedor_id', c.fornecedor_id) end,
      'Compra #' || c.numero, 'compra', c.id, 'compra:' || i.id);
  end loop;

  perform set_config('app.fluxo_compra', 'on', true);
  update public.compras set status = 'confirmada', confirmada_em = now(), valor_total = v_total where id = c.id;
  perform set_config('app.fluxo_compra', 'off', true);

  if p_gerar_conta and v_total > 0 then
    insert into public.contas_pagar (empresa_id, fornecedor_id, categoria_id, compra_id, descricao, valor, vencimento, competencia, documento)
    values (c.empresa_id, c.fornecedor_id, private.categoria_sistema(c.empresa_id, 'despesa', 'Compras de insumos'), c.id,
            'Compra #' || c.numero, v_total, coalesce(p_vencimento, c.data_compra), c.data_compra, c.numero_documento)
    returning id into v_conta;
    if p_pago then
      perform public.baixar_conta_pagar(v_conta, v_total, coalesce(p_vencimento, c.data_compra), p_forma_pagamento, null, 'compra-paga:' || c.id);
    end if;
  end if;
  return c.id;
end $$;

-- Cancela a compra. Confirmadas: estorna as entradas e cancela a conta (se ainda sem pagamento).
create or replace function public.cancelar_compra(p_compra uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.compras%rowtype;
  m record;
  cp public.contas_pagar%rowtype;
begin
  select * into c from public.compras where id = p_compra for update;
  if not found then raise exception 'Compra não encontrada.'; end if;
  perform private.exigir_membro(c.empresa_id);
  if c.status = 'cancelada' then raise exception 'Esta compra já está cancelada.'; end if;
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'Informe o motivo do cancelamento.'; end if;

  if c.status = 'confirmada' then
    perform private.exigir_gestor(c.empresa_id);
    select * into cp from public.contas_pagar where compra_id = c.id and status <> 'cancelada' for update;
    if cp.id is not null and cp.valor_pago > 0 then
      raise exception 'A conta desta compra já tem pagamentos. Estorne os pagamentos no Financeiro antes de cancelar.';
    end if;
    for m in select id from public.movimentacoes_estoque
              where origem_tipo = 'compra' and origem_id = c.id and tipo = 'entrada'
                and not exists (select 1 from public.movimentacoes_estoque e where e.estorno_de = movimentacoes_estoque.id) loop
      perform public.estornar_movimentacao(m.id, 'Cancelamento da compra #' || c.numero || ': ' || btrim(p_motivo));
    end loop;
    if cp.id is not null then
      perform set_config('app.baixa_financeira', 'on', true);
      update public.contas_pagar set status = 'cancelada',
             observacoes = concat_ws(E'\n', observacoes, 'Cancelada: ' || btrim(p_motivo)) where id = cp.id;
      perform set_config('app.baixa_financeira', 'off', true);
    end if;
  end if;

  perform set_config('app.fluxo_compra', 'on', true);
  update public.compras set status = 'cancelada',
         observacoes = concat_ws(E'\n', observacoes, 'Cancelada: ' || btrim(p_motivo)) where id = c.id;
  perform set_config('app.fluxo_compra', 'off', true);
end $$;

-- =====================================================================
-- FINANCEIRO
-- =====================================================================
create or replace function public.baixar_conta_pagar(
  p_conta uuid, p_valor numeric, p_data date default null, p_forma uuid default null,
  p_observacao text default null, p_chave text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.contas_pagar%rowtype;
  v_id uuid;
begin
  select * into c from public.contas_pagar where id = p_conta for update;
  if not found then raise exception 'Conta não encontrada.'; end if;
  perform private.exigir_membro(c.empresa_id);
  if p_chave is not null then
    select id into v_id from public.lancamentos_financeiros where empresa_id = c.empresa_id and chave_idempotencia = p_chave;
    if found then return v_id; end if;
  end if;
  if c.status in ('quitada', 'cancelada') then raise exception 'Esta conta já está %.', c.status; end if;
  if coalesce(p_valor, 0) <= 0 then raise exception 'Informe um valor maior que zero.'; end if;
  if p_valor > c.valor - c.valor_pago then
    raise exception 'O valor (R$ %) é maior que o saldo da conta (R$ %).', p_valor, c.valor - c.valor_pago;
  end if;

  insert into public.lancamentos_financeiros (empresa_id, tipo, valor, data_lancamento, descricao, categoria_id,
                                              forma_pagamento_id, conta_pagar_id, chave_idempotencia)
  values (c.empresa_id, 'saida', p_valor, coalesce(p_data, current_date),
          'Pagamento: ' || c.descricao || coalesce(' · ' || nullif(btrim(p_observacao), ''), ''),
          c.categoria_id, p_forma, c.id, p_chave)
  returning id into v_id;

  perform set_config('app.baixa_financeira', 'on', true);
  update public.contas_pagar set valor_pago = valor_pago + p_valor,
         status = private.status_conta(valor, valor_pago + p_valor) where id = c.id;
  perform set_config('app.baixa_financeira', 'off', true);
  return v_id;
end $$;

create or replace function public.baixar_conta_receber(
  p_conta uuid, p_valor numeric, p_data date default null, p_forma uuid default null,
  p_observacao text default null, p_chave text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.contas_receber%rowtype;
  v_id uuid;
begin
  select * into c from public.contas_receber where id = p_conta for update;
  if not found then raise exception 'Conta não encontrada.'; end if;
  perform private.exigir_membro(c.empresa_id);
  if c.pedido_id is not null then
    -- Contas de pedidos são recebidas pelo próprio pedido (mantém pedido e conta sincronizados)
    select l.id into v_id
      from public.lancamentos_financeiros l
     where l.pagamento_id = public.pedido_registrar_pagamento(c.pedido_id, p_valor, p_forma, p_data, p_observacao, p_chave);
    return v_id;
  end if;
  if p_chave is not null then
    select id into v_id from public.lancamentos_financeiros where empresa_id = c.empresa_id and chave_idempotencia = p_chave;
    if found then return v_id; end if;
  end if;
  if c.status in ('quitada', 'cancelada') then raise exception 'Esta conta já está %.', c.status; end if;
  if coalesce(p_valor, 0) <= 0 then raise exception 'Informe um valor maior que zero.'; end if;
  if p_valor > c.valor - c.valor_recebido then
    raise exception 'O valor (R$ %) é maior que o saldo da conta (R$ %).', p_valor, c.valor - c.valor_recebido;
  end if;

  insert into public.lancamentos_financeiros (empresa_id, tipo, valor, data_lancamento, descricao, categoria_id,
                                              forma_pagamento_id, conta_receber_id, chave_idempotencia)
  values (c.empresa_id, 'entrada', p_valor, coalesce(p_data, current_date),
          'Recebimento: ' || c.descricao || coalesce(' · ' || nullif(btrim(p_observacao), ''), ''),
          c.categoria_id, p_forma, c.id, p_chave)
  returning id into v_id;

  perform set_config('app.baixa_financeira', 'on', true);
  update public.contas_receber set valor_recebido = valor_recebido + p_valor,
         status = private.status_conta(valor, valor_recebido + p_valor) where id = c.id;
  perform set_config('app.baixa_financeira', 'off', true);
  return v_id;
end $$;

-- Cancela uma conta sem baixas (contas de pedidos/compras são canceladas pela origem).
create or replace function public.cancelar_conta(p_tipo text, p_conta uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_emp uuid; v_baixado numeric; v_status text; v_pedido uuid; v_compra uuid;
begin
  if p_tipo = 'pagar' then
    select empresa_id, valor_pago, status, null, compra_id into v_emp, v_baixado, v_status, v_pedido, v_compra
      from public.contas_pagar where id = p_conta for update;
  elsif p_tipo = 'receber' then
    select empresa_id, valor_recebido, status, pedido_id, null into v_emp, v_baixado, v_status, v_pedido, v_compra
      from public.contas_receber where id = p_conta for update;
  else
    raise exception 'Tipo de conta inválido.';
  end if;
  if v_emp is null then raise exception 'Conta não encontrada.'; end if;
  perform private.exigir_gestor(v_emp);
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'Informe o motivo do cancelamento.'; end if;
  if v_status = 'cancelada' then raise exception 'Esta conta já está cancelada.'; end if;
  if v_baixado > 0 then raise exception 'A conta tem baixas registradas. Estorne-as antes de cancelar.'; end if;
  if v_pedido is not null then raise exception 'Esta conta pertence a um pedido. Cancele o pedido.'; end if;
  if v_compra is not null then raise exception 'Esta conta pertence a uma compra. Cancele a compra no Estoque.'; end if;

  perform set_config('app.baixa_financeira', 'on', true);
  if p_tipo = 'pagar' then
    update public.contas_pagar set status = 'cancelada', observacoes = concat_ws(E'\n', observacoes, 'Cancelada: ' || btrim(p_motivo)) where id = p_conta;
  else
    update public.contas_receber set status = 'cancelada', observacoes = concat_ws(E'\n', observacoes, 'Cancelada: ' || btrim(p_motivo)) where id = p_conta;
  end if;
  perform set_config('app.baixa_financeira', 'off', true);
end $$;

-- Entrada/saída de caixa avulsa (sem conta vinculada)
create or replace function public.lancamento_avulso(
  p_empresa uuid, p_tipo text, p_valor numeric, p_descricao text,
  p_categoria uuid default null, p_data date default null, p_forma uuid default null, p_chave text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.exigir_membro(p_empresa);
  if p_tipo not in ('entrada', 'saida') then raise exception 'Tipo de lançamento inválido.'; end if;
  if coalesce(p_valor, 0) <= 0 then raise exception 'Informe um valor maior que zero.'; end if;
  if coalesce(char_length(btrim(p_descricao)), 0) < 2 then raise exception 'Informe a descrição do lançamento.'; end if;
  if p_chave is not null then
    select id into v_id from public.lancamentos_financeiros where empresa_id = p_empresa and chave_idempotencia = p_chave;
    if found then return v_id; end if;
  end if;
  insert into public.lancamentos_financeiros (empresa_id, tipo, valor, data_lancamento, descricao, categoria_id, forma_pagamento_id, chave_idempotencia)
  values (p_empresa, p_tipo, p_valor, coalesce(p_data, current_date), btrim(p_descricao), p_categoria, p_forma, p_chave)
  returning id into v_id;
  return v_id;
end $$;

-- Estorna um lançamento de caixa (gera o lançamento inverso e desfaz a baixa da conta).
create or replace function public.estornar_lancamento(p_lancamento uuid, p_motivo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  l public.lancamentos_financeiros%rowtype;
  v_id uuid;
begin
  select * into l from public.lancamentos_financeiros where id = p_lancamento;
  if not found then raise exception 'Lançamento não encontrado.'; end if;
  perform private.exigir_gestor(l.empresa_id);
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'O estorno exige justificativa.'; end if;
  if l.estorno_de is not null then raise exception 'Não é possível estornar um estorno.'; end if;
  if exists (select 1 from public.lancamentos_financeiros where estorno_de = l.id) then
    raise exception 'Este lançamento já foi estornado.';
  end if;
  if l.pagamento_id is not null then
    perform public.pedido_estornar_pagamento(l.pagamento_id, p_motivo);
    select id into v_id from public.lancamentos_financeiros where estorno_de = l.id;
    return v_id;
  end if;

  insert into public.lancamentos_financeiros (empresa_id, tipo, valor, data_lancamento, descricao, categoria_id,
                                              forma_pagamento_id, conta_receber_id, conta_pagar_id, pedido_id, estorno_de)
  values (l.empresa_id, case l.tipo when 'entrada' then 'saida' else 'entrada' end, l.valor, current_date,
          'Estorno: ' || l.descricao || ' · ' || btrim(p_motivo), l.categoria_id, l.forma_pagamento_id,
          l.conta_receber_id, l.conta_pagar_id, l.pedido_id, l.id)
  returning id into v_id;

  perform set_config('app.baixa_financeira', 'on', true);
  if l.conta_pagar_id is not null then
    update public.contas_pagar set valor_pago = valor_pago - l.valor,
           status = private.status_conta(valor, valor_pago - l.valor) where id = l.conta_pagar_id;
  end if;
  if l.conta_receber_id is not null then
    update public.contas_receber set valor_recebido = valor_recebido - l.valor,
           status = private.status_conta(valor, valor_recebido - l.valor) where id = l.conta_receber_id;
  end if;
  perform set_config('app.baixa_financeira', 'off', true);
  return v_id;
end $$;

-- Gera as contas a pagar das despesas recorrentes até a data informada (padrão: próximos 31 dias).
create or replace function public.gerar_despesas_recorrentes(p_empresa uuid, p_ate date default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  d public.despesas_recorrentes%rowtype;
  v_ate date := coalesce(p_ate, current_date + 31);
  v_ref date; v_venc date; v_passo interval; v_n int := 0; v_k int; v_ultima date;
begin
  perform private.exigir_membro(p_empresa);
  if v_ate > current_date + 400 then raise exception 'Gere no máximo um ano à frente.'; end if;
  for d in select * from public.despesas_recorrentes where empresa_id = p_empresa and ativo for update loop
    v_passo := case d.frequencia when 'semanal' then interval '7 days' when 'mensal' then interval '1 month'
                 when 'bimestral' then interval '2 months' when 'trimestral' then interval '3 months' else interval '1 year' end;
    v_ref := case when d.frequencia = 'semanal' then d.data_inicio else date_trunc('month', d.data_inicio)::date end;
    v_ultima := d.ultima_geracao;
    loop
      v_venc := case when d.frequencia = 'semanal' then v_ref
                     else least(v_ref + (d.dia_vencimento - 1), (date_trunc('month', v_ref) + interval '1 month - 1 day')::date) end;
      exit when v_venc > v_ate or (d.data_fim is not null and v_venc > d.data_fim);
      if v_venc >= d.data_inicio and (d.ultima_geracao is null or v_venc > d.ultima_geracao) then
        insert into public.contas_pagar (empresa_id, fornecedor_id, categoria_id, despesa_recorrente_id, descricao, valor, vencimento, competencia)
        values (d.empresa_id, d.fornecedor_id, d.categoria_id, d.id, d.descricao, d.valor, v_venc, v_venc)
        on conflict (despesa_recorrente_id, competencia) do nothing;
        get diagnostics v_k = row_count;
        v_n := v_n + v_k;
        v_ultima := v_venc;
      end if;
      v_ref := (v_ref + v_passo)::date;
    end loop;
    if v_ultima is distinct from d.ultima_geracao then
      update public.despesas_recorrentes set ultima_geracao = v_ultima where id = d.id;
    end if;
  end loop;
  return v_n;
end $$;

-- =====================================================================
-- PEDIDOS
-- =====================================================================
-- Conta a receber espelha o pedido confirmado (valor = total, recebido = valor pago).
create or replace function private.sincronizar_conta_pedido(p_pedido uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.pedidos%rowtype;
  c public.contas_receber%rowtype;
  v_prev text := coalesce(current_setting('app.baixa_financeira', true), '');
begin
  select * into p from public.pedidos where id = p_pedido;
  if not found then return; end if;
  select * into c from public.contas_receber where pedido_id = p.id and status <> 'cancelada' for update;
  perform set_config('app.baixa_financeira', 'on', true);
  if p.status in ('orcamento', 'aguardando_confirmacao') then
    null;  -- ainda não é venda
  elsif p.status = 'cancelado' or p.total <= 0 then
    if c.id is not null then update public.contas_receber set status = 'cancelada' where id = c.id; end if;
  elsif c.id is null then
    insert into public.contas_receber (empresa_id, pedido_id, cliente_id, categoria_id, descricao, valor, valor_recebido,
                                       vencimento, competencia, status)
    values (p.empresa_id, p.id, p.cliente_id, private.categoria_sistema(p.empresa_id, 'receita', 'Vendas'),
            'Pedido #' || p.numero, p.total, least(p.valor_pago, p.total),
            coalesce(p.data_entrega, current_date), p.data_pedido, private.status_conta(p.total, p.valor_pago));
  else
    update public.contas_receber
       set valor = p.total, valor_recebido = least(p.valor_pago, p.total), cliente_id = p.cliente_id,
           vencimento = coalesce(p.data_entrega, vencimento), status = private.status_conta(p.total, p.valor_pago)
     where id = c.id;
  end if;
  perform set_config('app.baixa_financeira', v_prev, true);
end $$;

create or replace function private.trg_sincronizar_conta_pedido()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.sincronizar_conta_pedido(new.id);
  return null;
end $$;
create trigger sincronizar_conta after update of status, subtotal, desconto, taxa_entrega, valor_pago, data_entrega, cliente_id
  on public.pedidos for each row execute function private.trg_sincronizar_conta_pedido();

-- Explode uma ficha técnica (com subpreparações) em quantidades de insumos.
create or replace function private.explodir_ficha(p_ficha uuid, p_fator numeric, p_prof int default 0)
returns table (o_insumo uuid, o_qtd numeric, o_unid text)
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.ficha_tecnica_itens%rowtype;
  v_sub public.fichas_tecnicas%rowtype;
  v_q numeric;
begin
  if p_prof > 10 then raise exception 'Profundidade máxima de subpreparações excedida.'; end if;
  for r in select * from public.ficha_tecnica_itens where ficha_id = p_ficha loop
    if r.insumo_id is not null then
      o_insumo := r.insumo_id;
      o_qtd := r.quantidade * p_fator / (1 - r.perda_pct / 100);
      o_unid := r.unidade_codigo;
      return next;
    else
      select * into v_sub from public.fichas_tecnicas where id = r.subficha_id;
      v_q := public.converter_unidade(r.quantidade, r.unidade_codigo, v_sub.unidade_rendimento, null, v_sub.peso_unitario_g);
      return query select * from private.explodir_ficha(v_sub.id, p_fator * v_q / v_sub.rendimento / (1 - r.perda_pct / 100), p_prof + 1);
    end if;
  end loop;
end $$;

-- Quantas "receitas" um item consome: quantidade vendida convertida para a unidade de rendimento da ficha.
create or replace function private.fator_item(p_qtd numeric, p_unid_venda text, p_ficha uuid)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare f public.fichas_tecnicas%rowtype;
begin
  select * into f from public.fichas_tecnicas where id = p_ficha;
  begin
    return public.converter_unidade(p_qtd, coalesce(p_unid_venda, 'un'), f.unidade_rendimento, null, f.peso_unitario_g) / f.rendimento;
  exception when others then
    return p_qtd / f.rendimento;
  end;
end $$;

create or replace function private.baixar_estoque_pedido(p_pedido uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.pedidos%rowtype;
  r record;
begin
  select * into p from public.pedidos where id = p_pedido;
  if p.estoque_baixado_em is not null then return; end if;
  for r in
    select e.o_insumo, e.o_unid, sum(e.o_qtd) as qtd
      from (
        select x.* from public.pedido_itens i
          left join public.produtos pr on pr.id = i.produto_id
          cross join lateral private.explodir_ficha(i.ficha_tecnica_id, private.fator_item(i.quantidade, pr.unidade_venda, i.ficha_tecnica_id)) x
         where i.pedido_id = p.id and i.ficha_tecnica_id is not null
        union all
        select x.* from public.pedido_personalizacoes pp
          join public.pedido_itens i on i.id = pp.pedido_item_id
          join public.fichas_tecnicas f on f.id = pp.ficha_tecnica_id
          cross join lateral private.explodir_ficha(f.id, i.quantidade / f.rendimento) x
         where i.pedido_id = p.id
      ) e
     group by e.o_insumo, e.o_unid
    having sum(e.o_qtd) > 0
  loop
    perform public.movimentar_estoque(r.o_insumo, 'producao', round(r.qtd, 4), r.o_unid, null, null, null,
                                      'Produção do pedido #' || p.numero, 'pedido', p.id,
                                      'pedido:' || p.id || ':' || r.o_insumo || ':' || r.o_unid);
  end loop;
  perform set_config('app.fluxo_pedido', 'on', true);
  update public.pedidos set estoque_baixado_em = now() where id = p.id;
  perform set_config('app.fluxo_pedido', 'off', true);
end $$;

-- Credita pontos de fidelidade da compra (programas ativos com valor por ponto)
create or replace function private.creditar_pontos_pedido(p_pedido uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.pedidos%rowtype;
  r record;
  v_pts int;
begin
  select * into p from public.pedidos where id = p_pedido;
  if p.cliente_id is null then return; end if;
  for r in
    select fp.id as participante_id, pf.valor_por_ponto
      from public.fidelidade_participantes fp
      join public.programas_fidelidade pf on pf.id = fp.programa_id
     where fp.cliente_id = p.cliente_id and fp.ativo and pf.ativo and pf.valor_por_ponto is not null
       and pf.data_inicio <= current_date and (pf.data_fim is null or pf.data_fim >= current_date)
  loop
    v_pts := floor(p.total / r.valor_por_ponto);
    if v_pts > 0 then
      perform public.movimentar_pontos(r.participante_id, 'credito_compra', v_pts, 'Pedido #' || p.numero, p.id, null,
                                       'pedido:' || p.id || ':' || r.participante_id);
    end if;
  end loop;
end $$;

-- Avança/retrocede o status de um pedido conforme o fluxo permitido.
create or replace function public.pedido_alterar_status(p_pedido uuid, p_status public.status_pedido, p_observacao text default null)
returns public.pedidos language plpgsql security definer set search_path = '' as $$
declare
  p public.pedidos%rowtype;
  v_cfg public.configuracoes%rowtype;
  v_permitidos public.status_pedido[];
  v_anterior public.status_pedido;
  v_ordem constant public.status_pedido[] := array['confirmado', 'aguardando_producao', 'em_producao', 'pronto', 'saiu_entrega', 'entregue']::public.status_pedido[];
begin
  select * into p from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  perform private.exigir_membro(p.empresa_id);
  if p.status = p_status then return p; end if;
  v_anterior := p.status;

  v_permitidos := case p.status
    when 'orcamento'              then array['aguardando_confirmacao', 'confirmado', 'cancelado']
    when 'aguardando_confirmacao' then array['orcamento', 'confirmado', 'cancelado']
    when 'confirmado'             then array['aguardando_producao', 'em_producao', 'cancelado']
    when 'aguardando_producao'    then array['confirmado', 'em_producao', 'cancelado']
    when 'em_producao'            then array['pronto', 'cancelado']
    when 'pronto'                 then array['saiu_entrega', 'entregue', 'cancelado']
    when 'saiu_entrega'           then array['pronto', 'entregue']
    else array[]::text[]
  end::public.status_pedido[];
  if not (p_status = any (v_permitidos)) then
    raise exception 'Não é possível mudar o pedido de "%" para "%".', p.status, p_status using errcode = 'P0001';
  end if;
  if p_status = 'confirmado' and p.status in ('orcamento', 'aguardando_confirmacao') then
    if not exists (select 1 from public.pedido_itens where pedido_id = p.id) then
      raise exception 'Adicione ao menos um item antes de confirmar o pedido.';
    end if;
  end if;
  if p_status = 'cancelado' then
    if coalesce(btrim(p_observacao), '') = '' then raise exception 'Informe o motivo do cancelamento.'; end if;
    if p.valor_pago > 0 then
      raise exception 'O pedido tem R$ % recebidos. Estorne os pagamentos antes de cancelar.', p.valor_pago;
    end if;
  end if;

  select * into v_cfg from public.configuracoes where empresa_id = p.empresa_id;
  -- Baixa de insumos ao atingir (ou ultrapassar) o status configurado
  if p.estoque_baixado_em is null and p_status <> 'cancelado'
     and array_position(v_ordem, p_status) >= array_position(v_ordem, coalesce(v_cfg.baixa_estoque_no_status, 'em_producao')::public.status_pedido) then
    perform private.baixar_estoque_pedido(p.id);
  end if;

  perform set_config('app.fluxo_pedido', 'on', true);
  update public.pedidos set
    status = p_status,
    confirmado_em = case when p_status = 'confirmado' and confirmado_em is null then now() else confirmado_em end,
    producao_iniciada_em = case when p_status = 'em_producao' and producao_iniciada_em is null then now() else producao_iniciada_em end,
    concluido_em = case when p_status = 'pronto' and concluido_em is null then now() else concluido_em end,
    entregue_em = case when p_status = 'entregue' then now() else entregue_em end,
    cancelado_em = case when p_status = 'cancelado' then now() else cancelado_em end,
    motivo_cancelamento = case when p_status = 'cancelado' then btrim(p_observacao) else motivo_cancelamento end
  where id = p.id
  returning * into p;
  perform set_config('app.fluxo_pedido', 'off', true);

  insert into public.pedido_status_historico (empresa_id, pedido_id, status_anterior, status_novo, observacao)
  values (p.empresa_id, p.id, v_anterior, p_status,nullif(btrim(coalesce(p_observacao, '')), ''));

  if p_status = 'entregue' then perform private.creditar_pontos_pedido(p.id); end if;
  return p;
end $$;

-- Registra o histórico inicial do pedido
create or replace function private.historico_inicial_pedido()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.pedido_status_historico (empresa_id, pedido_id, status_anterior, status_novo, observacao)
  values (new.empresa_id, new.id, null, new.status, 'Pedido criado');
  return null;
end $$;
create trigger historico_inicial after insert on public.pedidos
  for each row execute function private.historico_inicial_pedido();

create or replace function public.pedido_registrar_pagamento(
  p_pedido uuid, p_valor numeric, p_forma uuid default null, p_data date default null,
  p_observacao text default null, p_chave text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  p public.pedidos%rowtype;
  v_tipo text;
  v_pag uuid;
  v_conta uuid;
begin
  select * into p from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  perform private.exigir_membro(p.empresa_id);
  if p_chave is not null then
    select id into v_pag from public.pagamentos where empresa_id = p.empresa_id and chave_idempotencia = p_chave;
    if found then return v_pag; end if;
  end if;
  if p.status = 'cancelado' then raise exception 'Pedidos cancelados não recebem pagamentos.'; end if;
  if coalesce(p_valor, 0) <= 0 then raise exception 'Informe um valor maior que zero.'; end if;
  if p.total <= 0 then raise exception 'Adicione itens ao pedido antes de registrar pagamentos.'; end if;
  if p_valor > p.saldo then
    raise exception 'O valor (R$ %) é maior que o saldo do pedido (R$ %).', p_valor, p.saldo;
  end if;

  v_tipo := case when p_valor = p.saldo then 'final' when p.valor_pago = 0 then 'sinal' else 'parcial' end;
  select id into v_conta from public.contas_receber where pedido_id = p.id and status <> 'cancelada';

  insert into public.pagamentos (empresa_id, pedido_id, conta_receber_id, tipo, valor, forma_pagamento_id, data_pagamento, observacoes, chave_idempotencia)
  values (p.empresa_id, p.id, v_conta, v_tipo, p_valor, p_forma, coalesce(p_data, current_date), nullif(btrim(coalesce(p_observacao, '')), ''), p_chave)
  returning id into v_pag;

  insert into public.lancamentos_financeiros (empresa_id, tipo, valor, data_lancamento, descricao, categoria_id,
                                              forma_pagamento_id, conta_receber_id, pagamento_id, pedido_id)
  values (p.empresa_id, 'entrada', p_valor, coalesce(p_data, current_date),
          case v_tipo when 'sinal' then 'Sinal' when 'final' then 'Pagamento' else 'Pagamento parcial' end || ' do pedido #' || p.numero,
          private.categoria_sistema(p.empresa_id, 'receita', case when v_tipo = 'sinal' and p.status in ('orcamento', 'aguardando_confirmacao') then 'Sinal de encomendas' else 'Vendas' end),
          p_forma, v_conta, v_pag, p.id);

  perform set_config('app.fluxo_pedido', 'on', true);
  update public.pedidos set valor_pago = valor_pago + p_valor, forma_pagamento_id = coalesce(p_forma, forma_pagamento_id) where id = p.id;
  perform set_config('app.fluxo_pedido', 'off', true);
  return v_pag;
end $$;

create or replace function public.pedido_estornar_pagamento(p_pagamento uuid, p_motivo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  pg public.pagamentos%rowtype;
  p public.pedidos%rowtype;
  l public.lancamentos_financeiros%rowtype;
  v_id uuid;
begin
  select * into pg from public.pagamentos where id = p_pagamento;
  if not found then raise exception 'Pagamento não encontrado.'; end if;
  perform private.exigir_gestor(pg.empresa_id);
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'O estorno exige justificativa.'; end if;
  if pg.tipo = 'estorno' then raise exception 'Não é possível estornar um estorno.'; end if;
  if exists (select 1 from public.pagamentos where estorno_de = pg.id) then raise exception 'Este pagamento já foi estornado.'; end if;
  select * into p from public.pedidos where id = pg.pedido_id for update;
  if p.status = 'entregue' then raise exception 'Pedidos entregues não podem ter pagamentos estornados.'; end if;

  insert into public.pagamentos (empresa_id, pedido_id, conta_receber_id, tipo, valor, forma_pagamento_id, data_pagamento, observacoes, estorno_de)
  values (pg.empresa_id, pg.pedido_id, pg.conta_receber_id, 'estorno', -pg.valor, pg.forma_pagamento_id, current_date, btrim(p_motivo), pg.id)
  returning id into v_id;

  select * into l from public.lancamentos_financeiros where pagamento_id = pg.id and estorno_de is null;
  if l.id is not null then
    insert into public.lancamentos_financeiros (empresa_id, tipo, valor, data_lancamento, descricao, categoria_id,
                                                forma_pagamento_id, conta_receber_id, pagamento_id, pedido_id, estorno_de)
    values (l.empresa_id, 'saida', l.valor, current_date, 'Estorno: ' || l.descricao || ' · ' || btrim(p_motivo),
            l.categoria_id, l.forma_pagamento_id, l.conta_receber_id, v_id, l.pedido_id, l.id);
  end if;

  perform set_config('app.fluxo_pedido', 'on', true);
  update public.pedidos set valor_pago = valor_pago - pg.valor where id = p.id;
  perform set_config('app.fluxo_pedido', 'off', true);
  return v_id;
end $$;

-- =====================================================================
-- FIDELIDADE
-- =====================================================================
create or replace function public.fidelidade_inscrever(p_programa uuid, p_cliente uuid, p_indicado_por uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  pf public.programas_fidelidade%rowtype;
  v_id uuid; v_ind uuid; v_nome text;
begin
  select * into pf from public.programas_fidelidade where id = p_programa;
  if not found then raise exception 'Programa não encontrado.'; end if;
  perform private.exigir_membro(pf.empresa_id);
  if not pf.ativo then raise exception 'Este programa está inativo.'; end if;
  if not exists (select 1 from public.clientes where id = p_cliente and empresa_id = pf.empresa_id) then
    raise exception 'Cliente não encontrado.';
  end if;
  if p_indicado_por = p_cliente then raise exception 'O cliente não pode indicar a si mesmo.'; end if;

  select id into v_id from public.fidelidade_participantes where programa_id = pf.id and cliente_id = p_cliente;
  if v_id is not null then
    update public.fidelidade_participantes set ativo = true where id = v_id;
    return v_id;
  end if;

  insert into public.fidelidade_participantes (empresa_id, programa_id, cliente_id, indicado_por_cliente_id)
  values (pf.empresa_id, pf.id, p_cliente, p_indicado_por)
  returning id into v_id;

  if p_indicado_por is not null and pf.pontos_por_indicacao > 0 then
    select id into v_ind from public.fidelidade_participantes where programa_id = pf.id and cliente_id = p_indicado_por and ativo;
    if v_ind is not null then
      select nome into v_nome from public.clientes where id = p_cliente;
      perform public.movimentar_pontos(v_ind, 'credito_indicacao', pf.pontos_por_indicacao, 'Indicou ' || v_nome, null, null, 'indicacao:' || v_id);
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.resgatar_recompensa(p_participante uuid, p_recompensa uuid, p_observacoes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  fp public.fidelidade_participantes%rowtype;
  rc public.recompensas%rowtype;
  pf public.programas_fidelidade%rowtype;
  v_id uuid;
begin
  select * into fp from public.fidelidade_participantes where id = p_participante for update;
  if not found then raise exception 'Participante não encontrado.'; end if;
  perform private.exigir_membro(fp.empresa_id);
  select * into rc from public.recompensas where id = p_recompensa for update;
  if not found or rc.programa_id <> fp.programa_id then raise exception 'Recompensa não pertence a este programa.'; end if;
  if not rc.ativo then raise exception 'Esta recompensa está inativa.'; end if;
  if not fp.ativo then raise exception 'O cliente está inativo neste programa.'; end if;
  if rc.quantidade_disponivel is not null and rc.quantidade_disponivel <= 0 then raise exception 'Recompensa esgotada.'; end if;
  if fp.saldo_pontos < rc.pontos_necessarios then
    raise exception 'Saldo insuficiente: o cliente tem % pontos e a recompensa exige %.', fp.saldo_pontos, rc.pontos_necessarios;
  end if;
  select * into pf from public.programas_fidelidade where id = fp.programa_id;
  if pf.limite_resgates_mes is not null and (
       select count(*) from public.resgates
        where participante_id = fp.id and status <> 'cancelado' and created_at >= date_trunc('month', now())) >= pf.limite_resgates_mes then
    raise exception 'Limite de % resgate(s) por mês atingido para este cliente.', pf.limite_resgates_mes;
  end if;

  insert into public.resgates (empresa_id, participante_id, recompensa_id, pontos, observacoes)
  values (fp.empresa_id, fp.id, rc.id, rc.pontos_necessarios, nullif(btrim(coalesce(p_observacoes, '')), ''))
  returning id into v_id;
  perform public.movimentar_pontos(fp.id, 'resgate', rc.pontos_necessarios, 'Resgate: ' || rc.nome, null, v_id, 'resgate:' || v_id);
  if rc.quantidade_disponivel is not null then
    update public.recompensas set quantidade_disponivel = quantidade_disponivel - 1 where id = rc.id;
  end if;
  return v_id;
end $$;

create or replace function public.cancelar_resgate(p_resgate uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.resgates%rowtype;
  v_mov uuid;
begin
  select * into r from public.resgates where id = p_resgate for update;
  if not found then raise exception 'Resgate não encontrado.'; end if;
  perform private.exigir_gestor(r.empresa_id);
  if r.status <> 'solicitado' then raise exception 'Somente resgates pendentes podem ser cancelados.'; end if;
  select id into v_mov from public.fidelidade_movimentacoes where resgate_id = r.id and tipo = 'resgate';
  if v_mov is not null then perform public.estornar_pontos(v_mov, 'Resgate cancelado: ' || coalesce(btrim(p_motivo), '')); end if;
  update public.resgates set status = 'cancelado', observacoes = concat_ws(E'\n', observacoes, 'Cancelado: ' || btrim(p_motivo)) where id = r.id;
  update public.recompensas set quantidade_disponivel = quantidade_disponivel + 1
   where id = r.recompensa_id and quantidade_disponivel is not null;
end $$;

-- =====================================================================
-- RELATÓRIOS
-- =====================================================================
create or replace function public.relatorio_gerencial(p_empresa uuid, p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  perform private.exigir_membro(p_empresa);
  if p_inicio is null or p_fim is null or p_fim < p_inicio then raise exception 'Período inválido.'; end if;
  if p_fim - p_inicio > 1100 then raise exception 'Período máximo de 3 anos.'; end if;

  with
  vendas as (
    select * from public.pedidos
     where empresa_id = p_empresa and status not in ('orcamento', 'aguardando_confirmacao', 'cancelado')
  ),
  vendas_periodo as (select * from vendas where data_pedido between p_inicio and p_fim),
  itens as (
    select i.*, coalesce(pr.nome, i.descricao) as produto_nome
      from public.pedido_itens i join vendas_periodo v on v.id = i.pedido_id
      left join public.produtos pr on pr.id = i.produto_id
  ),
  caixa as (
    select l.* from public.lancamentos_financeiros l
     where l.empresa_id = p_empresa and l.estorno_de is null
       and not exists (select 1 from public.lancamentos_financeiros e where e.estorno_de = l.id)
       and l.data_lancamento between p_inicio and p_fim
  )
  select jsonb_build_object(
    'resumo', jsonb_build_object(
      'faturamento', coalesce((select sum(total) from vendas_periodo), 0),
      'pedidos', (select count(*) from vendas_periodo),
      'cmv', coalesce((select sum(round(custo_unitario * quantidade, 2)) from itens), 0),
      'clientes_atendidos', (select count(distinct cliente_id) from vendas_periodo),
      'cancelados', (select count(*) from public.pedidos where empresa_id = p_empresa and status = 'cancelado' and data_pedido between p_inicio and p_fim),
      'orcamentos', (select count(*) from public.pedidos where empresa_id = p_empresa and data_pedido between p_inicio and p_fim),
      'recebido', coalesce((select sum(valor) from caixa where tipo = 'entrada'), 0),
      'pago', coalesce((select sum(valor) from caixa where tipo = 'saida'), 0),
      'despesas', coalesce((select sum(valor) from public.contas_pagar where empresa_id = p_empresa and status <> 'cancelada' and competencia between p_inicio and p_fim), 0)
    ),
    'produtos', coalesce((select jsonb_agg(t order by t.receita desc) from (
        select produto_nome as nome, sum(quantidade) as quantidade, sum(total) as receita,
               sum(round(custo_unitario * quantidade, 2)) as custo,
               sum(total) - sum(round(custo_unitario * quantidade, 2)) as lucro
          from itens group by produto_nome) t), '[]'::jsonb),
    'clientes', coalesce((select jsonb_agg(t order by t.total desc) from (
        select c.id, c.nome, count(*) as pedidos, sum(v.total) as total, max(v.data_pedido) as ultimo
          from vendas_periodo v join public.clientes c on c.id = v.cliente_id
         group by c.id, c.nome order by sum(v.total) desc limit 50) t), '[]'::jsonb),
    'recorrentes', (select count(*) from (select cliente_id from vendas_periodo where cliente_id is not null group by cliente_id having count(*) >= 2) r),
    'inativos', coalesce((select jsonb_agg(t order by t.ultimo) from (
        select c.id, c.nome, c.whatsapp, max(v.data_pedido) as ultimo, count(*) as pedidos, sum(v.total) as total
          from public.clientes c join vendas v on v.cliente_id = c.id
         where c.empresa_id = p_empresa and c.ativo
         group by c.id, c.nome, c.whatsapp
        having max(v.data_pedido) < p_fim - 90
         order by max(v.data_pedido) limit 50) t), '[]'::jsonb),
    'insumos', coalesce((select jsonb_agg(t order by t.valor desc) from (
        select i.nome, i.unidade_codigo as unidade,
               sum(case when m.tipo in ('producao', 'saida') then -m.quantidade else 0 end) as consumo,
               sum(case when m.tipo = 'perda' then -m.quantidade else 0 end) as perda,
               sum(case when m.tipo in ('producao', 'saida', 'perda') then m.valor_total else 0 end) as valor,
               sum(case when m.tipo = 'perda' then m.valor_total else 0 end) as valor_perda
          from public.movimentacoes_estoque m join public.insumos i on i.id = m.insumo_id
         where m.empresa_id = p_empresa and m.created_at::date between p_inicio and p_fim
           and m.tipo in ('producao', 'saida', 'perda')
           and not exists (select 1 from public.movimentacoes_estoque e where e.estorno_de = m.id)
         group by i.nome, i.unidade_codigo) t), '[]'::jsonb),
    'formas_pagamento', coalesce((select jsonb_agg(t order by t.valor desc) from (
        select coalesce(f.nome, 'Não informada') as nome, sum(c.valor) as valor, count(*) as quantidade
          from caixa c left join public.formas_pagamento f on f.id = c.forma_pagamento_id
         where c.tipo = 'entrada' group by 1) t), '[]'::jsonb),
    'despesas_categoria', coalesce((select jsonb_agg(t order by t.valor desc) from (
        select coalesce(cf.nome, 'Sem categoria') as nome, sum(cp.valor) as valor
          from public.contas_pagar cp left join public.categorias_financeiras cf on cf.id = cp.categoria_id
         where cp.empresa_id = p_empresa and cp.status <> 'cancelada' and cp.competencia between p_inicio and p_fim
         group by 1) t), '[]'::jsonb),
    'fidelidade', coalesce((select jsonb_agg(t) from (
        select pf.nome,
               (select count(*) from public.fidelidade_participantes fp where fp.programa_id = pf.id and fp.ativo) as participantes,
               coalesce((select sum(m.pontos) from public.fidelidade_movimentacoes m join public.fidelidade_participantes fp on fp.id = m.participante_id
                          where fp.programa_id = pf.id and m.pontos > 0 and m.tipo <> 'estorno' and m.created_at::date between p_inicio and p_fim), 0) as pontos_emitidos,
               coalesce((select -sum(m.pontos) from public.fidelidade_movimentacoes m join public.fidelidade_participantes fp on fp.id = m.participante_id
                          where fp.programa_id = pf.id and m.tipo = 'resgate' and m.created_at::date between p_inicio and p_fim), 0) as pontos_resgatados,
               (select count(*) from public.resgates r join public.fidelidade_participantes fp on fp.id = r.participante_id
                 where fp.programa_id = pf.id and r.status <> 'cancelado' and r.created_at::date between p_inicio and p_fim) as resgates
          from public.programas_fidelidade pf where pf.empresa_id = p_empresa) t), '[]'::jsonb)
  ) into v;
  return v;
end $$;

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------
revoke execute on function
  public.confirmar_compra(uuid, boolean, date, boolean, uuid), public.cancelar_compra(uuid, text),
  public.baixar_conta_pagar(uuid, numeric, date, uuid, text, text), public.baixar_conta_receber(uuid, numeric, date, uuid, text, text),
  public.cancelar_conta(text, uuid, text), public.lancamento_avulso(uuid, text, numeric, text, uuid, date, uuid, text),
  public.estornar_lancamento(uuid, text), public.gerar_despesas_recorrentes(uuid, date),
  public.pedido_alterar_status(uuid, public.status_pedido, text), public.pedido_registrar_pagamento(uuid, numeric, uuid, date, text, text),
  public.pedido_estornar_pagamento(uuid, text), public.fidelidade_inscrever(uuid, uuid, uuid),
  public.resgatar_recompensa(uuid, uuid, text), public.cancelar_resgate(uuid, text), public.relatorio_gerencial(uuid, date, date)
from public, anon;
grant execute on function
  public.confirmar_compra(uuid, boolean, date, boolean, uuid), public.cancelar_compra(uuid, text),
  public.baixar_conta_pagar(uuid, numeric, date, uuid, text, text), public.baixar_conta_receber(uuid, numeric, date, uuid, text, text),
  public.cancelar_conta(text, uuid, text), public.lancamento_avulso(uuid, text, numeric, text, uuid, date, uuid, text),
  public.estornar_lancamento(uuid, text), public.gerar_despesas_recorrentes(uuid, date),
  public.pedido_alterar_status(uuid, public.status_pedido, text), public.pedido_registrar_pagamento(uuid, numeric, uuid, date, text, text),
  public.pedido_estornar_pagamento(uuid, text), public.fidelidade_inscrever(uuid, uuid, uuid),
  public.resgatar_recompensa(uuid, uuid, text), public.cancelar_resgate(uuid, text), public.relatorio_gerencial(uuid, date, date)
to authenticated;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
grant execute on function private.site_publicado(uuid), private.produto_na_vitrine(uuid), private.artigo_publicado(uuid) to anon;
