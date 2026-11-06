import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { ArrowRight, ClipboardList, Globe, Plus, Truck, Store } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase, type Tabela } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { useClientesBasico, useConfiguracoes, useInvalidar } from '@/lib/consultas'
import { Badge, Button, Campo, Card, Carregando, EstadoErro, EstadoVazio, Input, Select } from '@/components/ui'
import { Abas, CabecalhoPagina, CabecalhoTabela, CampoBusca, LinhaClicavel, Modal, Pilulas } from '@/components/ui/estrutura'
import { cn, dataLocal, formatarMoeda, hojeIso, isoLocal, mensagemErro, normalizarTexto } from '@/lib/utils'
import { FormularioCliente } from '@/features/clientes/FormularioCliente'
import { EditorPedido } from './EditorPedido'
import { Solicitacoes } from './Solicitacoes'
import { origensPedido, proximoPasso, rotuloAcao, rotulosStatus, statusAbertos, statusOrcamento, tomStatus } from './utils'

export type PedidoLista = Tabela<'pedidos'> & { cliente: { nome: string } | null }
type Filtro = 'abertos' | 'orcamentos' | 'hoje' | 'entregues' | 'cancelados' | 'todos'

export function usePedidos() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['pedidos', empresa.id, 'lista'],
    queryFn: async () => exigir(await supabase.from('pedidos').select('*, cliente:clientes(nome)')
      .eq('empresa_id', empresa.id).order('data_entrega', { ascending: true, nullsFirst: false }).order('horario_entrega').limit(2000)) as PedidoLista[],
  })
}

export function PedidosPage() {
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') === 'site' ? 'site' : 'pedidos'
  const [criando, setCriando] = useState(false)
  const abrir = (id: string) => setParams({ id })

  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Pedidos" descricao="Orçamentos, encomendas e o acompanhamento da produção até a entrega."
        acoes={<Button onClick={() => setCriando(true)}><Plus className="size-4" />Novo pedido</Button>} />
      <Abas ativa={aba} onChange={(a) => setParams(a === 'site' ? { aba: 'site' } : {}, { replace: true })} abas={[
        { id: 'pedidos', rotulo: 'Pedidos', icone: <ClipboardList className="size-4" /> },
        { id: 'site', rotulo: 'Solicitações do site', icone: <Globe className="size-4" /> },
      ]} />
      {aba === 'pedidos' ? <ListaPedidos onAbrir={abrir} /> : <Solicitacoes onAbrirPedido={abrir} />}
      <NovoPedido aberto={criando} onAbertoChange={setCriando} onCriado={abrir} />
      <EditorPedido pedidoId={params.get('id')} onFechar={() => setParams(aba === 'site' ? { aba: 'site' } : {})} />
    </div>
  )
}

