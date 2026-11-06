import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, type Tabela } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type Papel = Database['public']['Enums']['papel_usuario']
export type Empresa = Tabela<'empresas'>
export type Perfil = Tabela<'profiles'>
export interface Vinculo { empresa: Empresa; papel: Papel }

interface AuthState {
  carregando: boolean
  sessao: Session | null
  usuario: User | null
  perfil: Perfil | null
  vinculos: Vinculo[]
  empresa: Empresa | null
  papel: Papel | null
  ehGestor: boolean
  ehAdmin: boolean
  recuperandoSenha: boolean
  recarregar: () => Promise<void>
  trocarEmpresa: (id: string) => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [recuperandoSenha, setRecuperandoSenha] = useState(false)

  const carregarDados = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null)
      setVinculos([])
      return
    }
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase
        .from('empresa_membros')
        .select('papel, empresa:empresas(*)')
        .eq('user_id', s.user.id)
        .eq('ativo', true),
    ])
    setPerfil(p ?? null)
    setVinculos(
      (m ?? [])
        .filter((v) => v.empresa)
        .map((v) => ({ papel: v.papel, empresa: v.empresa as unknown as Empresa })),
    )
  }, [])

  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      await carregarDados(data.session)
      if (ativo) setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoSenha(true)
      if (evento === 'SIGNED_OUT') {
        setRecuperandoSenha(false)
        queryClient.clear()
      }
      setSessao(s)
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT' || evento === 'USER_UPDATED') {
        // Evita chamadas ao Supabase dentro do callback (recomendação do SDK)
        setTimeout(() => {
          void carregarDados(s).finally(() => setCarregando(false))
        }, 0)
      }
    })
    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [carregarDados, queryClient])

  const empresaAtualId = perfil?.empresa_atual_id
  const vinculo = vinculos.find((v) => v.empresa.id === empresaAtualId) ?? vinculos[0] ?? null

  const recarregar = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await carregarDados(data.session)
  }, [carregarDados])

  const trocarEmpresa = useCallback(
    async (id: string) => {
      if (!sessao) return
      const { error } = await supabase.from('profiles').update({ empresa_atual_id: id }).eq('id', sessao.user.id)
      if (error) throw error
      queryClient.clear()
      await recarregar()
    },
    [sessao, queryClient, recarregar],
  )

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const valor = useMemo<AuthState>(() => {
    const papel = vinculo?.papel ?? null
    return {
      carregando,
      sessao,
      usuario: sessao?.user ?? null,
      perfil,
      vinculos,
      empresa: vinculo?.empresa ?? null,
      papel,
      ehAdmin: papel === 'proprietario' || papel === 'administrador',
      ehGestor: papel === 'proprietario' || papel === 'administrador' || papel === 'gerente',
      recuperandoSenha,
      recarregar,
      trocarEmpresa,
      sair,
    }
  }, [carregando, sessao, perfil, vinculos, vinculo, recuperandoSenha, recarregar, trocarEmpresa, sair])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

/** Retorna a empresa atual garantida (use apenas dentro das rotas protegidas). */
export function useEmpresa() {
  const { empresa } = useAuth()
  if (!empresa) throw new Error('Nenhuma empresa selecionada')
  return empresa
}

export const nomesPapeis: Record<Papel, string> = {
  proprietario: 'Proprietária(o)',
  administrador: 'Administrador(a)',
  gerente: 'Gerente',
  atendente: 'Atendimento',
  producao: 'Produção',
}
