-- =====================================================================
-- 0006 · SITE PÚBLICO, VITRINE, BLOG E SOLICITAÇÕES DE ORÇAMENTO
-- Visitantes (anon) leem apenas conteúdo publicado/ativo.
-- =====================================================================

create table public.site_configuracoes (
  empresa_id             uuid primary key references public.empresas (id) on delete cascade,
  publicado              boolean not null default false,
  titulo                 text,
  slogan                 text,
  nossa_historia         text,
  imagem_historia_url    text,
  whatsapp               text,
  mensagem_whatsapp      text default 'Olá! Gostaria de fazer um orçamento.',
  instagram              text,
  facebook               text,
  tiktok                 text,
  email                  text,
  telefone               text,
  endereco               text,
  horario_funcionamento  text,
  mapa_url               text,
  dominio                text unique,
  updated_at             timestamptz not null default now()
);

create table public.site_banners (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas (id) on delete cascade,
  tipo         text not null default 'principal' check (tipo in ('principal', 'campanha', 'promocional')),
  titulo       text not null,
  descricao    text,
  imagem_url   text not null,
  imagem_mobile_url text,
  link         text,
  botao_texto  text,
  data_inicio  timestamptz,
  data_fim     timestamptz,
  ordem        int not null default 0,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (data_fim is null or data_inicio is null or data_fim > data_inicio)
);

-- Publicação de produtos na vitrine (vinculada ao cadastro original)
create table public.produtos_publicacoes (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  produto_id          uuid not null,
  status              text not null default 'rascunho' check (status in ('rascunho', 'agendado', 'publicado', 'despublicado')),
  publicar_em         timestamptz,
  destaque            boolean not null default false,
  ordem               int not null default 0,
  exibir_preco        boolean not null default true,
  titulo              text,       -- opcional; padrão = nome do produto
  descricao_curta     text,
  caracteristicas     text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (produto_id),
  foreign key (empresa_id, produto_id) references public.produtos (empresa_id, id) on delete cascade,
  check (status <> 'agendado' or publicar_em is not null)
);

create table public.blog_categorias (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  nome        text not null,
  slug        text not null check (slug ~ '^[a-z0-9-]+$'),
  descricao   text,
  ordem       int not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, slug)
);

create table public.blog_tags (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  nome        text not null,
  slug        text not null check (slug ~ '^[a-z0-9-]+$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, slug)
);

create table public.blog_artigos (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references public.empresas (id) on delete cascade,
  tipo               text not null default 'artigo' check (tipo in ('artigo', 'receita', 'dica')),
  titulo             text not null check (char_length(btrim(titulo)) between 3 and 200),
  subtitulo          text,
  slug               text not null check (slug ~ '^[a-z0-9-]+$'),
  capa_url           text,
  categoria_id       uuid,
  conteudo           jsonb,          -- documento do editor (JSON)
  conteudo_html      text,           -- HTML sanitizado para o site
  resumo             text,
  autor_id           uuid references auth.users (id) on delete set null,
  autor_nome         text,
  status             text not null default 'rascunho' check (status in ('rascunho', 'agendado', 'publicado', 'despublicado')),
  publicado_em       timestamptz,
  tempo_leitura_min  int check (tempo_leitura_min > 0),
  -- Campos específicos de receitas
  receita            jsonb,          -- {nome, tempo_preparo_min, tempo_forno_min, rendimento, dificuldade, modo_preparo[], dicas, imagem_resultado_url}
  destaque           boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, slug),
  foreign key (empresa_id, categoria_id) references public.blog_categorias (empresa_id, id) on delete set null (categoria_id),
  check (status not in ('agendado', 'publicado') or publicado_em is not null)
);
create index blog_artigos_publicados_idx on public.blog_artigos (empresa_id, publicado_em desc) where status in ('publicado', 'agendado');

