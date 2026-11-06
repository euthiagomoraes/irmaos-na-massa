import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BoloDecorativo } from '@/components/three/BoloDecorativo'

export function AuthLayout({ titulo, subtitulo, children, rodape }: { titulo: string; subtitulo?: string; children: ReactNode; rodape?: ReactNode }) {
  return (
    <div className="fundo-confeitaria grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Painel da marca */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-rosa-100 via-creme to-dourado-100 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-rosa-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-28 size-96 rounded-full bg-dourado-300/30 blur-3xl" />
        <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-10 text-center">
          <BoloDecorativo className="h-[340px] w-full" />
          <p className="mt-2 font-script text-[44px] leading-none text-cacau-600">Irmãos na Massa</p>
          <p className="mt-2 text-[11px] font-semibold tracking-[0.32em] text-dourado-700 uppercase">Confeitaria artesanal</p>
          <p className="mt-6 max-w-sm font-display text-lg text-choco-700 italic">
            Cada pedido, cada insumo e cada centavo — organizados com o mesmo carinho que vai em cada bolo.
          </p>
        </div>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <img src="/logo.webp" alt="Irmãos na Massa — Confeitaria Artesanal" className="size-40 rounded-full shadow-suave" />
          </div>
          <h1 className="text-[28px] font-semibold">{titulo}</h1>
          {subtitulo && <p className="mt-1.5 text-[14.5px] text-texto-suave">{subtitulo}</p>}
          <div className="mt-7">{children}</div>
          {rodape && <div className="mt-6 text-center text-[13.5px] text-texto-suave">{rodape}</div>}
        </motion.div>
      </section>
    </div>
  )
}
