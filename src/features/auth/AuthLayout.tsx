import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { LogoCompleta, Ornamento } from '@/components/marca'

export function AuthLayout({ titulo, subtitulo, children, rodape }: { titulo: string; subtitulo?: string; children: ReactNode; rodape?: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-creme lg:grid-cols-[1.05fr_1fr]">
      {/* Painel da marca: mesmo creme da arte, para a logo se fundir ao fundo */}
      <section className="relative hidden overflow-hidden border-r border-borda bg-creme lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-rosa-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-32 size-[28rem] rounded-full bg-dourado-300/25 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex w-full max-w-[520px] flex-col items-center px-10 text-center"
        >
          <LogoCompleta className="w-full max-w-[460px]" />
          <Ornamento className="mt-2 w-64" />
          <p className="mt-5 max-w-sm font-display text-[19px] leading-snug text-cacau-600 italic">
            Cada pedido, cada insumo e cada centavo — organizados com o mesmo carinho que vai em cada bolo.
          </p>
        </motion.div>
      </section>

      {/* Formulário */}
      <section className="fundo-confeitaria flex items-center justify-center px-4 py-10 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[420px]">
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <LogoCompleta className="w-56" />
            <Ornamento className="mt-1 w-40" />
          </div>
          <div className="rounded-[1.75rem] border border-borda bg-white/85 p-7 shadow-elevada backdrop-blur-sm sm:p-8">
            <h1 className="text-[28px] font-semibold">{titulo}</h1>
            {subtitulo && <p className="mt-1.5 text-[14.5px] text-texto-suave">{subtitulo}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {rodape && <div className="mt-6 text-center text-[13.5px] text-texto-suave">{rodape}</div>}
        </motion.div>
      </section>
    </div>
  )
}