function ListaPedidos({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { data = [], isLoading, error, refetch } = usePedidos()
  const invalidar = useInvalidar()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('abertos')
  const [avancando, setAvancando] = useState<string | null>(null)
  const hoje = hojeIso(), amanha = isoLocal(addDays(new Date(), 1))

  const contagem = useMemo(() => ({
    abertos: data.filter((p) => statusAbertos.includes(p.status)).length,
    orcamentos: data.filter((p) => statusOrcamento.includes(p.status)).length,
    hoje: data.filter((p) => (p.data_entrega === hoje || p.data_entrega === amanha) && p.status !== 'cancelado' && p.status !== 'entregue').length,
    entregues: data.filter((p) => p.status === 'entregue').length,
    cancelados: data.filter((p) => p.status === 'cancelado').length,
    todos: data.length,
  }), [data, hoje, amanha])

  const lista = useMemo(() => {
    const t = normalizarTexto(busca.trim().replace('#', ''))
    let l = data.filter((p) => {
      if (filtro === 'abertos' && !statusAbertos.includes(p.status)) return false
      if (filtro === 'orcamentos' && !statusOrcamento.includes(p.status)) return false
      if (filtro === 'hoje' && !((p.data_entrega === hoje || p.data_entrega === amanha) && p.status !== 'cancelado' && p.status !== 'entregue')) return false
      if (filtro === 'entregues' && p.status !== 'entregue') return false
      if (filtro === 'cancelados' && p.status !== 'cancelado') return false
      return !t || String(p.numero) === t || normalizarTexto(p.cliente?.nome ?? '').includes(t)
    })
    if (filtro === 'entregues' || filtro === 'cancelados' || filtro === 'todos') l = [...l].sort((a, b) => b.numero - a.numero)
    return l
  }, [data, busca, filtro, hoje, amanha])

  const avancar = async (p: PedidoLista) => {
    const prox = proximoPasso(p.status, p.tipo_entrega)
    if (!prox) return
    setAvancando(p.id)
    const { error: e } = await supabase.rpc('pedido_alterar_status', { p_pedido: p.id, p_status: prox })
    setAvancando(null)
    if (e) return void toast.error(mensagemErro(e))
    await invalidar('pedidos', 'insumos', 'movimentacoes', 'financeiro', 'clientes', 'fidelidade')
    toast.success(`Pedido #${p.numero}: ${rotulosStatus[prox].toLowerCase()}.`)
  }

  const quando = (p: PedidoLista) => {
    if (!p.data_entrega) return 'Sem data'
    const d = p.data_entrega === hoje ? 'Hoje' : p.data_entrega === amanha ? 'Amanhã' : format(dataLocal(p.data_entrega), 'dd/MM')
    return `${d}${p.horario_entrega ? ` · ${p.horario_entrega.slice(0, 5)}` : ''}`
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-3 p-4">
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar por nº do pedido ou cliente" />
        <Pilulas ativa={filtro} onChange={setFiltro} opcoes={[
          { id: 'abertos', rotulo: 'Em andamento', contagem: contagem.abertos },
          { id: 'hoje', rotulo: 'Hoje e amanhã', contagem: contagem.hoje },
          { id: 'orcamentos', rotulo: 'Orçamentos', contagem: contagem.orcamentos },
          { id: 'entregues', rotulo: 'Entregues', contagem: contagem.entregues },
          { id: 'cancelados', rotulo: 'Cancelados', contagem: contagem.cancelados },
          { id: 'todos', rotulo: 'Todos', contagem: contagem.todos },
        ]} />
      </Card>
      <Card className="overflow-hidden">
        {isLoading ? <Carregando texto="Carregando pedidos…" /> : error ? <div className="p-5"><EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} /></div>
          : lista.length === 0 ? (
            <EstadoVazio icone={<ClipboardList className="size-6" />} titulo={data.length ? 'Nenhum pedido neste filtro' : 'Nenhum pedido ainda'}
              descricao={data.length ? undefined : 'Crie um orçamento, adicione os itens e confirme quando o cliente aprovar.'} />
          ) : (
            <>
              <CabecalhoTabela className="grid-cols-[4.5rem_minmax(0,1.6fr)_8.5rem_10rem_7.5rem_11rem]">
                <span>Nº</span><span>Cliente</span><span>Entrega</span><span>Status</span><span className="text-right">Total</span><span />
              </CabecalhoTabela>
              <ul className="divide-y divide-borda/70">
                {lista.map((p) => {
                  const prox = proximoPasso(p.status, p.tipo_entrega)
                  const atrasado = p.data_entrega && p.data_entrega < hoje && statusAbertos.includes(p.status)
                  return (
                    <li key={p.id} className="flex items-center">
                      <LinhaClicavel onClick={() => onAbrir(p.id)} className="grid flex-1 grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 md:grid-cols-[4.5rem_minmax(0,1.6fr)_8.5rem_10rem_7.5rem]">
                        <span className="text-[13.5px] font-semibold text-choco-700">#{p.numero}</span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-choco-800">{p.cliente?.nome ?? 'Cliente não informado'}</p>
                          {Number(p.saldo) > 0 && statusAbertos.includes(p.status) && <p className="text-[12px] text-alerta">Falta receber {formatarMoeda(p.saldo)}</p>}
                        </div>
                        <span className={cn('flex items-center gap-1.5 text-[13px]', atrasado ? 'font-semibold text-erro' : 'text-choco-700')}>
                          {p.tipo_entrega === 'entrega' ? <Truck className="size-3.5 text-texto-suave" /> : <Store className="size-3.5 text-texto-suave" />}{quando(p)}
                        </span>
                        <span className="max-md:col-start-2"><Badge tom={tomStatus[p.status]}>{rotulosStatus[p.status]}</Badge></span>
                        <span className="text-right text-[13.5px] font-semibold tabular-nums">{formatarMoeda(p.total)}</span>
                      </LinhaClicavel>
                      <div className="hidden w-44 justify-end pr-4 md:flex">
                        {prox && prox !== 'confirmado' && (
                          <Button variante="suave" tamanho="sm" carregando={avancando === p.id} onClick={() => void avancar(p)}>
                            {rotuloAcao[prox]}<ArrowRight className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
      </Card>
    </div>
  )
}

export function NovoPedido({ aberto, onAbertoChange, onCriado, inicial }: {
  aberto: boolean; onAbertoChange: (v: boolean) => void; onCriado: (id: string) => void
  inicial?: { cliente_id?: string; data_entrega?: string; solicitacao_id?: string; observacoes?: string; origem?: string }
}) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: clientes = [] } = useClientesBasico()
  const { data: cfg } = useConfiguracoes()
  const [cliente, setCliente] = useState('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [tipo, setTipo] = useState<'retirada' | 'entrega'>('retirada')
  const [origem, setOrigem] = useState('whatsapp')
  const [ocupado, setOcupado] = useState(false)
  const [novoCliente, setNovoCliente] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setCliente(inicial?.cliente_id ?? ''); setData(inicial?.data_entrega ?? ''); setHora(''); setTipo('retirada'); setOrigem(inicial?.origem ?? 'whatsapp')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reinicia só ao abrir
  }, [aberto])

  const antecedencia = cfg?.antecedencia_minima_horas ?? 0
  const horasAte = data ? (new Date(`${data}T${hora || '12:00'}`).getTime() - Date.now()) / 3600000 : null
  const curto = horasAte !== null && horasAte < antecedencia

  const criar = async (e: FormEvent) => {
    e.preventDefault()
    setOcupado(true)
    const c = clientes.find((x) => x.id === cliente)
    const { data: p, error } = await supabase.from('pedidos').insert({
      empresa_id: empresa.id, numero: 0 /* atribuído pelo banco */, cliente_id: cliente || null, data_entrega: data || null, horario_entrega: hora || null,
      tipo_entrega: tipo, origem, taxa_entrega: tipo === 'entrega' ? Number(cfg?.taxa_entrega_padrao ?? 0) : 0,
      endereco_entrega: tipo === 'entrega' ? (c?.endereco ?? {}) : {},
      validade_orcamento: isoLocal(addDays(new Date(), cfg?.validade_orcamento_dias ?? 7)),
      solicitacao_id: inicial?.solicitacao_id ?? null, observacoes: inicial?.observacoes ?? null,
    }).select('id').single()
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    if (inicial?.solicitacao_id) {
      await supabase.from('solicitacoes_orcamento').update({ pedido_id: p.id, cliente_id: cliente || null, status: 'convertida' }).eq('id', inicial.solicitacao_id)
    }
    await invalidar('pedidos', 'solicitacoes')
    onAbertoChange(false)
    onCriado(p.id)
  }

  const c = clientes.find((x) => x.id === cliente)
  return (
    <>
      <Modal aberto={aberto} onAbertoChange={onAbertoChange} titulo="Novo pedido" descricao="Começa como orçamento. Adicione os itens e confirme quando o cliente aprovar." largura="max-w-lg" onSubmit={criar}
        rodape={<><Button variante="fantasma" onClick={() => onAbertoChange(false)}>Cancelar</Button><Button type="submit" carregando={ocupado}>Criar e adicionar itens</Button></>}>
        <div className="space-y-4">
          <Campo rotulo="Cliente" htmlFor="np-cli" acao={<button type="button" className="text-[12px] font-semibold text-cacau-600 hover:underline" onClick={() => setNovoCliente(true)}>+ Novo cliente</button>}>
            <Select id="np-cli" value={cliente} onChange={(e) => setCliente(e.target.value)}>
              <option value="">Selecione…</option>
              {clientes.filter((x) => x.ativo).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </Select>
          </Campo>
          {c?.restricoes && <p className="rounded-xl bg-alerta-fundo px-3.5 py-2 text-[13px] text-alerta"><strong>Restrição:</strong> {c.restricoes}</p>}
          <div className="grid grid-cols-2 gap-2">
            {(['retirada', 'entrega'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}
                className={cn('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold', tipo === t ? 'border-cacau-500 bg-cacau-50 text-cacau-700' : 'border-borda text-choco-700 hover:bg-creme')}>
                {t === 'retirada' ? <Store className="size-4" /> : <Truck className="size-4" />}{t === 'retirada' ? 'Retirada' : 'Entrega'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Data" htmlFor="np-data"><Input id="np-data" type="date" min={hojeIso()} value={data} onChange={(e) => setData(e.target.value)} /></Campo>
            <Campo rotulo="Horário" htmlFor="np-hora"><Input id="np-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></Campo>
          </div>
          {curto && <p className="rounded-xl bg-alerta-fundo px-3.5 py-2 text-[13px] text-alerta">Antecedência menor que o mínimo configurado ({antecedencia} h).</p>}
          <Campo rotulo="Origem" htmlFor="np-orig">
            <Select id="np-orig" value={origem} onChange={(e) => setOrigem(e.target.value)}>
              {origensPedido.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </Select>
          </Campo>
        </div>
      </Modal>
      <FormularioCliente aberto={novoCliente} onAbertoChange={setNovoCliente} clientes={[]} onSalvo={(id) => setCliente(id)} />
    </>
  )
}
