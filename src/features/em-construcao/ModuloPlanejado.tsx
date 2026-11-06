import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, Circle, ArrowLeft } from 'lucide-react'
import { navegacao, nomesFases, FASE_ATUAL } from '@/config/navegacao'
import { Badge, Button, Card } from '@/components/ui'
import { cn } from '@/lib/utils'

/** Página exibida para módulos ainda não entregues: mostra o que vem e em qual fase. */
export function ModuloPlanejado() {
  const { pathname } = useLocation()
  const item = navegacao.find((n) => n.rota === pathname)
  if (!item) return null
  const Icone = item.icone
  const fases = Object.entries(nomesFases).map(([n, nome]) => ({ n: Number(n), nome }))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-rosa-100 via-white to-dourado-100/70 p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-cacau-600 shadow-suave"><Icone className="size-7" /></span>
            <div>
              <Badge tom="dourado">Fase {item.fase} · {nomesFases[item.fase]}</Badge>
              <h1 className="mt-2 text-[28px] font-semibold">{item.rotulo}</h1>
              <p className="mt-1 text-[14.5px] text-texto-suave">{item.descricao}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-6 p-7 md:grid-cols-2">
          <div>
            <p className="mb-3 font-display text-[15px] font-semibold">O que este módulo vai fazer</p>
            <ul className="space-y-2">
              {item.recursos.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[13.5px] text-choco-700">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cacau-500" />{r}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-creme px-3.5 py-2.5 text-[12.5px] text-texto-suave">
              As tabelas, regras e travas de segurança deste módulo já estão prontas no banco de dados — falta apenas a interface.
            </p>
          </div>
          <div>
            <p className="mb-3 font-display text-[15px] font-semibold">Plano de entrega</p>
            <ol className="space-y-2">
              {fases.map((f) => (
                <li key={f.n} className={cn('flex items-center gap-2 text-[13.5px]', f.n === item.fase ? 'font-semibold text-cacau-700' : 'text-choco-700')}>
                  {f.n <= FASE_ATUAL ? <CheckCircle2 className="size-4 text-sucesso" /> : <Circle className={cn('size-4', f.n === item.fase ? 'text-cacau-500' : 'text-borda-forte')} />}
                  Fase {f.n} · {f.nome}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>
      <Link to="/"><Button variante="fantasma"><ArrowLeft className="size-4" />Voltar para a visão geral</Button></Link>
    </div>
  )
}
