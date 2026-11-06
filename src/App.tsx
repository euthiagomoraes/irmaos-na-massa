import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Carregando } from '@/components/ui'
import { navegacao } from '@/config/navegacao'
import { configuracaoAusente } from '@/lib/supabase'

const LoginPage = lazy(() => import('@/features/auth/paginas').then((m) => ({ default: m.LoginPage })))
const CadastroPage = lazy(() => import('@/features/auth/paginas').then((m) => ({ default: m.CadastroPage })))
const RecuperarSenhaPage = lazy(() => import('@/features/auth/paginas').then((m) => ({ default: m.RecuperarSenhaPage })))
const RedefinirSenhaPage = lazy(() => import('@/features/auth/paginas').then((m) => ({ default: m.RedefinirSenhaPage })))
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ConfiguracoesPage = lazy(() => import('@/features/configuracoes/ConfiguracoesPage').then((m) => ({ default: m.ConfiguracoesPage })))
const ModuloPlanejado = lazy(() => import('@/features/em-construcao/ModuloPlanejado').then((m) => ({ default: m.ModuloPlanejado })))

function TelaCarregando() {
  return (
    <div className="fundo-confeitaria grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3">
        <img src="/icone.png" alt="" className="size-20 animate-pulse rounded-full" />
        <Carregando texto="Preparando sua confeitaria…" className="py-0" />
      </div>
    </div>
  )
}

/** Exige login e uma empresa vinculada. */
function Protegida({ children }: { children: ReactNode }) {
  const { carregando, sessao, empresa, recuperandoSenha } = useAuth()
  const { pathname } = useLocation()
  if (carregando) return <TelaCarregando />
  if (!sessao) return <Navigate to="/login" replace state={{ de: pathname }} />
  if (recuperandoSenha) return <Navigate to="/redefinir-senha" replace />
  if (!empresa) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

/** Rotas públicas de autenticação: redireciona quem já está logado. */
function SomenteVisitante({ children }: { children: ReactNode }) {
  const { carregando, sessao } = useAuth()
  if (carregando) return <TelaCarregando />
  if (sessao) return <Navigate to="/" replace />
  return <>{children}</>
}

function SomenteSemEmpresa({ children }: { children: ReactNode }) {
  const { carregando, sessao, empresa } = useAuth()
  if (carregando) return <TelaCarregando />
  if (!sessao) return <Navigate to="/login" replace />
  if (empresa) return <Navigate to="/" replace />
  return <>{children}</>
}

function ConfiguracaoAusente() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">Configuração incompleta</h1>
        <p className="mt-2 text-sm text-texto-suave">Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> nas variáveis de ambiente (arquivo <code>.env.local</code> ou painel da Vercel).</p>
      </div>
    </div>
  )
}

export default function App() {
  if (configuracaoAusente) return <ConfiguracaoAusente />
  return (
    <BrowserRouter>
      <Suspense fallback={<TelaCarregando />}>
        <Routes>
          <Route path="/login" element={<SomenteVisitante><LoginPage /></SomenteVisitante>} />
          <Route path="/cadastro" element={<SomenteVisitante><CadastroPage /></SomenteVisitante>} />
          <Route path="/recuperar-senha" element={<SomenteVisitante><RecuperarSenhaPage /></SomenteVisitante>} />
          <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
          <Route path="/onboarding" element={<SomenteSemEmpresa><OnboardingPage /></SomenteSemEmpresa>} />
          <Route element={<Protegida><AppLayout /></Protegida>}>
            <Route index element={<DashboardPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            {navegacao.filter((n) => n.fase > 1).map((n) => (
              <Route key={n.rota} path={n.rota.slice(1)} element={<ModuloPlanejado />} />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
