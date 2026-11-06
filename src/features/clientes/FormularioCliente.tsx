import { useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, type Tabela } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { Button, Campo, Input, Select, Textarea } from '@/components/ui'
import { mensagemErro } from '@/lib/utils'
import { origensCliente } from './utils'

export type Cliente = Tabela<'clientes'>

const opcional = z.string().trim().max(200).optional().or(z.literal(''))
const telefone = z.string().trim().refine((v) => !v || v.replace(/\D/g, '').length >= 10, 'Informe DDD + número').optional()

const esquema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome').max(150),
  whatsapp: telefone,
  telefone,
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  data_nascimento: z.string().optional().refine((v) => !v || new Date(v) <= new Date(), 'Data no futuro'),
  origem: opcional,
  indicado_por: opcional,
  preferencias: z.string().trim().max(500).optional(),
  restricoes: z.string().trim().max(1000).optional(),
  observacoes: z.string().trim().max(2000).optional(),
  cep: opcional, logradouro: opcional, numero: opcional, complemento: opcional, bairro: opcional, cidade: opcional,
  uf: z.string().trim().max(2).optional(), referencia: opcional,
})
type Valores = z.infer<typeof esquema>

function valoresIniciais(c?: Cliente | null): Valores {
  const e = (c?.endereco ?? {}) as Record<string, string>
  return {
    nome: c?.nome ?? '', whatsapp: c?.whatsapp ?? '', telefone: c?.telefone ?? '', email: c?.email ?? '',
    data_nascimento: c?.data_nascimento ?? '', origem: c?.origem ?? '', indicado_por: c?.indicado_por ?? '',
    preferencias: (c?.preferencias ?? []).join(', '), restricoes: c?.restricoes ?? '', observacoes: c?.observacoes ?? '',
    cep: e.cep ?? '', logradouro: e.logradouro ?? '', numero: e.numero ?? '', complemento: e.complemento ?? '',
    bairro: e.bairro ?? '', cidade: e.cidade ?? '', uf: e.uf ?? '', referencia: e.referencia ?? '',
  }
}

