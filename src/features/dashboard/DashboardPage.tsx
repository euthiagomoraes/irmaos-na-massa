import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  TrendingUp, TrendingDown, Wallet, HandCoins, Receipt, PiggyBank, Landmark, ClipboardList, ChefHat, PackageCheck,
  FileText, PackageX, ArrowDownCircle, ArrowUpCircle, CalendarDays, Info, Trophy, Layers, LineChart as IconeLinha, BarChart3,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { Card, CardTitulo, Esqueleto, EstadoErro, EstadoVazio, Input, Badge, Dica } from '@/components/ui'
import { BoloDecorativo } from '@/components/three/BoloDecorativo'
import { cn, dataLocal, formatarMoeda, formatarNumero, mensagemErro, primeiroNome, saudacao, lerPreferencia, salvarPreferencia, isoLocal } from '@/lib/utils'
import { calcularPeriodo, rotulosPeriodo, type PresetPeriodo, type Periodo } from './periodos'
import { GraficoBarras, GraficoLinhas, GraficoRanking, Legenda, SERIES, rotulosMes } from './graficos'

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

/* ------------------------------------------------------------ Filtro de período */
function FiltroPeriodo({ preset, periodo, onPreset, onPersonalizado }: {
  preset: PresetPeriodo; periodo: Periodo; onPreset: (p: PresetPeriodo) => void; onPersonalizado: (p: Periodo) => void
}) {
  const presets: PresetPeriodo[] = ['hoje', 'semana', 'mes', '30dias', 'personalizado']
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div role="radiogroup" aria-label="Período" className="rolagem-fina -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={preset === p}
            onClick={() => onPreset(p)}
            className={cn(
              'h-9 shrink-0 rounded-xl px-3.5 text-[13px] font-semibold transition-colors',
              preset === p ? 'bg-choco-800 text-white shadow-suave' : 'bg-white/80 text-choco-700 hover:bg-white border border-borda',
            )}
          >
            {rotulosPeriodo[p]}
          </button>
        ))}
      </div>
      {preset === 'personalizado' && (
        <div className="flex items-center gap-2">
          <Input type="date" aria-label="Data inicial" value={periodo.inicio} max={periodo.fim} onChange={(e) => e.target.value && onPersonalizado({ ...periodo, inicio: e.target.value })} className="h-9 w-auto" />
          <span className="text-[13px] text-texto-suave">até</span>
          <Input type="date" aria-label="Data final" value={periodo.fim} min={periodo.inicio} onChange={(e) => e.target.value && onPersonalizado({ ...periodo, fim: e.target.value })} className="h-9 w-auto" />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ Cartões */
function Variacao({ atual, anterior, inverso }: { atual: number; anterior: number; inverso?: boolean }) {
  if (!anterior) return <span className="text-texto-suave">Sem base no período anterior</span>
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100
  const positivo = inverso ? pct <= 0 : pct >= 0
  const Icone = pct >= 0 ? TrendingUp : TrendingDown
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', positivo ? 'text-sucesso' : 'text-erro')}>
      <Icone className="size-3.5" aria-hidden />
      {pct >= 0 ? '+' : ''}{formatarNumero(pct.toFixed(1))}%
      <span className="font-normal text-texto-suave">vs. período anterior</span>
    </span>
  )
}

function CartaoKpi({ rotulo, valor, icone, detalhe, ajuda, destaque, negativo }: {
  rotulo: string; valor: string; icone: ReactNode; detalhe?: ReactNode; ajuda?: string; destaque?: boolean; negativo?: boolean
}) {
  return (
    <Card className={cn('relative overflow-hidden p-5 transition-shadow hover:shadow-elevada', destaque && 'border-transparent bg-gradient-to-br from-cacau-600 to-cacau-800 text-white')}>
      {destaque && <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-rosa-300/20 blur-2xl" />}
      <div className="flex items-start justify-between gap-2">
        <p className={cn('flex items-center gap-1.5 text-[13px] font-semibold', destaque ? 'text-rosa-100' : 'text-texto-suave')}>
          {rotulo}
          {ajuda && (
            <Dica conteudo={ajuda}>
              <button type="button" aria-label={`Sobre ${rotulo}`} className="rounded-full"><Info className="size-3.5 opacity-70" /></button>
            </Dica>
          )}
        </p>
        <span className={cn('grid size-9 place-items-center rounded-xl', destaque ? 'bg-white/15 text-white' : 'bg-rosa-100 text-cacau-600')}>{icone}</span>
      </div>
      <p className={cn('numeros mt-2 font-display text-[26px] leading-tight font-semibold', destaque ? 'text-white' : negativo ? 'text-erro' : 'text-choco-800')}>{valor}</p>
      {detalhe && <div className={cn('mt-1.5 text-[12.5px]', destaque ? 'text-rosa-100 [&_*]:!text-rosa-100' : '')}>{detalhe}</div>}
    </Card>
  )
}

function CartaoOperacional({ rotulo, valor, icone, para, tom = 'neutro', detalhe }: {
  rotulo: string; valor: string; icone: ReactNode; para: string; tom?: 'neutro' | 'alerta' | 'erro'; detalhe?: string
}) {
  return (
    <Link to={para} className="group flex items-center gap-3 rounded-2xl border border-borda/80 bg-white/90 p-4 shadow-suave transition hover:-translate-y-0.5 hover:shadow-elevada">
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl',
        tom === 'erro' ? 'bg-erro-fundo text-erro' : tom === 'alerta' ? 'bg-alerta-fundo text-alerta' : 'bg-creme text-cacau-600')}>
        {icone}
      </span>
      <span className="min-w-0">
        <span className="numeros block font-display text-xl leading-tight font-semibold text-choco-800">{valor}</span>
        <span className="block text-[12.5px] leading-snug text-texto-suave">{rotulo}</span>
        {detalhe && <span className="block truncate text-[11.5px] font-semibold text-erro">{detalhe}</span>}
      </span>
    </Link>
  )
}

