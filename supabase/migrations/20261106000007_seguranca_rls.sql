-- =====================================================================
-- 0007 · SEGURANÇA: RLS, PERMISSÕES, AUDITORIA, STORAGE E ÍNDICES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabelas de cadastro padrão: membros leem/criam/editam; gestores excluem
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clientes', 'fornecedores', 'categorias_insumos', 'insumos', 'compras', 'compra_itens',
    'categorias_produtos', 'fichas_tecnicas', 'ficha_tecnica_itens', 'produtos', 'variacoes_produtos',
    'opcoes_personalizacao', 'produtos_opcoes', 'produtos_imagens',
    'formas_pagamento', 'categorias_financeiras', 'pedidos', 'pedido_itens', 'pedido_personalizacoes',
    'contas_receber', 'contas_pagar', 'despesas_recorrentes',
    'programas_fidelidade', 'fidelidade_participantes', 'recompensas', 'resgates',
    'site_banners', 'produtos_publicacoes', 'blog_categorias', 'blog_tags', 'blog_artigos',
    'blog_receita_ingredientes', 'blog_artigos_tags', 'blog_artigos_produtos', 'blog_imagens',
    'galeria_trabalhos', 'depoimentos_clientes', 'seo_configuracoes',
    'solicitacoes_orcamento', 'solicitacoes_orcamento_itens']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "membros consultam" on public.%I for select to authenticated using (private.is_membro(empresa_id))', t);
    execute format('create policy "membros cadastram" on public.%I for insert to authenticated with check (private.is_membro(empresa_id))', t);
    execute format('create policy "membros editam" on public.%I for update to authenticated using (private.is_membro(empresa_id)) with check (private.is_membro(empresa_id))', t);
    execute format('create policy "gestores excluem" on public.%I for delete to authenticated using (private.is_gestor(empresa_id))', t);
    execute format('create index if not exists %I on public.%I (empresa_id)', t || '_empresa_idx', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
  end loop;
end $$;

-- Tabelas de histórico / saldos controlados: somente leitura via API
do $$
declare t text;
begin
  foreach t in array array[
    'insumos_custos_historico', 'lotes_insumos', 'movimentacoes_estoque', 'fichas_custos_historico',
    'pedido_status_historico', 'pagamentos', 'lancamentos_financeiros', 'fidelidade_movimentacoes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "membros consultam" on public.%I for select to authenticated using (private.is_membro(empresa_id))', t);
    execute format('create index if not exists %I on public.%I (empresa_id)', t || '_empresa_idx', t);
  end loop;
end $$;

-- Lotes: dados descritivos (código, validade) podem ser corrigidos
create policy "membros editam" on public.lotes_insumos for update to authenticated
  using (private.is_membro(empresa_id)) with check (private.is_membro(empresa_id));
create trigger set_updated_at before update on public.lotes_insumos for each row execute function private.set_updated_at();

-- Configurações do site
alter table public.site_configuracoes enable row level security;
create policy "membros consultam" on public.site_configuracoes for select to authenticated using (private.is_membro(empresa_id));
create policy "gestores editam" on public.site_configuracoes for update to authenticated
  using (private.is_gestor(empresa_id)) with check (private.is_gestor(empresa_id));
create trigger set_updated_at before update on public.site_configuracoes for each row execute function private.set_updated_at();

-- Categorias financeiras de sistema não podem ser excluídas
create or replace function private.proteger_categoria_sistema()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.sistema and coalesce(current_setting('app.excluir_empresa', true), '') <> 'on' then
    raise exception 'Categorias do sistema não podem ser excluídas; desative-as se necessário.' using errcode = 'P0001';
  end if;
  return old;
end $$;
create trigger proteger_sistema before delete on public.categorias_financeiras
  for each row execute function private.proteger_categoria_sistema();

-- Pedidos só podem ser excluídos enquanto orçamento (sem pagamentos)
create or replace function private.proteger_exclusao_pedido()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.excluir_empresa', true), '') = 'on' then return old; end if;
  if old.status not in ('orcamento', 'aguardando_confirmacao') then
    raise exception 'Somente orçamentos podem ser excluídos. Pedidos confirmados devem ser cancelados.' using errcode = 'P0001';
  end if;
  return old;
end $$;
create trigger proteger_exclusao before delete on public.pedidos
  for each row execute function private.proteger_exclusao_pedido();

-- Contas com baixa não podem ser excluídas
create or replace function private.proteger_exclusao_conta()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.excluir_empresa', true), '') = 'on' then return old; end if;
  if old.status <> 'aberta' then
    raise exception 'Contas com baixas não podem ser excluídas; cancele-as com estorno.' using errcode = 'P0001';
  end if;
  return old;
end $$;
create trigger proteger_exclusao before delete on public.contas_pagar   for each row execute function private.proteger_exclusao_conta();
create trigger proteger_exclusao before delete on public.contas_receber for each row execute function private.proteger_exclusao_conta();

-- Exclusão segura de empresa (libera as travas de histórico)
create or replace function public.excluir_empresa(p_empresa uuid, p_confirmacao text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.tem_papel(p_empresa, array['proprietario']::public.papel_usuario[]) then
    raise exception 'Apenas o proprietário pode excluir a empresa.' using errcode = '42501';
  end if;
  if p_confirmacao is distinct from (select slug from public.empresas where id = p_empresa) then
    raise exception 'Confirmação inválida: digite o identificador da empresa.';
  end if;
  perform set_config('app.excluir_empresa', 'on', true);
  delete from public.empresas where id = p_empresa;
end $$;

-- ---------------------------------------------------------------------
-- Leitura pública (site) — somente conteúdo publicado e ativo
-- ---------------------------------------------------------------------
create policy "publico ve empresas com site" on public.empresas for select to anon
  using (private.site_publicado(id));
create policy "publico ve site publicado" on public.site_configuracoes for select to anon
  using (publicado);
create policy "publico ve banners vigentes" on public.site_banners for select to anon
  using (ativo and (data_inicio is null or data_inicio <= now()) and (data_fim is null or data_fim >= now())
         and private.site_publicado(empresa_id));
create policy "publico ve categorias" on public.categorias_produtos for select to anon
  using (ativo and private.site_publicado(empresa_id));
create policy "publico ve produtos da vitrine" on public.produtos for select to anon
  using (private.produto_na_vitrine(id));
create policy "publico ve publicacoes" on public.produtos_publicacoes for select to anon
  using (private.produto_na_vitrine(produto_id));
create policy "publico ve variacoes" on public.variacoes_produtos for select to anon
  using (ativo and private.produto_na_vitrine(produto_id));
create policy "publico ve imagens" on public.produtos_imagens for select to anon
  using (private.produto_na_vitrine(produto_id));
create policy "publico ve opcoes do produto" on public.produtos_opcoes for select to anon
  using (private.produto_na_vitrine(produto_id));
create policy "publico ve opcoes ativas" on public.opcoes_personalizacao for select to anon
  using (ativo and private.site_publicado(empresa_id));
create policy "publico ve categorias do blog" on public.blog_categorias for select to anon
  using (ativo and private.site_publicado(empresa_id));
create policy "publico ve tags" on public.blog_tags for select to anon
  using (private.site_publicado(empresa_id));
create policy "publico ve artigos publicados" on public.blog_artigos for select to anon
  using (status in ('publicado', 'agendado') and publicado_em <= now() and private.site_publicado(empresa_id));
create policy "publico ve ingredientes" on public.blog_receita_ingredientes for select to anon
  using (private.artigo_publicado(artigo_id));
create policy "publico ve tags do artigo" on public.blog_artigos_tags for select to anon
  using (private.artigo_publicado(artigo_id));
create policy "publico ve produtos do artigo" on public.blog_artigos_produtos for select to anon
  using (private.artigo_publicado(artigo_id) and private.produto_na_vitrine(produto_id));
create policy "publico ve imagens do artigo" on public.blog_imagens for select to anon
  using (private.artigo_publicado(artigo_id));
create policy "publico ve galeria" on public.galeria_trabalhos for select to anon
  using (ativo and private.site_publicado(empresa_id));
create policy "publico ve depoimentos" on public.depoimentos_clientes for select to anon
  using (ativo and private.site_publicado(empresa_id));
create policy "publico ve seo" on public.seo_configuracoes for select to anon
  using (private.site_publicado(empresa_id));

-- ---------------------------------------------------------------------
-- Auditoria das tabelas relevantes
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clientes', 'fornecedores', 'insumos', 'compras', 'fichas_tecnicas', 'produtos', 'variacoes_produtos',
    'pedidos', 'pedido_itens', 'contas_receber', 'contas_pagar', 'despesas_recorrentes',
    'formas_pagamento', 'categorias_financeiras', 'programas_fidelidade', 'recompensas', 'resgates',
    'produtos_publicacoes', 'blog_artigos', 'site_banners', 'site_configuracoes', 'solicitacoes_orcamento']
  loop
    execute format('create trigger auditar after insert or update or delete on public.%I for each row execute function private.auditar()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Índices para todas as chaves estrangeiras ainda sem índice
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname,
           (select string_agg(quote_ident(a.attname), ', ' order by k.ord)
              from unnest(c.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols
      from pg_constraint c
     where c.contype = 'f' and c.connamespace = 'public'::regnamespace
       and not exists (
         select 1 from pg_index i
          where i.indrelid = c.conrelid
            and (string_to_array(i.indkey::text, ' ')::int2[])[1:array_length(c.conkey, 1)] = c.conkey
       )
  loop
    execute format('create index %I on %s (%s)', left(r.conname, 55) || '_idx', r.tbl, r.cols);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Storage: bucket público (imagens do site/produtos) e privado (referências de pedidos)
-- Caminho obrigatório: <empresa_id>/<pasta>/<arquivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('publico', 'publico', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('privado', 'privado', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'])
on conflict (id) do nothing;

create policy "membros leem arquivos da empresa" on storage.objects for select to authenticated
  using (bucket_id in ('publico', 'privado') and private.is_membro(private.uuid_seguro((storage.foldername(name))[1])));
create policy "membros enviam arquivos da empresa" on storage.objects for insert to authenticated
  with check (bucket_id in ('publico', 'privado') and private.is_membro(private.uuid_seguro((storage.foldername(name))[1])));
create policy "membros atualizam arquivos da empresa" on storage.objects for update to authenticated
  using (bucket_id in ('publico', 'privado') and private.is_membro(private.uuid_seguro((storage.foldername(name))[1])))
  with check (bucket_id in ('publico', 'privado') and private.is_membro(private.uuid_seguro((storage.foldername(name))[1])));
create policy "membros removem arquivos da empresa" on storage.objects for delete to authenticated
  using (bucket_id in ('publico', 'privado') and private.is_membro(private.uuid_seguro((storage.foldername(name))[1])));

-- ---------------------------------------------------------------------
-- Permissões de execução das funções públicas (RPC)
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.site_solicitar_orcamento(text, jsonb) to anon;
grant execute on function public.converter_unidade(numeric, text, text, numeric, numeric) to anon;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
grant execute on function private.site_publicado(uuid), private.produto_na_vitrine(uuid), private.artigo_publicado(uuid) to anon;
