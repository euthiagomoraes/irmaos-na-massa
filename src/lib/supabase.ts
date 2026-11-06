import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const configuracaoAusente = !url || !key

/** Cliente único do Supabase. Usa apenas a chave publicável — o acesso é protegido por RLS. */
export const supabase = createClient<Database>(url ?? 'http://localhost', key ?? 'ausente', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

export type Tabela<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
