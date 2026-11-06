import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Cake, ExternalLink, Image as ImageIcon, ImagePlus, LayoutTemplate, MessageSquareQuote, Newspaper, Pencil, Plus, Settings2, Star, Store, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { enviarImagem, exigir, supabase, type Tabela } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useClientesBasico, useInvalidar, useProdutos } from '@/lib/consultas'
import { Badge, Button, Campo, Card, Carregando, EstadoErro, EstadoVazio, Input, Select, Textarea } from '@/components/ui'
import { Abas, CabecalhoPagina, Interruptor, Modal } from '@/components/ui/estrutura'
import { cn, mensagemErro } from '@/lib/utils'
import { Blog } from './Blog'

type Aba = 'config' | 'vitrine' | 'banners' | 'blog' | 'galeria' | 'depoimentos'

export function SitePage() {
  const empresa = useEmpresa()
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'config'
  const url = `${location.origin}/site/${empresa.slug}`
  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Site e vitrine" descricao="Tudo o que aparece no site público da confeitaria é administrado aqui."
        acoes={<a href={url} target="_blank" rel="noreferrer"><Button variante="contorno"><ExternalLink className="size-4" />Ver o site</Button></a>} />
      <Abas ativa={aba} onChange={(a) => setParams(a === 'config' ? {} : { aba: a }, { replace: true })} abas={[
        { id: 'config', rotulo: 'Configuração', icone: <Settings2 className="size-4" /> },
        { id: 'vitrine', rotulo: 'Vitrine', icone: <Store className="size-4" /> },
        { id: 'banners', rotulo: 'Banners', icone: <LayoutTemplate className="size-4" /> },
        { id: 'blog', rotulo: 'Blog e receitas', icone: <Newspaper className="size-4" /> },
        { id: 'galeria', rotulo: 'Galeria', icone: <ImageIcon className="size-4" /> },
        { id: 'depoimentos', rotulo: 'Depoimentos', icone: <MessageSquareQuote className="size-4" /> },
      ]} />
      {aba === 'config' && <Configuracao url={url} />}
      {aba === 'vitrine' && <Vitrine />}
      {aba === 'banners' && <Banners />}
      {aba === 'blog' && <Blog />}
      {aba === 'galeria' && <Galeria />}
      {aba === 'depoimentos' && <Depoimentos />}
    </div>
  )
}

