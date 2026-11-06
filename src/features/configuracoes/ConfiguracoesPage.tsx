import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, SlidersHorizontal, UserRound, Users, Upload, ShieldCheck, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth, useEmpresa, nomesPapeis, type Papel } from '@/contexts/AuthContext'
import { Badge, Button, Campo, Card, CardTitulo, Carregando, EstadoErro, Input, Select } from '@/components/ui'
import { cn, iniciais, mensagemErro } from '@/lib/utils'

type Aba = 'empresa' | 'parametros' | 'perfil' | 'equipe'
const abas: { id: Aba; rotulo: string; icone: typeof Building2 }[] = [
  { id: 'empresa', rotulo: 'Confeitaria', icone: Building2 },
  { id: 'parametros', rotulo: 'Parâmetros', icone: SlidersHorizontal },
  { id: 'perfil', rotulo: 'Meu perfil', icone: UserRound },
  { id: 'equipe', rotulo: 'Equipe', icone: Users },
]

const opcional = z.string().trim().max(200).optional().or(z.literal(''))
const telefone = z.string().trim().refine((v) => !v || v.replace(/\D/g, '').length >= 10, 'Informe DDD + número').optional()

/* ------------------------------------------------------------ Empresa */
const esquemaEmpresa = z.object({
  nome: z.string().trim().min(2, 'Informe o nome').max(120),
  nome_fantasia: opcional,
  documento: opcional,
  telefone, whatsapp: telefone,
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  instagram: opcional,
  logradouro: opcional, numero: opcional, bairro: opcional, cidade: opcional, uf: z.string().trim().max(2).optional(), cep: opcional,
})

