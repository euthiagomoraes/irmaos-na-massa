import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { LogoCompleta, Ornamento } from '@/components/marca'
import { FundoAnimado } from './FundoAnimado'

export function AuthLayout({ titulo, subtitulo, children, rodape }: { titulo: string; subtitulo?: string; children: ReactNode; rodape?: ReactNode }) {
  return (
    <div className="fundo-confeitaria relative isolate grid min-h-dvh overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      {/* Doces flutuando + gráfico de negócio crescendo, atrás de tudo */}
      <FundoAnimado className="-z-10" />

      {/* Painel da marca */}
      <section className="relative hidden border-r border-borda/60 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex w-full max-w-[520px] flex-col items-center px-10 text-center"
        >
          <LogoCompleta className="w-full max-w-[440px] drop-shadow-[0_10px_30px_rgb(124_53_10/0.12)]" />
          <Ornamento className="mt-2 w-64" />
          <p className="mt-5 max-w-sm font-display text-[19px] leading-snug text-cacau-600 italic">
            Cada pedido, cada insumo e cada centavo — organizados com o mesmo carinho que vai em cada bolo.
          </p>
        </motion.div>
      </section>

      {/* Formulário */}
      <section className="pt-seguro pb-seguro relative flex items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[420px]">
          <div className="mb-5 flex flex-col items-center lg:hidden">
            <LogoCompleta className="w-48 sm:w-56" />
            <Ornamento className="mt-1 w-36" />
          </div>
          <div className="rounded-[1.75rem] border border-borda bg-white/85 p-6 shadow-elevada backdrop-blur-md sm:p-8">
            <h1 className="text-[26px] font-semibold sm:text-[28px]">{titulo}</h1>
            {subtitulo && <p className="mt-1.5 text-[14.5px] text-texto-suave">{subtitulo}</p>}
            <div className="mt-6 sm:mt-7">{children}</div>
          </div>
          {rodape && <div className="mt-6 text-center text-[13.5px] text-texto-suave">{rodape}</div>}
        </motion.div>
      </section>
    </div>
  )
}