export function FormularioCliente({
  aberto, onAbertoChange, cliente, clientes, onSalvo,
}: {
  aberto: boolean
  onAbertoChange: (v: boolean) => void
  cliente?: Cliente | null
  clientes: Cliente[]
  onSalvo?: (id: string) => void
}) {
  const empresa = useEmpresa()
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: valoresIniciais(cliente),
  })
  useEffect(() => { if (aberto) reset(valoresIniciais(cliente)) }, [aberto, cliente, reset])

  const salvar = handleSubmit(async (v) => {
    const digitos = (s?: string) => (s ? s.replace(/\D/g, '') || null : null)
    const vazio = (s?: string) => (s && s.trim() ? s.trim() : null)
    const dados = {
      nome: v.nome,
      whatsapp: digitos(v.whatsapp),
      telefone: digitos(v.telefone),
      email: vazio(v.email)?.toLowerCase() ?? null,
      data_nascimento: vazio(v.data_nascimento),
      origem: vazio(v.origem),
      indicado_por: vazio(v.indicado_por),
      preferencias: (v.preferencias ?? '').split(',').map((p) => p.trim()).filter(Boolean),
      restricoes: vazio(v.restricoes),
      observacoes: vazio(v.observacoes),
      endereco: {
        cep: v.cep, logradouro: v.logradouro, numero: v.numero, complemento: v.complemento,
        bairro: v.bairro, cidade: v.cidade, uf: v.uf?.toUpperCase(), referencia: v.referencia,
      },
    }
    const resp = cliente
      ? await supabase.from('clientes').update(dados).eq('id', cliente.id).eq('empresa_id', empresa.id).select('id').single()
      : await supabase.from('clientes').insert({ ...dados, empresa_id: empresa.id }).select('id').single()
    if (resp.error) return void toast.error(mensagemErro(resp.error))
    await qc.invalidateQueries({ queryKey: ['clientes', empresa.id] })
    toast.success(cliente ? 'Cliente atualizado.' : 'Cliente cadastrado.')
    onAbertoChange(false)
    onSalvo?.(resp.data.id)
  })

  const outros = clientes.filter((c) => c.id !== cliente?.id && c.ativo)

  return (
    <Dialog.Root open={aberto} onOpenChange={onAbertoChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-choco-900/25 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-borda bg-white shadow-elevada animate-surgir">
          <div className="flex items-start justify-between gap-3 border-b border-borda px-6 py-4">
            <div>
              <Dialog.Title className="font-display text-xl font-semibold">{cliente ? 'Editar cliente' : 'Novo cliente'}</Dialog.Title>
              <Dialog.Description className="text-[13px] text-texto-suave">Só o nome é obrigatório. Complete o resto quando puder.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variante="fantasma" tamanho="icone" aria-label="Fechar"><X className="size-5" /></Button></Dialog.Close>
          </div>

          <form onSubmit={salvar} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <section className="grid gap-4 md:grid-cols-2">
                <Campo rotulo="Nome" htmlFor="c-nome" erro={errors.nome?.message} obrigatorio className="md:col-span-2">
                  <Input id="c-nome" autoFocus aria-invalid={!!errors.nome} {...register('nome')} />
                </Campo>
                <Campo rotulo="WhatsApp" htmlFor="c-whatsapp" erro={errors.whatsapp?.message}>
                  <Input id="c-whatsapp" inputMode="tel" placeholder="(11) 98888-7777" aria-invalid={!!errors.whatsapp} {...register('whatsapp')} />
                </Campo>
                <Campo rotulo="Telefone" htmlFor="c-telefone" erro={errors.telefone?.message}>
                  <Input id="c-telefone" inputMode="tel" aria-invalid={!!errors.telefone} {...register('telefone')} />
                </Campo>
                <Campo rotulo="E-mail" htmlFor="c-email" erro={errors.email?.message}>
                  <Input id="c-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
                </Campo>
                <Campo rotulo="Data de nascimento" htmlFor="c-nasc" erro={errors.data_nascimento?.message} dica="Para lembrar do aniversário.">
                  <Input id="c-nasc" type="date" aria-invalid={!!errors.data_nascimento} {...register('data_nascimento')} />
                </Campo>
                <Campo rotulo="Como conheceu a confeitaria" htmlFor="c-origem">
                  <Select id="c-origem" {...register('origem')}>
                    <option value="">Não informado</option>
                    {origensCliente.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                  </Select>
                </Campo>
                <Campo rotulo="Indicado por" htmlFor="c-indicado">
                  <Select id="c-indicado" {...register('indicado_por')}>
                    <option value="">Ninguém</option>
                    {outros.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </Select>
                </Campo>
              </section>

              <section className="grid gap-4">
                <p className="font-display text-[15px] font-semibold">Gostos e cuidados</p>
                <Campo rotulo="Preferências" htmlFor="c-pref" dica="Separe por vírgula. Ex.: chocolate, ninho com morango, pouco doce">
                  <Input id="c-pref" {...register('preferencias')} />
                </Campo>
                <Campo rotulo="Restrições e alergias" htmlFor="c-restr" dica="Aparece em destaque na ficha do cliente.">
                  <Textarea id="c-restr" className="min-h-16" placeholder="Ex.: intolerante à lactose, alergia a amendoim" {...register('restricoes')} />
                </Campo>
                <Campo rotulo="Observações" htmlFor="c-obs">
                  <Textarea id="c-obs" className="min-h-16" {...register('observacoes')} />
                </Campo>
              </section>

              <section>
                <p className="mb-3 font-display text-[15px] font-semibold">Endereço de entrega</p>
                <div className="grid gap-4 md:grid-cols-6">
                  <Campo rotulo="CEP" htmlFor="c-cep" className="md:col-span-2"><Input id="c-cep" inputMode="numeric" {...register('cep')} /></Campo>
                  <Campo rotulo="Logradouro" htmlFor="c-log" className="md:col-span-3"><Input id="c-log" {...register('logradouro')} /></Campo>
                  <Campo rotulo="Número" htmlFor="c-num"><Input id="c-num" {...register('numero')} /></Campo>
                  <Campo rotulo="Complemento" htmlFor="c-comp" className="md:col-span-2"><Input id="c-comp" {...register('complemento')} /></Campo>
                  <Campo rotulo="Bairro" htmlFor="c-bairro" className="md:col-span-2"><Input id="c-bairro" {...register('bairro')} /></Campo>
                  <Campo rotulo="Cidade" htmlFor="c-cidade" className="md:col-span-1"><Input id="c-cidade" {...register('cidade')} /></Campo>
                  <Campo rotulo="UF" htmlFor="c-uf"><Input id="c-uf" maxLength={2} className="uppercase" {...register('uf')} /></Campo>
                  <Campo rotulo="Ponto de referência" htmlFor="c-ref" className="md:col-span-6"><Input id="c-ref" {...register('referencia')} /></Campo>
                </div>
              </section>
            </div>

            <div className="flex justify-end gap-2 border-t border-borda bg-creme/40 px-6 py-3.5">
              <Dialog.Close asChild><Button variante="fantasma">Cancelar</Button></Dialog.Close>
              <Button type="submit" carregando={isSubmitting}>{cliente ? 'Salvar alterações' : 'Cadastrar cliente'}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