function AbaEmpresa() {
  const empresa = useEmpresa()
  const { ehAdmin, recarregar } = useAuth()
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const arquivo = useRef<HTMLInputElement>(null)
  const end = (empresa.endereco ?? {}) as Record<string, string>
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(esquemaEmpresa),
    defaultValues: {
      nome: empresa.nome, nome_fantasia: empresa.nome_fantasia ?? '', documento: empresa.documento ?? '',
      telefone: empresa.telefone ?? '', whatsapp: empresa.whatsapp ?? '', email: empresa.email ?? '', instagram: empresa.instagram ?? '',
      logradouro: end.logradouro ?? '', numero: end.numero ?? '', bairro: end.bairro ?? '', cidade: end.cidade ?? '', uf: end.uf ?? '', cep: end.cep ?? '',
    },
  })

  const salvar = handleSubmit(async (v) => {
    const digitos = (s?: string) => (s ? s.replace(/\D/g, '') || null : null)
    const { error } = await supabase.from('empresas').update({
      nome: v.nome, nome_fantasia: v.nome_fantasia || null, documento: v.documento || null,
      telefone: digitos(v.telefone), whatsapp: digitos(v.whatsapp), email: v.email || null, instagram: v.instagram || null,
      endereco: { logradouro: v.logradouro, numero: v.numero, bairro: v.bairro, cidade: v.cidade, uf: v.uf?.toUpperCase(), cep: v.cep },
    }).eq('id', empresa.id)
    if (error) return void toast.error(mensagemErro(error))
    await recarregar()
    reset(v)
    toast.success('Dados da confeitaria salvos.')
  })

  const enviarLogo = async (f: File) => {
    if (!f.type.startsWith('image/')) return void toast.error('Selecione uma imagem (JPG, PNG ou WebP).')
    if (f.size > 5 * 1024 * 1024) return void toast.error('A imagem deve ter no máximo 5 MB.')
    setEnviandoLogo(true)
    try {
      const ext = f.name.split('.').pop()?.toLowerCase() || 'png'
      const caminho = `${empresa.id}/marca/logo-${Date.now()}.${ext}`
      const { error: e1 } = await supabase.storage.from('publico').upload(caminho, f, { cacheControl: '31536000', upsert: false })
      if (e1) throw e1
      const { data } = supabase.storage.from('publico').getPublicUrl(caminho)
      const { error: e2 } = await supabase.from('empresas').update({ logo_url: data.publicUrl }).eq('id', empresa.id)
      if (e2) throw e2
      await recarregar()
      toast.success('Logo atualizada.')
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setEnviandoLogo(false)
    }
  }

  return (
    <form onSubmit={salvar} noValidate>
      <fieldset disabled={!ehAdmin} className="space-y-6">
        {!ehAdmin && <p className="rounded-xl bg-alerta-fundo px-4 py-2.5 text-[13px] text-alerta">Somente administradores podem alterar estes dados.</p>}
        <div className="flex flex-wrap items-center gap-4">
          <img src={empresa.logo_url || '/logo.webp'} alt="Logo da confeitaria" className="size-20 rounded-full border border-borda bg-white object-cover" />
          <div>
            <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviarLogo(f); e.target.value = '' }} />
            <Button variante="contorno" tamanho="sm" carregando={enviandoLogo} onClick={() => arquivo.current?.click()}><Upload className="size-4" />Enviar nova logo</Button>
            <p className="mt-1 text-[12px] text-texto-suave">PNG, JPG ou WebP · até 5 MB. Usada no site e nos comprovantes.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Campo rotulo="Nome" htmlFor="nome" erro={errors.nome?.message} obrigatorio><Input id="nome" aria-invalid={!!errors.nome} {...register('nome')} /></Campo>
          <Campo rotulo="Nome fantasia" htmlFor="nome_fantasia"><Input id="nome_fantasia" {...register('nome_fantasia')} /></Campo>
          <Campo rotulo="CNPJ / CPF" htmlFor="documento"><Input id="documento" inputMode="numeric" {...register('documento')} /></Campo>
          <Campo rotulo="E-mail" htmlFor="email" erro={errors.email?.message}><Input id="email" type="email" {...register('email')} /></Campo>
          <Campo rotulo="WhatsApp" htmlFor="whatsapp" erro={errors.whatsapp?.message}><Input id="whatsapp" inputMode="tel" {...register('whatsapp')} /></Campo>
          <Campo rotulo="Telefone" htmlFor="telefone" erro={errors.telefone?.message}><Input id="telefone" inputMode="tel" {...register('telefone')} /></Campo>
          <Campo rotulo="Instagram" htmlFor="instagram"><Input id="instagram" placeholder="@irmaossnamassa" {...register('instagram')} /></Campo>
        </div>
        <div>
          <p className="mb-3 font-display text-[15px] font-semibold">Endereço</p>
          <div className="grid gap-4 md:grid-cols-6">
            <Campo rotulo="CEP" htmlFor="cep" className="md:col-span-2"><Input id="cep" inputMode="numeric" {...register('cep')} /></Campo>
            <Campo rotulo="Logradouro" htmlFor="logradouro" className="md:col-span-3"><Input id="logradouro" {...register('logradouro')} /></Campo>
            <Campo rotulo="Número" htmlFor="numero"><Input id="numero" {...register('numero')} /></Campo>
            <Campo rotulo="Bairro" htmlFor="bairro" className="md:col-span-2"><Input id="bairro" {...register('bairro')} /></Campo>
            <Campo rotulo="Cidade" htmlFor="cidade" className="md:col-span-3"><Input id="cidade" {...register('cidade')} /></Campo>
            <Campo rotulo="UF" htmlFor="uf"><Input id="uf" maxLength={2} className="uppercase" {...register('uf')} /></Campo>
          </div>
        </div>
        <div className="flex justify-end"><Button type="submit" carregando={isSubmitting} disabled={!isDirty}>Salvar alterações</Button></div>
      </fieldset>
    </form>
  )
}

/* ------------------------------------------------------------ Parâmetros */
const esquemaParametros = z.object({
  custo_hora_mao_obra: z.coerce.number().min(0, 'Valor inválido'),
  margem_lucro_padrao: z.coerce.number().min(0, 'Valor inválido').max(1000),
  dias_alerta_validade: z.coerce.number().int().min(0).max(365),
  antecedencia_minima_horas: z.coerce.number().int().min(0).max(720),
  taxa_entrega_padrao: z.coerce.number().min(0),
  validade_orcamento_dias: z.coerce.number().int().min(1).max(90),
  baixa_estoque_no_status: z.enum(['em_producao', 'pronto']),
  permitir_estoque_negativo: z.boolean(),
})

