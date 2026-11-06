import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Carregando } from '@/components/ui'
import { lerPreferencia, salvarPreferencia } from '@/lib/utils'

export function AppLayout() {
  const [recolhida, setRecolhida] = useState(() => lerPreferencia('inm:menu-recolhido', false))
  const [movelAberta, setMovelAberta] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="fundo-confeitaria flex min-h-dvh">
      <div className="contents print:hidden"><Sidebar
        recolhida={recolhida}
        onAlternar={() => setRecolhida((v) => { salvarPreferencia('inm:menu-recolhido', !v); return !v })}
        movelAberta={movelAberta}
        onFecharMovel={() => setMovelAberta(false)}
      /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="contents print:hidden"><Topbar onAbrirMenu={() => setMovelAberta(true)} /></div>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <Suspense fallback={<Carregando />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
