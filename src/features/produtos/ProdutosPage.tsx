import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cake, FolderTree, Palette, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, type Tabela } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useCategoriasProdutos, useInvalidar, useOpcoesPersonalizacao, useProdutos } from '@/lib/consultas'
import { Badge, Button, Campo, Card, Carregando, EstadoErro, EstadoVazio, Input, Select, Textarea } from '@/components/ui'
import { Abas, CabecalhoPagina, CampoBusca, Interruptor, Modal, Pilulas } from '@/components/ui/estrutura'
import { cn, formatarMoeda, lerNumero, mensagemErro, normalizarTexto, slugificar } from '@/lib/utils'
import { EditorProduto } from './EditorProduto'

export const tiposProduto: Record<string, string> = {
  bolo_personalizado: 'Bolo personalizado', bolo_tradicional: 'Bolo tradicional', docinho: 'Docinho', doce_fino: 'Doce fino',
  cupcake: 'Cupcake', mini_bolo: 'Mini bolo', brownie: 'Brownie', kit: 'Kit', sobremesa: 'Sobremesa', outro: 'Outro',
}
export const gruposOpcao: Record<string, string> = {
  massa: 'Massas', recheio: 'Recheios', cobertura: 'Coberturas', decoracao: 'Decoração', tema: 'Temas', topper: 'Toppers', embalagem: 'Embalagens', outro: 'Outros',
}

type Aba = 'produtos' | 'opcoes' | 'categorias'

export function ProdutosPage() {
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'produtos'
  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Produtos" descricao="Cardápio com variações de tamanho e preço, opções de personalização e categorias." />
      <Abas ativa={aba} onChange={(a) => setParams(a === 'produtos' ? {} : { aba: a }, { replace: true })} abas={[
        { id: 'produtos', rotulo: 'Cardápio', icone: <Cake className="size-4" /> },
        { id: 'opcoes', rotulo: 'Massas, recheios e coberturas', icone: <Palette className="size-4" /> },
        { id: 'categorias', rotulo: 'Categorias', icone: <FolderTree className="size-4" /> },
      ]} />
      {aba === 'produtos' && <Cardapio />}
      {aba === 'opcoes' && <Opcoes />}
      {aba === 'categorias' && <Categorias />}
    </div>
  )
}

