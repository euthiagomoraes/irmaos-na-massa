// Edge Function: cria a conta (login) de uma pessoa da equipe com e-mail e senha inicial.
// Só administradores da empresa conseguem: a pessoa é lida com o token de quem chamou,
// então o RLS de pessoas_equipe (somente admins) faz a autorização.
// Depois de criada a conta, o gatilho do banco (vincular_pessoa_equipe) libera o acesso.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const autorizacao = req.headers.get('Authorization') ?? ''

    const comoUsuario = createClient(url, anon, { global: { headers: { Authorization: autorizacao } }, auth: { persistSession: false } })
    const { data: { user } } = await comoUsuario.auth.getUser()
    if (!user) return json({ erro: 'Sessão expirada. Entre novamente.' }, 401)

    const { pessoa_id, senha } = await req.json().catch(() => ({}))
    if (typeof pessoa_id !== 'string') return json({ erro: 'Pessoa não informada.' }, 400)
    if (typeof senha !== 'string' || senha.length < 8) return json({ erro: 'A senha precisa ter pelo menos 8 caracteres.' }, 400)

    const { data: pessoa } = await comoUsuario.from('pessoas_equipe')
      .select('id, nome, email, user_id, ativo').eq('id', pessoa_id).maybeSingle()
    if (!pessoa) return json({ erro: 'Somente sócios podem criar acessos.' }, 403)
    if (!pessoa.email) return json({ erro: 'Informe o e-mail da pessoa antes de criar o acesso.' }, 400)
    if (!pessoa.ativo) return json({ erro: 'Ative a pessoa antes de criar o acesso.' }, 400)
    if (pessoa.user_id) return json({ erro: 'Esta pessoa já tem acesso ao sistema.' }, 409)

    const admin = createClient(url, service, { auth: { persistSession: false } })
    const { error } = await admin.auth.admin.createUser({
      email: pessoa.email, password: senha, email_confirm: true, user_metadata: { nome: pessoa.nome },
    })
    if (error) {
      const jaExiste = /already|registered|exists/i.test(error.message)
      return json({ erro: jaExiste ? 'Já existe uma conta com este e-mail.' : error.message }, jaExiste ? 409 : 400)
    }

    const { data: atualizada } = await admin.from('pessoas_equipe').select('user_id').eq('id', pessoa.id).single()
    return json({ ok: true, vinculado: !!atualizada?.user_id })
  } catch (e) {
    return json({ erro: e instanceof Error ? e.message : 'Erro inesperado.' }, 500)
  }
})
