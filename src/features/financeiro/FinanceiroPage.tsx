import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, LayoutDashboard, Plus, Receipt, RotateCcw, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useCategoriasFinanceiras, useFormasPagamento, useInvalidar } from '@/lib/consultas'
import { Badge, Button, Campo, Card, Carregando, EstadoErro, EstadoVazio, Input, Select } from '@/components/ui'
import { Abas, CabecalhoPagina, CabecalhoTabela, DialogoMotivo, Kpi, Modal, Pilulas } from '@/components/ui/estrutura'
import { cn, dataLocal, formatarMoeda, hojeIso, isoLocal, lerNumero, mensagemErro } from '@/lib/utils'
import { Contas } from './Contas'

type Aba = 'visao' | 'receber' | 'pagar' | 'caixa'

export function FinanceiroPage() {
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'visao'
  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Financeiro" descricao="Contas a pagar e a receber, fluxo de caixa e lançamentos. Faturamento (pedidos) é separado do valor recebido (caixa)." />
      <Abas ativa={aba} onChange={(a) => setParams(a === 'visao' ? {} : { aba: a }, { replace: true })} abas={[
        { id: 'visao', rotulo: 'Fluxo de caixa', icone: <LayoutDashboard className="size-4" /> },
        { id: 'receber', rotulo: 'A receber', icone: <ArrowDownCircle className="size-4" /> },
        { id: 'pagar', rotulo: 'A pagar', icone: <ArrowUpCircle className="size-4" /> },
        { id: 'caixa', rotulo: 'Lançamentos', icone: <Receipt className="size-4" /> },
      ]} />
      {aba === 'visao' && <Visao />}
      {aba === 'receber' && <Contas key="r" tipo="receber" />}
      {aba === 'pagar' && <Contas key="p" tipo="pagar" />}
      {aba === 'caixa' && <Caixa />}
    </div>
  )
}

function useLancamentos() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['financeiro', empresa.id, 'lancamentos'],
    queryFn: async () => exigir(await supabase.from('lancamentos_financeiros')
      .select('*, categoria:categorias_financeiras(nome), forma:formas_pagamento(nome)')
      .eq('empresa_id', empresa.id).order('data_lancamento', { ascending: false }).order('created_at', { ascending: false }).limit(20000)),
  })
}

function SeletorMes({ mes, onChange }: { mes: Date; onChange: (d: Date) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button variante="fantasma" tamanho="icone" aria-label="Mês anterior" onClick={() => onChange(addMonths(mes, -1))}><ChevronLeft className="size-5" /></Button>
      <p className="w-40 text-center font-display text-[17px] font-semibold first-letter:uppercase">{format(mes, "MMMM 'de' yyyy", { locale: ptBR })}</p>
      <Button variante="fantasma" tamanho="icone" aria-label="Próximo mês" onClick={() => onChange(addMonths(mes, 1))}><ChevronRight className="size-5" /></Button>
    </div>
  )
}