create table public.blog_receita_ingredientes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  artigo_id       uuid not null,
  insumo_id       uuid,     -- vínculo informativo; NÃO movimenta estoque
  descricao       text not null,
  quantidade      numeric(12,3),
  unidade_codigo  text references public.unidades_medida (codigo),
  grupo           text,     -- ex.: massa, recheio
  ordem           int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (empresa_id, artigo_id) references public.blog_artigos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, insumo_id) references public.insumos (empresa_id, id) on delete set null (insumo_id)
);

create table public.blog_artigos_tags (
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  artigo_id   uuid not null,
  tag_id      uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (artigo_id, tag_id),
  foreign key (empresa_id, artigo_id) references public.blog_artigos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, tag_id) references public.blog_tags (empresa_id, id) on delete cascade
);

create table public.blog_artigos_produtos (
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  artigo_id   uuid not null,
  produto_id  uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (artigo_id, produto_id),
  foreign key (empresa_id, artigo_id) references public.blog_artigos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, produto_id) references public.produtos (empresa_id, id) on delete cascade
);

create table public.blog_imagens (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  artigo_id   uuid not null,
  url         text not null,
  legenda     text,
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (empresa_id, artigo_id) references public.blog_artigos (empresa_id, id) on delete cascade
);

create table public.galeria_trabalhos (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas (id) on delete cascade,
  titulo      text not null,
  descricao    text,
  imagem_url   text not null,
  produto_id   uuid,
  categoria    text,
  data_trabalho date,
  destaque     boolean not null default false,
  ordem        int not null default 0,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (empresa_id, produto_id) references public.produtos (empresa_id, id) on delete set null (produto_id)
);

create table public.depoimentos_clientes (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  cliente_id     uuid,
  nome_exibicao  text not null,
  texto          text not null check (char_length(texto) between 5 and 1000),
  nota           int check (nota between 1 and 5),
  foto_url       text,
  ordem          int not null default 0,
  ativo          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (empresa_id, cliente_id) references public.clientes (empresa_id, id) on delete set null (cliente_id)
);

create table public.seo_configuracoes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  entidade_tipo   text not null check (entidade_tipo in ('pagina', 'produto', 'artigo', 'categoria')),
  entidade_id     uuid,
  rota            text,     -- para páginas fixas: '/', '/nossa-historia'...
  titulo          text check (char_length(titulo) <= 70),
  descricao       text check (char_length(descricao) <= 170),
  palavras_chave  text[] not null default '{}',
  imagem_og_url   text,
  noindex         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (num_nonnulls(entidade_id, rota) = 1)
);
create unique index seo_entidade_unq on public.seo_configuracoes (empresa_id, entidade_tipo, coalesce(entidade_id::text, rota));

create type public.status_solicitacao as enum ('nova', 'em_atendimento', 'orcamento_enviado', 'convertida', 'nao_convertida', 'cancelada');

create table public.solicitacoes_orcamento (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  protocolo       bigint not null,
  nome            text not null check (char_length(btrim(nome)) between 2 and 150),
  telefone        text not null,
  email           text,
  data_evento     date,
  tipo_evento     text,
  quantidade_pessoas int check (quantidade_pessoas > 0),
  mensagem        text check (char_length(mensagem) <= 3000),
  referencia_url  text,
  status          public.status_solicitacao not null default 'nova',
  origem          text not null default 'site',
  cliente_id      uuid,
  pedido_id       uuid,
  atendido_por    uuid references auth.users (id) on delete set null,
  observacoes_internas text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, protocolo),
  foreign key (empresa_id, cliente_id) references public.clientes (empresa_id, id) on delete set null (cliente_id),
  foreign key (empresa_id, pedido_id) references public.pedidos (empresa_id, id) on delete set null (pedido_id)
);
create index solicitacoes_status_idx on public.solicitacoes_orcamento (empresa_id, status, created_at desc);

create table public.solicitacoes_orcamento_itens (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  solicitacao_id  uuid not null,
  produto_id      uuid,
  variacao_id     uuid,
  descricao       text,
  quantidade      numeric(12,2) not null default 1 check (quantidade > 0),
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (empresa_id, solicitacao_id) references public.solicitacoes_orcamento (empresa_id, id) on delete cascade,
  foreign key (empresa_id, produto_id) references public.produtos (empresa_id, id) on delete set null (produto_id),
  foreign key (empresa_id, variacao_id) references public.variacoes_produtos (empresa_id, id) on delete set null (variacao_id)
);