function AbaParametros() {
  const empresa = useEmpresa()
  const { ehGestor } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['configuracoes', empresa.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracoes').select('*').eq('empresa_id', empresa.id).single()
      if (error) throw error
      return data
    },
  })
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(esquemaParametros) })
  useEffect(() => { if (data) reset({ ...data, custo_hora_mao_obra: Number(data.custo_hora_mao_obra), margem_lucro_padrao: Number(data.margem_lucro_padrao), taxa_entrega_padrao: Number(data.taxa_entrega_padrao) } as never) }, [data, reset])

  const salvar = useMutation({
    mutationFn: async (v: z.infer<typeof esquemaParametros>) => {
      const { error } = await supabase.from('configuracoes').update(v).eq('empresa_id', empresa.id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Parâmetros salvos.'); void qc.invalidateQueries({ queryKey: ['configuracoes'] }) },
    onError: (e) => toast.error(mensagemErro(e)),
  })

  if (isLoading) return <Carregando />
  if (error) return <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} />

  return (
    <form onSubmit={handleSubmit((v) => salvar.mutate(v as z.infer<typeof esquemaParametros>))} noValidate>
      <fieldset disabled={!ehGestor} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Campo rotulo="Custo da hora de mão de obra (R$)" htmlFor="ch" erro={errors.custo_hora_mao_obra?.message} dica="Base para calcular a mão de obra nas receitas dos produtos.">
            <Input id="ch" type="number" step="0.01" min={0} {...register('custo_hora_mao_obra')} />
          </Campo>
          <Campo rotulo="Margem de lucro padrão (%)" htmlFor="mg" erro={errors.margem_lucro_padrao?.message} dica="Sugestão inicial na formação de preço.">
            <Input id="mg" type="number" step="0.1" min={0} {...register('margem_lucro_padrao')} />
          </Campo>
          <Campo rotulo="Taxa de entrega padrão (R$)" htmlFor="te" erro={errors.taxa_entrega_padrao?.message}>
            <Input id="te" type="number" step="0.01" min={0} {...register('taxa_entrega_padrao')} />
          </Campo>
          <Campo rotulo="Alertar validade com antecedência (dias)" htmlFor="dv" erro={errors.dias_alerta_validade?.message}>
            <Input id="dv" type="number" min={0} {...register('dias_alerta_validade')} />
          </Campo>
          <Campo rotulo="Antecedência mínima de encomendas (horas)" htmlFor="am" erro={errors.antecedencia_minima_horas?.message}>
            <Input id="am" type="number" min={0} {...register('antecedencia_minima_horas')} />
          </Campo>
          <Campo rotulo="Validade dos orçamentos (dias)" htmlFor="vo" erro={errors.validade_orcamento_dias?.message}>
            <Input id="vo" type="number" min={1} {...register('validade_orcamento_dias')} />
          </Campo>
          <Campo rotulo="Baixar insumos do estoque quando o pedido estiver" htmlFor="be" dica="A baixa acontece uma única vez por pedido.">
            <Select id="be" {...register('baixa_estoque_no_status')}>
              <option value="em_producao">Em produção</option>
              <option value="pronto">Pronto</option>
            </Select>
          </Campo>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-borda bg-creme/50 p-4">
          <input type="checkbox" className="mt-0.5 size-4 accent-cacau-600" {...register('permitir_estoque_negativo')} />
          <span>
            <span className="block text-sm font-semibold text-choco-800">Permitir estoque negativo</span>
            <span className="block text-[12.5px] text-texto-suave">Quando desativado, saídas maiores que o saldo são bloqueadas. Recomendado manter desativado.</span>
          </span>
        </label>
        <div className="flex justify-end"><Button type="submit" carregando={salvar.isPending} disabled={!isDirty}>Salvar parâmetros</Button></div>
      </fieldset>
    </form>
  )
}