/** Botão de envio de imagem reutilizável. */
export function EnvioImagem({ url, pasta, onEnviada, rotulo = 'Enviar imagem', className }: { url?: string | null; pasta: string; onEnviada: (url: string | null) => void; rotulo?: string; className?: string }) {
  const empresa = useEmpresa()
  const ref = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const enviar = async (f: File) => {
    setEnviando(true)
    try { onEnviada(await enviarImagem(empresa.id, pasta, f)) } catch (e) { toast.error(mensagemErro(e)) } finally { setEnviando(false) }
  }
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="size-20 shrink-0 overflow-hidden rounded-xl border border-borda bg-rosa-50">
        {url ? <img src={url} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-rosa-300"><ImageIcon className="size-7" /></div>}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviar(f); e.target.value = '' }} />
      <div className="flex flex-col gap-1">
        <Button variante="contorno" tamanho="sm" carregando={enviando} onClick={() => ref.current?.click()}><ImagePlus className="size-4" />{url ? 'Trocar' : rotulo}</Button>
        {url && <button type="button" className="text-left text-[12px] text-erro hover:underline" onClick={() => onEnviada(null)}>Remover</button>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Configuração */
function Configuracao({ url }: { url: string }) {
  const empresa = useEmpresa()
  const { ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const { data: cfg, isLoading, error } = useQuery({
    queryKey: ['site', empresa.id, 'config'],
    queryFn: async () => exigir(await supabase.from('site_configuracoes').select('*').eq('empresa_id', empresa.id).single()),
  })
  const atualizar = async (campos: Partial<Tabela<'site_configuracoes'>>) => {
    const { error: e } = await supabase.from('site_configuracoes').update(campos).eq('empresa_id', empresa.id)
    if (e) return void toast.error(mensagemErro(e))
    await invalidar('site')
  }
  if (isLoading) return <Carregando />
  if (error || !cfg) return <EstadoErro mensagem={mensagemErro(error)} />
  const campo = (k: keyof typeof cfg, rotulo: string, opts: { area?: boolean; dica?: ReactNode; classe?: string; placeholder?: string } = {}) => (
    <Campo rotulo={rotulo} htmlFor={`sc-${k}`} dica={opts.dica} className={opts.classe}>
      {opts.area ? (
        <Textarea id={`sc-${k}`} className="min-h-24" defaultValue={(cfg[k] as string) ?? ''} placeholder={opts.placeholder} onBlur={(e) => e.target.value !== (cfg[k] ?? '') && void atualizar({ [k]: e.target.value || null })} />
      ) : (
        <Input id={`sc-${k}`} defaultValue={(cfg[k] as string) ?? ''} placeholder={opts.placeholder} onBlur={(e) => e.target.value !== (cfg[k] ?? '') && void atualizar({ [k]: e.target.value || null })} />
      )}
    </Campo>
  )
  return (
    <fieldset disabled={!ehGestor} className="space-y-5">
      {!ehGestor && <p className="rounded-xl bg-alerta-fundo px-4 py-2.5 text-[13px] text-alerta">Somente gestores podem alterar o site.</p>}
      <Card className={cn('flex flex-wrap items-center gap-4 p-5', cfg.publicado ? 'border-sucesso/30 bg-sucesso-fundo/40' : '')}>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[17px] font-semibold">{cfg.publicado ? 'Site publicado' : 'Site em rascunho'}</p>
          <p className="text-[13px] text-texto-suave">{cfg.publicado ? <>Visível em <a className="font-semibold text-cacau-600 hover:underline" href={url} target="_blank" rel="noreferrer">{url}</a></> : 'Só você e sua equipe conseguem ver enquanto não publicar.'}</p>
        </div>
        <Button variante={cfg.publicado ? 'contorno' : 'primario'} onClick={() => void atualizar({ publicado: !cfg.publicado })}>{cfg.publicado ? 'Despublicar' : 'Publicar site'}</Button>
      </Card>
      <Card className="grid gap-4 p-5 md:grid-cols-2">
        {campo('titulo', 'Título do site')}
        {campo('slogan', 'Slogan', { placeholder: 'Doces que abraçam' })}
        {campo('nossa_historia', 'Nossa história', { area: true, classe: 'md:col-span-2' })}
        <Campo rotulo="Foto da nossa história" className="md:col-span-2"><EnvioImagem url={cfg.imagem_historia_url} pasta="site" onEnviada={(u) => void atualizar({ imagem_historia_url: u })} /></Campo>
      </Card>
      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <p className="font-display text-[15px] font-semibold md:col-span-2">Contato e redes</p>
        {campo('whatsapp', 'WhatsApp', { placeholder: '11988887777' })}
        {campo('mensagem_whatsapp', 'Mensagem inicial do WhatsApp')}
        {campo('instagram', 'Instagram', { placeholder: '@irmaosnamassa' })}
        {campo('facebook', 'Facebook')}
        {campo('tiktok', 'TikTok')}
        {campo('email', 'E-mail')}
        {campo('telefone', 'Telefone')}
        {campo('horario_funcionamento', 'Horário de funcionamento', { placeholder: 'Ter a sáb, 9h às 18h' })}
        {campo('endereco', 'Endereço', { classe: 'md:col-span-2' })}
        {campo('mapa_url', 'Link do mapa (Google Maps)', { classe: 'md:col-span-2' })}
      </Card>
    </fieldset>
  )
}

/* ------------------------------------------------------------ Vitrine */
function Vitrine() {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: produtos = [], isLoading } = useProdutos()
  const pubs = useQuery({
    queryKey: ['site', empresa.id, 'publicacoes'],
    queryFn: async () => exigir(await supabase.from('produtos_publicacoes').select('*').eq('empresa_id', empresa.id)),
  })
  const pubDe = (id: string) => (pubs.data ?? []).find((p) => p.produto_id === id)
  const salvar = async (produtoId: string, campos: Partial<Tabela<'produtos_publicacoes'>>) => {
    const atual = pubDe(produtoId)
    const r = atual ? await supabase.from('produtos_publicacoes').update(campos).eq('id', atual.id)
      : await supabase.from('produtos_publicacoes').insert({ empresa_id: empresa.id, produto_id: produtoId, ...campos })
    if (r.error) return void toast.error(mensagemErro(r.error))
    await invalidar('site')
  }
  if (isLoading || pubs.isLoading) return <Carregando />
  const ativos = produtos.filter((p) => p.ativo)
  if (!ativos.length) return <Card><EstadoVazio icone={<Cake className="size-6" />} titulo="Cadastre produtos primeiro" descricao="Os produtos do cardápio podem ser publicados aqui." /></Card>
  return (
    <Card className="overflow-hidden">
      <p className="border-b border-borda px-5 py-3 text-[13px] text-texto-suave">Escolha o que aparece na vitrine. Produtos sem foto ficam menos atraentes, então vale enviar uma no cadastro do produto.</p>
      <ul className="divide-y divide-borda/70">
        {ativos.map((p) => {
          const pub = pubDe(p.id)
          const publicado = pub?.status === 'publicado'
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-rosa-50">{p.foto_url ? <img src={p.foto_url} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-rosa-300"><Cake className="size-5" /></div>}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-choco-800">{p.nome}</p>
                <Input aria-label="Descrição curta" placeholder="Descrição curta para a vitrine" defaultValue={pub?.descricao_curta ?? ''} className="mt-1 h-8 text-[12.5px]"
                  onBlur={(e) => e.target.value !== (pub?.descricao_curta ?? '') && void salvar(p.id, { descricao_curta: e.target.value || null })} />
              </div>
              <label className="flex items-center gap-1.5 text-[12.5px]"><input type="checkbox" className="accent-cacau-600" checked={pub?.exibir_preco ?? true} onChange={(e) => void salvar(p.id, { exibir_preco: e.target.checked })} />Preço</label>
              <button type="button" aria-pressed={pub?.destaque ?? false} title="Destaque" onClick={() => void salvar(p.id, { destaque: !(pub?.destaque ?? false) })}
                className={cn('grid size-8 place-items-center rounded-full', pub?.destaque ? 'bg-dourado-100 text-dourado-700' : 'text-cinza hover:bg-creme')}><Star className={cn('size-4', pub?.destaque && 'fill-current')} /></button>
              <Button tamanho="sm" variante={publicado ? 'contorno' : 'secundario'} onClick={() => void salvar(p.id, { status: publicado ? 'despublicado' : 'publicado' })}>{publicado ? 'Remover' : 'Publicar'}</Button>
              {publicado && <Badge tom="sucesso">No site</Badge>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ------------------------------------------------------------ Banners, galeria e depoimentos (CRUD genérico) */
function useLista<T extends 'site_banners' | 'galeria_trabalhos' | 'depoimentos_clientes'>(tabela: T) {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['site', empresa.id, tabela],
    queryFn: async () => exigir(await supabase.from(tabela as 'site_banners').select('*').eq('empresa_id', empresa.id).order('ordem').order('created_at', { ascending: false })) as unknown as Tabela<T>[],
  })
}

function Banners() {
  const { data = [], isLoading } = useLista('site_banners')
  const [editando, setEditando] = useState<Tabela<'site_banners'> | null | undefined>(undefined)
  return (
    <ListaVisual carregando={isLoading} vazio="Nenhum banner" onNovo={() => setEditando(null)} itens={data.map((b) => ({
      id: b.id, imagem: b.imagem_url, titulo: b.titulo, sub: [b.tipo, !b.ativo && 'inativo'].filter(Boolean).join(' · '), onEditar: () => setEditando(b),
    }))} tabela="site_banners">
      <FormularioBanner item={editando} onFechar={() => setEditando(undefined)} />
    </ListaVisual>
  )
}

function Galeria() {
  const { data = [], isLoading } = useLista('galeria_trabalhos')
  const [editando, setEditando] = useState<Tabela<'galeria_trabalhos'> | null | undefined>(undefined)
  return (
    <ListaVisual carregando={isLoading} vazio="Galeria vazia" onNovo={() => setEditando(null)} itens={data.map((g) => ({
      id: g.id, imagem: g.imagem_url, titulo: g.titulo, sub: [g.categoria, g.destaque && 'destaque', !g.ativo && 'oculto'].filter(Boolean).join(' · '), onEditar: () => setEditando(g),
    }))} tabela="galeria_trabalhos">
      <FormularioGaleria item={editando} onFechar={() => setEditando(undefined)} />
    </ListaVisual>
  )
}

function Depoimentos() {
  const { data = [], isLoading } = useLista('depoimentos_clientes')
  const [editando, setEditando] = useState<Tabela<'depoimentos_clientes'> | null | undefined>(undefined)
  return (
    <ListaVisual carregando={isLoading} vazio="Nenhum depoimento" onNovo={() => setEditando(null)} itens={data.map((d) => ({
      id: d.id, imagem: d.foto_url, titulo: d.nome_exibicao, sub: `${d.nota ? '★'.repeat(d.nota) + ' · ' : ''}${d.texto.slice(0, 80)}${!d.ativo ? ' · oculto' : ''}`, onEditar: () => setEditando(d),
    }))} tabela="depoimentos_clientes">
      <FormularioDepoimento item={editando} onFechar={() => setEditando(undefined)} />
    </ListaVisual>
  )
}

function ListaVisual({ carregando, vazio, onNovo, itens, tabela, children }: {
  carregando: boolean; vazio: string; onNovo: () => void; tabela: string; children: ReactNode
  itens: { id: string; imagem: string | null; titulo: string; sub: string; onEditar: () => void }[]
}) {
  const invalidar = useInvalidar()
  const { ehGestor } = useAuth()
  const excluir = async (id: string) => {
    if (!window.confirm('Excluir este item?')) return
    const { error } = await supabase.from(tabela as 'site_banners').delete().eq('id', id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('site')
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={onNovo}><Plus className="size-4" />Adicionar</Button></div>
      {carregando ? <Carregando /> : itens.length === 0 ? <Card><EstadoVazio icone={<ImageIcon className="size-6" />} titulo={vazio} /></Card> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map((i) => (
            <li key={i.id}>
              <Card className="overflow-hidden">
                <div className="aspect-[16/9] bg-rosa-50">{i.imagem ? <img src={i.imagem} alt="" className="size-full object-cover" loading="lazy" /> : <div className="grid size-full place-items-center text-rosa-300"><ImageIcon className="size-8" /></div>}</div>
                <div className="flex items-start gap-2 p-3.5">
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold text-choco-800">{i.titulo}</p><p className="line-clamp-2 text-[12px] text-texto-suave">{i.sub}</p></div>
                  <Button variante="fantasma" tamanho="icone" className="size-8" aria-label="Editar" onClick={i.onEditar}><Pencil className="size-3.5" /></Button>
                  {ehGestor && <Button variante="fantasma" tamanho="icone" className="size-8 text-erro" aria-label="Excluir" onClick={() => void excluir(i.id)}><Trash2 className="size-3.5" /></Button>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  )
}

function useFormulario<T extends object>(item: T | null | undefined, inicial: (i: T | null) => Record<string, unknown>) {
  const [v, setV] = useState<Record<string, unknown>>({})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (item !== undefined) setV(inicial(item)) }, [item])
  return [v, (k: string, val: unknown) => setV((s) => ({ ...s, [k]: val }))] as const
}

function FormularioBanner({ item, onFechar }: { item: Tabela<'site_banners'> | null | undefined; onFechar: () => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const [v, set] = useFormulario(item, (i) => ({
    titulo: i?.titulo ?? '', descricao: i?.descricao ?? '', imagem_url: i?.imagem_url ?? null, link: i?.link ?? '', botao_texto: i?.botao_texto ?? '',
    tipo: i?.tipo ?? 'principal', ordem: String(i?.ordem ?? 0), ativo: i?.ativo ?? true,
  }))
  const valido = String(v.titulo ?? '').trim().length >= 2 && !!v.imagem_url
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    const dados = { titulo: String(v.titulo).trim(), descricao: String(v.descricao || '') || null, imagem_url: String(v.imagem_url), link: String(v.link || '') || null,
      botao_texto: String(v.botao_texto || '') || null, tipo: String(v.tipo), ordem: Number(v.ordem) || 0, ativo: !!v.ativo }
    const r = item ? await supabase.from('site_banners').update(dados).eq('id', item.id) : await supabase.from('site_banners').insert({ ...dados, empresa_id: empresa.id })
    if (r.error) return void toast.error(mensagemErro(r.error))
    await invalidar('site'); onFechar()
  }
  return (
    <Modal aberto={item !== undefined} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={item ? 'Editar banner' : 'Novo banner'} largura="max-w-lg" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" disabled={!valido}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Imagem (1600×700 recomendado)" className="sm:col-span-2"><EnvioImagem url={v.imagem_url as string | null} pasta="banners" onEnviada={(u) => set('imagem_url', u)} /></Campo>
        <Campo rotulo="Título" htmlFor="bn-t" obrigatorio className="sm:col-span-2"><Input id="bn-t" value={String(v.titulo ?? '')} onChange={(e) => set('titulo', e.target.value)} /></Campo>
        <Campo rotulo="Texto" htmlFor="bn-d" className="sm:col-span-2"><Input id="bn-d" value={String(v.descricao ?? '')} onChange={(e) => set('descricao', e.target.value)} /></Campo>
        <Campo rotulo="Texto do botão" htmlFor="bn-b"><Input id="bn-b" value={String(v.botao_texto ?? '')} onChange={(e) => set('botao_texto', e.target.value)} placeholder="Peça já" /></Campo>
        <Campo rotulo="Link do botão" htmlFor="bn-l"><Input id="bn-l" value={String(v.link ?? '')} onChange={(e) => set('link', e.target.value)} placeholder="#orcamento" /></Campo>
        <Campo rotulo="Tipo" htmlFor="bn-tp"><Select id="bn-tp" value={String(v.tipo)} onChange={(e) => set('tipo', e.target.value)}><option value="principal">Principal</option><option value="campanha">Campanha</option><option value="promocional">Promocional</option></Select></Campo>
        <Campo rotulo="Ordem" htmlFor="bn-o"><Input id="bn-o" inputMode="numeric" value={String(v.ordem ?? '0')} onChange={(e) => set('ordem', e.target.value)} /></Campo>
        <div className="sm:col-span-2"><Interruptor id="bn-a" marcado={!!v.ativo} onChange={(a) => set('ativo', a)} rotulo="Exibir no site" /></div>
      </div>
    </Modal>
  )
}

function FormularioGaleria({ item, onFechar }: { item: Tabela<'galeria_trabalhos'> | null | undefined; onFechar: () => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: produtos = [] } = useProdutos()
  const [v, set] = useFormulario(item, (i) => ({
    titulo: i?.titulo ?? '', descricao: i?.descricao ?? '', imagem_url: i?.imagem_url ?? null, categoria: i?.categoria ?? '', produto_id: i?.produto_id ?? '',
    data_trabalho: i?.data_trabalho ?? '', destaque: i?.destaque ?? false, ativo: i?.ativo ?? true,
  }))
  const valido = String(v.titulo ?? '').trim().length >= 2 && !!v.imagem_url
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    const dados = { titulo: String(v.titulo).trim(), descricao: String(v.descricao || '') || null, imagem_url: String(v.imagem_url), categoria: String(v.categoria || '') || null,
      produto_id: String(v.produto_id || '') || null, data_trabalho: String(v.data_trabalho || '') || null, destaque: !!v.destaque, ativo: !!v.ativo }
    const r = item ? await supabase.from('galeria_trabalhos').update(dados).eq('id', item.id) : await supabase.from('galeria_trabalhos').insert({ ...dados, empresa_id: empresa.id })
    if (r.error) return void toast.error(mensagemErro(r.error))
    await invalidar('site'); onFechar()
  }
  return (
    <Modal aberto={item !== undefined} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={item ? 'Editar trabalho' : 'Novo trabalho na galeria'} largura="max-w-lg" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" disabled={!valido}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Foto" className="sm:col-span-2"><EnvioImagem url={v.imagem_url as string | null} pasta="galeria" onEnviada={(u) => set('imagem_url', u)} /></Campo>
        <Campo rotulo="Título" htmlFor="gl-t" obrigatorio className="sm:col-span-2"><Input id="gl-t" value={String(v.titulo ?? '')} onChange={(e) => set('titulo', e.target.value)} placeholder="Bolo Jardim Encantado" /></Campo>
        <Campo rotulo="Categoria" htmlFor="gl-c"><Input id="gl-c" value={String(v.categoria ?? '')} onChange={(e) => set('categoria', e.target.value)} placeholder="Aniversário infantil" /></Campo>
        <Campo rotulo="Data" htmlFor="gl-d"><Input id="gl-d" type="date" value={String(v.data_trabalho ?? '')} onChange={(e) => set('data_trabalho', e.target.value)} /></Campo>
        <Campo rotulo="Produto relacionado" htmlFor="gl-p" className="sm:col-span-2">
          <Select id="gl-p" value={String(v.produto_id ?? '')} onChange={(e) => set('produto_id', e.target.value)}>
            <option value="">Nenhum</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Descrição" htmlFor="gl-ds" className="sm:col-span-2"><Textarea id="gl-ds" className="min-h-14" value={String(v.descricao ?? '')} onChange={(e) => set('descricao', e.target.value)} /></Campo>
        <Interruptor id="gl-dst" marcado={!!v.destaque} onChange={(a) => set('destaque', a)} rotulo="Destaque" />
        <Interruptor id="gl-a" marcado={!!v.ativo} onChange={(a) => set('ativo', a)} rotulo="Exibir no site" />
      </div>
    </Modal>
  )
}

function FormularioDepoimento({ item, onFechar }: { item: Tabela<'depoimentos_clientes'> | null | undefined; onFechar: () => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: clientes = [] } = useClientesBasico()
  const [v, set] = useFormulario(item, (i) => ({
    nome_exibicao: i?.nome_exibicao ?? '', texto: i?.texto ?? '', nota: String(i?.nota ?? 5), foto_url: i?.foto_url ?? null, cliente_id: i?.cliente_id ?? '', ativo: i?.ativo ?? true,
  }))
  const valido = String(v.nome_exibicao ?? '').trim().length >= 2 && String(v.texto ?? '').trim().length >= 5
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    const dados = { nome_exibicao: String(v.nome_exibicao).trim(), texto: String(v.texto).trim(), nota: Number(v.nota) || null, foto_url: (v.foto_url as string | null) ?? null,
      cliente_id: String(v.cliente_id || '') || null, ativo: !!v.ativo }
    const r = item ? await supabase.from('depoimentos_clientes').update(dados).eq('id', item.id) : await supabase.from('depoimentos_clientes').insert({ ...dados, empresa_id: empresa.id })
    if (r.error) return void toast.error(mensagemErro(r.error))
    await invalidar('site'); onFechar()
  }
  return (
    <Modal aberto={item !== undefined} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={item ? 'Editar depoimento' : 'Novo depoimento'} largura="max-w-lg" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" disabled={!valido}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome exibido" htmlFor="dp-n" obrigatorio><Input id="dp-n" value={String(v.nome_exibicao ?? '')} onChange={(e) => set('nome_exibicao', e.target.value)} placeholder="Ana P." /></Campo>
        <Campo rotulo="Nota" htmlFor="dp-nt"><Select id="dp-nt" value={String(v.nota)} onChange={(e) => set('nota', e.target.value)}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</Select></Campo>
        <Campo rotulo="Depoimento" htmlFor="dp-t" obrigatorio className="sm:col-span-2"><Textarea id="dp-t" className="min-h-24" maxLength={1000} value={String(v.texto ?? '')} onChange={(e) => set('texto', e.target.value)} /></Campo>
        <Campo rotulo="Cliente (opcional)" htmlFor="dp-c" className="sm:col-span-2">
          <Select id="dp-c" value={String(v.cliente_id ?? '')} onChange={(e) => set('cliente_id', e.target.value)}><option value="">Não vincular</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select>
        </Campo>
        <Campo rotulo="Foto" className="sm:col-span-2"><EnvioImagem url={v.foto_url as string | null} pasta="depoimentos" onEnviada={(u) => set('foto_url', u)} /></Campo>
        <div className="sm:col-span-2"><Interruptor id="dp-a" marcado={!!v.ativo} onChange={(a) => set('ativo', a)} rotulo="Exibir no site" descricao="Publique apenas com autorização do cliente." /></div>
      </div>
    </Modal>
  )
}

