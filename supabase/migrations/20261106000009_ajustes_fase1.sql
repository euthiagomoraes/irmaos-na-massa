-- =====================================================================
-- 0009 · AJUSTES APÓS TESTES DA FASE 1
-- 1) guard_conta: campos específicos por tabela avaliados separadamente
--    (PL/pgSQL não pode referenciar campo inexistente do NEW).
-- 2) Excluir ficha técnica: itens removidos em cascata não devem tentar
--    recalcular uma ficha que já não existe.
-- =====================================================================

create or replace function private.guard_conta()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_novo numeric; v_antigo numeric;
begin
  if coalesce(current_setting('app.baixa_financeira', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    if tg_table_name = 'contas_pagar' then
      new := jsonb_populate_record(new, '{"valor_pago": 0, "status": "aberta"}'::jsonb);
    else
      new := jsonb_populate_record(new, '{"valor_recebido": 0, "status": "aberta"}'::jsonb);
    end if;
    return new;
  end if;
  if tg_table_name = 'contas_pagar' then
    v_novo := (to_jsonb(new) ->> 'valor_pago')::numeric;  v_antigo := (to_jsonb(old) ->> 'valor_pago')::numeric;
  else
    v_novo := (to_jsonb(new) ->> 'valor_recebido')::numeric;  v_antigo := (to_jsonb(old) ->> 'valor_recebido')::numeric;
  end if;
  if v_novo is distinct from v_antigo or new.status is distinct from old.status then
    raise exception 'Baixas e status de contas só podem ser alterados pelas ações financeiras.' using errcode = 'P0001';
  end if;
  if old.status in ('quitada', 'cancelada') then
    raise exception 'Contas % não podem ser editadas.', old.status || 's' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function private.recalcular_ficha_por_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ficha uuid := coalesce(new.ficha_id, old.ficha_id);
begin
  if exists (select 1 from public.fichas_tecnicas where id = v_ficha) then
    perform public.recalcular_custo_ficha(v_ficha, 'itens alterados');
  end if;
  return null;
end $$;
