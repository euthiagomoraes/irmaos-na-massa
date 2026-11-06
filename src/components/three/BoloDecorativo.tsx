import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const Bolo3D = lazy(() => import('./Bolo3D'))

function suportaWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

class LimiteErro3D extends Component<{ alternativa: ReactNode; children: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() { return { erro: true } }
  render() { return this.state.erro ? this.props.alternativa : this.props.children }
}

/**
 * Elemento decorativo: carrega o bolo 3D sob demanda apenas em telas médias/grandes,
 * com WebGL disponível e sem preferência por movimento reduzido. Caso contrário, usa a ilustração 2D.
 */
export function BoloDecorativo({ className, larguraMinima = 768 }: { className?: string; larguraMinima?: number }) {
  const [usar3D, setUsar3D] = useState(false)

  useEffect(() => {
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const larga = window.matchMedia(`(min-width: ${larguraMinima}px)`).matches
    if (!reduzido && larga && suportaWebGL()) {
      const w = window as Window & { requestIdleCallback?: Window['requestIdleCallback'] }
      if (w.requestIdleCallback) {
        const id = w.requestIdleCallback(() => setUsar3D(true), { timeout: 1200 })
        return () => window.cancelIdleCallback(id)
      }
      const t = setTimeout(() => setUsar3D(true), 300)
      return () => clearTimeout(t)
    }
  }, [larguraMinima])

  const alternativa = (
    <img src="/icone.png" alt="" className="mx-auto aspect-square h-full max-h-full rounded-full object-contain opacity-95" />
  )

  return (
    <div className={cn('relative', className)}>
      {usar3D ? (
        <LimiteErro3D alternativa={alternativa}>
          <Suspense fallback={alternativa}>
            <Bolo3D className="absolute inset-0" />
          </Suspense>
        </LimiteErro3D>
      ) : (
        alternativa
      )}
    </div>
  )
}