/* ------------------------------------------------------------ Perfil */
function AbaPerfil() {
  const { perfil, usuario, recarregar } = useAuth()
  const form = useForm({ resolver: zodResolver(z.object({ nome: z.string().trim().min(2, 'Informe seu nome'), telefone })), defaultValues: { nome: perfil?.nome ?? '', telefone: perfil?.telefone ?? '' } })
  const senha = useForm({
    resolver: zodResolver(z.object({ senha: z.string().min(8, 'Mínimo de 8 caracteres').regex(/[A-Za-z]/, 'Inclua uma letra').regex(/\d/, 'Inclua um número'), confirmacao: z.string() }).refine((d) => d.senha === d.confirmacao, { path: ['confirmacao'], message: 'As senhas não conferem' })),
  })

  return (
    <div className="space-y-8">
      <form noValidate onSubmit={form.handleSubmit(async (v) => {
        if (!usuario) return
        const { error } = await supabase.from('profiles').update({ nome: v.nome, telefone: v.telefone?.replace(/\D/g, '') || null }).eq('id', usuario.id)
        if (error) return void toast.error(mensagemErro(error))
        await recarregar(); form.reset(v); toast.success('Perfil atualizado.')
      })} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Campo rotulo="Nome" htmlFor="pnome" erro={form.formState.errors.nome?.message}><Input id="pnome" autoComplete="name" {...form.register('nome')} /></Campo>
          <Campo rotulo="Telefone" htmlFor="ptel" erro={form.formState.errors.telefone?.message}><Input id="ptel" inputMode="tel" {...form.register('telefone')} /></Campo>
          <Campo rotulo="E-mail de acesso" htmlFor="pemail"><Input id="pemail" value={usuario?.email ?? ''} disabled readOnly /></Campo>
        </div>
        <div className="flex justify-end"><Button type="submit" carregando={form.formState.isSubmitting} disabled={!form.formState.isDirty}>Salvar perfil</Button></div>
      </form>

      <div className="border-t border-borda pt-6">
        <p className="mb-3 flex items-center gap-2 font-display text-[15px] font-semibold"><Lock className="size-4 text-cacau-600" />Alterar senha</p>
        <form noValidate onSubmit={senha.handleSubmit(async ({ senha: s }) => {
          const { error } = await supabase.auth.updateUser({ password: s })
          if (error) return void toast.error(mensagemErro(error))
          senha.reset({ senha: '', confirmacao: '' }); toast.success('Senha alterada.')
        })} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Campo rotulo="Nova senha" htmlFor="ns" erro={senha.formState.errors.senha?.message}><Input id="ns" type="password" autoComplete="new-password" {...senha.register('senha')} /></Campo>
          <Campo rotulo="Confirmar nova senha" htmlFor="cs" erro={senha.formState.errors.confirmacao?.message}><Input id="cs" type="password" autoComplete="new-password" {...senha.register('confirmacao')} /></Campo>
          <Button type="submit" variante="contorno" carregando={senha.formState.isSubmitting}>Alterar senha</Button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Equipe */
function AbaEquipe() {
  const empresa = useEmpresa()
  const { usuario, ehAdmin } = useAuth()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [papelNovo, setPapelNovo] = useState<Papel>('atendente')
  const [adicionando, setAdicionando] = useState(false)
  const atualizarEquipe = () => qc.invalidateQueries({ queryKey: ['equipe', empresa.id] })
  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return void toast.error('Informe um e-mail válido.')
    setAdicionando(true)
    const { error: er } = await supabase.rpc('adicionar_membro', { p_empresa: empresa.id, p_email: email.trim(), p_papel: papelNovo })
    setAdicionando(false)
    if (er) return void toast.error(mensagemErro(er))
    setEmail('')
    await atualizarEquipe()
    toast.success('Membro adicionado. No próximo acesso, a pessoa já entra nesta confeitaria.')
  }
  const alterar = async (membro: string, campos: { p_papel?: Papel; p_ativo?: boolean }) => {
    const { error: er } = await supabase.rpc('alterar_membro', { p_membro: membro, ...campos })
    if (er) return void toast.error(mensagemErro(er))
    await atualizarEquipe()
  }
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['equipe', empresa.id],
    queryFn: async () => {
      const { data: membros, error } = await supabase.from('empresa_membros').select('id, user_id, papel, ativo, created_at').eq('empresa_id', empresa.id).order('created_at')
      if (error) throw error
      const ids = membros.map((m) => m.user_id)
      const { data: perfis } = await supabase.from('profiles').select('id, nome').in('id', ids)
      return membros.map((m) => ({ ...m, nome: perfis?.find((p) => p.id === m.user_id)?.nome ?? null }))
    },
  })
  if (isLoading) return <Carregando />
  if (error) return <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} />
  const descricoes: Record<Papel, string> = {
    proprietario: 'Acesso total, incluindo exclusão da empresa.',
    administrador: 'Acesso total à gestão e às configurações.',
    gerente: 'Gestão do dia a dia, exclusões e estornos.',
    atendente: 'Pedidos, clientes e consultas.',
    producao: 'Produção, receitas e estoque.',
  }
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-borda rounded-2xl border border-borda">
        {data?.map((m) => {
          const editavel = ehAdmin && m.papel !== 'proprietario' && m.user_id !== usuario?.id
          return (
            <li key={m.id} className={cn('flex flex-wrap items-center gap-3 p-4', !m.ativo && 'opacity-60')}>
              <span className="grid size-10 place-items-center rounded-full bg-rosa-100 text-[13px] font-bold text-cacau-700">{iniciais(m.nome)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-choco-800">
                  {m.nome ?? 'Sem nome'} {m.user_id === usuario?.id && <span className="font-normal text-texto-suave">(você)</span>}
                  {!m.ativo && <Badge className="ml-2 py-0 text-[11px]">Sem acesso</Badge>}
                </p>
                <p className="text-[12.5px] text-texto-suave">{descricoes[m.papel]}</p>
              </div>
              {editavel ? (
                <>
                  <Select aria-label={`Perfil de ${m.nome ?? 'membro'}`} value={m.papel} className="h-9 w-44 text-[13px]"
                    onChange={(e) => void alterar(m.id, { p_papel: e.target.value as Papel })}>
                    {(Object.keys(descricoes) as Papel[]).filter((p) => p !== 'proprietario').map((p) => <option key={p} value={p}>{nomesPapeis[p]}</option>)}
                  </Select>
                  <Button variante="fantasma" tamanho="sm" onClick={() => void alterar(m.id, { p_ativo: !m.ativo })}>{m.ativo ? 'Remover acesso' : 'Devolver acesso'}</Button>
                </>
              ) : <Badge tom={m.papel === 'proprietario' ? 'dourado' : 'neutro'}>{nomesPapeis[m.papel]}</Badge>}
            </li>
          )
        })}
      </ul>
      {ehAdmin && (
        <form onSubmit={adicionar} className="space-y-3 rounded-2xl border border-dashed border-borda-forte p-4">
          <p className="text-sm font-semibold text-choco-800">Adicionar pessoa à equipe</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <Campo rotulo="E-mail da conta" htmlFor="eq-email"><Input id="eq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.com" /></Campo>
            <Campo rotulo="Perfil" htmlFor="eq-papel">
              <Select id="eq-papel" value={papelNovo} onChange={(e) => setPapelNovo(e.target.value as Papel)}>
                {(Object.keys(descricoes) as Papel[]).filter((p) => p !== 'proprietario').map((p) => <option key={p} value={p}>{nomesPapeis[p]}</option>)}
              </Select>
            </Campo>
            <Button type="submit" carregando={adicionando} disabled={!email.trim()}>Adicionar</Button>
          </div>
          <p className="text-[12.5px] text-texto-suave">A pessoa precisa criar a conta no sistema com esse e-mail antes. Depois de adicionada, ela entra direto nesta confeitaria.</p>
        </form>
      )}
      <p className="flex items-start gap-2 rounded-xl bg-creme px-4 py-3 text-[12.5px] text-texto-suave">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cacau-600" />
        Cada perfil de acesso é aplicado diretamente no banco de dados (Row Level Security): mesmo fora do sistema, ninguém vê ou altera o que o seu perfil não permite.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------ Página */
export function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>('empresa')
  const atual = abas.find((a) => a.id === aba)!
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold">Configurações</h1>
        <p className="mt-1 text-[14px] text-texto-suave">Dados da confeitaria, parâmetros do sistema e seu perfil.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Seções" className="flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] lg:flex-col [&::-webkit-scrollbar]:hidden">
          {abas.map((a) => (
            <button key={a.id} type="button" onClick={() => setAba(a.id)} aria-current={aba === a.id ? 'page' : undefined}
              className={cn('flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-[14px] font-medium transition-colors',
                aba === a.id ? 'bg-white text-cacau-700 shadow-suave' : 'text-choco-700 hover:bg-white/60')}>
              <a.icone className="size-4" /> {a.rotulo}
            </button>
          ))}
        </nav>
        <Card className="pb-6">
          <CardTitulo titulo={atual.rotulo} icone={<atual.icone className="size-[18px]" />} />
          <div className="px-5 pt-6">
            {aba === 'empresa' && <AbaEmpresa />}
            {aba === 'parametros' && <AbaParametros />}
            {aba === 'perfil' && <AbaPerfil />}
            {aba === 'equipe' && <AbaEquipe />}
          </div>
        </Card>
      </div>
    </div>
  )
}
