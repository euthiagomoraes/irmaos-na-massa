import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarHeart, ClipboardList, LayoutDashboard, Menu, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Atalhos mais usados no dia a dia; o resto fica em "Mais" (menu lateral). */
const atalhos = [
  { rota: '/', rotulo: 'Início', icone: LayoutDashboard },
  { rota: '/pedidos', rotulo: 'Pedidos', icone: ClipboardList },
  { rota: '/agenda', rotulo: 'Agenda', icone: CalendarHeart },
  { rota: '/estoque', rotulo: 'Estoque', icone: Package },
]

/** Navegação inferior no celular, como em um app. */
export function BarraInferior({ onMais }: { onMais: () => void }) {
  const { pathname } = useLocation()
  const emAtalho = atalhos.some((a) => (a.rota === '/' ? pathname === '/' : pathname.startsWith(a.rota)))

  return (
    <nav aria-label="Navegação rápida"
      className="pb-seguro fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-creme-claro/95 shadow-[0_-6px_20px_-12px_rgb(124_53_10/0.25)] backdrop-blur-md lg:hidden print:hidden">
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {atalhos.map(({ rota, rotulo, icone: Icone }) => (
          <li key={rota}>
            <NavLink to={rota} end={rota === '/'}
              className={({ isActive }) => cn('relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
                isActive ? 'text-cacau-700' : 'text-choco-500 active:text-cacau-600')}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="barra-ativa" className="absolute inset-x-3 top-1.5 bottom-1.5 -z-10 rounded-2xl bg-rosa-100"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                  )}
                  <Icone className="size-[21px]" aria-hidden strokeWidth={isActive ? 2.3 : 1.9} />
                  {rotulo}
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li>
          <button type="button" onClick={onMais}
            className={cn('flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
              emAtalho ? 'text-choco-500' : 'text-cacau-700')}>
            <Menu className="size-[21px]" aria-hidden />
            Mais
          </button>
        </li>
      </ul>
    </nav>
  )
}
