import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarHeart, ChevronLeft, ChevronRight, Store, Truck } from 'lucide-react'
import { exigir, supabase, type Tabela } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { Badge, Button, Card, Carregando, EstadoErro, EstadoVazio } from '@/components/ui'
import { CabecalhoPagina, Pilulas } from '@/components/ui/estrutura'
import { cn, dataLocal, formatarMoeda, isoLocal, mensagemErro } from '@/lib/utils'
import { EditorPedido } from '@/features/pedidos/EditorPedido'
import { rotulosStatus, statusOrcamento, tomStatus } from '@/features/pedidos/utils'

type Visao = 'mes' | 'semana'
type PedidoAgenda = Tabela<'pedidos'> & { cliente: { nome: string } | null; itens: { descricao: string; quantidade: number }[] }

export function AgendaPage() {
  const empresa = useEmpresa()
  const [params, setParams] = useSearchParams()
  const [visao, setVisao] = useState<Visao>('mes')
  const [ref, setRef] = useState(new Date())
  const [diaSel, setDiaSel] = useState(isoLocal(new Date()))
  const [incluirOrcamentos, setIncluirOrcamentos] = useState(false)

  const inicio = visao === 'mes' ? startOfWeek(startOfMonth(ref), { weekStartsOn: 0 }) : startOfWeek(ref, { weekStartsOn: 0 })
  const fim = visao === 'mes' ? endOfWeek(endOfMonth(ref), { weekStartsOn: 0 }) : endOfWeek(ref, { weekStartsOn: 0 })
  const dias = eachDayOfInterval({ start: inicio, end: fim })

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pedidos', empresa.id, 'agenda', isoLocal(inicio), isoLocal(fim)],
    queryFn: async () => exigir(await supabase.from('pedidos')
      .select('*, cliente:clientes(nome), itens:pedido_itens(descricao, quantidade)')
      .eq('empresa_id', empresa.id).gte('data_entrega', isoLocal(inicio)).lte('data_entrega', isoLocal(fim))
      .neq('status', 'cancelado').order('horario_entrega', { nullsFirst: false })) as PedidoAgenda[],
  })

  const porDia = useMemo(() => {
    const m = new Map<string, PedidoAgenda[]>()
    for (const p of data) {
      if (!incluirOrcamentos && statusOrcamento.includes(p.status)) continue
      const l = m.get(p.data_entrega!) ?? []
      l.push(p)
      m.set(p.data_entrega!, l)
    }
    return m
  }, [data, incluirOrcamentos])

  const mover = (n: number) => setRef(visao === 'mes' ? addMonths(ref, n) : addWeeks(ref, n))
  const doDia = porDia.get(diaSel) ?? []
  const titulo = visao === 'mes' ? format(ref, "MMMM 'de' yyyy", { locale: ptBR }) : `${format(inicio, 'dd/MM')} a ${format(fim, 'dd/MM/yyyy')}`

  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Agenda" descricao="Entregas e retiradas por dia, com a carga de produção." />
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-1">
          <Button variante="fantasma" tamanho="icone" aria-label="Anterior" onClick={() => mover(-1)}><ChevronLeft className="size-5" /></Button>
          <Button variante="fantasma" tamanho="icone" aria-label="Próximo" onClick={() => mover(1)}><ChevronRight className="size-5" /></Button>
          <p className="ml-1 font-display text-[18px] font-semibold first-letter:uppercase">{titulo}</p>
        </div>
        <Button variante="contorno" tamanho="sm" onClick={() => { setRef(new Date()); setDiaSel(isoLocal(new Date())) }}>Hoje</Button>
        <label className="flex items-center gap-2 text-[13px] text-choco-700">
          <input type="checkbox" className="size-4 accent-cacau-600" checked={incluirOrcamentos} onChange={(e) => setIncluirOrcamentos(e.target.checked)} />Mostrar orçamentos
        </label>
        <div className="ml-auto"><Pilulas ativa={visao} onChange={setVisao} opcoes={[{ id: 'mes', rotulo: 'Mês' }, { id: 'semana', rotulo: 'Semana' }]} /></div>
      </Card>

      {isLoading ? <Carregando /> : error ? <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} /> : (
        <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 border-b border-borda bg-creme/50 text-center text-[11.5px] font-semibold tracking-wide text-texto-suave uppercase">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {dias.map((d) => {
                const iso = isoLocal(d)
                const lista = porDia.get(iso) ?? []
                const unidades = lista.reduce((s, p) => s + p.itens.reduce((a, i) => a + Number(i.quantidade), 0), 0)
                return (
                  <button key={iso} type="button" onClick={() => setDiaSel(iso)}
                    className={cn('flex flex-col gap-1 border-r border-b border-borda/70 p-1.5 text-left transition-colors hover:bg-rosa-50 sm:p-2',
                      visao === 'mes' ? 'min-h-20 sm:min-h-28' : 'min-h-64', !isSameMonth(d, ref) && visao === 'mes' && 'bg-creme/40 text-texto-suave',
                      diaSel === iso && 'bg-rosa-50 ring-2 ring-cacau-500 ring-inset')}>
                    <span className={cn('grid size-6 place-items-center rounded-full text-[12.5px] font-semibold', isToday(d) && 'bg-cacau-600 text-white')}>{format(d, 'd')}</span>
                    {lista.length > 0 && (
                      <>
                        <span className="hidden flex-col gap-0.5 sm:flex">
                          {lista.slice(0, visao === 'mes' ? 3 : 12).map((p) => (
                            <span key={p.id} className={cn('truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                              statusOrcamento.includes(p.status) ? 'bg-dourado-100 text-dourado-700' : p.status === 'entregue' ? 'bg-creme-escuro text-texto-suave line-through' : 'bg-rosa-100 text-cacau-700')}>
                              {p.horario_entrega?.slice(0, 5)} {p.cliente?.nome ?? `#${p.numero}`}
                            </span>
                          ))}
                          {lista.length > (visao === 'mes' ? 3 : 12) && <span className="text-[11px] text-texto-suave">+{lista.length - (visao === 'mes' ? 3 : 12)}</span>}
                        </span>
                        <span className="mt-auto text-[10.5px] font-semibold text-cacau-700 sm:hidden">{lista.length}</span>
                        {unidades > 0 && <span className="mt-auto hidden text-[10.5px] text-texto-suave sm:block">{unidades} un. a produzir</span>}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="h-fit overflow-hidden">
            <div className="border-b border-borda px-5 py-3.5">
              <p className="font-display text-[16px] font-semibold first-letter:uppercase">{format(dataLocal(diaSel), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              <p className="text-[12.5px] text-texto-suave">{doDia.length} {doDia.length === 1 ? 'pedido' : 'pedidos'} · {formatarMoeda(doDia.reduce((s, p) => s + Number(p.total), 0))}</p>
            </div>
            {doDia.length === 0 ? <EstadoVazio icone={<CalendarHeart className="size-6" />} titulo="Dia livre" className="py-8" /> : (
              <ul className="divide-y divide-borda/70">
                {doDia.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setParams({ id: p.id })} className="w-full px-5 py-3 text-left hover:bg-rosa-50">
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-[13px] font-semibold tabular-nums">{p.horario_entrega?.slice(0, 5) ?? '--:--'}</span>
                        {p.tipo_entrega === 'entrega' ? <Truck className="size-3.5 text-texto-suave" /> : <Store className="size-3.5 text-texto-suave" />}
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-choco-800">{p.cliente?.nome ?? 'Sem cliente'}</span>
                        <span className="text-[12px] text-texto-suave">#{p.numero}</span>
                      </div>
                      <ul className="mt-1 pl-14 text-[12.5px] text-choco-700">
                        {p.itens.slice(0, 4).map((i, k) => <li key={k} className="truncate">{Number(i.quantidade)}× {i.descricao}</li>)}
                      </ul>
                      <div className="mt-1.5 flex items-center gap-2 pl-14">
                        <Badge tom={tomStatus[p.status]} className="py-0 text-[11px]">{rotulosStatus[p.status]}</Badge>
                        {Number(p.saldo) > 0 && <span className="text-[11.5px] text-alerta">falta {formatarMoeda(p.saldo)}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-borda px-5 py-3">
              <Button variante="fantasma" tamanho="sm" onClick={() => setDiaSel(isoLocal(addDays(dataLocal(diaSel), 1)))}>Próximo dia<ChevronRight className="size-3.5" /></Button>
            </div>
          </Card>
        </div>
      )}
      <EditorPedido pedidoId={params.get('id')} onFechar={() => setParams({})} />
    </div>
  )
}
