import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { supabase, type Tabela } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { useCategoriasInsumos, useFornecedores, useInvalidar } from '@/lib/consultas'
import { Button, Campo, Input, Select, Textarea } from '@/components/ui'
import { Interruptor, Modal } from '@/components/ui/estrutura'
import { cn, lerNumero, mensagemErro, unidadesMedida } from '@/lib/utils'

export type Insumo = Tabela<'insumos'>

interface Valores {
  nome: string; codigo: string; categoria_id: string; unidade_codigo: string
  estoque_minimo: string; custo_unitario: string; fornecedor_padrao_id: string; local_armazenamento: string
  densidade_g_ml: string; peso_unitario_g: string; controla_validade: boolean; e_embalagem: boolean; observacoes: string
}

const num = (v: string) => { const n = lerNumero(v); return Number.isNaN(n) ? 'Número inválido' : n < 0 ? 'Não pode ser negativo' : true }

/** O insumo tem algo preenchido nos campos opcionais? */
const temDetalhes = (i?: Insumo | null) => !!i && !!(i.categoria_id || i.fornecedor_padrao_id || i.codigo || i.local_armazenamento
  || i.densidade_g_ml || i.peso_unitario_g || i.controla_validade || i.e_embalagem || i.observacoes)

export function FormularioInsumo({ aberto, onAbertoChange, insumo, onSalvo }: {
  aberto: boolean; onAbertoChange: (v: boolean) => void; insumo?: Insumo | null; onSalvo?: (id: string) => void
}) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: categorias = [] } = useCategoriasInsumos()
  const { data: fornecedores = [] } = useFornecedores()
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<Valores>()
  const [detalhes, setDetalhes] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setDetalhes(temDetalhes(insumo))
    reset({
      nome: insumo?.nome ?? '', codigo: insumo?.codigo ?? '', categoria_id: insumo?.categoria_id ?? '',
      unidade_codigo: insumo?.unidade_codigo ?? 'g',
      estoque_minimo: insumo ? String(insumo.estoque_minimo).replace('.', ',') : '',
      custo_unitario: insumo ? String(insumo.custo_unitario).replace('.', ',') : '',
      fornecedor_padrao_id: insumo?.fornecedor_padrao_id ?? '', local_armazenamento: insumo?.local_armazenamento ?? '',
      densidade_g_ml: insumo?.densidade_g_ml ? String(insumo.densidade_g_ml).replace('.', ',') : '',
      peso_unitario_g: insumo?.peso_unitario_g ? String(insumo.peso_unitario_g).replace('.', ',') : '',
      controla_validade: insumo?.controla_validade ?? false, e_embalagem: insumo?.e_embalagem ?? false,
      observacoes: insumo?.observacoes ?? '',
    })
  }, [aberto, insumo, reset])

  const unidade = watch('unidade_codigo')
  const salvar = handleSubmit(async (v) => {
    const opcional = (s: string) => (s.trim() ? lerNumero(s) : null)
    const dados = {
      nome: v.nome.trim(), codigo: v.codigo.trim() || null, categoria_id: v.categoria_id || null,
      unidade_codigo: v.unidade_codigo, estoque_minimo: lerNumero(v.estoque_minimo), custo_unitario: lerNumero(v.custo_unitario),
      fornecedor_padrao_id: v.fornecedor_padrao_id || null, local_armazenamento: v.local_armazenamento.trim() || null,
      densidade_g_ml: opcional(v.densidade_g_ml) || null, peso_unitario_g: opcional(v.peso_unitario_g) || null,
      controla_validade: v.controla_validade, e_embalagem: v.e_embalagem, observacoes: v.observacoes.trim() || null,
    }
    const r = insumo
      ? await supabase.from('insumos').update(dados).eq('id', insumo.id).select('id').single()
      : await supabase.from('insumos').insert({ ...dados, empresa_id: empresa.id }).select('id').single()
    if (r.error) return void toast.error(r.error.code === '23505' ? 'Já existe um insumo ativo com este nome.' : mensagemErro(r.error))
    await invalidar('insumos', 'fichas')
    toast.success(insumo ? 'Insumo atualizado.' : 'Insumo cadastrado. Registre a primeira entrada para ter saldo.')
    onAbertoChange(false)
    onSalvo?.(r.data.id)
  })

  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} titulo={insumo ? 'Editar insumo' : 'Novo insumo'} largura="max-w-lg"
      descricao="Só o nome é obrigatório. O saldo entra pelas movimentações." onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={() => onAbertoChange(false)}>Cancelar</Button><Button type="submit" carregando={isSubmitting}>{insumo ? 'Salvar' : 'Cadastrar insumo'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" htmlFor="i-nome" obrigatorio erro={errors.nome?.message} className="sm:col-span-2">
          <Input id="i-nome" autoFocus placeholder="Ex.: Leite condensado" aria-invalid={!!errors.nome}
            {...register('nome', { validate: (s) => s.trim().length >= 2 || 'Informe o nome' })} />
        </Campo>
        <Campo rotulo="Unidade" htmlFor="i-un" obrigatorio dica={insumo && insumo.quantidade_atual !== 0 ? 'Só pode mudar com o saldo zerado.' : undefined}>
          <Select id="i-un" {...register('unidade_codigo')}>
            {unidadesMedida.map((u) => <option key={u.codigo} value={u.codigo}>{u.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo={`Custo por ${unidade || 'unidade'} (R$)`} htmlFor="i-custo" erro={errors.custo_unitario?.message}>
          <Input id="i-custo" inputMode="decimal" placeholder="0,00" {...register('custo_unitario', { validate: num })} />
        </Campo>
        <Campo rotulo={`Avisar quando tiver menos de (${unidade || 'un'})`} htmlFor="i-min" erro={errors.estoque_minimo?.message} className="sm:col-span-2">
          <Input id="i-min" inputMode="decimal" placeholder="0" {...register('estoque_minimo', { validate: num })} />
        </Campo>
      </div>

      <button type="button" onClick={() => setDetalhes((d) => !d)} aria-expanded={detalhes} aria-controls="i-detalhes"
        className="mt-5 flex w-full items-center gap-1.5 rounded-xl border border-borda px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-choco-700 hover:bg-creme/50">
        Mais detalhes <span className="font-normal text-texto-suave">· categoria, fornecedor, validade…</span>
        <ChevronDown className={cn('ml-auto size-4 shrink-0 transition-transform', detalhes && 'rotate-180')} aria-hidden />
      </button>

      {detalhes && (
        <div id="i-detalhes" className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Categoria" htmlFor="i-cat">
            <Select id="i-cat" {...register('categoria_id')}>
              <option value="">Sem categoria</option>
              {categorias.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Fornecedor" htmlFor="i-forn">
            <Select id="i-forn" {...register('fornecedor_padrao_id')}>
              <option value="">Nenhum</option>
              {fornecedores.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Código" htmlFor="i-cod"><Input id="i-cod" {...register('codigo')} /></Campo>
          <Campo rotulo="Onde fica guardado" htmlFor="i-local"><Input id="i-local" placeholder="Ex.: Geladeira 2" {...register('local_armazenamento')} /></Campo>
          <Campo rotulo="Densidade (g/ml)" htmlFor="i-dens" erro={errors.densidade_g_ml?.message} dica="Converte peso ↔ volume (leite ≈ 1,03).">
            <Input id="i-dens" inputMode="decimal" {...register('densidade_g_ml', { validate: (s) => !s.trim() || num(s) })} />
          </Campo>
          <Campo rotulo="Peso de 1 unidade (g)" htmlFor="i-peso" erro={errors.peso_unitario_g?.message} dica="Converte unidade ↔ gramas (ovo ≈ 50 g).">
            <Input id="i-peso" inputMode="decimal" {...register('peso_unitario_g', { validate: (s) => !s.trim() || num(s) })} />
          </Campo>
          <Interruptor id="i-val" marcado={watch('controla_validade') ?? false} onChange={(v) => setValue('controla_validade', v)}
            rotulo="Controlar validade" descricao="Cada entrada vira um lote; sai primeiro o que vence antes." />
          <Interruptor id="i-emb" marcado={watch('e_embalagem') ?? false} onChange={(v) => setValue('e_embalagem', v)}
            rotulo="É embalagem ou material" descricao="Caixas, fitas, velas, topos, descartáveis." />
          <Campo rotulo="Observações" htmlFor="i-obs" className="sm:col-span-2"><Textarea id="i-obs" className="min-h-16" {...register('observacoes')} /></Campo>
        </div>
      )}
    </Modal>
  )
}