/* ------------------------------------------------------------ Página */
export function DashboardPage() {
  const empresa = useEmpresa()
  const { perfil } = useAuth()
  const [preset, setPreset] = useState<PresetPeriodo>(() => lerPreferencia<PresetPeriodo>('inm:periodo', 'mes'))
  const [personalizado, setPersonalizado] = useState<Periodo>(() => calcularPeriodo('mes'))
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
  const textoPeriodo = periodo.inicio === periodo.fim
    ? format(dataLocal(periodo.inicio), "dd 'de' MMMM", { locale: ptBR })
    : `${format(dataLocal(periodo.inicio), 'dd/MM/yyyy')} a ${format(dataLocal(periodo.fim), 'dd/MM/yyyy')}`

  return (
    <div className="space-y-6">
      {/* Boas-vindas */}
      <Card className="relative overflow-hidden border-rosa-200/70 bg-gradient-to-br from-white via-rosa-50 to-dourado-100/60">
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto]">
          <div className="p-6 sm:p-7">
            <p className="text-[13px] font-semibold tracking-wide text-dourado-700 first-letter:uppercase">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="mt-1 text-[28px] leading-tight font-semibold sm:text-[32px]">
              {saudacao()}{perfil?.nome ? `, ${primeiroNome(perfil.nome)}` : ''}!
            </h1>
            <p className="mt-1.5 max-w-xl text-[14.5px] text-texto-suave">
              {k && k.entregas_hoje > 0
                ? `Você tem ${k.entregas_hoje} ${k.entregas_hoje === 1 ? 'entrega' : 'entregas'} hoje.`
                : 'Aqui está o resumo do seu negócio, calculado a partir dos registros reais.'}
            </p>
            <div className="mt-5">
              <FiltroPeriodo
                preset={preset}
                periodo={periodo}
                onPreset={(p) => {
                  if (p === 'personalizado' && preset !== 'personalizado') setPersonalizado(periodo)
                  setPreset(p)
                  salvarPreferencia('inm:periodo', p)
                }}
                onPersonalizado={(p) => p.inicio <= p.fim && p.fim <= isoLocal(new Date(2100, 0, 1)) && setPersonalizado(p)}
              />
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-texto-suave">
                <CalendarDays className="size-3.5" aria-hidden /> {textoPeriodo}
                {isFetching && !isLoading && <span className="text-cacau-500">· atualizando…</span>}
              </p>
            </div>
          </div>
          <BoloDecorativo className="hidden h-[230px] w-[280px] md:block" />
        </div>
      </Card>

      {error ? (
        <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} />
      ) : isLoading || !k ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Esqueleto key={i} className="h-[132px] rounded-[var(--radius-card)]" />)}
        </div>
      ) : (
        <>
          {/* Indicadores financeiros */}
          <section aria-label="Indicadores financeiros" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CartaoKpi
              destaque rotulo="Faturamento" valor={formatarMoeda(k.faturamento)} icone={<Receipt className="size-[18px]" />}
              ajuda="Soma dos pedidos confirmados no período (pela data do pedido). Não é o mesmo que dinheiro recebido."
              detalhe={<Variacao atual={k.faturamento} anterior={k.faturamento_anterior} />}
            />
            <CartaoKpi
              rotulo="Recebido" valor={formatarMoeda(k.recebido)} icone={<HandCoins className="size-[18px]" />}
              ajuda="Entradas efetivas no caixa no período (sinais, parcelas e pagamentos), já descontados estornos."
              detalhe={<span className="text-texto-suave">{k.total_vendas} {k.total_vendas === 1 ? 'venda' : 'vendas'} · ticket médio {formatarMoeda(k.ticket_medio)}</span>}
            />
            <CartaoKpi
              rotulo="Despesas do período" valor={formatarMoeda(k.despesas)} icone={<Wallet className="size-[18px]" />}
              ajuda="Despesas lançadas com competência no período (pagas ou não). Pagas no período aparecem abaixo."
              detalhe={<span className="text-texto-suave">Pagas no período: <strong className="numeros text-choco-800">{formatarMoeda(k.despesas_pagas)}</strong></span>}
            />
            <CartaoKpi
              rotulo="Lucro bruto" valor={formatarMoeda(k.lucro_bruto)} icone={<PiggyBank className="size-[18px]" />} negativo={k.lucro_bruto < 0}
              ajuda="Faturamento menos o custo dos produtos vendidos (CMV), calculado pelas fichas técnicas no momento de cada pedido."
              detalhe={<span className="text-texto-suave">CMV: <strong className="numeros text-choco-800">{formatarMoeda(k.cmv)}</strong></span>}
            />
            <CartaoKpi
              rotulo="Lucro líquido" valor={formatarMoeda(k.lucro_liquido)} icone={<Landmark className="size-[18px]" />} negativo={k.lucro_liquido < 0}
              ajuda="Lucro bruto menos as despesas do período."
              detalhe={k.margem_liquida === null ? <span className="text-texto-suave">Margem: sem faturamento no período</span> : <span className="text-texto-suave">Margem líquida: <strong className={cn('numeros', k.margem_liquida < 0 ? 'text-erro' : 'text-choco-800')}>{formatarNumero(k.margem_liquida)}%</strong></span>}
            />
            <CartaoKpi
              rotulo="Saldo de caixa" valor={formatarMoeda(k.saldo_caixa)} icone={<Wallet className="size-[18px]" />} negativo={k.saldo_caixa < 0}
              ajuda="Todas as entradas menos todas as saídas registradas no caixa até hoje."
              detalhe={<span className="text-texto-suave">Acumulado de todos os lançamentos</span>}
            />
          </section>

          {/* Operação */}
          <section aria-label="Pedidos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CartaoOperacional rotulo="Pedidos em aberto" valor={formatarNumero(k.pedidos_abertos)} icone={<ClipboardList className="size-5" />} para="/pedidos" />
            <CartaoOperacional rotulo="Em produção" valor={formatarNumero(k.pedidos_producao)} icone={<ChefHat className="size-5" />} para="/pedidos" />
            <CartaoOperacional rotulo="Aguardando retirada" valor={formatarNumero(k.pedidos_retirada)} icone={<PackageCheck className="size-5" />} para="/pedidos" />
            <CartaoOperacional rotulo="Orçamentos pendentes" valor={formatarNumero(k.orcamentos_pendentes)} icone={<FileText className="size-5" />} para="/pedidos" />
          </section>
          <section aria-label="Estoque e contas" className="grid gap-3 sm:grid-cols-3">
            <CartaoOperacional rotulo="Insumos com estoque baixo" valor={formatarNumero(k.estoque_baixo)} icone={<PackageX className="size-5" />} para="/estoque" tom={k.estoque_baixo ? 'alerta' : 'neutro'} />
            <CartaoOperacional
              rotulo="Contas a pagar em aberto" valor={formatarMoeda(k.contas_pagar)} icone={<ArrowUpCircle className="size-5" />} para="/financeiro"
              tom={k.contas_pagar_vencidas ? 'erro' : 'neutro'} detalhe={k.contas_pagar_vencidas ? `${formatarMoeda(k.contas_pagar_vencidas)} vencidas` : undefined}
            />
            <CartaoOperacional
              rotulo="Contas a receber em aberto" valor={formatarMoeda(k.contas_receber)} icone={<ArrowDownCircle className="size-5" />} para="/financeiro"
              tom={k.contas_receber_vencidas ? 'alerta' : 'neutro'} detalhe={k.contas_receber_vencidas ? `${formatarMoeda(k.contas_receber_vencidas)} em atraso` : undefined}
            />
          </section>

          {/* Gráficos */}
          <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card className="pb-4">
              <CardTitulo titulo="Receitas e despesas" descricao={`Por ${data.periodo.agrupamento === 'mes' ? 'mês' : 'dia'} no período selecionado`} icone={<IconeLinha className="size-[18px]" />} />
              {temMovimento ? (
                <div className="px-3 pt-3 sm:px-5">
                  <Legenda series={[
                    { chave: 'faturamento', nome: 'Faturamento', cor: SERIES.s1 },
                    { chave: 'despesas', nome: 'Despesas', cor: SERIES.s2 },
                    { chave: 'recebido', nome: 'Recebido', cor: SERIES.s3 },
                  ]} />
                  <div className="mt-3 -ml-2">
                    <GraficoLinhas
                      dados={data.serie as unknown as Record<string, unknown>[]}
                      agrupamento={data.periodo.agrupamento}
                      series={[
                        { chave: 'faturamento', nome: 'Faturamento', cor: SERIES.s1 },
                        { chave: 'despesas', nome: 'Despesas', cor: SERIES.s2 },
                        { chave: 'recebido', nome: 'Recebido', cor: SERIES.s3 },
                      ]}
                    />
                  </div>
                </div>
              ) : (
                <EstadoVazio icone={<IconeLinha className="size-5" />} titulo="Sem movimentação no período" descricao="Quando houver pedidos confirmados, recebimentos ou despesas, a evolução aparecerá aqui." />
              )}
            </Card>

            <Card className="pb-4">
              <CardTitulo titulo="Evolução do lucro" descricao="Faturamento − custo dos produtos − despesas" icone={<TrendingUp className="size-[18px]" />} />
              {temMovimento ? (
                <div className="mt-3 px-3 sm:px-5 -ml-2">
                  <GraficoBarras
                    dados={data.serie as unknown as Record<string, unknown>[]}
                    chaveX="data"
                    series={[{ chave: 'lucro', nome: 'Lucro', cor: SERIES.s1 }]}
                    rotuloX={(v) => format(dataLocal(v), data.periodo.agrupamento === 'mes' ? 'MMM' : 'dd/MM', { locale: ptBR })}
                    rotuloDica={(v) => format(dataLocal(v), data.periodo.agrupamento === 'mes' ? "MMMM 'de' yyyy" : "dd 'de' MMMM", { locale: ptBR })}
                    linhaZero
                  />
                </div>
              ) : (
                <EstadoVazio icone={<TrendingUp className="size-5" />} titulo="Sem lucro a exibir" descricao="O lucro é calculado automaticamente a partir de vendas, custos e despesas." />
              )}
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="pb-4">
              <CardTitulo titulo="Desempenho mensal" descricao="Últimos 6 meses" icone={<BarChart3 className="size-[18px]" />} />
              {temMensal ? (
                <div className="px-3 pt-3 sm:px-5">
                  <Legenda series={[{ chave: 'faturamento', nome: 'Faturamento', cor: SERIES.s1 }, { chave: 'despesas', nome: 'Despesas', cor: SERIES.s2 }]} />
                  <div className="mt-3 -ml-2">
                    <GraficoBarras
                      dados={data.mensal as unknown as Record<string, unknown>[]}
                      chaveX="mes"
                      series={[{ chave: 'faturamento', nome: 'Faturamento', cor: SERIES.s1 }, { chave: 'despesas', nome: 'Despesas', cor: SERIES.s2 }]}
                      rotuloX={rotulosMes.curto}
                      rotuloDica={rotulosMes.longo}
                      altura={230}
                    />
                  </div>
                </div>
              ) : (
                <EstadoVazio icone={<BarChart3 className="size-5" />} titulo="Ainda sem histórico" descricao="Os meses aparecerão conforme os pedidos forem registrados." />
              )}
            </Card>

            <Card className="pb-4">
              <CardTitulo titulo="Produtos mais vendidos" descricao="Quantidade no período" icone={<Trophy className="size-[18px]" />} />
              {temVendas && data.top_produtos.length ? (
                <div className="mt-3 px-3 sm:px-5">
                  <GraficoRanking dados={data.top_produtos} chave="quantidade" nome="Quantidade" moeda={false} />
                </div>
              ) : (
                <EstadoVazio icone={<Trophy className="size-5" />} titulo="Nenhum produto vendido" descricao="O ranking considera os itens dos pedidos confirmados." />
              )}
            </Card>

            <Card className="pb-4">
              <CardTitulo titulo="Categorias mais rentáveis" descricao="Lucro bruto por categoria" icone={<Layers className="size-[18px]" />} />
              {temVendas && data.categorias.length ? (
                <div className="mt-3 px-3 sm:px-5">
                  <GraficoRanking dados={data.categorias} chave="lucro" nome="Lucro bruto" cor={SERIES.s3} />
                </div>
              ) : (
                <EstadoVazio icone={<Layers className="size-5" />} titulo="Sem dados de categorias" descricao="Aparece quando houver vendas de produtos com categoria definida." />
              )}
            </Card>
          </section>

          {!temVendas && !temMovimento && (
            <p className="flex items-center justify-center gap-2 text-center text-[12.5px] text-texto-suave">
              <Badge tom="dourado">Fase 1</Badge> Os indicadores ganham vida conforme os módulos de cadastros, pedidos e financeiro forem entrando em uso.
            </p>
          )}
        </>
      )}
    </div>
  )
}