alter table public.pedidos
  add constraint pedidos_solicitacao_fk foreign key (empresa_id, solicitacao_id)
  references public.solicitacoes_orcamento (empresa_id, id) on delete set null (solicitacao_id);

-- ---------------------------------------------------------------------
-- Helpers de visibilidade pública (security definer evita recursão de RLS)
-- ---------------------------------------------------------------------
create or replace function private.site_publicado(p_empresa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select publicado from public.site_configuracoes where empresa_id = p_empresa), false)
$$;

create or replace function private.produto_na_vitrine(p_produto uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.produtos_publicacoes pp
    join public.produtos p on p.id = pp.produto_id
    where pp.produto_id = p_produto
      and p.ativo
      and (pp.status = 'publicado' or (pp.status = 'agendado' and pp.publicar_em <= now()))
      and private.site_publicado(p.empresa_id)
  )
$$;

create or replace function private.artigo_publicado(p_artigo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blog_artigos a
    where a.id = p_artigo and a.status in ('publicado', 'agendado') and a.publicado_em <= now()
      and private.site_publicado(a.empresa_id)
  )
$$;

-- Envio público de solicitação de orçamento (com limite anti-spam)
create or replace function public.site_solicitar_orcamento(p_empresa_slug text, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_emp uuid; v_id uuid; v_prot bigint; v_tel text; v_item jsonb; v_prod uuid;
begin
  select e.id into v_emp from public.empresas e
   where e.slug = p_empresa_slug and private.site_publicado(e.id);
  if v_emp is null then raise exception 'Confeitaria não encontrada.'; end if;

  v_tel := private.somente_digitos(p_dados ->> 'telefone');
  if coalesce(char_length(btrim(p_dados ->> 'nome')), 0) < 2 then raise exception 'Informe seu nome.'; end if;
  if v_tel is null or char_length(v_tel) not between 10 and 13 then raise exception 'Informe um telefone/WhatsApp válido com DDD.'; end if;
  if (select count(*) from public.solicitacoes_orcamento
       where empresa_id = v_emp and telefone = v_tel and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Recebemos várias solicitações deste número. Aguarde um pouco ou fale conosco pelo WhatsApp.';
  end if;

  v_prot := private.proximo_numero(v_emp, 'solicitacao');
  insert into public.solicitacoes_orcamento (empresa_id, protocolo, nome, telefone, email, data_evento, tipo_evento,
                                             quantidade_pessoas, mensagem, referencia_url, origem)
  values (v_emp, v_prot, left(btrim(p_dados ->> 'nome'), 150), v_tel,
          nullif(lower(btrim(coalesce(p_dados ->> 'email', ''))), ''),
          nullif(p_dados ->> 'data_evento', '')::date,
          left(nullif(p_dados ->> 'tipo_evento', ''), 80),
          nullif(p_dados ->> 'quantidade_pessoas', '')::int,
          left(p_dados ->> 'mensagem', 3000),
          left(nullif(p_dados ->> 'referencia_url', ''), 500),
          'site')
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_dados -> 'itens', '[]'::jsonb)) limit 20 loop
    v_prod := private.uuid_seguro(v_item ->> 'produto_id');
    if v_prod is not null and not private.produto_na_vitrine(v_prod) then v_prod := null; end if;
    insert into public.solicitacoes_orcamento_itens (empresa_id, solicitacao_id, produto_id, descricao, quantidade, observacoes)
    values (v_emp, v_id, v_prod, left(v_item ->> 'descricao', 200),
            greatest(coalesce(nullif(v_item ->> 'quantidade', '')::numeric, 1), 1),
            left(v_item ->> 'observacoes', 500));
  end loop;

  return jsonb_build_object('protocolo', v_prot);
end $$;
