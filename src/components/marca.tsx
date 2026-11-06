import { cn } from '@/lib/utils'

/** Filete dourado com coração ao centro — reproduz o ornamento da logo. */
export function Ornamento({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)} aria-hidden>
      <span className="filete flex-1" />
      <svg viewBox="0 0 24 20" className="size-3.5 shrink-0 text-dourado-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 18s-7.5-4.6-9.4-9.1C1.3 5.7 3.3 2.5 6.5 2.5c2.2 0 3.6 1.4 5.5 3.6 1.9-2.2 3.3-3.6 5.5-3.6 3.2 0 5.2 3.2 3.9 6.4C19.5 13.4 12 18 12 18Z" />
      </svg>
      <span className="filete flex-1" />
    </div>
  )
}

/** Logo oficial completa. O recorte radial esconde as bordas do fundo creme da arte. */
export function LogoCompleta({ className, recorte = true }: { className?: string; recorte?: boolean }) {
  return (
    <img
      style={recorte ? { maskImage: 'radial-gradient(closest-side, #000 91%, transparent 100%)', WebkitMaskImage: 'radial-gradient(closest-side, #000 91%, transparent 100%)' } : undefined}
      src="/logo.webp"
      alt="Irmãos na Massa — Confeitaria Artesanal"
      width={800}
      height={800}
      className={cn('aspect-square select-none object-contain', className)}
      draggable={false}
    />
  )
}

/** Selo circular (bolo + batedor) para espaços pequenos. */
export function SeloMarca({ className }: { className?: string }) {
  return <img src="/icone.png" alt="" className={cn('aspect-square rounded-full object-cover', className)} draggable={false} />
}
