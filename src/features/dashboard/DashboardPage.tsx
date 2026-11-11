import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Wallet, HandCoins, Receipt, Landmark, ClipboardList, ChefHat, PackageCheck, FileText, PackageX, ArrowDownCircle,
  ArrowUpCircle, CalendarDays, Trophy, LineChart as IconeLinha, PieChart, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { Card, Esqueleto, EstadoErro, EstadoVazio, Input } from '@/components/ui'
import { cn, dataLocal, formatarMoeda, formatarNumero, mensagemErro, primeiroNome, saudacao, lerPreferencia, salvarPreferencia, isoLocal } from '@/lib/utils'
import { calcularPeriodo, rotulosPeriodo, type PresetPeriodo, type Periodo } from './periodos'
import { GraficoBarras, GraficoLinhas, GraficoRanking, Legenda, SERIES, rotulosMes } from './graficos'
import { BarraComposicao, CartaoKpi, Variacao } from './kpis'

interface Kpis {
  faturamento: number; total_vendas: number; ticket_medio: number; recebido: number; despesas: number; despesas_pagas: number
  cmv: number; lucro_bruto: number; lucro_liquido: number; margem_liquida: number | null; saldo_caixa: number
  faturamento_anterior: number; despesas_anterior: number
  pedidos_abertos: number; pedidos_producao: number; pedidos_retirada: number; orcamentos_pendentes: number; entregas_hoje: number
  estoque_baixo: number; contas_pagar: number; contas_pagar_vencidas: number; contas_receber: number; contas_receber_vencidas: number
}
interface Resumo {
  periodo: { inicio: string; fim: string; agrupamento: 'dia' | 'mes' }
  kpis: Kpis
  serie: { data: string; faturamento: number; recebido: number; despesas: number; lucro: number }[]
  mensal: { mes: string; faturamento: number; despesas: number; lucro: number }[]
  top_produtos: { nome: string; quantidade: number; receita: number; lucro: number }[]
  categorias: { nome: string; receita: number; custo: number; lucro: number }[]
}

/* ------------------------------------------------------------ Controles */
function Segmentos<T extends string>({ opcoes, valor, onChange, rotulo, escuro }: {
  opcoes: { id: T; rotulo: string }[]; valor: T; onChange: (v: T) => void; rotulo: string; escuro?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="sem-barra -mx-1 flex gap-1 overflow-x-auto px-1">
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => onChange(o.id)}
          className={cn('h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold transition-colors',
            valor === o.id
              ? escuro ? 'bg-choco-800 text-white shadow-suave' : 'bg-cacau-600 text-white'
              : 'border border-borda bg-white/80 text-choco-700 hover:bg-white')}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

function CabecalhoCard({ titulo, icone, acao }: { titulo: string; icone: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-sans text-[14.5px] font-semibold text-choco-800">
        <span className="grid size-7 place-items-center rounded-lg bg-rosa-100 text-cacau-600">{icone}</span>{titulo}
      </h2>
      {acao}
    </div>
  )
}

/* ------------------------------------------------------------ Atalhos operacionais (chips) */
function Atalho({ rotulo, valor, icone, para, tom = 'neutro' }: { rotulo: string; valor: string; icone: ReactNode; para: string; tom?: 'neutro' | 'alerta' | 'erro' }) {
  return (
    <Link to={para}
      className="group flex min-w-[9.5rem] shrink-0 snap-start items-center gap-2.5 rounded-2xl border border-borda/80 bg-white/90 px-3 py-2.5 shadow-suave transition active:scale-[0.98] sm:min-w-0 sm:hover:-translate-y-0.5 sm:hover:shadow-elevada">
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-xl',
        tom === 'erro' ? 'bg-erro-fundo text-erro' : tom === 'alerta' ? 'bg-alerta-fundo text-alerta' : 'bg-creme text-cacau-600')}>{icone}</span>
      <span className="min-w-0">
        <span className="numeros block font-display text-[16px] leading-tight font-semibold text-choco-800">{valor}</span>
        <span className="block truncate text-[11.5px] leading-snug text-texto-suave">{rotulo}</span>
      </span>
    </Link>
  )
}

type Grafico = 'movimento' | 'lucro' | 'mensal'
type Ranking = 'produtos' | 'categorias'

