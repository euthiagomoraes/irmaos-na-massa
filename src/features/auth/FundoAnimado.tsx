import type { CSSProperties, ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/* Fundo da tela de login: doces flutuando + elementos de negócio (moedas, gráfico crescendo).
   Só CSS + SVG (leve, sem WebGL). Com "reduzir movimento" ligado, fica estático. */

const C = {
  caramelo: '#7C350A', chocolate: '#7B2C05', rosa: '#E2745C', rosaClaro: '#F4A58E', pessego: '#FBCDB9',
  dourado: '#E2AB75', douradoEsc: '#D18A45', creme: '#FFF8EF', oliva: '#8A8650',
}

/* ------------------------------------------------------------ Ilustrações */
const Cupcake = () => (
  <svg viewBox="0 0 64 64">
    <path d="M14 34h36l-5 24H19z" fill={C.dourado} />
    <path d="M22 34l2 24M30 34l1 24M38 34l-1 24M45 34l-2 24" stroke={C.douradoEsc} strokeWidth="2" />
    <path d="M12 35c-2-7 4-12 9-11 0-7 8-11 13-7 5-4 13 0 12 7 6-1 10 5 7 11z" fill={C.rosaClaro} />
    <path d="M18 29c4 2 9 2 13 0M33 29c4 2 9 2 13 0" stroke={C.rosa} strokeWidth="2" fill="none" strokeLinecap="round" />
    <circle cx="33" cy="12" r="5" fill={C.rosa} />
    <path d="M33 7c1-3 4-5 6-5" stroke={C.oliva} strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
)
const FatiaBolo = () => (
  <svg viewBox="0 0 64 64">
    <path d="M8 44L56 30v20L8 58z" fill={C.chocolate} />
    <path d="M8 44L56 30v6L8 50z" fill={C.pessego} />
    <path d="M8 44L56 30 40 18 8 36z" fill={C.creme} />
    <path d="M8 36l32-18 16 12-4 3c-2-3-6-3-7 0-2-2-6-2-7 1-2-2-6-1-6 2-3-1-6 0-6 3-3-1-6 1-6 3z" fill={C.rosaClaro} />
    <circle cx="38" cy="16" r="4" fill={C.rosa} />
  </svg>
)
const Macaron = () => (
  <svg viewBox="0 0 64 64">
    <ellipse cx="32" cy="24" rx="22" ry="11" fill={C.rosaClaro} />
    <rect x="12" y="29" width="40" height="7" rx="3.5" fill={C.creme} />
    <ellipse cx="32" cy="41" rx="22" ry="11" fill={C.rosaClaro} />
    <path d="M12 25c6 3 34 3 40 0M12 40c6-3 34-3 40 0" stroke={C.rosa} strokeWidth="2" fill="none" />
  </svg>
)
const Donut = () => (
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="24" fill={C.dourado} />
    <path d="M10 30c0-13 10-22 22-22s22 9 22 22c-3 3-5-2-8 1s-4 5-7 2-5 2-8 0-5-3-8 0-6-1-8 1-4-1-5-4z" fill={C.chocolate} />
    <circle cx="32" cy="32" r="8" fill={C.creme} />
    <path d="M20 18l3 2M40 15l-2 3M46 26l3-1M27 13l1 3M17 27l3-1" stroke={C.rosaClaro} strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)
const Moeda = () => (
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="26" fill={C.dourado} />
    <circle cx="32" cy="32" r="20" fill="none" stroke={C.douradoEsc} strokeWidth="2.5" />
    <text x="32" y="40" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="20" fill={C.caramelo}>R$</text>
  </svg>
)
const Estrela = () => (
  <svg viewBox="0 0 24 24"><path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" fill={C.dourado} /></svg>
)

/* ------------------------------------------------------------ Peças posicionadas */
type Var = CSSProperties & Record<`--${string}`, string | number>

function Peca({ children, className, estilo, animar, tipo = 'flutuar' }: { children: ReactNode; className: string; estilo: Var; animar: boolean; tipo?: 'flutuar' | 'subir' }) {
  return (
    <div aria-hidden style={estilo}
      className={cn('absolute', animar && (tipo === 'subir' ? 'anima-subir' : 'anima-flutuar'), className)}>
      {children}
    </div>
  )
}

/* Doces que flutuam em posições fixas */
const flutuantes = [
  { el: <Cupcake />, cls: 'top-[8%] left-[6%] size-16 sm:size-20', v: { '--duracao': '10s', '--giro': '-8deg', '--dy': '-16px', opacity: 0.55 } },
  { el: <Macaron />, cls: 'top-[16%] right-[8%] size-12 sm:size-16', v: { '--duracao': '8s', '--atraso': '-2s', '--giro': '10deg', opacity: 0.5 } },
  { el: <FatiaBolo />, cls: 'bottom-[24%] left-[3%] size-14 sm:size-20', v: { '--duracao': '11s', '--atraso': '-4s', '--giro': '6deg', '--dx': '10px', opacity: 0.45 } },
  { el: <Donut />, cls: 'bottom-[10%] right-[6%] size-14 sm:size-[4.5rem]', v: { '--duracao': '9s', '--atraso': '-1s', '--giro': '-12deg', opacity: 0.5 } },
  { el: <Moeda />, cls: 'top-[42%] right-[3%] size-10 sm:size-12', v: { '--duracao': '7s', '--atraso': '-3s', '--giro': '14deg', opacity: 0.55 } },
  { el: <Cupcake />, cls: 'top-[55%] left-[44%] hidden size-12 lg:block', v: { '--duracao': '12s', '--atraso': '-6s', '--giro': '8deg', opacity: 0.3 } },
]

/* Moedas e mini doces que sobem devagar (lucro subindo) */
const subindo = [
  { el: <Moeda />, left: '12%', tam: 'size-7', v: { '--duracao': '19s', '--atraso': '0s', '--dx': '30px', '--opacidade': 0.45 } },
  { el: <Moeda />, left: '33%', tam: 'size-5', v: { '--duracao': '23s', '--atraso': '-8s', '--dx': '-20px', '--opacidade': 0.35 } },
  { el: <Macaron />, left: '58%', tam: 'size-8', v: { '--duracao': '26s', '--atraso': '-4s', '--dx': '25px', '--opacidade': 0.35 } },
  { el: <Moeda />, left: '76%', tam: 'size-6', v: { '--duracao': '21s', '--atraso': '-13s', '--dx': '-30px', '--opacidade': 0.4 } },
  { el: <Donut />, left: '88%', tam: 'size-7', v: { '--duracao': '28s', '--atraso': '-18s', '--dx': '-15px', '--opacidade': 0.3 } },
  { el: <Moeda />, left: '47%', tam: 'size-6', v: { '--duracao': '24s', '--atraso': '-16s', '--dx': '20px', '--opacidade': 0.35 } },
]

const estrelas = [
  { cls: 'top-[12%] left-[38%] size-3', v: { '--duracao': '3s' } },
  { cls: 'top-[30%] left-[18%] size-2', v: { '--duracao': '2.4s', '--atraso': '-1s' } },
  { cls: 'top-[70%] right-[20%] size-3', v: { '--duracao': '3.4s', '--atraso': '-2s' } },
  { cls: 'top-[8%] right-[30%] size-2', v: { '--duracao': '2.8s', '--atraso': '-0.5s' } },
  { cls: 'bottom-[30%] left-[30%] size-2.5', v: { '--duracao': '3.2s', '--atraso': '-1.6s' } },
]

/* Gráfico de barras crescendo + linha de tendência (o lado "negócio") */
function GraficoNegocio({ animar }: { animar: boolean }) {
  const barras = [28, 40, 34, 52, 60, 74]
  return (
    <svg viewBox="0 0 220 110" className="absolute bottom-0 left-1/2 h-auto w-[min(640px,110vw)] -translate-x-1/2 opacity-[0.16]" aria-hidden>
      {barras.map((h, i) => (
        <rect key={i} x={14 + i * 34} y={100 - h} width="20" height={h} rx="4" fill={i % 2 ? C.rosa : C.caramelo}
          className={animar ? 'anima-barra' : undefined} style={{ '--atraso': `${i * 0.18}s` } as Var} />
      ))}
      <path d="M10 82 C40 76 52 70 72 66 S108 58 126 44 S170 30 206 14" fill="none" stroke={C.caramelo} strokeWidth="3" strokeLinecap="round"
        pathLength={1} className={animar ? 'anima-tracar' : undefined} />
      <path d="M198 10l9 3-5 8" fill="none" stroke={C.caramelo} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="4" y1="101" x2="216" y2="101" stroke={C.caramelo} strokeWidth="1.5" />
    </svg>
  )
}

export function FundoAnimado({ className }: { className?: string }) {
  const animar = !useReducedMotion()
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {/* Manchas de cor suaves */}
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-rosa-300/25 blur-3xl" />
      <div className="absolute -right-24 -bottom-32 size-[28rem] rounded-full bg-dourado-300/30 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 size-72 -translate-x-1/2 rounded-full bg-rosa-200/20 blur-3xl" />

      <GraficoNegocio animar={animar} />

      {subindo.map((s, i) => (
        <Peca key={`s${i}`} tipo="subir" animar={animar} className={cn('-bottom-12', s.tam)}
          estilo={{ left: s.left, ...(animar ? {} : { display: 'none' }), ...s.v } as Var}>{s.el}</Peca>
      ))}
      {flutuantes.map((f, i) => (
        <Peca key={`f${i}`} animar={animar} className={f.cls} estilo={f.v as unknown as Var}>{f.el}</Peca>
      ))}
      {estrelas.map((e, i) => (
        <div key={`e${i}`} className={cn('absolute', animar && 'anima-cintilar', e.cls)} style={e.v as unknown as Var}><Estrela /></div>
      ))}
    </div>
  )
}