/* ------------------------------------------------------------ Fluxo de caixa */
function Visao() {
  const empresa = useEmpresa()
  const { data: lancs = [], isLoading, error, refetch } = useLancamentos()
  const [mes, setMes] = useState(startOfMonth(new Date()))
  const ini = isoLocal(startOfMonth(mes)), fim = isoLocal(endOfMonth(mes))

  const previstos = useQuery({
    queryKey: ['financeiro', empresa.id, 'previstos', ini, fim],
    queryFn: async () => {
      const [r, p] = await Promise.all([
        supabase.from('contas_receber').select('vencimento, valor, valor_recebido').eq('empresa_id', empresa.id).in('status', ['aberta', 'parcial']).lte('vencimento', fim),
        supabase.from('contas_pagar').select('vencimento, valor, valor_pago').eq('empresa_id', empresa.id).in('status', ['aberta', 'parcial']).lte('vencimento', fim),
      ])
      return { receber: exigir(r), pagar: exigir(p) }
    },
  })

  const resumo = useMemo(() => {
    const sinal = (l: (typeof lancs)[number]) => (l.tipo === 'entrada' ? 1 : -1) * Number(l.valor)
    const saldoTotal = lancs.reduce((s, l) => s + sinal(l), 0)
    const saldoInicial = lancs.filter((l) => l.data_lancamento < ini).reduce((s, l) => s + sinal(l), 0)
    const doMes = lancs.filter((l) => l.data_lancamento >= ini && l.data_lancamento <= fim)
    const entradas = doMes.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
    const saidas = doMes.filter((l) => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
    const hoje = hojeIso()
    let acumulado = saldoInicial
    const dias = eachDayOfInterval({ start: dataLocal(ini), end: dataLocal(fim) }).map((d) => {
      const iso = isoLocal(d)
      const e = doMes.filter((l) => l.data_lancamento === iso && l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
      const sa = doMes.filter((l) => l.data_lancamento === iso && l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
      const pe = iso >= hoje ? (previstos.data?.receber ?? []).filter((c) => (c.vencimento === iso) || (iso === hoje && c.vencimento < hoje)).reduce((s, c) => s + Number(c.valor) - Number(c.valor_recebido), 0) : 0
      const ps = iso >= hoje ? (previstos.data?.pagar ?? []).filter((c) => (c.vencimento === iso) || (iso === hoje && c.vencimento < hoje)).reduce((s, c) => s + Number(c.valor) - Number(c.valor_pago), 0) : 0
      acumulado += e - sa + pe - ps
      return { iso, e, sa, pe, ps, saldo: acumulado }
    }).filter((d) => d.e || d.sa || d.pe || d.ps)
    return { saldoTotal, saldoInicial, entradas, saidas, dias, saldoFinal: acumulado }
  }, [lancs, ini, fim, previstos.data])

  if (isLoading) return <Carregando />
  if (error) return <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} />
  const maior = Math.max(1, ...resumo.dias.map((d) => Math.max(d.e + d.pe, d.sa + d.ps)))

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <SeletorMes mes={mes} onChange={setMes} />
        <p className="text-[12.5px] text-texto-suave">Realizado (caixa) + previsto (contas em aberto a partir de hoje).</p>
      </Card>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi rotulo="Saldo em caixa hoje" valor={formatarMoeda(resumo.saldoTotal)} tom={resumo.saldoTotal < 0 ? 'erro' : undefined} />
        <Kpi rotulo="Entradas no mês" valor={formatarMoeda(resumo.entradas)} tom="sucesso" />
        <Kpi rotulo="Saídas no mês" valor={formatarMoeda(resumo.saidas)} tom={resumo.saidas > 0 ? 'erro' : undefined} />
        <Kpi rotulo="Resultado de caixa" valor={formatarMoeda(resumo.entradas - resumo.saidas)} tom={resumo.entradas - resumo.saidas < 0 ? 'erro' : 'sucesso'} />
        <Kpi rotulo="Saldo previsto no fim do mês" valor={formatarMoeda(resumo.saldoFinal)} tom={resumo.saldoFinal < 0 ? 'erro' : undefined} />
      </div>
      <Card className="overflow-hidden">
        {resumo.dias.length === 0 ? <EstadoVazio icone={<Wallet className="size-6" />} titulo="Sem movimento neste mês" descricao="Recebimentos de pedidos, pagamentos de contas e lançamentos avulsos aparecem aqui." /> : (
          <>
            <CabecalhoTabela className="grid-cols-[6rem_minmax(0,1fr)_8rem_8rem_8rem]">
              <span>Dia</span><span /><span className="text-right">Entradas</span><span className="text-right">Saídas</span><span className="text-right">Saldo</span>
            </CabecalhoTabela>
            <div className="flex justify-between border-b border-borda/70 px-5 py-2 text-[12.5px] text-texto-suave"><span>Saldo inicial</span><span className="tabular-nums">{formatarMoeda(resumo.saldoInicial)}</span></div>
            <ul className="divide-y divide-borda/70">
              {resumo.dias.map((d) => (
                <li key={d.iso} className="grid grid-cols-[5rem_1fr_auto] items-center gap-x-4 px-5 py-2.5 text-[13px] md:grid-cols-[6rem_minmax(0,1fr)_8rem_8rem_8rem]">
                  <span className="tabular-nums">{format(dataLocal(d.iso), 'dd/MM EEE', { locale: ptBR })}</span>
                  <div className="hidden flex-col gap-1 md:flex" aria-hidden>
                    <div className="flex h-2 gap-px"><div className="rounded-full bg-sucesso" style={{ width: `${(d.e / maior) * 100}%` }} /><div className="rounded-full bg-sucesso/35" style={{ width: `${(d.pe / maior) * 100}%` }} /></div>
                    <div className="flex h-2 gap-px"><div className="rounded-full bg-erro" style={{ width: `${(d.sa / maior) * 100}%` }} /><div className="rounded-full bg-erro/35" style={{ width: `${(d.ps / maior) * 100}%` }} /></div>
                  </div>
                  <span className="hidden text-right tabular-nums text-sucesso md:block">{d.e ? formatarMoeda(d.e) : ''}{d.pe ? <span className="block text-[11.5px] opacity-70">prev. {formatarMoeda(d.pe)}</span> : null}</span>
                  <span className="hidden text-right tabular-nums text-erro md:block">{d.sa ? formatarMoeda(d.sa) : ''}{d.ps ? <span className="block text-[11.5px] opacity-70">prev. {formatarMoeda(d.ps)}</span> : null}</span>
                  <span className={cn('text-right font-semibold tabular-nums', d.saldo < 0 && 'text-erro')}>{formatarMoeda(d.saldo)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------ Lançamentos */
function Caixa() {
  const { ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const { data: lancs = [], isLoading, error, refetch } = useLancamentos()
  const [mes, setMes] = useState(startOfMonth(new Date()))
  const [tipo, setTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [novo, setNovo] = useState<'entrada' | 'saida' | null>(null)
  const [estornando, setEstornando] = useState<string | null>(null)
  const ini = isoLocal(startOfMonth(mes)), fim = isoLocal(endOfMonth(mes))
  const estornados = useMemo(() => new Set(lancs.map((l) => l.estorno_de).filter(Boolean)), [lancs])
  const lista = lancs.filter((l) => l.data_lancamento >= ini && l.data_lancamento <= fim && (tipo === 'todos' || l.tipo === tipo))

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <SeletorMes mes={mes} onChange={setMes} />
        <Pilulas ativa={tipo} onChange={setTipo} opcoes={[{ id: 'todos', rotulo: 'Todos' }, { id: 'entrada', rotulo: 'Entradas' }, { id: 'saida', rotulo: 'Saídas' }]} />
        <div className="ml-auto flex gap-2">
          <Button variante="contorno" onClick={() => setNovo('entrada')}><Plus className="size-4" />Entrada</Button>
          <Button variante="contorno" onClick={() => setNovo('saida')}><Plus className="size-4" />Saída</Button>
        </div>
      </Card>
      <Card className="overflow-hidden">
        {isLoading ? <Carregando /> : error ? <div className="p-5"><EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} /></div>
          : lista.length === 0 ? <EstadoVazio icone={<Receipt className="size-6" />} titulo="Nenhum lançamento neste mês" /> : (
            <ul className="divide-y divide-borda/70">
              {lista.map((l) => {
                const anulado = !!l.estorno_de || estornados.has(l.id)
                return (
                  <li key={l.id} className={cn('flex items-center gap-3 px-5 py-3 text-[13px]', anulado && 'text-texto-suave')}>
                    <span className="w-16 tabular-nums">{format(dataLocal(l.data_lancamento), 'dd/MM')}</span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate font-medium', !anulado && 'text-choco-800')}>{l.descricao}{estornados.has(l.id) && <Badge className="ml-1.5 py-0 text-[11px]">Estornado</Badge>}</p>
                      <p className="truncate text-[12px] text-texto-suave">{[(l.categoria as { nome: string } | null)?.nome, (l.forma as { nome: string } | null)?.nome].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className={cn('font-semibold tabular-nums', !anulado && (l.tipo === 'entrada' ? 'text-sucesso' : 'text-erro'))}>{l.tipo === 'entrada' ? '+' : '−'}{formatarMoeda(l.valor)}</span>
                    {ehGestor && !anulado ? (
                      <Button variante="fantasma" tamanho="icone" className="size-7" title="Estornar" aria-label="Estornar lançamento" onClick={() => setEstornando(l.id)}><RotateCcw className="size-3.5" /></Button>
                    ) : <span className="w-7" />}
                  </li>
                )
              })}
            </ul>
          )}
      </Card>
      <LancamentoAvulso tipo={novo} onFechar={() => setNovo(null)} />
      <DialogoMotivo aberto={!!estornando} onAbertoChange={(v) => { if (!v) setEstornando(null) }} titulo="Estornar lançamento" perigo botao="Estornar"
        descricao="Gera o lançamento inverso. Se for pagamento de conta ou pedido, o saldo volta a ficar em aberto."
        onConfirmar={async (m) => {
          const { error: e } = await supabase.rpc('estornar_lancamento', { p_lancamento: estornando!, p_motivo: m })
          if (e) { toast.error(mensagemErro(e)); throw e }
          await invalidar('financeiro', 'pedidos')
          toast.success('Lançamento estornado.')
        }} />
    </div>
  )
}

function LancamentoAvulso({ tipo, onFechar }: { tipo: 'entrada' | 'saida' | null; onFechar: () => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: categorias = [] } = useCategoriasFinanceiras()
  const { data: formas = [] } = useFormasPagamento()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataL, setDataL] = useState(hojeIso())
  const [categoria, setCategoria] = useState('')
  const [forma, setForma] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const n = lerNumero(valor)
  const valido = descricao.trim().length >= 2 && n > 0

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido || !tipo) return
    setOcupado(true)
    const { error } = await supabase.rpc('lancamento_avulso', {
      p_empresa: empresa.id, p_tipo: tipo, p_valor: n, p_descricao: descricao.trim(), p_categoria: categoria || undefined,
      p_data: dataL, p_forma: forma || undefined, p_chave: crypto.randomUUID(),
    })
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('financeiro')
    toast.success('Lançamento registrado.')
    setDescricao(''); setValor('')
    onFechar()
  }

  return (
    <Modal aberto={!!tipo} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={tipo === 'entrada' ? 'Nova entrada de caixa' : 'Nova saída de caixa'} largura="max-w-md" onSubmit={salvar}
      descricao="Para movimentos sem conta vinculada (ex.: aporte, retirada, venda de balcão sem pedido)."
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={!valido}>Registrar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Descrição" htmlFor="la-d" obrigatorio className="sm:col-span-2"><Input id="la-d" autoFocus value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Campo>
        <Campo rotulo="Valor (R$)" htmlFor="la-v" obrigatorio><Input id="la-v" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <Campo rotulo="Data" htmlFor="la-dt"><Input id="la-dt" type="date" value={dataL} onChange={(e) => setDataL(e.target.value)} /></Campo>
        <Campo rotulo="Categoria" htmlFor="la-c">
          <Select id="la-c" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Sem categoria</option>
            {categorias.filter((c) => c.ativo && c.tipo === (tipo === 'entrada' ? 'receita' : 'despesa')).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Forma" htmlFor="la-f">
          <Select id="la-f" value={forma} onChange={(e) => setForma(e.target.value)}>
            <option value="">Não informada</option>
            {formas.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </Select>
        </Campo>
      </div>
    </Modal>
  )
}
