import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Cake, MessageCircle, Plus, Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { Badge, Button, Card, Carregando, EstadoErro, EstadoVazio, Input, Select } from '@/components/ui'
import { cn, formatarMoeda, iniciais, lerPreferencia, mensagemErro, salvarPreferencia } from '@/lib/utils'
import { FormularioCliente, type Cliente } from './FormularioCliente'
import { FichaCliente, type ResumoCliente } from './FichaCliente'
import { diasAteAniversario, formatarAniversario, formatarTelefone, linkWhatsApp, statusVenda, textoAniversario } from './utils'

type Filtro = 'ativos' | 'aniversariantes' | 'inativos' | 'todos'
type Ordem = 'nome' | 'gasto' | 'pedidos' | 'recentes'

const filtros: { id: Filtro; rotulo: string }[] = [
  { id: 'ativos', rotulo: 'Ativos' },
  { id: 'aniversariantes', rotulo: 'Aniversariantes' },
  { id: 'inativos', rotulo: 'Inativos' },
  { id: 'todos', rotulo: 'Todos' },
]

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function ClientesPage() {
  const empresa = useEmpresa()
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('ativos')
  const [ordem, setOrdem] = useState<Ordem>(() => lerPreferencia<Ordem>('inm:clientes:ordem', 'nome'))
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clientes', empresa.id, 'lista'],
    queryFn: async () => {
      const [clientes, pedidos] = await Promise.all([
        supabase.from('clientes').select('*').eq('empresa_id', empresa.id).order('nome').limit(5000),
        supabase.from('pedidos').select('cliente_id, total, data_pedido')
          .eq('empresa_id', empresa.id).not('cliente_id', 'is', null).in('status', [...statusVenda]).limit(20000),
      ])
      if (clientes.error) throw clientes.error
      if (pedidos.error) throw pedidos.error
      const resumos = new Map<string, ResumoCliente>()
      for (const p of pedidos.data) {
        const r = resumos.get(p.cliente_id!) ?? { pedidos: 0, total: 0, ultimo: null }
        r.pedidos++
        r.total += Number(p.total)
        if (!r.ultimo || p.data_pedido > r.ultimo) r.ultimo = p.data_pedido
        resumos.set(p.cliente_id!, r)
      }
      return { clientes: clientes.data, resumos }
    },
  })

  const clientes = useMemo(() => data?.clientes ?? [], [data])
  const resumos = data?.resumos

  const contagem = useMemo(() => ({
    ativos: clientes.filter((c) => c.ativo).length,
    aniversariantes: clientes.filter((c) => c.ativo && c.data_nascimento && diasAteAniversario(c.data_nascimento) <= 30).length,
    inativos: clientes.filter((c) => !c.ativo).length,
    todos: clientes.length,
  }), [clientes])

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim())
    const digitos = busca.replace(/\D/g, '')
    let l = clientes.filter((c) => {
      if (filtro === 'ativos' && !c.ativo) return false
      if (filtro === 'inativos' && c.ativo) return false
      if (filtro === 'aniversariantes' && !(c.ativo && c.data_nascimento && diasAteAniversario(c.data_nascimento) <= 30)) return false
      if (!termo) return true
      return normalizar(c.nome).includes(termo)
        || (c.email ?? '').toLowerCase().includes(termo)
        || (digitos.length >= 3 && ((c.whatsapp ?? '').includes(digitos) || (c.telefone ?? '').includes(digitos)))
    })
    if (filtro === 'aniversariantes') {
      l = [...l].sort((a, b) => diasAteAniversario(a.data_nascimento!) - diasAteAniversario(b.data_nascimento!))
    } else if (ordem !== 'nome') {
      const r = (c: Cliente) => resumos?.get(c.id)
      l = [...l].sort((a, b) =>
        ordem === 'gasto' ? (r(b)?.total ?? 0) - (r(a)?.total ?? 0)
          : ordem === 'pedidos' ? (r(b)?.pedidos ?? 0) - (r(a)?.pedidos ?? 0)
            : b.created_at.localeCompare(a.created_at))
    }
    return l
  }, [clientes, resumos, busca, filtro, ordem])

  const selecionadoId = params.get('id')
  const selecionado = clientes.find((c) => c.id === selecionadoId) ?? null
  const abrirFicha = (id: string | null) => setParams(id ? { id } : {}, { replace: !id })

  const novo = () => { setEditando(null); setFormAberto(true) }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold">Clientes</h1>
          <p className="mt-1 text-[14px] text-texto-suave">Ficha de cada cliente com contato, preferências e histórico de compras.</p>
        </div>
        <Button onClick={novo}><Plus className="size-4" />Novo cliente</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-cinza" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail" className="pl-10" aria-label="Buscar clientes" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar clientes">
            {filtros.map((f) => (
              <button key={f.id} role="tab" aria-selected={filtro === f.id} onClick={() => setFiltro(f.id)}
                className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                  filtro === f.id ? 'bg-cacau-600 text-white' : 'bg-creme text-choco-700 hover:bg-rosa-100')}>
                {f.id === 'aniversariantes' && <Cake className="size-3.5" />}
                {f.rotulo}
                <span className={cn('rounded-full px-1.5 text-[11px]', filtro === f.id ? 'bg-white/20' : 'bg-white')}>{contagem[f.id]}</span>
              </button>
            ))}
          </div>
          {filtro !== 'aniversariantes' && (
            <Select value={ordem} onChange={(e) => { const v = e.target.value as Ordem; setOrdem(v); salvarPreferencia('inm:clientes:ordem', v) }}
              className="h-9 w-full rounded-full text-[13px] lg:w-48" aria-label="Ordenar por">
              <option value="nome">Nome (A–Z)</option>
              <option value="gasto">Maior gasto</option>
              <option value="pedidos">Mais pedidos</option>
              <option value="recentes">Cadastro mais recente</option>
            </Select>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? <Carregando texto="Carregando clientes…" /> : error ? (
          <div className="p-5"><EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} /></div>
        ) : clientes.length === 0 ? (
          <EstadoVazio icone={<Users className="size-6" />} titulo="Nenhum cliente cadastrado"
            descricao="Cadastre seus clientes para acompanhar pedidos, aniversários e preferências."
            acao={<Button onClick={novo}><Plus className="size-4" />Cadastrar o primeiro</Button>} />
        ) : lista.length === 0 ? (
          <EstadoVazio icone={<Search className="size-6" />} titulo="Nenhum cliente encontrado"
            descricao={busca ? `Nada corresponde a “${busca}” neste filtro.` : filtro === 'aniversariantes' ? 'Nenhum aniversário nos próximos 30 dias.' : 'Nenhum cliente neste filtro.'} />
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_8rem_6rem_8rem] gap-4 border-b border-borda bg-creme/50 px-5 py-2.5 text-[11.5px] font-semibold tracking-wide text-texto-suave uppercase md:grid">
              <span>Cliente</span><span>Contato</span><span>Aniversário</span><span className="text-right">Pedidos</span><span className="text-right">Total gasto</span>
            </div>
            <ul className="divide-y divide-borda/70">
              {lista.map((c) => {
                const r = resumos?.get(c.id)
                const dias = c.data_nascimento ? diasAteAniversario(c.data_nascimento) : null
                const wa = linkWhatsApp(c.whatsapp)
                return (
                  <li key={c.id}>
                    <div role="button" tabIndex={0} onClick={() => abrirFicha(c.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirFicha(c.id) } }}
                      className={cn('grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors outline-none hover:bg-rosa-50 focus-visible:bg-rosa-50 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_8rem_6rem_8rem]',
                        !c.ativo && 'opacity-60')}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rosa-100 text-[13px] font-semibold text-cacau-700">{iniciais(c.nome)}</span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-choco-800">{c.nome}</p>
                          <div className="flex flex-wrap gap-1">
                            {!c.ativo && <Badge tom="neutro" className="py-0 text-[11px]">Inativo</Badge>}
                            {c.restricoes && <Badge tom="alerta" className="py-0 text-[11px]">Restrição</Badge>}
                            {c.preferencias.slice(0, 2).map((p) => <span key={p} className="truncate text-[12px] text-texto-suave">{p}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="hidden min-w-0 text-[13px] md:block">
                        {c.whatsapp || c.telefone ? (
                          <span className="flex items-center gap-1.5">
                            {formatarTelefone(c.whatsapp ?? c.telefone)}
                            {wa && (
                              <a href={wa} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`WhatsApp de ${c.nome}`}
                                className="grid size-6 place-items-center rounded-full text-sucesso hover:bg-sucesso-fundo"><MessageCircle className="size-3.5" /></a>
                            )}
                          </span>
                        ) : <span className="text-texto-suave">{c.email ?? '—'}</span>}
                      </div>
                      <div className="hidden text-[13px] md:block">
                        {c.data_nascimento ? (
                          dias !== null && dias <= 7
                            ? <Badge tom="rosa"><Cake className="size-3" />{textoAniversario(dias)}</Badge>
                            : <span className="text-choco-700">{formatarAniversario(c.data_nascimento)}{filtro === 'aniversariantes' && dias !== null ? <span className="text-texto-suave"> · {textoAniversario(dias).toLowerCase()}</span> : null}</span>
                        ) : <span className="text-texto-suave">—</span>}
                      </div>
                      <span className="hidden text-right text-[13.5px] tabular-nums md:block">{r?.pedidos ?? 0}</span>
                      <span className="text-right text-[13.5px] font-semibold tabular-nums">
                        {formatarMoeda(r?.total ?? 0)}
                        <span className="block text-[11.5px] font-normal text-texto-suave md:hidden">{r?.pedidos ?? 0} {r?.pedidos === 1 ? 'pedido' : 'pedidos'}</span>
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <FormularioCliente aberto={formAberto} onAbertoChange={setFormAberto} cliente={editando} clientes={clientes} onSalvo={(id) => abrirFicha(id)} />
      <FichaCliente
        cliente={selecionado}
        resumo={selecionado ? resumos?.get(selecionado.id) : undefined}
        indicadoPor={selecionado?.indicado_por ? clientes.find((c) => c.id === selecionado.indicado_por) : undefined}
        onFechar={() => abrirFicha(null)}
        onEditar={(c) => { setEditando(c); setFormAberto(true) }}
      />
    </div>
  )
}