/* ------------------------------------------------------------ Cardápio */
function Cardapio() {
  const [params, setParams] = useSearchParams()
  const { data: produtos = [], isLoading, error, refetch } = useProdutos()
  const { data: categorias = [] } = useCategoriasProdutos()
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [filtro, setFiltro] = useState<'ativos' | 'inativos'>('ativos')
  const [criando, setCriando] = useState(false)

  const lista = useMemo(() => {
    const t = normalizarTexto(busca.trim())
    return produtos.filter((p) => (filtro === 'ativos' ? p.ativo : !p.ativo) && (!categoria || p.categoria_id === categoria)
      && (!t || normalizarTexto(p.nome).includes(t)))
  }, [produtos, busca, categoria, filtro])

  const faixaPreco = (p: (typeof produtos)[number]) => {
    if (p.preco_sob_consulta) return 'Sob consulta'
    const precos = p.variacoes.filter((v) => v.ativo).map((v) => Number(v.preco))
    if (precos.length) {
      const min = Math.min(...precos), max = Math.max(...precos)
      return min === max ? formatarMoeda(min) : `${formatarMoeda(min)} a ${formatarMoeda(max)}`
    }
    return p.preco_sugerido ? formatarMoeda(p.preco_sugerido) : 'Sem preço'
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar produto" />
        <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-9 rounded-full text-[13px] lg:w-56" aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Pilulas ativa={filtro} onChange={setFiltro} opcoes={[
          { id: 'ativos', rotulo: 'Ativos', contagem: produtos.filter((p) => p.ativo).length },
          { id: 'inativos', rotulo: 'Inativos', contagem: produtos.filter((p) => !p.ativo).length },
        ]} />
        <Button onClick={() => setCriando(true)}><Plus className="size-4" />Novo produto</Button>
      </Card>

      {isLoading ? <Carregando /> : error ? <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} />
        : produtos.length === 0 ? (
          <Card><EstadoVazio icone={<Cake className="size-6" />} titulo="Cardápio vazio" descricao="Cadastre bolos, docinhos, kits e tudo o que você vende."
            acao={<Button onClick={() => setCriando(true)}><Plus className="size-4" />Cadastrar o primeiro</Button>} /></Card>
        ) : lista.length === 0 ? <Card><EstadoVazio titulo="Nenhum produto neste filtro" /></Card> : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setParams({ id: p.id })}
                  className={cn('group flex w-full overflow-hidden rounded-[var(--radius-card)] border border-borda/80 bg-white text-left shadow-suave transition hover:-translate-y-0.5 hover:shadow-elevada', !p.ativo && 'opacity-60')}>
                  <div className="size-28 shrink-0 bg-rosa-50">
                    {p.foto_url ? <img src={p.foto_url} alt="" className="size-full object-cover" loading="lazy" />
                      : <div className="grid size-full place-items-center text-rosa-300"><Cake className="size-10" /></div>}
                  </div>
                  <div className="min-w-0 flex-1 p-3.5">
                    <p className="truncate font-display text-[15.5px] font-semibold text-choco-800">{p.nome}</p>
                    <p className="truncate text-[12px] text-texto-suave">{(p.categoria as { nome: string } | null)?.nome ?? tiposProduto[p.tipo]}</p>
                    <p className="mt-1.5 text-[14px] font-semibold text-cacau-700 tabular-nums">{faixaPreco(p)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.variacoes.filter((v) => v.ativo).length > 0 && <Badge className="py-0 text-[11px]">{p.variacoes.filter((v) => v.ativo).length} tamanhos</Badge>}
                      {p.personalizavel && <Badge tom="rosa" className="py-0 text-[11px]">Personalizável</Badge>}
                      {!p.ficha_tecnica_id && !p.variacoes.some((v) => v.ficha_tecnica_id) && <Badge tom="alerta" className="py-0 text-[11px]">Sem receita</Badge>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      <NovoProduto aberto={criando} onAbertoChange={setCriando} onCriado={(id) => setParams({ id })} />
      <EditorProduto produtoId={params.get('id')} onFechar={() => setParams({})} />
    </div>
  )
}

