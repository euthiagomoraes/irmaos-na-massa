import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Newspaper, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase, type Tabela } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useInvalidar } from '@/lib/consultas'
import { Badge, Button, Campo, Card, Carregando, EstadoVazio, Input, Select, Textarea } from '@/components/ui'
import { Gaveta, Interruptor, LinhaClicavel, Pilulas } from '@/components/ui/estrutura'
import { mensagemErro, slugificar } from '@/lib/utils'
import { EnvioImagem } from './SitePage'

type Artigo = Tabela<'blog_artigos'>
export interface Receita { ingredientes?: string[]; modo_preparo?: string[]; tempo_preparo_min?: number | null; rendimento?: string; dificuldade?: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Markdown simples e seguro (escapa todo HTML): ## títulos, **negrito**, *itálico*, listas com "-" e parágrafos. */
export function markdownParaHtml(md: string) {
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
  return md.replace(/\r/g, '').split(/\n{2,}/).map((bloco) => {
    const b = bloco.trim()
    if (!b) return ''
    if (b.startsWith('### ')) return `<h3>${inline(b.slice(4))}</h3>`
    if (b.startsWith('## ')) return `<h2>${inline(b.slice(3))}</h2>`
    const linhas = b.split('\n')
    if (linhas.every((l) => /^[-*] /.test(l.trim()))) return `<ul>${linhas.map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join('')}</ul>`
    return `<p>${linhas.map(inline).join('<br>')}</p>`
  }).join('\n')
}

const rotuloStatus: Record<string, string> = { rascunho: 'Rascunho', publicado: 'Publicado', agendado: 'Agendado', despublicado: 'Despublicado' }
const tomStatus: Record<string, 'neutro' | 'sucesso' | 'dourado'> = { rascunho: 'neutro', publicado: 'sucesso', agendado: 'dourado', despublicado: 'neutro' }

export function Blog() {
  const empresa = useEmpresa()
  const [filtro, setFiltro] = useState<'todos' | 'artigo' | 'receita' | 'dica'>('todos')
  const [aberto, setAberto] = useState<Artigo | null | undefined>(undefined)
  const { data = [], isLoading } = useQuery({
    queryKey: ['site', empresa.id, 'blog'],
    queryFn: async () => exigir(await supabase.from('blog_artigos').select('*').eq('empresa_id', empresa.id).order('created_at', { ascending: false })),
  })
  const lista = data.filter((a) => filtro === 'todos' || a.tipo === filtro)
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <Pilulas ativa={filtro} onChange={setFiltro} opcoes={[
          { id: 'todos', rotulo: 'Todos', contagem: data.length }, { id: 'receita', rotulo: 'Receitas' }, { id: 'artigo', rotulo: 'Artigos' }, { id: 'dica', rotulo: 'Dicas' },
        ]} />
        <Button onClick={() => setAberto(null)}><Plus className="size-4" />Novo texto</Button>
      </Card>
      <Card className="overflow-hidden">
        {isLoading ? <Carregando /> : lista.length === 0 ? <EstadoVazio icone={<Newspaper className="size-6" />} titulo="Nenhum texto ainda" descricao="Receitas e dicas atraem visitantes do Google e das redes para o seu site." /> : (
          <ul className="divide-y divide-borda/70">
            {lista.map((a) => (
              <li key={a.id}>
                <LinhaClicavel onClick={() => setAberto(a)} className="flex items-center gap-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-rosa-50">{a.capa_url && <img src={a.capa_url} alt="" className="size-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-choco-800">{a.titulo}</p>
                    <p className="text-[12px] text-texto-suave capitalize">{a.tipo}{a.publicado_em && ` · ${format(new Date(a.publicado_em), 'dd/MM/yyyy')}`}{a.destaque && ' · destaque'}</p>
                  </div>
                  <Badge tom={tomStatus[a.status]}>{rotuloStatus[a.status]}</Badge>
                </LinhaClicavel>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <EditorArtigo artigo={aberto} onFechar={() => setAberto(undefined)} />
    </div>
  )
}

function EditorArtigo({ artigo, onFechar }: { artigo: Artigo | null | undefined; onFechar: () => void }) {
  const empresa = useEmpresa()
  const { perfil, ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const categorias = useQuery({
    queryKey: ['site', empresa.id, 'blog-categorias'],
    queryFn: async () => exigir(await supabase.from('blog_categorias').select('*').eq('empresa_id', empresa.id).eq('ativo', true).order('ordem')),
  })
  const [v, setV] = useState({ titulo: '', subtitulo: '', slug: '', tipo: 'receita', categoria: '', capa: null as string | null, resumo: '', texto: '', destaque: false,
    ingredientes: '', modo: '', tempo: '', rendimento: '', dificuldade: 'fácil', status: 'rascunho', publicar_em: '' })
  const [slugManual, setSlugManual] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (artigo === undefined) return
    const r = (artigo?.receita ?? {}) as Receita
    const doc = (artigo?.conteudo ?? {}) as { markdown?: string }
    setV({
      titulo: artigo?.titulo ?? '', subtitulo: artigo?.subtitulo ?? '', slug: artigo?.slug ?? '', tipo: artigo?.tipo ?? 'receita', categoria: artigo?.categoria_id ?? '',
      capa: artigo?.capa_url ?? null, resumo: artigo?.resumo ?? '', texto: doc.markdown ?? '', destaque: artigo?.destaque ?? false,
      ingredientes: (r.ingredientes ?? []).join('\n'), modo: (r.modo_preparo ?? []).join('\n'), tempo: r.tempo_preparo_min ? String(r.tempo_preparo_min) : '',
      rendimento: r.rendimento ?? '', dificuldade: r.dificuldade ?? 'fácil', status: artigo?.status ?? 'rascunho',
      publicar_em: artigo?.publicado_em ? format(new Date(artigo.publicado_em), "yyyy-MM-dd'T'HH:mm") : '',
    })
    setSlugManual(!!artigo)
  }, [artigo])

  const valido = v.titulo.trim().length >= 3 && (v.slug || slugificar(v.titulo)).length > 0 && (v.status !== 'agendado' || !!v.publicar_em)
  const salvar = async (status?: string) => {
    if (!valido) return
    setOcupado(true)
    const st = status ?? v.status
    const linhas = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)
    const palavras = `${v.texto} ${v.ingredientes} ${v.modo}`.split(/\s+/).filter(Boolean).length
    const dados = {
      titulo: v.titulo.trim(), subtitulo: v.subtitulo.trim() || null, slug: slugificar(v.slug || v.titulo), tipo: v.tipo, categoria_id: v.categoria || null,
      capa_url: v.capa, resumo: v.resumo.trim() || null, conteudo: { markdown: v.texto }, conteudo_html: markdownParaHtml(v.texto), destaque: v.destaque,
      receita: v.tipo === 'receita' ? { ingredientes: linhas(v.ingredientes), modo_preparo: linhas(v.modo), tempo_preparo_min: v.tempo ? Number(v.tempo) || null : null, rendimento: v.rendimento.trim(), dificuldade: v.dificuldade } : null,
      status: st, publicado_em: st === 'agendado' ? new Date(v.publicar_em).toISOString() : st === 'publicado' ? (artigo?.publicado_em ?? new Date().toISOString()) : artigo?.publicado_em ?? null,
      tempo_leitura_min: Math.max(1, Math.round(palavras / 200)), autor_nome: artigo?.autor_nome ?? perfil?.nome ?? null,
    }
    const r = artigo ? await supabase.from('blog_artigos').update(dados).eq('id', artigo.id)
      : await supabase.from('blog_artigos').insert({ ...dados, empresa_id: empresa.id, autor_id: perfil?.id ?? null })
    setOcupado(false)
    if (r.error) return void toast.error(r.error.code === '23505' ? 'Já existe um texto com este endereço (slug).' : mensagemErro(r.error))
    await invalidar('site')
    toast.success(st === 'publicado' ? 'Publicado no site.' : 'Salvo.')
    onFechar()
  }
  const excluir = async () => {
    if (!artigo || !window.confirm('Excluir este texto?')) return
    const { error } = await supabase.from('blog_artigos').delete().eq('id', artigo.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('site'); onFechar()
  }

  return (
    <Gaveta aberto={artigo !== undefined} onFechar={onFechar} largura="max-w-3xl" titulo={artigo ? 'Editar texto' : 'Novo texto'} subtitulo="Use ## para subtítulos, **negrito** e linhas começando com - para listas."
      rodape={<>
        {artigo && ehGestor && <Button variante="fantasma" tamanho="sm" className="text-erro" onClick={() => void excluir()}><Trash2 className="size-4" />Excluir</Button>}
        <div className="ml-auto flex gap-2">
          <Button variante="contorno" tamanho="sm" carregando={ocupado} disabled={!valido} onClick={() => void salvar()}>Salvar</Button>
          {v.status !== 'publicado' && <Button tamanho="sm" carregando={ocupado} disabled={!valido} onClick={() => void salvar('publicado')}>Publicar agora</Button>}
        </div>
      </>}>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void salvar() }} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Tipo" htmlFor="ba-tp"><Select id="ba-tp" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}><option value="receita">Receita</option><option value="artigo">Artigo</option><option value="dica">Dica</option></Select></Campo>
          <Campo rotulo="Categoria" htmlFor="ba-cat" className="sm:col-span-2">
            <Select id="ba-cat" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}><option value="">Sem categoria</option>{(categorias.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select>
          </Campo>
          <Campo rotulo="Título" htmlFor="ba-t" obrigatorio className="sm:col-span-3">
            <Input id="ba-t" autoFocus value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value, slug: slugManual ? v.slug : slugificar(e.target.value) })} />
          </Campo>
          <Campo rotulo="Subtítulo" htmlFor="ba-st" className="sm:col-span-2"><Input id="ba-st" value={v.subtitulo} onChange={(e) => setV({ ...v, subtitulo: e.target.value })} /></Campo>
          <Campo rotulo="Endereço (slug)" htmlFor="ba-sl"><Input id="ba-sl" value={v.slug} onChange={(e) => { setSlugManual(true); setV({ ...v, slug: e.target.value }) }} /></Campo>
          <Campo rotulo="Capa" className="sm:col-span-3"><EnvioImagem url={v.capa} pasta="blog" onEnviada={(u) => setV({ ...v, capa: u })} /></Campo>
          <Campo rotulo="Resumo (aparece na listagem e no Google)" htmlFor="ba-r" className="sm:col-span-3"><Textarea id="ba-r" className="min-h-14" maxLength={300} value={v.resumo} onChange={(e) => setV({ ...v, resumo: e.target.value })} /></Campo>
        </div>
        {v.tipo === 'receita' && (
          <div className="grid gap-4 rounded-2xl bg-creme/60 p-4 sm:grid-cols-3">
            <Campo rotulo="Tempo de preparo (min)" htmlFor="ba-tm"><Input id="ba-tm" inputMode="numeric" value={v.tempo} onChange={(e) => setV({ ...v, tempo: e.target.value })} /></Campo>
            <Campo rotulo="Rendimento" htmlFor="ba-rd"><Input id="ba-rd" value={v.rendimento} onChange={(e) => setV({ ...v, rendimento: e.target.value })} placeholder="20 fatias" /></Campo>
            <Campo rotulo="Dificuldade" htmlFor="ba-df"><Select id="ba-df" value={v.dificuldade} onChange={(e) => setV({ ...v, dificuldade: e.target.value })}><option>fácil</option><option>média</option><option>difícil</option></Select></Campo>
            <Campo rotulo="Ingredientes (um por linha)" htmlFor="ba-in" className="sm:col-span-3"><Textarea id="ba-in" className="min-h-28" value={v.ingredientes} onChange={(e) => setV({ ...v, ingredientes: e.target.value })} placeholder={'1 lata de leite condensado\n1 colher (sopa) de manteiga'} /></Campo>
            <Campo rotulo="Modo de preparo (um passo por linha)" htmlFor="ba-mp" className="sm:col-span-3"><Textarea id="ba-mp" className="min-h-28" value={v.modo} onChange={(e) => setV({ ...v, modo: e.target.value })} /></Campo>
          </div>
        )}
        <Campo rotulo={v.tipo === 'receita' ? 'Texto de apresentação e dicas' : 'Conteúdo'} htmlFor="ba-tx"><Textarea id="ba-tx" className="min-h-56 font-mono text-[13px]" value={v.texto} onChange={(e) => setV({ ...v, texto: e.target.value })} /></Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Situação" htmlFor="ba-s"><Select id="ba-s" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>{Object.entries(rotuloStatus).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</Select></Campo>
          {v.status === 'agendado' && <Campo rotulo="Publicar em" htmlFor="ba-pe"><Input id="ba-pe" type="datetime-local" value={v.publicar_em} onChange={(e) => setV({ ...v, publicar_em: e.target.value })} /></Campo>}
          <div className="sm:col-span-2"><Interruptor id="ba-dst" marcado={v.destaque} onChange={(d) => setV({ ...v, destaque: d })} rotulo="Destacar na página inicial" /></div>
        </div>
      </form>
    </Gaveta>
  )
}
