import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronsLeft, X } from 'lucide-react'
import { navegacao, FASE_ATUAL } from '@/config/navegacao'
import { useAuth } from '@/contexts/AuthContext'
import { Dica } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Props {
  recolhida: boolean
  onAlternar: () => void
  movelAberta: boolean
  onFecharMovel: () => void
}

function Conteudo({ recolhida, onNavegar }: { recolhida: boolean; onNavegar?: () => void }) {
  const { empresa } = useAuth()
  return (
    <>
      <div className={cn('flex items-center gap-3 px-4 pt-5 pb-4', recolhida && 'justify-center px-2')}>
        <img src="/icone.png" alt="" className="size-11 shrink-0 rounded-full ring-2 ring-white shadow-suave" />
        {!recolhida && (
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-[17px] font-semibold text-cacau-700">{empresa?.nome ?? 'Irmãos na Massa'}</p>
            <p className="text-[10.5px] font-semibold tracking-[0.18em] text-dourado-700 uppercase">Confeitaria artesanal</p>
          </div>
        )}
      </div>

      <nav aria-label="Navegação principal" className="rolagem-fina flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {navegacao.map((item) => {
          const Icone = item.icone
          const pendente = item.fase > FASE_ATUAL
          const link = (
            <NavLink
              key={item.rota}
              to={item.rota}
              end={item.rota === '/'}
              onClick={onNavegar}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-choco-700 transition-colors hover:bg-white/70 hover:text-cacau-700',
                  isActive && 'bg-white text-cacau-700 shadow-suave',
                  recolhida && 'justify-center px-0',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-ativo" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-cacau-600" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                  )}
                  <Icone className={cn('size-[18px] shrink-0', isActive ? 'text-cacau-600' : 'text-choco-500 group-hover:text-cacau-600')} aria-hidden />
                  {!recolhida && <span className="flex-1 truncate">{item.rotulo}</span>}
                  {!recolhida && pendente && (
                    <span className="rounded-md bg-creme-escuro px-1.5 py-0.5 text-[10px] font-semibold text-texto-suave">Fase {item.fase}</span>
                  )}
                </>
              )}
            </NavLink>
          )
          return recolhida ? (
            <Dica key={item.rota} conteudo={pendente ? `${item.rotulo} · Fase ${item.fase}` : item.rotulo} lado="right">
              {link}
            </Dica>
          ) : (
            link
          )
        })}
      </nav>
    </>
  )
}

export function Sidebar({ recolhida, onAlternar, movelAberta, onFecharMovel }: Props) {
  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-borda/70 bg-gradient-to-b from-rosa-50 via-creme to-creme transition-[width] duration-300 lg:flex',
          recolhida ? 'w-[76px]' : 'w-[264px]',
        )}
      >
        <Conteudo recolhida={recolhida} />
        <div className="border-t border-borda/70 p-3">
          <button
            type="button"
            onClick={onAlternar}
            aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
            className={cn('flex h-9 w-full items-center gap-2 rounded-lg px-3 text-[13px] font-medium text-texto-suave hover:bg-white/70 hover:text-cacau-700', recolhida && 'justify-center px-0')}
          >
            <ChevronsLeft className={cn('size-4 transition-transform', recolhida && 'rotate-180')} aria-hidden />
            {!recolhida && 'Recolher menu'}
          </button>
        </div>
      </aside>

      {/* Móvel */}
      {movelAberta && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-choco-900/30 backdrop-blur-[2px]" onClick={onFecharMovel} />
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-gradient-to-b from-rosa-50 to-creme shadow-elevada"
          >
            <button type="button" onClick={onFecharMovel} aria-label="Fechar menu" className="absolute top-4 right-3 grid size-9 place-items-center rounded-lg text-choco-700 hover:bg-white/70">
              <X className="size-5" />
            </button>
            <Conteudo recolhida={false} onNavegar={onFecharMovel} />
          </motion.aside>
        </div>
      )}
    </>
  )
}
