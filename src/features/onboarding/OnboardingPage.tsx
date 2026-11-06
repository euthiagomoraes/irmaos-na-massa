import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { mensagemErro, primeiroNome } from '@/lib/utils'
import { Button, Campo, Input } from '@/components/ui'
import { AuthLayout } from '@/features/auth/AuthLayout'

const esquema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da confeitaria').max(120),
  whatsapp: z.string().trim().refine((v) => !v || v.replace(/\D/g, '').length >= 10, 'Informe DDD + número').optional(),
  instagram: z.string().trim().max(60).optional(),
})

export function OnboardingPage() {
  const navigate = useNavigate()
  const { perfil, recarregar, sair } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { nome: 'Irmãos na Massa', whatsapp: '', instagram: '' },
  })

  const criar = handleSubmit(async ({ nome, whatsapp, instagram }) => {
    const { error } = await supabase.rpc('criar_empresa', {
      p_nome: nome,
      p_whatsapp: whatsapp || undefined,
      p_instagram: instagram || undefined,
    })
    if (error) return void toast.error(mensagemErro(error))
    await recarregar()
    toast.success('Confeitaria criada! Tudo pronto para começar.')
    navigate('/', { replace: true })
  })

  return (
    <AuthLayout
      titulo={`Olá${perfil?.nome ? `, ${primeiroNome(perfil.nome)}` : ''}!`}
      subtitulo="Vamos configurar sua confeitaria. Você poderá alterar tudo depois em Configurações."
      rodape={<button type="button" onClick={() => void sair()} className="font-semibold text-cacau-600 hover:underline">Sair e usar outra conta</button>}
    >
      <form onSubmit={criar} className="space-y-4" noValidate>
        <Campo rotulo="Nome da confeitaria" htmlFor="nome" erro={errors.nome?.message} obrigatorio>
          <Input id="nome" aria-invalid={!!errors.nome} {...register('nome')} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="WhatsApp" htmlFor="whatsapp" erro={errors.whatsapp?.message}>
            <Input id="whatsapp" inputMode="tel" placeholder="(91) 99302-9687" aria-invalid={!!errors.whatsapp} {...register('whatsapp')} />
          </Campo>
          <Campo rotulo="Instagram" htmlFor="instagram" erro={errors.instagram?.message}>
            <Input id="instagram" placeholder="@irmaossnamassa" {...register('instagram')} />
          </Campo>
        </div>
        <div className="rounded-xl border border-dourado-300/60 bg-dourado-100/60 p-3.5 text-[13px] text-choco-700">
          <p className="flex items-center gap-1.5 font-semibold text-dourado-700"><Sparkles className="size-4" /> Já deixamos pronto para você</p>
          <p className="mt-1">Categorias do cardápio (bolos, docinhos, doces finos, cupcakes, kits…), categorias de insumos, categorias financeiras, formas de pagamento e categorias do blog.</p>
        </div>
        <Button type="submit" tamanho="lg" className="w-full" carregando={isSubmitting}>Criar minha confeitaria</Button>
      </form>
    </AuthLayout>
  )
}
