import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { mensagemErro } from '@/lib/utils'
import { Button, Campo, Input } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import { useAuth } from '@/contexts/AuthContext'

const email = z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido')
const senhaForte = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
  .regex(/\d/, 'Inclua ao menos um número')

function CampoSenha({ id, registro, erro, rotulo = 'Senha', autoComplete, acao }: {
  id: string; registro: ReturnType<ReturnType<typeof useForm>['register']>; erro?: string; rotulo?: string; autoComplete: string; acao?: React.ReactNode
}) {
  const [visivel, setVisivel] = useState(false)
  return (
    <Campo rotulo={rotulo} htmlFor={id} erro={erro} acao={acao}>
      <div className="relative">
        <Input id={id} type={visivel ? 'text' : 'password'} autoComplete={autoComplete} aria-invalid={!!erro} className="pr-11" {...registro} />
        <button type="button" onClick={() => setVisivel((v) => !v)} aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'} className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-choco-500 hover:bg-creme">
          {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Campo>
  )
}

/* ------------------------------------------------------------ Login */
const esquemaLogin = z.object({ email, senha: z.string().min(1, 'Informe sua senha') })

export function LoginPage() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(esquemaLogin) })

  const entrar = handleSubmit(async ({ email, senha }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) return void toast.error(mensagemErro(error))
    navigate('/', { replace: true })
  })

  return (
    <AuthLayout titulo="Bem-vinda de volta" subtitulo="Entre para acessar a gestão da confeitaria." rodape={<>Ainda não tem conta? <Link to="/cadastro" className="font-semibold text-cacau-600 hover:underline">Criar conta</Link></>}>
      <form onSubmit={entrar} className="space-y-4" noValidate>
        <Campo rotulo="E-mail" htmlFor="email" erro={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register('email')} />
        </Campo>
        <CampoSenha
          id="senha" autoComplete="current-password" registro={register('senha')} erro={errors.senha?.message}
          acao={<Link to="/recuperar-senha" className="text-[12.5px] font-semibold text-cacau-600 hover:underline">Esqueci a senha</Link>}
        />
        <Button type="submit" tamanho="lg" className="w-full" carregando={isSubmitting}>Entrar</Button>
      </form>
    </AuthLayout>
  )
}

/* ------------------------------------------------------------ Cadastro */
const esquemaCadastro = z
  .object({ nome: z.string().trim().min(2, 'Informe seu nome'), email, senha: senhaForte, confirmacao: z.string() })
  .refine((d) => d.senha === d.confirmacao, { path: ['confirmacao'], message: 'As senhas não conferem' })

export function CadastroPage() {
  const navigate = useNavigate()
  const [enviado, setEnviado] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(esquemaCadastro) })

  const cadastrar = handleSubmit(async ({ nome, email, senha }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome }, emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) return void toast.error(mensagemErro(error))
    if (data.session) {
      toast.success('Conta criada! Vamos configurar sua confeitaria.')
      navigate('/onboarding', { replace: true })
    } else {
      setEnviado(email)
    }
  })

  if (enviado) {
    return (
      <AuthLayout titulo="Confirme seu e-mail" rodape={<Link to="/login" className="font-semibold text-cacau-600 hover:underline">Voltar para o login</Link>}>
        <div className="rounded-2xl border border-borda bg-white p-6 text-center shadow-suave">
          <MailCheck className="mx-auto size-10 text-cacau-600" />
          <p className="mt-3 text-[14.5px] text-choco-700">Enviamos um link de confirmação para <strong>{enviado}</strong>. Abra o e-mail e clique no link para ativar sua conta.</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout titulo="Criar conta" subtitulo="Comece a organizar pedidos, estoque e finanças." rodape={<>Já tem conta? <Link to="/login" className="font-semibold text-cacau-600 hover:underline">Entrar</Link></>}>
      <form onSubmit={cadastrar} className="space-y-4" noValidate>
        <Campo rotulo="Seu nome" htmlFor="nome" erro={errors.nome?.message}>
          <Input id="nome" autoComplete="name" aria-invalid={!!errors.nome} {...register('nome')} />
        </Campo>
        <Campo rotulo="E-mail" htmlFor="email" erro={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register('email')} />
        </Campo>
        <CampoSenha id="senha" autoComplete="new-password" registro={register('senha')} erro={errors.senha?.message} />
        <CampoSenha id="confirmacao" rotulo="Confirmar senha" autoComplete="new-password" registro={register('confirmacao')} erro={errors.confirmacao?.message} />
        <p className="text-[12.5px] text-texto-suave">Use ao menos 8 caracteres, com letras e números.</p>
        <Button type="submit" tamanho="lg" className="w-full" carregando={isSubmitting}>Criar conta</Button>
      </form>
    </AuthLayout>
  )
}

/* ------------------------------------------------------------ Recuperar senha */
export function RecuperarSenhaPage() {
  const [enviado, setEnviado] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(z.object({ email })) })

  const enviar = handleSubmit(async ({ email }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` })
    if (error) return void toast.error(mensagemErro(error))
    setEnviado(true)
  })

  return (
    <AuthLayout titulo="Recuperar senha" subtitulo="Enviaremos um link para você criar uma nova senha." rodape={<Link to="/login" className="font-semibold text-cacau-600 hover:underline">Voltar para o login</Link>}>
      {enviado ? (
        <div className="rounded-2xl border border-borda bg-white p-6 text-center shadow-suave">
          <MailCheck className="mx-auto size-10 text-cacau-600" />
          <p className="mt-3 text-[14.5px] text-choco-700">Se houver uma conta com este e-mail, você receberá o link em instantes. Verifique também a caixa de spam.</p>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          <Campo rotulo="E-mail" htmlFor="email" erro={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
          </Campo>
          <Button type="submit" tamanho="lg" className="w-full" carregando={isSubmitting}>Enviar link</Button>
        </form>
      )}
    </AuthLayout>
  )
}

/* ------------------------------------------------------------ Redefinir senha */
const esquemaNovaSenha = z
  .object({ senha: senhaForte, confirmacao: z.string() })
  .refine((d) => d.senha === d.confirmacao, { path: ['confirmacao'], message: 'As senhas não conferem' })

export function RedefinirSenhaPage() {
  const navigate = useNavigate()
  const { sessao, carregando } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(esquemaNovaSenha) })

  const salvar = handleSubmit(async ({ senha }) => {
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) return void toast.error(mensagemErro(error))
    toast.success('Senha alterada com sucesso!')
    navigate('/', { replace: true })
  })

  if (!carregando && !sessao) {
    return (
      <AuthLayout titulo="Link inválido ou expirado" subtitulo="Solicite um novo link de recuperação de senha." rodape={<Link to="/recuperar-senha" className="font-semibold text-cacau-600 hover:underline">Solicitar novo link</Link>}>
        <span />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout titulo="Nova senha" subtitulo="Escolha uma nova senha para sua conta.">
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <CampoSenha id="senha" rotulo="Nova senha" autoComplete="new-password" registro={register('senha')} erro={errors.senha?.message} />
        <CampoSenha id="confirmacao" rotulo="Confirmar nova senha" autoComplete="new-password" registro={register('confirmacao')} erro={errors.confirmacao?.message} />
        <Button type="submit" tamanho="lg" className="w-full" carregando={isSubmitting}>Salvar nova senha</Button>
      </form>
    </AuthLayout>
  )
}
