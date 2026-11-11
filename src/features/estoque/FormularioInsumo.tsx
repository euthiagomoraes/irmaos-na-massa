import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { supabase, type Tabela } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { useInvalidar } from '@/lib/consultas'
import { Button, Campo, Input, Select } from '@/components/ui'
import { Modal } from '@/components/ui/estrutura'
import { cn, lerNumero, mensagemErro, unidadesMedida } from '@/lib/utils'

export type Insumo = Tabela<'insumos'>

interface Valores { nome: string; unidade_codigo: string; estoque_minimo: string; custo_unitario: string; e_embalagem: boolean }

const num = (v: string) => { const n = lerNumero(v); return Number.isNaN(n) ? 'Número inválido' : n < 0 ? 'Não pode ser negativo' : true }

export function FormularioInsumo({ aberto, onAbertoChange, insumo, embalagemInicial = false, onSalvo }: {
  aberto: boolean; onAbertoChange: (v: boolean) => void; insumo?: Insumo | null; embalagemInicial?: boolean; onSalvo?: (id: string) => void
}) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<Valores>()

  useEffect(() => {
    if (!aberto) return
    const emb = insumo?.e_embalagem ?? embalagemInicial
    reset({
      nome: insumo?.nome ?? '',
      unidade_codigo: insumo?.unidade_codigo ?? (emb ? 'un' : 'g'),
      estoque_minimo: insumo ? String(insumo.estoque_minimo).replace('.', ',') : '',
      custo_unitario: insumo ? String(insumo.custo_unitario).replace('.', ',') : '',
      e_embalagem: emb,
    })
  }, [aberto, insumo, embalagemInicial, reset])

  const unidade = watch('unidade_codigo')
  const embalagem = watch('e_embalagem') ?? false
  const termo = embalagem ? 'embalagem' : 'insumo'
  const travarUnidade = !!insumo && Number(insumo.quantidade_atual) !== 0

  const escolherTipo = (emb: boolean) => {
    setValue('e_embalagem', emb)
    // Sugere a unidade mais comum para cada tipo enquanto ainda não há saldo
    if (!travarUnidade && !insumo) setValue('unidade_codigo', emb ? 'un' : 'g')
  }

  const salvar = handleSubmit(async (v) => {
    // Só os campos do resumo: dados antigos (categoria, validade etc.) ficam preservados
    const dados = {
      nome: v.nome.trim(), unidade_codigo: v.unidade_codigo, e_embalagem: v.e_embalagem,
      estoque_minimo: lerNumero(v.estoque_minimo), custo_unitario: lerNumero(v.custo_unitario),
    }
    const r = insumo
      ? await supabase.from('insumos').update(dados).eq('id', insumo.id).select('id').single()
      : await supabase.from('insumos').insert({ ...dados, empresa_id: empresa.id }).select('id').single()
    if (r.error) return void toast.error(r.error.code === '23505' ? 'Já existe um item ativo com este nome.' : mensagemErro(r.error))
    await invalidar('insumos', 'fichas')
    toast.success(insumo ? 'Cadastro atualizado.' : `${embalagem ? 'Embalagem cadastrada' : 'Insumo cadastrado'}. Registre a primeira entrada para ter saldo.`)
    onAbertoChange(false)
    onSalvo?.(r.data.id)
  })

  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} largura="max-w-md" onSubmit={salvar}
      titulo={insumo ? `Editar ${termo}` : embalagem ? 'Nova embalagem' : 'Novo insumo'}
      descricao="O saldo entra pelas movimentações."
      rodape={<><Button variante="fantasma" onClick={() => onAbertoChange(false)}>Cancelar</Button><Button type="submit" carregando={isSubmitting}>{insumo ? 'Salvar' : 'Cadastrar'}</Button></>}>
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-xl bg-creme p-1">
          {[{ emb: false, rotulo: 'Insumo', dica: 'Ingredientes' }, { emb: true, rotulo: 'Embalagem', dica: 'Caixas, fitas, topos' }].map((o) => (
            <button key={o.rotulo} type="button" role="radio" aria-checked={embalagem === o.emb} onClick={() => escolherTipo(o.emb)}
              className={cn('rounded-lg px-3 py-2 text-center transition-colors',
                embalagem === o.emb ? 'bg-white text-cacau-700 shadow-suave ring-1 ring-borda' : 'text-choco-700 hover:bg-white/60')}>
              <span className="block text-[13.5px] font-semibold">{o.rotulo}</span>
              <span className="block text-[11.5px] text-texto-suave">{o.dica}</span>
            </button>
          ))}
        </div>

        <Campo rotulo="Nome" htmlFor="i-nome" obrigatorio erro={errors.nome?.message}>
          <Input id="i-nome" autoFocus placeholder={embalagem ? 'Ex.: Caixa para bolo 20 cm' : 'Ex.: Leite condensado'} aria-invalid={!!errors.nome}
            {...register('nome', { validate: (s) => s.trim().length >= 2 || 'Informe o nome' })} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Unidade" htmlFor="i-un" obrigatorio dica={travarUnidade ? 'Só muda com o saldo zerado.' : undefined}>
            <Select id="i-un" {...register('unidade_codigo')}>
              {unidadesMedida.map((u) => <option key={u.codigo} value={u.codigo}>{u.nome}</option>)}
            </Select>
          </Campo>
          <Campo rotulo={`Custo por ${unidade || 'unidade'} (R$)`} htmlFor="i-custo" erro={errors.custo_unitario?.message}>
            <Input id="i-custo" inputMode="decimal" placeholder="0,00" {...register('custo_unitario', { validate: num })} />
          </Campo>
        </div>
        <Campo rotulo={`Avisar quando tiver menos de (${unidade || 'un'})`} htmlFor="i-min" erro={errors.estoque_minimo?.message}>
          <Input id="i-min" inputMode="decimal" placeholder="0" {...register('estoque_minimo', { validate: num })} />
        </Campo>
      </div>
    </Modal>
  )
}
