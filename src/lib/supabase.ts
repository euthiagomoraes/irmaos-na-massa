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
export type NovoRegistro<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type StatusPedido = Database['public']['Enums']['status_pedido']

/** Lança o erro do Supabase (para uso dentro de queryFn/mutationFn). */
export function exigir<T>(r: { data: T; error: unknown }): NonNullable<T> {
  if (r.error) throw r.error
  return r.data as NonNullable<T>
}

/** Envia uma imagem para o bucket público, em <empresa>/<pasta>/, e devolve a URL pública. */
export async function enviarImagem(empresaId: string, pasta: string, arquivo: File) {
  if (!arquivo.type.startsWith('image/')) throw new Error('Selecione uma imagem (JPG, PNG ou WebP).')
  if (arquivo.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.')
  const ext = arquivo.name.split('.').pop()?.toLowerCase() || 'jpg'
  const caminho = `${empresaId}/${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('publico').upload(caminho, arquivo, { cacheControl: '31536000', upsert: false })
  if (error) throw error
  return supabase.storage.from('publico').getPublicUrl(caminho).data.publicUrl
}
