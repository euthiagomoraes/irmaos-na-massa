import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type HTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------------------------------------------------------------- Button */
type Variante = 'primario' | 'secundario' | 'contorno' | 'fantasma' | 'perigo' | 'suave'
type Tamanho = 'sm' | 'md' | 'lg' | 'icone'

const variantes: Record<Variante, string> = {
  primario:
    'bg-cacau-600 text-white shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_6px_16px_-6px_rgb(124_53_10/0.55)] hover:bg-cacau-700 active:bg-cacau-800',
  secundario: 'bg-rosa-100 text-cacau-700 hover:bg-rosa-200',
  contorno: 'border border-borda-forte bg-white text-choco-800 hover:border-cacau-500/40 hover:bg-cacau-50',
  fantasma: 'text-choco-700 hover:bg-rosa-100/70',
  perigo: 'bg-erro text-white hover:bg-[#8F2B21]',
  suave: 'bg-white/70 text-choco-800 hover:bg-white border border-borda',
}
const tamanhos: Record<Tamanho, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
  icone: 'h-10 w-10 rounded-xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamanho?: Tamanho
  carregando?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = 'primario', tamanho = 'md', carregando, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform,color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
        variantes[variante],
        tamanhos[tamanho],
        className,
      )}
      {...props}
    >
      {carregando && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

/* ---------------------------------------------------------------- Inputs */
const baseCampo =
  'w-full rounded-xl border border-borda-forte bg-white px-3.5 text-sm text-texto placeholder:text-cinza/80 transition-[border-color,box-shadow] outline-none focus:border-cacau-500 focus:ring-4 focus:ring-cacau-500/12 disabled:bg-creme-escuro/50 disabled:text-texto-suave aria-[invalid=true]:border-erro aria-[invalid=true]:focus:ring-erro/15'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(baseCampo, 'h-11', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(baseCampo, 'min-h-24 py-2.5', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(baseCampo, 'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%236B5853%27 stroke-width=%272%27%3E%3Cpath d=%27m4 6 4 4 4-4%27/%3E%3C/svg%3E")] bg-[position:right_0.75rem_center] bg-no-repeat pr-9', className)} {...props}>
      {children}
    </select>
  )
})

export function Campo({
  rotulo, erro, dica, htmlFor, obrigatorio, children, className, acao,
}: { rotulo: string; erro?: string; dica?: ReactNode; htmlFor?: string; obrigatorio?: boolean; children: ReactNode; className?: string; acao?: ReactNode }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-choco-700">
          {rotulo}
          {obrigatorio && <span className="ml-0.5 text-cacau-500" aria-hidden>*</span>}
        </label>
        {acao}
      </div>
      {children}
      {erro ? (
        <p role="alert" className="text-[12.5px] font-medium text-erro">{erro}</p>
      ) : dica ? (
        <p className="text-[12.5px] text-texto-suave">{dica}</p>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- Card */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[var(--radius-card)] border border-borda/80 bg-white shadow-suave', className)} {...props} />
}
export function CardTitulo({ titulo, descricao, acao, icone }: { titulo: string; descricao?: string; acao?: ReactNode; icone?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="flex min-w-0 items-start gap-3">
        {icone && <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-rosa-100 text-cacau-600">{icone}</div>}
        <div className="min-w-0">
          <h3 className="font-display text-[17px] font-semibold leading-tight">{titulo}</h3>
          {descricao && <p className="mt-0.5 text-[13px] text-texto-suave">{descricao}</p>}
        </div>
      </div>
      {acao}
    </div>
  )
}

/* ---------------------------------------------------------------- Badge */
type Tom = 'neutro' | 'sucesso' | 'alerta' | 'erro' | 'info' | 'rosa' | 'dourado'
const tons: Record<Tom, string> = {
  neutro: 'bg-creme-escuro text-choco-700',
  sucesso: 'bg-sucesso-fundo text-sucesso',
  alerta: 'bg-alerta-fundo text-alerta',
  erro: 'bg-erro-fundo text-erro',
  info: 'bg-info-fundo text-info',
  rosa: 'bg-rosa-100 text-rosa-700',
  dourado: 'bg-dourado-100 text-dourado-700',
}
export function Badge({ tom = 'neutro', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tom?: Tom }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold', tons[tom], className)} {...props} />
}

/* ---------------------------------------------------------------- Estados */
export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn('esqueleto rounded-lg', className)} aria-hidden />
}

export function Carregando({ texto = 'Carregando…', className }: { texto?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-10 text-sm text-texto-suave', className)}>
      <Loader2 className="size-4 animate-spin text-cacau-500" aria-hidden />
      {texto}
    </div>
  )
}

export function EstadoVazio({ icone, titulo, descricao, acao, className }: { icone?: ReactNode; titulo: string; descricao?: ReactNode; acao?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      {icone && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-rosa-100 text-cacau-600">{icone}</div>}
      <p className="font-display text-base font-semibold text-choco-800">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-[13px] text-texto-suave">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

export function EstadoErro({ mensagem, onTentarNovamente }: { mensagem: string; onTentarNovamente?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-erro/20 bg-erro-fundo/60 px-6 py-8 text-center">
      <p className="text-sm font-semibold text-erro">Não foi possível carregar</p>
      <p className="max-w-md text-[13px] text-choco-700">{mensagem}</p>
      {onTentarNovamente && (
        <Button variante="contorno" tamanho="sm" onClick={onTentarNovamente}>Tentar novamente</Button>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- Tooltip */
export const TooltipProvider = TooltipPrimitive.Provider
export function Dica({ conteudo, children, lado = 'top' }: { conteudo: ReactNode; children: ReactNode; lado?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={lado}
          sideOffset={8}
          className="z-50 max-w-xs rounded-lg bg-choco-800 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-elevada animate-surgir"
        >
          {conteudo}
          <TooltipPrimitive.Arrow className="fill-choco-800" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
