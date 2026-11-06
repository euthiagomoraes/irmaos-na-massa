import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useFornecedores, useInvalidar } from '@/lib/consultas'
import { Button, Campo, Input, Select, Textarea } from '@/components/ui'
import { Modal } from '@/components/ui/estrutura'
import { cn, formatarMoeda, formatarQuantidade, lerNumero, mensagemErro, unidadesMedida } from '@/lib/utils'
import type { Insumo } from './FormularioInsumo'

export type TipoMov = 'entrada' | 'saida' | 'perda' | 'ajuste'

const tipos: { id: TipoMov; rotulo: string; icone: typeof ArrowDownToLine; dica: string }[] = [
  { id: 'entrada', rotulo: 'Entrada', icone: ArrowDownToLine, dica: 'Compra, doação ou produção própria.' },
  { id: 'saida', rotulo: 'Saída', icone: ArrowUpFromLine, dica: 'Uso avulso fora de pedidos.' },
  { id: 'perda', rotulo: 'Perda', icone: Trash2, dica: 'Vencido, estragado, quebrado.' },
  { id: 'ajuste', rotulo: 'Inventário', icone: ClipboardCheck, dica: 'Informe a quantidade contada.' },
]

/** Grandezas compatíveis com a unidade do insumo (considera densidade e peso unitário). */
function unidadesCompativeis(ins: Insumo) {
  const grandeza = (c: string) => (['g', 'kg', 'mg'].includes(c) ? 'massa' : ['ml', 'l', 'cc', 'cs', 'xic'].includes(c) ? 'volume' : 'unidade')
  const g = grandeza(ins.unidade_codigo)
  return unidadesMedida.filter((u) => {
    const gu = grandeza(u.codigo)
    if (gu === g) return true
    const pares = new Set([g, gu])
    if (pares.has('massa') && pares.has('volume')) return !!ins.densidade_g_ml
    if (pares.has('massa') && pares.has('unidade')) return !!ins.peso_unitario_g
    return !!ins.densidade_g_ml && !!ins.peso_unitario_g
  })
}