/* ------------------------------------------------------------ Página */
export function DashboardPage() {
  const empresa = useEmpresa()
  const { perfil } = useAuth()
  const [preset, setPreset] = useState<PresetPeriodo>(() => lerPreferencia<PresetPeriodo>('inm:periodo', 'mes'))
  const [personalizado, setPersonalizado] = useState<Periodo>(() => calcularPeriodo('mes'))
  const [grafico, setGrafico] = useState<Grafico>('movimento')
  const [ranking, setRanking] = useState<Ranking>('produtos')
  const periodo = preset === 'personalizado' ? personalizado : calcularPeriodo(preset)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', empresa.id, periodo.inicio, periodo.fim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_resumo', { p_empresa: empresa.id, p_inicio: periodo.inicio, p_fim: periodo.fim })
      if (error) throw error
      return data as unknown as Resumo
    },
    placeholderData: keepPreviousData,
  })

  const k = data?.kpis
  const temVendas = (k?.total_vendas ?? 0) > 0
  const temMovimento = useMemo(() => (data?.serie ?? []).some((p) => p.faturamento || p.despesas || p.recebido), [data])
  const temMensal = useMemo(() => (data?.mensal ?? []).some((p) => p.faturamento || p.despesas), [data])
  const tendencia = useMemo(() => {
    const s = data?.serie ?? []
    return { faturamento: s.map((p) => p.faturamento), recebido: s.map((p) => p.recebido), lucro: s.map((p) => p.lucro) }
  }, [data])
  const textoPeriodo = periodo.inicio === periodo.fim
    ? format(dataLocal(periodo.inicio), "dd 'de' MMMM", { locale: ptBR })
    : `${format(dataLocal(periodo.inicio), 'dd/MM')} a ${format(dataLocal(periodo.fim), 'dd/MM/yyyy')}`
  const porDia = data?.periodo.agrupamento !== 'mes'

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Cabeçalho compacto */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-dourado-700 first-letter:uppercase">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="text-[24px] leading-tight font-semibold sm:text-[28px]">
              {saudacao()}{perfil?.nome ? `, ${primeiroNome(perfil.nome)}` : ''}!
            </h1>
          </div>
          {k && k.entregas_hoje > 0 && (
            <Link to="/agenda" className="inline-flex items-center gap-1 rounded-full bg-rosa-100 px-3 py-1 text-[12.5px] font-semibold text-cacau-700">
              {k.entregas_hoje} {k.entregas_hoje === 1 ? 'entrega' : 'entregas'} hoje <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Segmentos rotulo="Período" escuro valor={preset}
            opcoes={(['hoje', 'semana', 'mes', '30dias', 'personalizado'] as PresetPeriodo[]).map((p) => ({ id: p, rotulo: rotulosPeriodo[p] }))}
            onChange={(p) => {
              if (p === 'personalizado' && preset !== 'personalizado') setPersonalizado(periodo)
              setPreset(p)
              salvarPreferencia('inm:periodo', p)
            }} />
          <p className="flex items-center gap-1.5 text-[12px] text-texto-suave">
            <CalendarDays className="size-3.5" aria-hidden /> {textoPeriodo}
            {isFetching && !isLoading && <span className="text-cacau-500">· atualizando…</span>}
          </p>
        </div>
        {preset === 'personalizado' && (
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="Data inicial" value={periodo.inicio} max={periodo.fim} className="h-9 w-auto"
              onChange={(e) => e.target.value && e.target.value <= periodo.fim && setPersonalizado({ ...periodo, inicio: e.target.value })} />
            <span className="text-[13px] text-texto-suave">até</span>
            <Input type="date" aria-label="Data final" value={periodo.fim} min={periodo.inicio} className="h-9 w-auto"
              onChange={(e) => e.target.value && e.target.value >= periodo.inicio && e.target.value <= isoLocal(new Date(2100, 0, 1)) && setPersonalizado({ ...periodo, fim: e.target.value })} />
          </div>
        )}
      </header>

      {error ? (
        <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} />
      ) : isLoading || !k || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Esqueleto key={i} className="h-[118px] rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* KPIs principais: 2 colunas no celular, 4 no computador */}
          <section aria-label="Indicadores principais" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CartaoKpi indice={0} destaque rotulo="Faturamento" valor={k.faturamento} icone={<Receipt className="size-4" />}
              tendencia={tendencia.faturamento}
              ajuda="Soma dos pedidos confirmados no período. Não é o mesmo que dinheiro recebido."
              rodape={<Variacao claro atual={k.faturamento} anterior={k.faturamento_anterior} />} />
            <CartaoKpi indice={1} rotulo="Recebido" valor={k.recebido} icone={<HandCoins className="size-4" />}
              tendencia={tendencia.recebido}
              ajuda="Entradas efetivas no caixa no período, já descontados estornos."
              rodape={<>{k.total_vendas} {k.total_vendas === 1 ? 'venda' : 'vendas'} · ticket {formatarMoeda(k.ticket_medio)}</>} />
            <CartaoKpi indice={2} rotulo="Lucro líquido" valor={k.lucro_liquido} icone={<Landmark className="size-4" />} negativo={k.lucro_liquido < 0}
              tendencia={tendencia.lucro}
              ajuda="Faturamento − custo dos produtos − despesas do período."
              rodape={k.margem_liquida === null ? 'Sem faturamento' : <>Margem <strong className={cn('numeros', k.margem_liquida < 0 ? 'text-erro' : 'text-choco-800')}>{formatarNumero(k.margem_liquida)}%</strong></>} />
            <CartaoKpi indice={3} rotulo="Saldo de caixa" valor={k.saldo_caixa} icone={<Wallet className="size-4" />} negativo={k.saldo_caixa < 0}
              ajuda="Todas as entradas menos todas as saídas registradas no caixa até hoje."
              rodape={<>A receber <strong className="numeros text-choco-800">{formatarMoeda(k.contas_receber)}</strong></>} />
          </section>

          {/* Atalhos do dia a dia: rolagem lateral no celular */}
          <section aria-label="Operação" className="sem-barra -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 xl:grid-cols-7">
            <Atalho rotulo="Pedidos em aberto" valor={formatarNumero(k.pedidos_abertos)} icone={<ClipboardList className="size-4" />} para="/pedidos" />
            <Atalho rotulo="Em produção" valor={formatarNumero(k.pedidos_producao)} icone={<ChefHat className="size-4" />} para="/pedidos" />
            <Atalho rotulo="Para retirada" valor={formatarNumero(k.pedidos_retirada)} icone={<PackageCheck className="size-4" />} para="/pedidos" />
            <Atalho rotulo="Orçamentos" valor={formatarNumero(k.orcamentos_pendentes)} icone={<FileText className="size-4" />} para="/pedidos" />
            <Atalho rotulo="Estoque baixo" valor={formatarNumero(k.estoque_baixo)} icone={<PackageX className="size-4" />} para="/estoque" tom={k.estoque_baixo ? 'alerta' : 'neutro'} />
            <Atalho rotulo={k.contas_pagar_vencidas ? `A pagar · ${formatarMoeda(k.contas_pagar_vencidas)} vencido` : 'A pagar'} valor={formatarMoeda(k.contas_pagar)}
              icone={<ArrowUpCircle className="size-4" />} para="/financeiro" tom={k.contas_pagar_vencidas ? 'erro' : 'neutro'} />
            <Atalho rotulo={k.contas_receber_vencidas ? `A receber · ${formatarMoeda(k.contas_receber_vencidas)} atrasado` : 'A receber'} valor={formatarMoeda(k.contas_receber)}
              icone={<ArrowDownCircle className="size-4" />} para="/financeiro" tom={k.contas_receber_vencidas ? 'alerta' : 'neutro'} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            {/* Gráfico principal com abas */}
            <Card className="p-4 sm:p-5">
              <CabecalhoCard titulo="Evolução" icone={<IconeLinha className="size-4" />}
                acao={<Segmentos rotulo="Gráfico" valor={grafico} onChange={setGrafico}
                  opcoes={[{ id: 'movimento', rotulo: 'Entradas e saídas' }, { id: 'lucro', rotulo: 'Lucro' }, { id: 'mensal', rotulo: '6 meses' }]} />} />
              <div className="mt-3 min-h-[240px]">
                {grafico === 'movimento' && (temMovimento ? (
                  <>
                    <Legenda series={[{ chave: 'faturamento', nome: 'Faturamento', cor: SERIES.s1 }, { chave: 'despesas', nome: 'Despesas', cor: SERIES.s2 }, { chave: 'recebido', nome: 'Recebido', cor: SERIES.s3 }]} />
                    <div className="mt-2 -ml-3">
                      <GraficoLinhas key={`m-${periodo.inicio}-${periodo.fim}`} altura={230} dados={data.serie as unknown as Record<string, unknown>[]} agrupamento={data.periodo.agrupamento}
                        series={[{ chave: 'faturamento', nome: 'Faturamento', cor: SERIES.s1 }, { chave: 'despesas', nome: 'Despesas', cor: SERIES.s2 }, { chave: 'recebido', nome: 'Recebido', cor: SERIES.s3 }]} />
                    </div>
                  </>
                ) : <EstadoVazio icone={<IconeLinha className="size-5" />} titulo="Sem movimentação no período" descricao="Pedidos, recebimentos e despesas aparecem aqui." />)}

                {grafico === 'lucro' && (temMovimento ? (
                  <div className="-ml-3">
                    <GraficoBarras key={`l-${periodo.inicio}-${periodo.fim}`} altura={250} dados={data.serie as unknown as Record<string, unknown>[]} chaveX="data"
                      series={[{ chave: 'lucro', nome: 'Lucro', cor: SERIES.s1 }]} linhaZero
                      rotuloX={(v) => format(dataLocal(v), porDia ? 'dd/MM' : 'MMM', { locale: ptBR })}
                      rotuloDica={(v) => format(dataLocal(v), porDia ? "dd 'de' MMMM" : "MMMM 'de' yyyy", { locale: ptBR })} />
                  </div>
                ) : <EstadoVazio icone={<IconeLinha className="size-5" />} titulo="Sem lucro a exibir" descricao="Calculado a partir de vendas, custos e despesas." />)}

                {grafico === 'mensal' && (temMensal ? (
                  <>
                    <Legenda series={[{ chave: 'faturamento', nome: 'Faturamento', cor: SERIES.s1 }, { chave: 'despesas', nome: 'Despesas', cor: SERIES.s2 }]} />
                    <div className="mt-2 -ml-3">
                      <GraficoBarras altura={230} dados={data.mensal as unknown as Record<string, unknown>[]} chaveX="mes"
                        series={[{ chave: 'faturamento', nome: 'Faturamento', cor: SERIES.s1 }, { chave: 'despesas', nome: 'Despesas', cor: SERIES.s2 }]}
                        rotuloX={rotulosMes.curto} rotuloDica={rotulosMes.longo} />
                    </div>
                  </>
                ) : <EstadoVazio icone={<IconeLinha className="size-5" />} titulo="Ainda sem histórico" descricao="Os meses aparecem conforme os pedidos forem registrados." />)}
              </div>
            </Card>

            <div className="grid gap-4">
              {/* Para onde foi o faturamento */}
              <Card className="p-4 sm:p-5">
                <CabecalhoCard titulo="Para onde foi o faturamento" icone={<PieChart className="size-4" />} />
                <div className="mt-3">
                  {k.faturamento > 0 || k.despesas > 0
                    ? <BarraComposicao faturamento={k.faturamento} cmv={k.cmv} despesas={k.despesas} />
                    : <p className="py-4 text-center text-[13px] text-texto-suave">Sem vendas ou despesas no período.</p>}
                </div>
              </Card>

              {/* Ranking com abas */}
              <Card className="p-4 sm:p-5">
                <CabecalhoCard titulo="Mais vendidos" icone={<Trophy className="size-4" />}
                  acao={<Segmentos rotulo="Ranking" valor={ranking} onChange={setRanking}
                    opcoes={[{ id: 'produtos', rotulo: 'Produtos' }, { id: 'categorias', rotulo: 'Categorias' }]} />} />
                <div className="mt-3">
                  {ranking === 'produtos'
                    ? temVendas && data.top_produtos.length
                      ? <GraficoRanking key="rp" dados={data.top_produtos.slice(0, 5)} chave="quantidade" nome="Quantidade" moeda={false} />
                      : <p className="py-4 text-center text-[13px] text-texto-suave">Nenhum produto vendido no período.</p>
                    : temVendas && data.categorias.length
                      ? <GraficoRanking key="rc" dados={data.categorias.slice(0, 5)} chave="lucro" nome="Lucro bruto" cor={SERIES.s3} />
                      : <p className="py-4 text-center text-[13px] text-texto-suave">Sem vendas por categoria no período.</p>}
                </div>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
