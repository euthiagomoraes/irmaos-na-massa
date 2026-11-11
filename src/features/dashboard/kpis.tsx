import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import { Info, TrendingDown, TrendingUp } from 'lucide-react'
import { Dica } from '@/components/ui'
import { cn, formatarMoeda, formatarNumero } from '@/lib/utils'

/* ------------------------------------------------------------ Número que "conta" até o valor */
export function ValorAnimado({ valor, formatar = formatarMoeda }: { valor: number; formatar?: (n: number) => string }) {
  const reduzir = useReducedMotion()
  const anterior = useRef(0)
  const [exibido, setExibido] = useState(reduzir ? valor : 0)

  useEffect(() => {
    if (reduzir) { setExibido(valor); anterior.current = valor; return }
    const controle = animate(anterior.current, valor, {
      duration: 0.9, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setExibido(v),
    })
    anterior.current = valor
    return () => controle.stop()
  }, [valor, reduzir])

  return <span className="numeros">{formatar(exibido)}</span>
}

/* ------------------------------------------------------------ Mini gráfico de tendência */
export function Sparkline({ valores, cor = 'currentColor', className }: { valores: number[]; cor?: string; className?: string }) {
  const id = useId()
  const reduzir = useReducedMotion()
  if (valores.length < 2 || valores.every((v) => v === 0)) return null
  const L = 100, A = 32
  const min = Math.min(...valores, 0), max = Math.max(...valores)
  const faixa = max - min || 1
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * L, A - 2 - ((v - min) / faixa) * (A - 4)] as const)
  const linha = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${linha} L${L},${A} L0,${A} Z`
  const [ux, uy] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" className={cn('h-8 w-full overflow-visible', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#${id})`} initial={reduzir ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
      <motion.path d={linha} fill="none" stroke={cor} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
        initial={reduzir ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }} />
      <motion.circle cx={ux} cy={uy} r={2.6} fill={cor} vectorEffect="non-scaling-stroke"
        initial={reduzir ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 400, damping: 18 }} />
    </svg>
  )
}

/* ------------------------------------------------------------ Variação vs. período anterior */
export function Variacao({ atual, anterior, inverso, claro }: { atual: number; anterior: number; inverso?: boolean; claro?: boolean }) {
  if (!anterior) return <span className={claro ? 'text-white/70' : 'text-texto-suave'}>sem base anterior</span>
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100
  const bom = inverso ? pct <= 0 : pct >= 0
  const Icone = pct >= 0 ? TrendingUp : TrendingDown
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold',
      claro ? 'rounded-full bg-white/15 px-1.5 py-0.5 text-white' : bom ? 'text-sucesso' : 'text-erro')}>
      <Icone className="size-3.5" aria-hidden />
      {pct >= 0 ? '+' : ''}{formatarNumero(pct.toFixed(1))}%
      <span className="sr-only">{bom ? 'melhor' : 'pior'} que o período anterior</span>
    </span>
  )
}

/* ------------------------------------------------------------ Cartão de KPI compacto */
export function CartaoKpi({ rotulo, valor, icone, rodape, ajuda, destaque, negativo, tendencia, indice = 0 }: {
  rotulo: string; valor: number; icone: ReactNode; rodape?: ReactNode; ajuda?: string
  destaque?: boolean; negativo?: boolean; tendencia?: number[]; indice?: number
}) {
  const reduzir = useReducedMotion()
  return (
    <motion.article
      initial={reduzir ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: indice * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-3.5 shadow-suave sm:p-4',
        destaque ? 'border-transparent bg-gradient-to-br from-cacau-600 to-cacau-800 text-white' : 'border-borda/80 bg-white/90')}>
      {destaque && <div className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full bg-rosa-300/25 blur-2xl" />}
      <div className="flex items-center justify-between gap-2">
        <p className={cn('flex min-w-0 items-center gap-1 text-[12px] font-semibold sm:text-[12.5px]', destaque ? 'text-rosa-100' : 'text-texto-suave')}>
          <span className="truncate">{rotulo}</span>
          {ajuda && (
            <Dica conteudo={ajuda}>
              <button type="button" aria-label={`Sobre ${rotulo}`} className="shrink-0 rounded-full"><Info className="size-3.5 opacity-70" /></button>
            </Dica>
          )}
        </p>
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', destaque ? 'bg-white/15 text-white' : 'bg-rosa-100 text-cacau-600')}>{icone}</span>
      </div>
      <p className={cn('mt-1.5 truncate font-display text-[19px] leading-tight font-semibold sm:text-[22px]',
        destaque ? 'text-white' : negativo ? 'text-erro' : 'text-choco-800')}>
        <ValorAnimado valor={valor} />
      </p>
      {tendencia && <Sparkline valores={tendencia} cor={destaque ? '#FDE6DA' : negativo ? '#B0362A' : '#8A3A0C'} className="mt-1.5" />}
      {rodape && <div className={cn('mt-1.5 text-[11.5px] leading-snug sm:text-[12px]', destaque ? 'text-rosa-100' : 'text-texto-suave')}>{rodape}</div>}
    </motion.article>
  )
}

/* ------------------------------------------------------------ Para onde foi o faturamento */
export function BarraComposicao({ faturamento, cmv, despesas }: { faturamento: number; cmv: number; despesas: number }) {
  const reduzir = useReducedMotion()
  const lucro = faturamento - cmv - despesas
  const partes = [
    { nome: 'Custo dos produtos', valor: cmv, cor: '#8A3A0C' },
    { nome: 'Despesas', valor: despesas, cor: '#E06C78' },
    { nome: lucro >= 0 ? 'Lucro líquido' : 'Prejuízo', valor: Math.abs(lucro), cor: lucro >= 0 ? '#6E7A2E' : '#B0362A' },
  ]
  // Com prejuízo, a base é o que saiu (custos + despesas), não o faturamento
  const base = lucro >= 0 ? faturamento : cmv + despesas
  const pct = (v: number) => (base > 0 ? (v / base) * 100 : 0)

  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-creme" role="img"
        aria-label={partes.map((p) => `${p.nome}: ${formatarMoeda(p.valor)} (${pct(p.valor).toFixed(0)}%)`).join(', ')}>
        {partes.filter((p) => p.valor > 0).map((p, i) => (
          <motion.div key={p.nome} className="h-full first:rounded-l-full last:rounded-r-full" style={{ background: p.cor }}
            initial={reduzir ? false : { width: 0 }} animate={{ width: `${pct(p.valor)}%` }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {partes.map((p) => (
          <li key={p.nome} className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11.5px] text-texto-suave">
              <span className="size-2 shrink-0 rounded-full" style={{ background: p.cor }} aria-hidden />
              <span className="truncate">{p.nome}</span>
            </span>
            <span className="block truncate font-display text-[15px] font-semibold text-choco-800 sm:text-[16px]"><ValorAnimado valor={p.valor} /></span>
            <span className="text-[11.5px] font-semibold text-texto-suave">{pct(p.valor).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