export function Movimentar({ insumo, tipoInicial = 'entrada', onFechar }: { insumo: Insumo | null; tipoInicial?: TipoMov; onFechar: () => void }) {
  const invalidar = useInvalidar()
  const { data: fornecedores = [] } = useFornecedores()
  const [tipo, setTipo] = useState<TipoMov>(tipoInicial)
  const [qtd, setQtd] = useState('')
  const [unidade, setUnidade] = useState('')
  const [custo, setCusto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [lote, setLote] = useState('')
  const [validade, setValidade] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!insumo) return
    setTipo(tipoInicial); setQtd(''); setUnidade(insumo.unidade_codigo); setCusto(''); setMotivo('')
    setLote(''); setValidade(''); setFornecedor(insumo.fornecedor_padrao_id ?? '')
  }, [insumo, tipoInicial])

  if (!insumo) return null
  const n = lerNumero(qtd)
  const diferenca = tipo === 'ajuste' ? n - Number(insumo.quantidade_atual) : 0
  const custoN = lerNumero(custo)
  const invalido = !qtd.trim() || Number.isNaN(n) || (tipo !== 'ajuste' && n <= 0) || (tipo === 'ajuste' && (n < 0 || diferenca === 0))
    || (tipo !== 'entrada' && motivo.trim().length < 3) || (tipo === 'entrada' && custo.trim() !== '' && (Number.isNaN(custoN) || custoN < 0))

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (invalido) return
    setOcupado(true)
    const novoLote = tipo === 'entrada' && (insumo.controla_validade || lote || validade)
      ? { codigo_lote: lote || null, data_validade: validade || null, fornecedor_id: fornecedor || null } : undefined
    const { error } = await supabase.rpc('movimentar_estoque', {
      p_insumo_id: insumo.id,
      p_tipo: tipo,
      p_quantidade: tipo === 'ajuste' ? diferenca : n,
      p_unidade: tipo === 'ajuste' ? insumo.unidade_codigo : unidade,
      p_custo_unitario: tipo === 'entrada' && custo.trim() ? custoN : undefined,
      p_novo_lote: novoLote,
      p_motivo: tipo === 'ajuste' ? `Inventário: ${motivo.trim()}` : motivo.trim() || undefined,
      p_chave: crypto.randomUUID(),
    })
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('insumos', 'movimentacoes', 'fichas')
    toast.success('Movimentação registrada.')
    onFechar()
  }

  const unidades = unidadesCompativeis(insumo)
  return (
    <Modal aberto={!!insumo} onAbertoChange={(v) => { if (!v) onFechar() }} titulo={`Movimentar · ${insumo.nome}`} largura="max-w-lg"
      descricao={`Saldo atual: ${formatarQuantidade(insumo.quantidade_atual, insumo.unidade_codigo)}`} onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={invalido}>Registrar</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tipos.map((t) => (
            <button key={t.id} type="button" onClick={() => setTipo(t.id)} aria-pressed={tipo === t.id}
              className={cn('flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[12.5px] font-semibold transition-colors',
                tipo === t.id ? 'border-cacau-500 bg-cacau-50 text-cacau-700' : 'border-borda text-choco-700 hover:bg-creme')}>
              <t.icone className="size-4" />{t.rotulo}
            </button>
          ))}
        </div>
        <p className="text-[12.5px] text-texto-suave">{tipos.find((t) => t.id === tipo)?.dica}</p>

        {tipo === 'ajuste' ? (
          <Campo rotulo={`Quantidade contada (${insumo.unidade_codigo})`} htmlFor="m-qtd" obrigatorio
            dica={qtd.trim() && !Number.isNaN(n) ? (diferenca === 0 ? 'Igual ao saldo do sistema.' : `Ajuste de ${diferenca > 0 ? '+' : ''}${formatarQuantidade(diferenca, insumo.unidade_codigo)}`) : undefined}>
            <Input id="m-qtd" autoFocus inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </Campo>
        ) : (
          <div className="grid grid-cols-[1fr_10rem] gap-3">
            <Campo rotulo="Quantidade" htmlFor="m-qtd" obrigatorio>
              <Input id="m-qtd" autoFocus inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </Campo>
            <Campo rotulo="Unidade" htmlFor="m-un">
              <Select id="m-un" value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                {unidades.map((u) => <option key={u.codigo} value={u.codigo}>{u.codigo}</option>)}
              </Select>
            </Campo>
          </div>
        )}

        {tipo === 'entrada' && (
          <>
            <Campo rotulo={`Custo por ${unidade} (R$)`} htmlFor="m-custo"
              dica={custo.trim() && n > 0 && !Number.isNaN(custoN) ? `Total: ${formatarMoeda(custoN * n)} · atualiza o custo médio e o custo das receitas.` : 'Deixe em branco para manter o custo atual.'}>
              <Input id="m-custo" inputMode="decimal" placeholder="0,00" value={custo} onChange={(e) => setCusto(e.target.value)} />
            </Campo>
            {(insumo.controla_validade || lote || validade) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Validade" htmlFor="m-val" dica={insumo.controla_validade ? 'Recomendado para o controle de lotes.' : undefined}>
                  <Input id="m-val" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
                </Campo>
                <Campo rotulo="Código do lote" htmlFor="m-lote"><Input id="m-lote" value={lote} onChange={(e) => setLote(e.target.value)} /></Campo>
              </div>
            )}
            <Campo rotulo="Fornecedor" htmlFor="m-forn">
              <Select id="m-forn" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)}>
                <option value="">Não informado</option>
                {fornecedores.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </Select>
            </Campo>
          </>
        )}

        <Campo rotulo={tipo === 'entrada' ? 'Observação' : 'Motivo'} htmlFor="m-motivo" obrigatorio={tipo !== 'entrada'}>
          <Textarea id="m-motivo" className="min-h-16" value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder={tipo === 'perda' ? 'Ex.: venceu, embalagem rasgou' : tipo === 'saida' ? 'Ex.: degustação, teste de receita' : ''} />
        </Campo>
      </div>
    </Modal>
  )
}
