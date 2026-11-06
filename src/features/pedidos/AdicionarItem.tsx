import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { useInvalidar, useOpcoesPersonalizacao, useProdutos } from '@/lib/consultas'
import { Button, Campo, Input, Select } from '@/components/ui'
import { cn, formatarMoeda, lerNumero, mensagemErro } from '@/lib/utils'
import { gruposOpcao } from '@/features/produtos/ProdutosPage'

export function AdicionarItem({ pedidoId }: { pedidoId: string }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: produtos = [] } = useProdutos()
  const { data: opcoes = [] } = useOpcoesPersonalizacao()
  const [produtoId, setProdutoId] = useState('')
  const [variacaoId, setVariacaoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [qtd, setQtd] = useState('1')
  const [preco, setPreco] = useState('')
  const [escolhidas, setEscolhidas] = useState<Record<string, string[]>>({})
  const [obs, setObs] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const produto = produtos.find((p) => p.id === produtoId)
  const variacoes = (produto?.variacoes ?? []).filter((v) => v.ativo).sort((a, b) => a.ordem - b.ordem || Number(a.preco) - Number(b.preco))
  const variacao = variacoes.find((v) => v.id === variacaoId)

  const vinculos = useQuery({
    enabled: !!produto?.personalizavel,
    queryKey: ['produtos', empresa.id, 'opcoes', produtoId],
    queryFn: async () => exigir(await supabase.from('produtos_opcoes').select('opcao_id').eq('produto_id', produtoId)).map((x) => x.opcao_id),
  })
  const disponiveis = useMemo(() => {
    if (!produto?.personalizavel) return []
    const ativos = opcoes.filter((o) => o.ativo)
    const v = vinculos.data ?? []
    return v.length ? ativos.filter((o) => v.includes(o.id)) : ativos
  }, [produto, opcoes, vinculos.data])

  useEffect(() => { setVariacaoId(''); setEscolhidas({}) }, [produtoId])
  useEffect(() => {
    const base = variacao ? Number(variacao.preco) : produto?.preco_sugerido ? Number(produto.preco_sugerido) : null
    setPreco(base !== null ? String(base).replace('.', ',') : '')
    setDescricao(produto ? (variacao ? `${produto.nome} · ${variacao.nome}` : produto.nome) : '')
  }, [produto, variacao])
  useEffect(() => { if (produto?.quantidade_minima) setQtd(String(produto.quantidade_minima)) }, [produto])

  const opcoesEscolhidas = Object.values(escolhidas).flat().map((id) => opcoes.find((o) => o.id === id)!).filter(Boolean)
  const acrescimos = opcoesEscolhidas.reduce((s, o) => s + Number(o.acrescimo), 0)
  const nQtd = lerNumero(qtd), nPreco = lerNumero(preco)
  const valido = descricao.trim().length >= 2 && nQtd > 0 && nPreco >= 0 && preco.trim() !== '' && (!variacoes.length || !!variacaoId)
  const abaixoMinimo = produto?.quantidade_minima && nQtd < Number(produto.quantidade_minima)

  const alternar = (grupo: string, id: string) => {
    const atual = escolhidas[grupo] ?? []
    const multiplo = ['decoracao', 'topper', 'outro'].includes(grupo)
    setEscolhidas({ ...escolhidas, [grupo]: atual.includes(id) ? atual.filter((x) => x !== id) : multiplo ? [...atual, id] : [id] })
  }

  const adicionar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    setOcupado(true)
    try {
      const { data: item, error } = await supabase.from('pedido_itens').insert({
        empresa_id: empresa.id, pedido_id: pedidoId, produto_id: produtoId || null, variacao_id: variacaoId || null,
        descricao: descricao.trim(), quantidade: nQtd, preco_unitario: nPreco, acrescimos, observacoes: obs.trim() || null,
      }).select('id').single()
      if (error) throw error
      if (opcoesEscolhidas.length) {
        const { error: e2 } = await supabase.from('pedido_personalizacoes').insert(opcoesEscolhidas.map((o) => ({
          empresa_id: empresa.id, pedido_item_id: item.id, grupo: gruposOpcao[o.grupo]?.replace(/s$/, '') ?? o.grupo, opcao_id: o.id,
          descricao: o.nome, acrescimo: o.acrescimo, ficha_tecnica_id: o.ficha_tecnica_id,
        })))
        if (e2) throw e2
      }
      setProdutoId(''); setQtd('1'); setObs(''); setDescricao(''); setPreco('')
      await invalidar('pedidos')
    } catch (err) {
      toast.error(mensagemErro(err))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={adicionar} className="mt-3 space-y-3 rounded-xl border border-dashed border-borda-forte p-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Produto" htmlFor="ai-prod">
          <Select id="ai-prod" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
            <option value="">Item avulso (sem produto)</option>
            {produtos.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </Campo>
        {variacoes.length > 0 ? (
          <Campo rotulo="Tamanho / variação" htmlFor="ai-var">
            <Select id="ai-var" value={variacaoId} onChange={(e) => setVariacaoId(e.target.value)}>
              <option value="">Selecione…</option>
              {variacoes.map((v) => <option key={v.id} value={v.id}>{v.nome} · {formatarMoeda(v.preco)}</option>)}
            </Select>
          </Campo>
        ) : (
          <Campo rotulo="Descrição" htmlFor="ai-desc"><Input id="ai-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Bolo de pote" /></Campo>
        )}
      </div>

      {disponiveis.length > 0 && (
        <div className="space-y-2.5">
          {Object.entries(gruposOpcao).map(([g, nome]) => {
            const lista = disponiveis.filter((o) => o.grupo === g)
            if (!lista.length) return null
            return (
              <div key={g}>
                <p className="mb-1 text-[11.5px] font-semibold tracking-wide text-texto-suave uppercase">{nome}</p>
                <div className="flex flex-wrap gap-1.5">
                  {lista.map((o) => {
                    const on = (escolhidas[g] ?? []).includes(o.id)
                    return (
                      <button key={o.id} type="button" aria-pressed={on} onClick={() => alternar(g, o.id)}
                        className={cn('rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors', on ? 'border-cacau-500 bg-cacau-600 text-white' : 'border-borda bg-white text-choco-700 hover:bg-creme')}>
                        {o.nome}{Number(o.acrescimo) > 0 && ` +${formatarMoeda(o.acrescimo)}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[6rem_9rem_1fr_auto] sm:items-end">
        <Campo rotulo="Qtd." htmlFor="ai-q" erro={abaixoMinimo ? `Mín. ${produto?.quantidade_minima}` : undefined}>
          <Input id="ai-q" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </Campo>
        <Campo rotulo="Preço unit. (R$)" htmlFor="ai-p"><Input id="ai-p" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} /></Campo>
        <Campo rotulo="Detalhes (tema, cor, frase…)" htmlFor="ai-obs"><Input id="ai-obs" value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
        <Button type="submit" variante="secundario" carregando={ocupado} disabled={!valido}><Plus className="size-4" />Adicionar</Button>
      </div>
      {valido && <p className="text-right text-[12.5px] text-texto-suave">Item: <strong className="text-choco-800">{formatarMoeda(nQtd * (nPreco + acrescimos))}</strong>{acrescimos > 0 && ` (inclui ${formatarMoeda(acrescimos)} de acréscimos por unidade)`}</p>}
    </form>
  )
}