function NovoProduto({ aberto, onAbertoChange, onCriado }: { aberto: boolean; onAbertoChange: (v: boolean) => void; onCriado: (id: string) => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: categorias = [] } = useCategoriasProdutos()
  const { data: produtos = [] } = useProdutos()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('bolo_personalizado')
  const [categoria, setCategoria] = useState('')
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { if (aberto) { setNome(''); setCategoria('') } }, [aberto])

  const criar = async (e: FormEvent) => {
    e.preventDefault()
    if (nome.trim().length < 2) return
    let slug = slugificar(nome) || 'produto'
    for (let i = 2; produtos.some((p) => p.slug === slug); i++) slug = `${slugificar(nome)}-${i}`
    setOcupado(true)
    const { data, error } = await supabase.from('produtos').insert({
      empresa_id: empresa.id, nome: nome.trim(), slug, tipo, categoria_id: categoria || null,
      personalizavel: tipo === 'bolo_personalizado',
    }).select('id').single()
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('produtos')
    onAbertoChange(false)
    onCriado(data.id)
  }

  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} titulo="Novo produto" largura="max-w-md" onSubmit={criar}
      rodape={<><Button variante="fantasma" onClick={() => onAbertoChange(false)}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={nome.trim().length < 2}>Criar e configurar</Button></>}>
      <div className="space-y-4">
        <Campo rotulo="Nome" htmlFor="np-nome" obrigatorio><Input id="np-nome" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Bolo Ninho com Morango" /></Campo>
        <Campo rotulo="Tipo" htmlFor="np-tipo">
          <Select id="np-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(tiposProduto).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Categoria" htmlFor="np-cat">
          <Select id="np-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Sem categoria</option>
            {categorias.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Campo>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------ Opções de personalização */
type Opcao = Tabela<'opcoes_personalizacao'>

function Opcoes() {
  const { data: opcoes = [], isLoading, error, refetch } = useOpcoesPersonalizacao()
  const { ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const [editando, setEditando] = useState<Opcao | null | undefined>(undefined)
  const [grupoNovo, setGrupoNovo] = useState('massa')

  const porGrupo = useMemo(() => {
    const m = new Map<string, Opcao[]>()
    for (const g of Object.keys(gruposOpcao)) m.set(g, [])
    for (const o of opcoes) m.get(o.grupo)?.push(o)
    return m
  }, [opcoes])

  const excluir = async (o: Opcao) => {
    if (!window.confirm(`Excluir "${o.nome}"?`)) return
    const { error: e } = await supabase.from('opcoes_personalizacao').delete().eq('id', o.id)
    if (e) return void toast.error(mensagemErro(e))
    await invalidar('opcoes_personalizacao', 'produtos')
  }

  if (isLoading) return <Carregando />
  if (error) return <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} />
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-[13px] text-texto-suave">Opções que o cliente escolhe nos produtos personalizáveis. O acréscimo é somado ao preço do item.</p>
        <Button onClick={() => { setGrupoNovo('massa'); setEditando(null) }}><Plus className="size-4" />Nova opção</Button>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...porGrupo.entries()].filter(([g, l]) => l.length > 0 || ['massa', 'recheio', 'cobertura'].includes(g)).map(([g, lista]) => (
          <Card key={g} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-borda px-5 py-3">
              <p className="font-display text-[15px] font-semibold">{gruposOpcao[g]}</p>
              <Button variante="fantasma" tamanho="sm" onClick={() => { setGrupoNovo(g); setEditando(null) }}><Plus className="size-3.5" />Adicionar</Button>
            </div>
            {lista.length === 0 ? <p className="px-5 py-4 text-[13px] text-texto-suave">Nenhuma opção.</p> : (
              <ul className="divide-y divide-borda/70">
                {lista.map((o) => (
                  <li key={o.id} className={cn('flex items-center gap-3 px-5 py-2.5 text-[13.5px]', !o.ativo && 'opacity-55')}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-choco-800">{o.nome}</p>
                      {(o.faixa || o.descricao) && <p className="truncate text-[12px] text-texto-suave">{[o.faixa, o.descricao].filter(Boolean).join(' · ')}</p>}
                    </div>
                    <span className="text-[13px] tabular-nums">{Number(o.acrescimo) > 0 ? `+ ${formatarMoeda(o.acrescimo)}` : 'sem acréscimo'}</span>
                    <Button variante="fantasma" tamanho="icone" className="size-7" aria-label="Editar" onClick={() => setEditando(o)}><Pencil className="size-3.5" /></Button>
                    {ehGestor && <Button variante="fantasma" tamanho="icone" className="size-7 text-erro" aria-label="Excluir" onClick={() => void excluir(o)}><Trash2 className="size-3.5" /></Button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
      <FormularioOpcao opcao={editando} grupoInicial={grupoNovo} onFechar={() => setEditando(undefined)} />
    </div>
  )
}

function FormularioOpcao({ opcao, grupoInicial, onFechar }: { opcao: Opcao | null | undefined; grupoInicial: string; onFechar: () => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const [v, setV] = useState({ grupo: 'massa', nome: '', faixa: '', descricao: '', acrescimo: '', ativo: true })
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    if (opcao === undefined) return
    setV({
      grupo: opcao?.grupo ?? grupoInicial, nome: opcao?.nome ?? '', faixa: opcao?.faixa ?? '', descricao: opcao?.descricao ?? '',
      acrescimo: opcao ? String(opcao.acrescimo).replace('.', ',') : '', ativo: opcao?.ativo ?? true,
    })
  }, [opcao, grupoInicial])
  const acr = v.acrescimo.trim() ? lerNumero(v.acrescimo) : 0
  const valido = v.nome.trim().length >= 2 && acr >= 0

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    setOcupado(true)
    const dados = { grupo: v.grupo, nome: v.nome.trim(), faixa: v.faixa.trim() || null, descricao: v.descricao.trim() || null, acrescimo: acr, ativo: v.ativo }
    const r = opcao ? await supabase.from('opcoes_personalizacao').update(dados).eq('id', opcao.id)
      : await supabase.from('opcoes_personalizacao').insert({ ...dados, empresa_id: empresa.id })
    setOcupado(false)
    if (r.error) return void toast.error(r.error.code === '23505' ? 'Já existe uma opção com este nome neste grupo.' : mensagemErro(r.error))
    await invalidar('opcoes_personalizacao', 'produtos')
    onFechar()
  }

  return (
    <Modal aberto={opcao !== undefined} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={opcao ? 'Editar opção' : 'Nova opção'} largura="max-w-lg" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={!valido}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Grupo" htmlFor="op-g">
          <Select id="op-g" value={v.grupo} onChange={(e) => setV({ ...v, grupo: e.target.value })}>
            {Object.entries(gruposOpcao).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Nome" htmlFor="op-n" obrigatorio><Input id="op-n" autoFocus value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} placeholder="Ex.: Brigadeiro belga" /></Campo>
        <Campo rotulo="Faixa" htmlFor="op-f" dica="Ex.: tradicional, especial, premium"><Input id="op-f" value={v.faixa} onChange={(e) => setV({ ...v, faixa: e.target.value })} /></Campo>
        <Campo rotulo="Acréscimo no preço (R$)" htmlFor="op-a"><Input id="op-a" inputMode="decimal" placeholder="0,00" value={v.acrescimo} onChange={(e) => setV({ ...v, acrescimo: e.target.value })} /></Campo>
        <Campo rotulo="Descrição" htmlFor="op-d" className="sm:col-span-2"><Textarea id="op-d" className="min-h-14" value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></Campo>
        <div className="sm:col-span-2"><Interruptor id="op-at" marcado={v.ativo} onChange={(a) => setV({ ...v, ativo: a })} rotulo="Disponível para escolha" /></div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------ Categorias */
type Categoria = Tabela<'categorias_produtos'>

function Categorias() {
  const empresa = useEmpresa()
  const { ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const { data: categorias = [], isLoading, error } = useCategoriasProdutos()
  const { data: produtos = [] } = useProdutos()
  const [nova, setNova] = useState('')

  const criar = async (e: FormEvent) => {
    e.preventDefault()
    if (nova.trim().length < 2) return
    const { error: er } = await supabase.from('categorias_produtos').insert({
      empresa_id: empresa.id, nome: nova.trim(), slug: slugificar(nova), ordem: categorias.length + 1,
    })
    if (er) return void toast.error(er.code === '23505' ? 'Já existe uma categoria com este nome.' : mensagemErro(er))
    setNova('')
    await invalidar('categorias_produtos')
  }
  const atualizar = async (c: Categoria, campos: Partial<Categoria>) => {
    const { error: er } = await supabase.from('categorias_produtos').update(campos).eq('id', c.id)
    if (er) return void toast.error(mensagemErro(er))
    await invalidar('categorias_produtos', 'produtos')
  }
  const excluir = async (c: Categoria) => {
    if (!window.confirm(`Excluir a categoria "${c.nome}"? Os produtos ficarão sem categoria.`)) return
    const { error: er } = await supabase.from('categorias_produtos').delete().eq('id', c.id)
    if (er) return void toast.error(mensagemErro(er))
    await invalidar('categorias_produtos', 'produtos')
  }

  if (isLoading) return <Carregando />
  if (error) return <EstadoErro mensagem={mensagemErro(error)} />
  return (
    <Card className="overflow-hidden">
      <form onSubmit={criar} className="flex gap-2 border-b border-borda p-4">
        <Input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova categoria" aria-label="Nova categoria" />
        <Button type="submit" disabled={nova.trim().length < 2}><Plus className="size-4" />Adicionar</Button>
      </form>
      <ul className="divide-y divide-borda/70">
        {categorias.map((c) => (
          <li key={c.id} className={cn('flex items-center gap-3 px-5 py-2.5', !c.ativo && 'opacity-55')}>
            <Input defaultValue={c.nome} aria-label="Nome da categoria" className="h-9 flex-1"
              onBlur={(e) => e.target.value.trim().length >= 2 && e.target.value.trim() !== c.nome && void atualizar(c, { nome: e.target.value.trim() })} />
            <span className="w-24 text-right text-[12.5px] text-texto-suave">{produtos.filter((p) => p.categoria_id === c.id).length} produtos</span>
            <Button variante="fantasma" tamanho="sm" onClick={() => void atualizar(c, { ativo: !c.ativo })}><Power className="size-3.5" />{c.ativo ? 'Ocultar' : 'Mostrar'}</Button>
            {ehGestor && <Button variante="fantasma" tamanho="icone" className="size-8 text-erro" aria-label="Excluir" onClick={() => void excluir(c)}><Trash2 className="size-3.5" /></Button>}
          </li>
        ))}
      </ul>
    </Card>
  )
}
