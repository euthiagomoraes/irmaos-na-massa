import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, X } from 'lucide-react'
import { Button, Campo, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------ Modal */
export function Modal({
  aberto, onAbertoChange, titulo, descricao, children, rodape, largura = 'max-w-2xl', onSubmit,
}: {
  aberto: boolean
  onAbertoChange: (v: boolean) => void
  titulo: ReactNode
  descricao?: ReactNode
  children: ReactNode
  rodape?: ReactNode
  largura?: string
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void
}) {
  const conteudo = (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {rodape && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-borda bg-creme/40 px-6 pt-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:pb-3.5">{rodape}</div>}
    </>
  )
  return (
    <Dialog.Root open={aberto} onOpenChange={onAbertoChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-choco-900/25 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            // Celular: folha que sobe de baixo (como app) · telas maiores: janela centralizada
            'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-b-0 border-borda bg-white shadow-elevada animate-folha',
            'sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border-b sm:animate-surgir',
            largura)}>
          <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-borda-forte sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3 border-b border-borda px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-xl font-semibold">{titulo}</Dialog.Title>
              <Dialog.Description className={cn('text-[13px] text-texto-suave', !descricao && 'sr-only')}>{descricao ?? titulo}</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variante="fantasma" tamanho="icone" aria-label="Fechar"><X className="size-5" /></Button></Dialog.Close>
          </div>
          {onSubmit ? (
            <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">{conteudo}</form>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">{conteudo}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ------------------------------------------------------------ Gaveta (painel lateral) */
export function Gaveta({
  aberto, onFechar, titulo, subtitulo, cabecalhoExtra, children, rodape, largura = 'max-w-xl',
}: {
  aberto: boolean
  onFechar: () => void
  titulo: ReactNode
  subtitulo?: ReactNode
  cabecalhoExtra?: ReactNode
  children: ReactNode
  rodape?: ReactNode
  largura?: string
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => { if (!v) onFechar() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-choco-900/25 backdrop-blur-[2px]" />
        <Dialog.Content className={cn('fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-borda bg-white shadow-elevada animate-surgir', largura)}>
          <div className="flex items-start gap-3 border-b border-borda bg-gradient-to-br from-white via-rosa-50 to-dourado-100/50 px-6 py-5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate font-display text-xl font-semibold">{titulo}</Dialog.Title>
              <Dialog.Description className={cn('mt-0.5 text-[13px] text-texto-suave', !subtitulo && 'sr-only')}>{subtitulo ?? titulo}</Dialog.Description>
              {cabecalhoExtra}
            </div>
            <Dialog.Close asChild><Button variante="fantasma" tamanho="icone" aria-label="Fechar"><X className="size-5" /></Button></Dialog.Close>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
          {rodape && <div className="flex flex-wrap items-center gap-2 border-t border-borda bg-creme/40 px-6 py-3.5">{rodape}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ------------------------------------------------------------ Cabeçalho de página */
export function CabecalhoPagina({ titulo, descricao, acoes }: { titulo: string; descricao?: string; acoes?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold">{titulo}</h1>
        {descricao && <p className="mt-1 text-[14px] text-texto-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}

/* ------------------------------------------------------------ Abas */
export function Abas<T extends string>({ abas, ativa, onChange, className }: {
  abas: { id: T; rotulo: string; icone?: ReactNode; contagem?: number }[]
  ativa: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-borda)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {abas.map((a) => (
        <button key={a.id} role="tab" aria-selected={ativa === a.id} onClick={() => onChange(a.id)}
          className={cn('inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors',
            ativa === a.id ? 'border-cacau-600 text-cacau-700' : 'border-transparent text-texto-suave hover:text-choco-800')}>
          {a.icone}{a.rotulo}
          {a.contagem !== undefined && a.contagem > 0 && <span className="rounded-full bg-rosa-100 px-1.5 text-[11px] text-cacau-700">{a.contagem}</span>}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ Filtros em pílula */
export function Pilulas<T extends string>({ opcoes, ativa, onChange }: {
  opcoes: { id: T; rotulo: string; contagem?: number; icone?: ReactNode }[]
  ativa: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {opcoes.map((f) => (
        <button key={f.id} role="tab" aria-selected={ativa === f.id} onClick={() => onChange(f.id)}
          className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
            ativa === f.id ? 'bg-cacau-600 text-white' : 'bg-creme text-choco-700 hover:bg-rosa-100')}>
          {f.icone}{f.rotulo}
          {f.contagem !== undefined && <span className={cn('rounded-full px-1.5 text-[11px]', ativa === f.id ? 'bg-white/20' : 'bg-white')}>{f.contagem}</span>}
        </button>
      ))}
    </div>
  )
}

export function CampoBusca({ valor, onChange, placeholder = 'Buscar…', className }: { valor: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-cinza" />
      <Input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-10" aria-label={placeholder} />
    </div>
  )
}

/* ------------------------------------------------------------ Confirmação com motivo */
export function DialogoMotivo({
  aberto, onAbertoChange, titulo, descricao, rotulo = 'Motivo', botao = 'Confirmar', perigo, obrigatorio = true, onConfirmar,
}: {
  aberto: boolean
  onAbertoChange: (v: boolean) => void
  titulo: string
  descricao?: ReactNode
  rotulo?: string
  botao?: string
  perigo?: boolean
  obrigatorio?: boolean
  onConfirmar: (motivo: string) => Promise<unknown> | void
}) {
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { if (aberto) setMotivo('') }, [aberto])
  const confirmar = async (e: FormEvent) => {
    e.preventDefault()
    if (obrigatorio && motivo.trim().length < 3) return
    setOcupado(true)
    try {
      await onConfirmar(motivo.trim())
      onAbertoChange(false)
    } finally {
      setOcupado(false)
    }
  }
  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} titulo={titulo} descricao={descricao} largura="max-w-md" onSubmit={confirmar}
      rodape={<>
        <Button variante="fantasma" onClick={() => onAbertoChange(false)}>Voltar</Button>
        <Button type="submit" variante={perigo ? 'perigo' : 'primario'} carregando={ocupado} disabled={obrigatorio && motivo.trim().length < 3}>{botao}</Button>
      </>}>
      <Campo rotulo={rotulo} htmlFor="motivo" obrigatorio={obrigatorio} dica={obrigatorio ? 'Fica registrado no histórico.' : undefined}>
        <Textarea id="motivo" autoFocus className="min-h-20" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Campo>
    </Modal>
  )
}

/* ------------------------------------------------------------ Blocos */
export function Kpi({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; tom?: 'erro' | 'alerta' | 'sucesso' }) {
  return (
    <div className="rounded-2xl border border-borda/80 bg-white px-4 py-3 shadow-suave">
      <p className="text-[11.5px] font-semibold tracking-wide text-texto-suave uppercase">{rotulo}</p>
      <p className={cn('mt-0.5 truncate font-display text-[20px] font-semibold tabular-nums',
        tom === 'erro' ? 'text-erro' : tom === 'alerta' ? 'text-alerta' : tom === 'sucesso' ? 'text-sucesso' : 'text-choco-800')}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-[12px] text-texto-suave">{detalhe}</p>}
    </div>
  )
}

export function Secao({ titulo, acao, children, className }: { titulo: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="font-display text-[15px] font-semibold">{titulo}</p>
        {acao}
      </div>
      {children}
    </section>
  )
}

/** Linha clicável acessível usada nas listas. */
export function LinhaClicavel({ onClick, className, children }: { onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={cn('cursor-pointer px-5 py-3.5 transition-colors outline-none hover:bg-rosa-50 focus-visible:bg-rosa-50', className)}>
      {children}
    </div>
  )
}

export function CabecalhoTabela({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('hidden gap-4 border-b border-borda bg-creme/50 px-5 py-2.5 text-[11.5px] font-semibold tracking-wide text-texto-suave uppercase md:grid', className)}>{children}</div>
}

export function Interruptor({ marcado, onChange, rotulo, descricao, id }: { marcado: boolean; onChange: (v: boolean) => void; rotulo: string; descricao?: string; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-borda px-3.5 py-3 hover:bg-creme/50">
      <input id={id} type="checkbox" checked={marcado} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-cacau-600" />
      <span>
        <span className="block text-[13.5px] font-semibold text-choco-800">{rotulo}</span>
        {descricao && <span className="block text-[12.5px] text-texto-suave">{descricao}</span>}
      </span>
    </label>
  )
}
