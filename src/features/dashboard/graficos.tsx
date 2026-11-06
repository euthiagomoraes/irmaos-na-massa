import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList,
  type TooltipContentProps,
} from 'recharts'
import { dataLocal, formatarMoeda, formatarMoedaCompacta, formatarNumero } from '@/lib/utils'

/* Cores validadas (CVD + contraste) — ver src/index.css --color-serie-* */
export const SERIES = { s1: '#8A3A0C', s2: '#E06C78', s3: '#6E7A2E' }
const EIXO = { fill: '#76553F', fontSize: 11.5, fontFamily: 'DM Sans Variable' }
const GRADE = '#F0D9BF'

export interface Serie { chave: string; nome: string; cor: string }

export function Legenda({ series }: { series: Serie[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {series.map((s) => (
        <li key={s.chave} className="flex items-center gap-1.5 text-[12.5px] font-medium text-texto-suave">
          <span className="h-[3px] w-3.5 rounded-full" style={{ background: s.cor }} aria-hidden />
          {s.nome}
        </li>
      ))}
    </ul>
  )
}

function DicaGrafico({ active, payload, label, rotulo, moeda = true }: Partial<TooltipContentProps<number, string>> & { rotulo: (l: string) => string; moeda?: boolean }) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[160px] rounded-xl border border-borda bg-white px-3 py-2.5 shadow-elevada">
      <p className="mb-1.5 text-[12px] font-semibold text-choco-800">{rotulo(String(label))}</p>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 text-[12.5px]">
          <span className="flex items-center gap-1.5 text-texto-suave">
            <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
            {p.name}
          </span>
          <span className="numeros font-semibold text-choco-800">{moeda ? formatarMoeda(Number(p.value)) : formatarNumero(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

const rotuloData = (agrupamento: 'dia' | 'mes') => (v: string) =>
  format(dataLocal(v), agrupamento === 'mes' ? 'MMM/yy' : 'dd/MM', { locale: ptBR })
const rotuloDataLongo = (agrupamento: 'dia' | 'mes') => (v: string) =>
  format(dataLocal(v), agrupamento === 'mes' ? "MMMM 'de' yyyy" : "EEEE, dd 'de' MMMM", { locale: ptBR })

/** Linhas ao longo do tempo (mesma unidade: R$). */
export function GraficoLinhas({ dados, series, agrupamento, altura = 260 }: { dados: Record<string, unknown>[]; series: Serie[]; agrupamento: 'dia' | 'mes'; altura?: number }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRADE} vertical={false} />
        <XAxis dataKey="data" tickFormatter={rotuloData(agrupamento)} tick={EIXO} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tickFormatter={formatarMoedaCompacta} tick={EIXO} axisLine={false} tickLine={false} width={64} />
        <Tooltip cursor={{ stroke: '#D18A45', strokeDasharray: '4 4' }} content={<DicaGrafico rotulo={rotuloDataLongo(agrupamento)} />} />
        {series.map((s) => (
          <Line key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor} strokeWidth={2} dot={dados.length <= 12 ? { r: 3, strokeWidth: 0, fill: s.cor } : false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Barras verticais (série única ou agrupadas por período). */
export function GraficoBarras({ dados, series, chaveX, rotuloX, rotuloDica, altura = 260, linhaZero }: {
  dados: Record<string, unknown>[]; series: Serie[]; chaveX: string; rotuloX: (v: string) => string; rotuloDica: (v: string) => string; altura?: number; linhaZero?: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
        <CartesianGrid stroke={GRADE} vertical={false} />
        <XAxis dataKey={chaveX} tickFormatter={rotuloX} tick={EIXO} axisLine={false} tickLine={false} minTickGap={12} />
        <YAxis tickFormatter={formatarMoedaCompacta} tick={EIXO} axisLine={false} tickLine={false} width={64} />
        <Tooltip cursor={{ fill: 'rgb(244 165 142 / 0.16)' }} content={<DicaGrafico rotulo={rotuloDica} />} />
        {linhaZero && <ReferenceLine y={0} stroke="#C9A98A" />}
        {series.map((s) => (
          <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor} radius={[4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export const rotulosMes = {
  curto: (v: string) => format(dataLocal(v), 'MMM', { locale: ptBR }),
  longo: (v: string) => format(dataLocal(v), "MMMM 'de' yyyy", { locale: ptBR }),
}

/** Barras horizontais com rótulo de valor direto (ranking). */
export function GraficoRanking({ dados, chave, nome, cor = SERIES.s1, moeda = true }: { dados: { nome: string; [k: string]: unknown }[]; chave: string; nome: string; cor?: string; moeda?: boolean }) {
  const altura = Math.max(dados.length * 40 + 16, 120)
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 0 }} barCategoryGap="30%">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="nome" tick={{ ...EIXO, fill: '#4A2410', fontSize: 12 }} axisLine={false} tickLine={false} width={160} interval={0} />
        <Tooltip cursor={{ fill: 'rgb(244 165 142 / 0.16)' }} content={<DicaGrafico rotulo={(l) => l} moeda={moeda} />} />
        <Bar dataKey={chave} name={nome} fill={cor} radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList dataKey={chave} position="right" formatter={(v: unknown) => (moeda ? formatarMoedaCompacta(Number(v)) : formatarNumero(Number(v)))} style={{ fill: '#4A2410', fontSize: 12, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
