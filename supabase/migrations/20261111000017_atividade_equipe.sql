-- =====================================================================
-- 0017 · EQUIPE COMPLETA + ATIVIDADE ENTRE SÓCIOS
-- 1) Todo membro com acesso aparece em "Sócios e equipe" (inclui o titular).
-- 2) Feed de atividade: cada pessoa vê o que as OUTRAS fizeram
--    (pedidos, pagamentos, solicitações do site, cadastros, contas, equipe),
--    a partir do log de auditoria que já existe.
-- 3) Marcação de "lido" por usuário.
-- =====================================================================

-- ---------------------------------------------------------------- 1) pessoas para todos os membros
alter table public.profiles add column if not exists atividade_vista_em timestamptz;

create or replace function private.garantir_pessoa_do_membro()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_email text; v_nome text;
begin
  -- Membro criado a partir do próprio cadastro de pessoa: nada a fazer
  if coalesce(current_setting('app.sincronizando_pessoa', true), '') = 'on' then return new; end if;
  select lower(email) into v_email from auth.users where id = new.user_id;
  select coalesce(nullif(btrim(nome), ''), split_part(v_email, '@', 1)) into v_nome from public.profiles where id = new.user_id;
  if exists (select 1 from public.pessoas_equipe
              where empresa_id = new.empresa_id and (user_id = new.user_id or lower(email) = v_email)) then
    return new;
  end if;
  insert into public.pessoas_equipe (empresa_id, nome, tipo, email, ativo)
  values (new.empresa_id, coalesce(v_nome, 'Sócio'),
          case when new.papel in ('proprietario', 'administrador') then 'socio' else 'colaborador' end,
          v_email, new.ativo);
  return new;
end $$;

drop trigger if exists garantir_pessoa on public.empresa_membros;
create trigger garantir_pessoa after insert on public.empresa_membros
  for each row execute function private.garantir_pessoa_do_membro();

-- Mesma função da 0015, marcando que o membro nasce do cadastro da pessoa
create or replace function private.sincronizar_acesso_pessoa()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_user  uuid;
  v_papel public.papel_usuario := case when new.tipo = 'socio' then 'administrador' else 'atendente' end;
  v_atual public.papel_usuario;
begin
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  if new.email is not null then
    select id into v_user from auth.users where lower(email) = new.email limit 1;
  end if;

  if tg_op = 'UPDATE' and old.user_id is not null and old.user_id = (select auth.uid())
     and (v_user is distinct from old.user_id or not new.ativo or new.tipo <> old.tipo) then
    raise exception 'Você não pode alterar o seu próprio acesso (e-mail, função ou situação).';
  end if;

  if tg_op = 'UPDATE' and old.user_id is not null and old.user_id is distinct from v_user then
    update public.empresa_membros set ativo = false
     where empresa_id = old.empresa_id and user_id = old.user_id and papel <> 'proprietario';
  end if;

  new.user_id := v_user;
  if v_user is null then return new; end if;

  select papel into v_atual from public.empresa_membros where empresa_id = new.empresa_id and user_id = v_user;
  if v_atual = 'proprietario' then
    if new.tipo <> 'socio' or not new.ativo then
      raise exception 'O titular da conta precisa continuar como sócio ativo.';
    end if;
    return new;
  end if;

  perform set_config('app.sincronizando_pessoa', 'on', true);
  insert into public.empresa_membros (empresa_id, user_id, papel, ativo)
  values (new.empresa_id, v_user, v_papel, new.ativo)
  on conflict (empresa_id, user_id) do update set papel = excluded.papel, ativo = excluded.ativo;

  if new.ativo then
    update public.profiles set empresa_atual_id = new.empresa_id where id = v_user and empresa_atual_id is null;
  end if;
  return new;
end $$;

-- Membros que já existiam sem cadastro (ex.: quem criou a empresa)
insert into public.pessoas_equipe (empresa_id, nome, tipo, email, ativo)
select m.empresa_id,
       coalesce(nullif(btrim(p.nome), ''), split_part(u.email, '@', 1)),
       case when m.papel in ('proprietario', 'administrador') then 'socio' else 'colaborador' end,
       lower(u.email), m.ativo
  from public.empresa_membros m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
 where not exists (select 1 from public.pessoas_equipe pe
                    where pe.empresa_id = m.empresa_id and (pe.user_id = m.user_id or lower(pe.email) = lower(u.email)));

-- ---------------------------------------------------------------- 2) feed de atividade
create or replace function private.rotulo_status_pedido(p text)
returns text language sql immutable set search_path = '' as $$
  select case p
    when 'orcamento' then 'orçamento' when 'aguardando_confirmacao' then 'aguardando confirmação'
    when 'confirmado' then 'confirmado' when 'aguardando_producao' then 'aguardando produção'
    when 'em_producao' then 'em produção' when 'pronto' then 'pronto' when 'saiu_entrega' then 'saiu para entrega'
    when 'entregue' then 'entregue' when 'cancelado' then 'cancelado' else coalesce(p, '') end
$$;

