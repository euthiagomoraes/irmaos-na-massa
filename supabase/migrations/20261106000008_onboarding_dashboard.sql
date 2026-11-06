-- =====================================================================
-- 0008 · ONBOARDING, DASHBOARD, BUSCA GLOBAL E NOTIFICAÇÕES
-- =====================================================================

-- Cria a empresa do usuário com todos os cadastros padrão
create or replace function public.criar_empresa(
  p_nome text, p_slug text default null, p_whatsapp text default null, p_instagram text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_emp uuid;
  v_slug text;
  v_base text;
  v_i int := 1;
begin
  if v_uid is null then raise exception 'Faça login para continuar.' using errcode = '42501'; end if;
  if coalesce(char_length(btrim(p_nome)), 0) < 2 then raise exception 'Informe o nome da confeitaria.'; end if;
  if (select count(*) from public.empresa_membros where user_id = v_uid and papel = 'proprietario') >= 3 then
    raise exception 'Limite de empresas por usuário atingido.';
  end if;

  v_base := left(private.slugify(coalesce(nullif(btrim(p_slug), ''), p_nome)), 50);
  if char_length(v_base) < 3 then v_base := 'confeitaria'; end if;
  v_slug := v_base;
  while exists (select 1 from public.empresas where slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  end loop;

  insert into public.empresas (nome, slug, whatsapp, instagram)
  values (btrim(p_nome), v_slug, private.somente_digitos(p_whatsapp), nullif(btrim(coalesce(p_instagram, '')), ''))
  returning id into v_emp;

  insert into public.empresa_membros (empresa_id, user_id, papel) values (v_emp, v_uid, 'proprietario');
  insert into public.configuracoes (empresa_id) values (v_emp);
  insert into public.site_configuracoes (empresa_id, titulo, whatsapp, instagram)
  values (v_emp, btrim(p_nome), private.somente_digitos(p_whatsapp), nullif(btrim(coalesce(p_instagram, '')), ''));
  update public.profiles set empresa_atual_id = v_emp where id = v_uid;

  insert into public.formas_pagamento (empresa_id, nome, tipo, ordem) values
    (v_emp, 'Pix', 'pix', 1),
    (v_emp, 'Dinheiro', 'dinheiro', 2),
    (v_emp, 'Cartão de crédito', 'cartao_credito', 3),
    (v_emp, 'Cartão de débito', 'cartao_debito', 4),
    (v_emp, 'Transferência bancária', 'transferencia', 5);

  insert into public.categorias_financeiras (empresa_id, nome, tipo, grupo, sistema, ordem) values
    (v_emp, 'Vendas', 'receita', 'Receita operacional', true, 1),
    (v_emp, 'Sinal de encomendas', 'receita', 'Receita operacional', true, 2),
    (v_emp, 'Outras receitas', 'receita', 'Outras', false, 3),
    (v_emp, 'Compras de insumos', 'despesa', 'Custo variável', true, 1),
    (v_emp, 'Embalagens', 'despesa', 'Custo variável', false, 2),
    (v_emp, 'Energia', 'despesa', 'Custo fixo', false, 3),
    (v_emp, 'Água', 'despesa', 'Custo fixo', false, 4),
    (v_emp, 'Internet', 'despesa', 'Custo fixo', false, 5),
    (v_emp, 'Aluguel', 'despesa', 'Custo fixo', false, 6),
    (v_emp, 'Gás', 'despesa', 'Custo fixo', false, 7),
    (v_emp, 'Equipamentos', 'despesa', 'Investimento', false, 8),
    (v_emp, 'Manutenção', 'despesa', 'Custo fixo', false, 9),
    (v_emp, 'Transporte e entregas', 'despesa', 'Custo variável', false, 10),
    (v_emp, 'Marketing', 'despesa', 'Despesa comercial', false, 11),
    (v_emp, 'Taxas e impostos', 'despesa', 'Tributos', false, 12),
    (v_emp, 'Pró-labore e salários', 'despesa', 'Pessoal', false, 13),
    (v_emp, 'Outras despesas', 'despesa', 'Outras', false, 14);

  insert into public.categorias_insumos (empresa_id, nome, ordem) values
    (v_emp, 'Farinhas e secos', 1), (v_emp, 'Açúcares', 2), (v_emp, 'Laticínios', 3),
    (v_emp, 'Ovos', 4), (v_emp, 'Chocolates e cacau', 5), (v_emp, 'Frutas e castanhas', 6),
    (v_emp, 'Corantes e essências', 7), (v_emp, 'Pasta americana e decoração', 8),
    (v_emp, 'Embalagens', 9), (v_emp, 'Descartáveis, velas e topos', 10);

  insert into public.categorias_produtos (empresa_id, nome, slug, ordem) values
    (v_emp, 'Bolos personalizados', 'bolos-personalizados', 1),
    (v_emp, 'Bolos afetivos', 'bolos-afetivos', 2),
    (v_emp, 'Docinhos tradicionais', 'docinhos-tradicionais', 3),
    (v_emp, 'Doces finos', 'doces-finos', 4),
    (v_emp, 'Cupcakes', 'cupcakes', 5),
    (v_emp, 'Mini bolos', 'mini-bolos', 6),
    (v_emp, 'Kits comemorativos', 'kits-comemorativos', 7),
    (v_emp, 'Sobremesas', 'sobremesas', 8),
    (v_emp, 'Outros', 'outros', 9);

  insert into public.blog_categorias (empresa_id, nome, slug, ordem) values
    (v_emp, 'Receitas de bolos', 'receitas-de-bolos', 1),
    (v_emp, 'Recheios e coberturas', 'recheios-e-coberturas', 2),
    (v_emp, 'Docinhos', 'docinhos', 3),
    (v_emp, 'Técnicas de confeitaria', 'tecnicas-de-confeitaria', 4),
    (v_emp, 'Dicas de decoração', 'dicas-de-decoracao', 5),
    (v_emp, 'Conservação de alimentos', 'conservacao-de-alimentos', 6),
    (v_emp, 'Festas e comemorações', 'festas-e-comemoracoes', 7),
    (v_emp, 'Novidades da confeitaria', 'novidades', 8);

  return v_emp;
end $$;

-- ---------------------------------------------------------------------
-- Dashboard: indicadores calculados a partir dos registros reais
-- Faturamento = pedidos confirmados (competência na data do pedido)
-- Recebido    = entradas de caixa não estornadas
-- ---------------------------------------------------------------------
create or replace function public.dashboard_resumo(p_empresa uuid, p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_dias int := (p_fim - p_inicio) + 1;
  v_ant_ini date := p_inicio - ((p_fim - p_inicio) + 1);
  v_ant_fim date := p_inicio - 1;
  v_mensal boolean := (p_fim - p_inicio) > 62;
  v_res jsonb;
begin
  perform private.exigir_membro(p_empresa);
  if p_inicio is null or p_fim is null or p_fim < p_inicio then raise exception 'Período inválido.'; end if;
  if v_dias > 1100 then raise exception 'Período máximo de 3 anos.'; end if;

  with
  vendas as (
    select p.* from public.pedidos p
     where p.empresa_id = p_empresa
       and p.status not in ('orcamento', 'aguardando_confirmacao', 'cancelado')
  ),
  vendas_periodo as (select * from vendas where data_pedido between p_inicio and p_fim),
  itens_periodo as (
    select i.*, pr.nome as produto_nome, coalesce(cp.nome, 'Sem categoria') as categoria_nome
      from public.pedido_itens i
      join vendas_periodo v on v.id = i.pedido_id
      left join public.produtos pr on pr.id = i.produto_id
      left join public.categorias_produtos cp on cp.id = pr.categoria_id
  ),
  caixa as (
    select l.* from public.lancamentos_financeiros l
     where l.empresa_id = p_empresa
       and l.estorno_de is null
       and not exists (select 1 from public.lancamentos_financeiros e where e.estorno_de = l.id)
  ),
  despesas as (
    select c.* from public.contas_pagar c where c.empresa_id = p_empresa and c.status <> 'cancelada'
  ),
  k as (
    select
      coalesce((select sum(total) from vendas_periodo), 0) as faturamento,
      (select count(*) from vendas_periodo) as total_vendas,
      coalesce((select sum(round(custo_unitario * quantidade, 2)) from itens_periodo), 0) as cmv,
      coalesce((select sum(valor) from caixa where tipo = 'entrada' and data_lancamento between p_inicio and p_fim), 0) as recebido,
      coalesce((select sum(valor) from caixa where tipo = 'saida' and data_lancamento between p_inicio and p_fim), 0) as despesas_pagas,
      coalesce((select sum(valor) from despesas where competencia between p_inicio and p_fim), 0) as despesas,
      coalesce((select sum(total) from vendas where data_pedido between v_ant_ini and v_ant_fim), 0) as faturamento_ant,
      coalesce((select sum(valor) from despesas where competencia between v_ant_ini and v_ant_fim), 0) as despesas_ant,
      coalesce((select sum(case tipo when 'entrada' then valor else -valor end)
                  from public.lancamentos_financeiros where empresa_id = p_empresa), 0) as saldo_caixa
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_inicio, 'fim', p_fim, 'agrupamento', case when v_mensal then 'mes' else 'dia' end),
    'kpis', jsonb_build_object(
      'faturamento', k.faturamento,
      'total_vendas', k.total_vendas,
      'ticket_medio', case when k.total_vendas > 0 then round(k.faturamento / k.total_vendas, 2) else 0 end,
      'recebido', k.recebido,
      'despesas', k.despesas,
      'despesas_pagas', k.despesas_pagas,
      'cmv', k.cmv,
      'lucro_bruto', k.faturamento - k.cmv,
      'lucro_liquido', k.faturamento - k.cmv - k.despesas,
      'margem_liquida', case when k.faturamento > 0 then round((k.faturamento - k.cmv - k.despesas) / k.faturamento * 100, 1) else null end,
      'saldo_caixa', k.saldo_caixa,
      'faturamento_anterior', k.faturamento_ant,
      'despesas_anterior', k.despesas_ant,
      'pedidos_abertos', (select count(*) from public.pedidos where empresa_id = p_empresa and status in ('confirmado', 'aguardando_producao', 'em_producao', 'pronto', 'saiu_entrega')),
      'pedidos_producao', (select count(*) from public.pedidos where empresa_id = p_empresa and status in ('aguardando_producao', 'em_producao')),
      'pedidos_retirada', (select count(*) from public.pedidos where empresa_id = p_empresa and status = 'pronto'),
      'orcamentos_pendentes', (select count(*) from public.pedidos where empresa_id = p_empresa and status in ('orcamento', 'aguardando_confirmacao')),
      'entregas_hoje', (select count(*) from public.pedidos where empresa_id = p_empresa and data_entrega = current_date and status not in ('cancelado', 'entregue', 'orcamento', 'aguardando_confirmacao')),
      'estoque_baixo', (select count(*) from public.insumos where empresa_id = p_empresa and ativo and estoque_minimo > 0 and quantidade_atual <= estoque_minimo),
      'contas_pagar', coalesce((select sum(valor - valor_pago) from public.contas_pagar where empresa_id = p_empresa and status in ('aberta', 'parcial')), 0),
      'contas_pagar_vencidas', coalesce((select sum(valor - valor_pago) from public.contas_pagar where empresa_id = p_empresa and status in ('aberta', 'parcial') and vencimento < current_date), 0),
      'contas_receber', coalesce((select sum(valor - valor_recebido) from public.contas_receber where empresa_id = p_empresa and status in ('aberta', 'parcial')), 0),
      'contas_receber_vencidas', coalesce((select sum(valor - valor_recebido) from public.contas_receber where empresa_id = p_empresa and status in ('aberta', 'parcial') and vencimento < current_date), 0)
    ),
    'serie', coalesce((
      select jsonb_agg(jsonb_build_object(
               'data', b.bucket,
               'faturamento', b.faturamento,
               'recebido', b.recebido,
               'despesas', b.despesas,
               'lucro', b.faturamento - b.cmv - b.despesas) order by b.bucket)
        from (
          select g::date as bucket,
                 coalesce((select sum(v.total) from vendas_periodo v
                            where v.data_pedido >= g::date and v.data_pedido < (g + case when v_mensal then interval '1 month' else interval '1 day' end)::date), 0) as faturamento,
                 coalesce((select sum(round(i.custo_unitario * i.quantidade, 2)) from itens_periodo i join vendas_periodo v on v.id = i.pedido_id
                            where v.data_pedido >= g::date and v.data_pedido < (g + case when v_mensal then interval '1 month' else interval '1 day' end)::date), 0) as cmv,
                 coalesce((select sum(c.valor) from caixa c where c.tipo = 'entrada'
                            and c.data_lancamento >= greatest(g::date, p_inicio) and c.data_lancamento < (g + case when v_mensal then interval '1 month' else interval '1 day' end)::date
                            and c.data_lancamento <= p_fim), 0) as recebido,
                 coalesce((select sum(d.valor) from despesas d
                            where d.competencia >= greatest(g::date, p_inicio) and d.competencia < (g + case when v_mensal then interval '1 month' else interval '1 day' end)::date
                            and d.competencia <= p_fim), 0) as despesas
            from generate_series(
                   case when v_mensal then date_trunc('month', p_inicio) else p_inicio::timestamp end,
                   p_fim::timestamp,
                   case when v_mensal then interval '1 month' else interval '1 day' end) g
        ) b), '[]'::jsonb),
    'mensal', coalesce((
      select jsonb_agg(jsonb_build_object('mes', m.mes, 'faturamento', m.fat, 'despesas', m.desp, 'lucro', m.fat - m.cmv - m.desp) order by m.mes)
        from (
          select g::date as mes,
                 coalesce((select sum(v.total) from vendas v where date_trunc('month', v.data_pedido) = g), 0) as fat,
                 coalesce((select sum(round(i.custo_unitario * i.quantidade, 2)) from public.pedido_itens i join vendas v on v.id = i.pedido_id
                            where date_trunc('month', v.data_pedido) = g), 0) as cmv,
                 coalesce((select sum(d.valor) from despesas d where date_trunc('month', d.competencia) = g), 0) as desp
            from generate_series(date_trunc('month', p_fim) - interval '5 months', date_trunc('month', p_fim), interval '1 month') g
        ) m), '[]'::jsonb),
    'top_produtos', coalesce((
      select jsonb_agg(t order by t.quantidade desc)
        from (
          select coalesce(produto_nome, descricao) as nome, sum(quantidade) as quantidade, sum(total) as receita,
                 sum(total) - sum(round(custo_unitario * quantidade, 2)) as lucro
            from itens_periodo group by 1 order by 2 desc limit 6
        ) t), '[]'::jsonb),
    'categorias', coalesce((
      select jsonb_agg(c order by c.lucro desc)
        from (
          select categoria_nome as nome, sum(total) as receita,
                 sum(round(custo_unitario * quantidade, 2)) as custo,
                 sum(total) - sum(round(custo_unitario * quantidade, 2)) as lucro
            from itens_periodo group by 1
        ) c), '[]'::jsonb)
  ) into v_res
  from k;

  return v_res;
end $$;

-- ---------------------------------------------------------------------
-- Busca global (clientes, pedidos, produtos, insumos)
-- ---------------------------------------------------------------------
create or replace function public.busca_global(p_empresa uuid, p_termo text)
returns table (tipo text, id uuid, titulo text, subtitulo text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_t text := btrim(coalesce(p_termo, ''));
  v_like text;
  v_num bigint;
begin
  perform private.exigir_membro(p_empresa);
  if char_length(v_t) < 2 then return; end if;
  v_like := '%' || replace(replace(v_t, '%', ''), '_', '') || '%';
  v_num := case when v_t ~ '^#?\d{1,12}$' then replace(v_t, '#', '')::bigint end;

  return query
  (select 'cliente'::text, c.id, c.nome, coalesce(c.whatsapp, c.telefone, c.email)
     from public.clientes c
    where c.empresa_id = p_empresa and c.ativo
      and (extensions.unaccent(c.nome) ilike extensions.unaccent(v_like) or c.whatsapp like v_like or c.telefone like v_like)
    order by c.nome limit 5)
  union all
  (select 'pedido'::text, p.id, 'Pedido #' || p.numero, coalesce(cl.nome, 'Sem cliente') || ' · ' || p.status::text
     from public.pedidos p left join public.clientes cl on cl.id = p.cliente_id
    where p.empresa_id = p_empresa
      and (p.numero = v_num or extensions.unaccent(cl.nome) ilike extensions.unaccent(v_like))
    order by p.created_at desc limit 5)
  union all
  (select 'produto'::text, pr.id, pr.nome, case when pr.ativo then 'Ativo' else 'Inativo' end
     from public.produtos pr
    where pr.empresa_id = p_empresa and extensions.unaccent(pr.nome) ilike extensions.unaccent(v_like)
    order by pr.nome limit 5)
  union all
  (select 'insumo'::text, i.id, i.nome, round(i.quantidade_atual, 2)::text || ' ' || i.unidade_codigo || ' em estoque'
     from public.insumos i
    where i.empresa_id = p_empresa and i.ativo and extensions.unaccent(i.nome) ilike extensions.unaccent(v_like)
    order by i.nome limit 5);
end $$;

-- ---------------------------------------------------------------------
-- Central de notificações (derivadas dos dados reais)
-- ---------------------------------------------------------------------
create or replace function public.notificacoes(p_empresa uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_dias int;
  v_res jsonb := '[]'::jsonb;
begin
  perform private.exigir_membro(p_empresa);
  select dias_alerta_validade into v_dias from public.configuracoes where empresa_id = p_empresa;
  v_dias := coalesce(v_dias, 7);

  v_res := v_res || coalesce((
    select jsonb_agg(jsonb_build_object('tipo', 'estoque_baixo', 'nivel', 'alerta', 'id', i.id,
             'titulo', i.nome || ' abaixo do mínimo',
             'descricao', round(i.quantidade_atual, 2) || ' ' || i.unidade_codigo || ' (mínimo ' || round(i.estoque_minimo, 2) || ')',
             'rota', '/estoque'))
      from (select * from public.insumos where empresa_id = p_empresa and ativo and estoque_minimo > 0
              and quantidade_atual <= estoque_minimo order by quantidade_atual / nullif(estoque_minimo, 0) limit 10) i), '[]'::jsonb);

  v_res := v_res || coalesce((
    select jsonb_agg(jsonb_build_object('tipo', 'validade', 'nivel', case when l.data_validade < current_date then 'critico' else 'alerta' end,
             'id', l.id,
             'titulo', i.nome || case when l.data_validade < current_date then ' vencido' else ' vence em breve' end,
             'descricao', 'Lote ' || coalesce(l.codigo_lote, 's/ código') || ' · validade ' || to_char(l.data_validade, 'DD/MM/YYYY'),
             'rota', '/estoque'))
      from public.lotes_insumos l join public.insumos i on i.id = l.insumo_id
     where l.empresa_id = p_empresa and l.quantidade_atual > 0 and l.data_validade <= current_date + v_dias), '[]'::jsonb);

  v_res := v_res || coalesce((
    select jsonb_agg(jsonb_build_object('tipo', 'entrega', 'nivel', 'info', 'id', p.id,
             'titulo', 'Pedido #' || p.numero || case when p.data_entrega = current_date then ' para hoje' else ' para amanhã' end,
             'descricao', coalesce(c.nome, 'Cliente não informado') || coalesce(' · ' || to_char(p.horario_entrega, 'HH24:MI'), ''),
             'rota', '/pedidos'))
      from public.pedidos p left join public.clientes c on c.id = p.cliente_id
     where p.empresa_id = p_empresa and p.data_entrega between current_date and current_date + 1
       and p.status not in ('cancelado', 'entregue', 'orcamento', 'aguardando_confirmacao')), '[]'::jsonb);

  v_res := v_res || coalesce((
    select jsonb_agg(jsonb_build_object('tipo', 'conta_vencida', 'nivel', 'critico', 'id', c.id,
             'titulo', 'Conta vencida: ' || c.descricao,
             'descricao', 'R$ ' || to_char(c.valor - c.valor_pago, 'FM999G999G990D00') || ' · venceu em ' || to_char(c.vencimento, 'DD/MM'),
             'rota', '/financeiro'))
      from public.contas_pagar c
     where c.empresa_id = p_empresa and c.status in ('aberta', 'parcial') and c.vencimento < current_date), '[]'::jsonb);

  v_res := v_res || coalesce((
    select jsonb_agg(jsonb_build_object('tipo', 'solicitacao', 'nivel', 'info', 'id', s.id,
             'titulo', 'Nova solicitação de orçamento #' || s.protocolo,
             'descricao', s.nome || ' · ' || to_char(s.created_at, 'DD/MM HH24:MI'),
             'rota', '/pedidos'))
      from public.solicitacoes_orcamento s where s.empresa_id = p_empresa and s.status = 'nova'), '[]'::jsonb);

  v_res := v_res || coalesce((
    select jsonb_agg(jsonb_build_object('tipo', 'aniversario', 'nivel', 'info', 'id', c.id,
             'titulo', 'Aniversário de ' || c.nome,
             'descricao', to_char(c.data_nascimento, 'DD/MM'),
             'rota', '/clientes'))
      from public.clientes c
     where c.empresa_id = p_empresa and c.ativo and c.data_nascimento is not null
       and to_char(c.data_nascimento, 'MMDD') in (
             select to_char(current_date + d, 'MMDD') from generate_series(0, 7) d)), '[]'::jsonb);

  return v_res;
end $$;

-- Funções criadas nesta migration: mesmas regras de execução
revoke execute on function public.criar_empresa(text, text, text, text), public.dashboard_resumo(uuid, date, date),
  public.busca_global(uuid, text), public.notificacoes(uuid) from public, anon;
grant execute on function public.criar_empresa(text, text, text, text), public.dashboard_resumo(uuid, date, date),
  public.busca_global(uuid, text), public.notificacoes(uuid) to authenticated;