create or replace function public.atividade_equipe(p_empresa uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_admin boolean;
  v_vista timestamptz;
  v_res   jsonb;
begin
  perform private.exigir_membro(p_empresa);
  v_admin := private.is_admin(p_empresa);
  select atividade_vista_em into v_vista from public.profiles where id = v_uid;

  with base as (
    select l.id, l.created_at, l.user_id, l.tabela, l.registro_id, l.acao,
           coalesce(l.dados_depois, l.dados_antes) as d, l.dados_antes as a,
           case
             when l.tabela = 'pedidos' and l.acao = 'update' and (l.dados_antes ->> 'status') is distinct from (l.dados_depois ->> 'status') then 'status'
             when l.tabela = 'pedidos' and l.acao = 'update' and (l.dados_antes ->> 'valor_pago') is distinct from (l.dados_depois ->> 'valor_pago') then 'pagamento'
             else l.acao
           end as evento
      from public.logs_operacoes l
     where l.empresa_id = p_empresa
       and l.created_at > now() - interval '14 days'
       and l.user_id is distinct from v_uid                      -- só o que os OUTROS fizeram
       and l.tabela in ('pedidos', 'solicitacoes_orcamento', 'clientes', 'produtos', 'insumos',
                        'contas_pagar', 'contas_receber', 'compras', 'despesas_recorrentes', 'pessoas_equipe')
       and (v_admin or l.tabela in ('pedidos', 'solicitacoes_orcamento', 'clientes', 'produtos', 'insumos'))
       and not (l.tabela = 'solicitacoes_orcamento' and l.acao <> 'insert')
  ),
  -- Várias edições seguidas do mesmo registro viram uma só notificação (por hora)
  agrupado as (
    select distinct on (tabela, registro_id, user_id, evento, date_trunc('hour', created_at)) *
      from base
     order by tabela, registro_id, user_id, evento, date_trunc('hour', created_at), created_at desc
  ),
  ultimos as (select * from agrupado order by created_at desc limit 40)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'quando', u.created_at,
    'nova', v_vista is null or u.created_at > v_vista,
    'autor', case when u.user_id is null then case when u.tabela = 'solicitacoes_orcamento' then 'Site' else 'Sistema' end else coalesce(nullif(split_part(btrim(p.nome), ' ', 1), ''), 'Equipe') end,
    'tabela', u.tabela,
    'evento', u.evento,
    'texto', case u.tabela
      when 'pedidos' then case u.evento
        when 'insert' then 'cadastrou o pedido #' || (u.d ->> 'numero')
        when 'status' then 'mudou o pedido #' || (u.d ->> 'numero') || ' para ' || private.rotulo_status_pedido(u.d ->> 'status')
        when 'pagamento' then 'registrou pagamento no pedido #' || (u.d ->> 'numero')
        when 'delete' then 'excluiu o orçamento #' || (u.d ->> 'numero')
        else 'alterou o pedido #' || (u.d ->> 'numero') end
      when 'solicitacoes_orcamento' then 'recebeu a solicitação de orçamento #' || (u.d ->> 'protocolo') || ' de ' || (u.d ->> 'nome')
      when 'clientes' then case u.acao when 'insert' then 'cadastrou o cliente ' when 'delete' then 'excluiu o cliente ' else 'alterou o cliente ' end || (u.d ->> 'nome')
      when 'produtos' then case u.acao when 'insert' then 'cadastrou o produto ' when 'delete' then 'excluiu o produto ' else 'alterou o produto ' end || (u.d ->> 'nome')
      when 'insumos' then case u.acao when 'insert' then 'cadastrou no estoque: ' when 'delete' then 'excluiu do estoque: ' else 'alterou no estoque: ' end || (u.d ->> 'nome')
      when 'contas_pagar' then case u.acao when 'insert' then 'lançou conta a pagar: ' else 'alterou conta a pagar: ' end || (u.d ->> 'descricao')
      when 'contas_receber' then case u.acao when 'insert' then 'lançou conta a receber: ' else 'alterou conta a receber: ' end || (u.d ->> 'descricao')
      when 'compras' then case u.acao when 'insert' then 'registrou uma compra' else 'alterou uma compra' end
      when 'despesas_recorrentes' then case u.acao when 'insert' then 'criou a despesa fixa: ' else 'alterou a despesa fixa: ' end || (u.d ->> 'descricao')
      when 'pessoas_equipe' then case u.acao when 'insert' then 'cadastrou ' || (u.d ->> 'nome') || ' na equipe' when 'delete' then 'removeu ' || (u.d ->> 'nome') || ' da equipe' else 'alterou o cadastro de ' || (u.d ->> 'nome') end
      else u.acao || ' em ' || u.tabela end,
    'detalhe', case
      when u.tabela = 'pedidos' and u.evento = 'pagamento'
        then 'R$ ' || to_char(coalesce((u.d ->> 'valor_pago')::numeric, 0) - coalesce((u.a ->> 'valor_pago')::numeric, 0), 'FM999G999G990D00')
      when u.tabela = 'pedidos' and u.d ? 'total' then 'Total R$ ' || to_char((u.d ->> 'total')::numeric, 'FM999G999G990D00')
      when u.tabela in ('contas_pagar', 'contas_receber') and u.d ? 'valor' then 'R$ ' || to_char((u.d ->> 'valor')::numeric, 'FM999G999G990D00')
      else null end,
    'rota', case u.tabela
      when 'pedidos' then '/pedidos' when 'solicitacoes_orcamento' then '/pedidos'
      when 'clientes' then '/clientes' || case when u.acao <> 'delete' then '?id=' || u.registro_id else '' end
      when 'produtos' then '/produtos' when 'insumos' then '/estoque'
      when 'pessoas_equipe' then '/equipe' else '/financeiro' end
  ) order by u.created_at desc), '[]'::jsonb)
    into v_res
    from ultimos u
    left join public.profiles p on p.id = u.user_id;

  return v_res;
end $$;

create or replace function public.marcar_atividade_vista()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set atividade_vista_em = now() where id = (select auth.uid());
$$;

revoke execute on function public.atividade_equipe(uuid), public.marcar_atividade_vista() from public, anon;
grant execute on function public.atividade_equipe(uuid), public.marcar_atividade_vista() to authenticated;
