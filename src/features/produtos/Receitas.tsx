import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Copy, Plus, Power, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase, type Tabela } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { useConfiguracoes, useFichas, useInsumos, useInvalidar } from '@/lib/consultas'
import { Badge, Button, Campo, Carregando, Input, Select } from '@/components/ui'
import { Secao } from '@/components/ui/estrutura'
import { cn, converterUnidade, formatarMoeda, formatarQuantidade, lerNumero, mensagemErro, unidadesMedida } from '@/lib/utils'

type Produto = Tabela<'produtos'>
type Variacao = Tabela<'variacoes_produtos'>
type Ficha = Tabela<'fichas_tecnicas'>
type ItemReceita = Tabela<'ficha_tecnica_itens'>

export const tiposForma = ['Redonda', 'Quadrada', 'Retangular', 'Coração', 'Aro', 'Forminha', 'Pote', 'Outra']

const num = (s: string) => (s.trim() ? lerNumero(s) : null)
const br = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','))
/** Extrai o primeiro número do tamanho ("20 cm" → 20) para sugerir a escala da receita. */
const medida = (t: string | null | undefined) => { const m = (t ?? '').match(/(\d+(?:[.,]\d+)?)/); return m ? lerNumero(m[1]) : null }

export function nomeVariacao(v: { tipo_forma?: string | null; tamanho?: string | null; faixa?: string | null }) {
  return [[v.tipo_forma, v.tamanho].filter(Boolean).join(' '), v.faixa].filter(Boolean).join(' · ') || 'Tamanho único'
}

function Margem({ preco, custo }: { preco: number; custo: number | null }) {
  if (!custo || preco <= 0) return <span className="text-texto-suave">—</span>
  const m = ((preco - custo) / preco) * 100
  return <span className={cn('font-semibold', m < 30 ? 'text-erro' : m < 50 ? 'text-alerta' : 'text-sucesso')}>{m.toFixed(0)}%</span>
}

/* ------------------------------------------------------------ Seção principal */
export function TamanhosEReceitas({ produto, variacoes }: { produto: Produto; variacoes: Variacao[] }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: fichas = [] } = useFichas()
  const ordenadas = [...variacoes].sort((a, b) => a.ordem - b.ordem || Number(a.preco) - Number(b.preco))
  const fichaProduto = fichas.find((f) => f.id === produto.ficha_tecnica_id) ?? null
  const [abertaId, setAbertaId] = useState<string | null>(null)

  const criarReceitaUnica = async () => {
    const { data, error } = await supabase.from('fichas_tecnicas').insert({
      empresa_id: empresa.id, nome: produto.nome, tipo: 'produto', rendimento: 1, unidade_rendimento: produto.unidade_venda,
    }).select('id').single()
    if (error) return void toast.error(mensagemErro(error))
    const { error: e2 } = await supabase.from('produtos').update({ ficha_tecnica_id: data.id }).eq('id', produto.id)
    if (e2) return void toast.error(mensagemErro(e2))
    await invalidar('produtos', 'fichas')
  }

  return (
    <Secao titulo="Tamanhos, formas e receitas">
      <p className="mb-3 text-[13px] text-texto-suave">
        Cadastre cada tamanho de forma com a receita (quantidades de cada insumo) e o rendimento esperado. O custo é calculado pelo preço dos insumos e,
        na produção, os insumos saem do estoque automaticamente.
      </p>
      {ordenadas.length > 0 ? (
        <ul className="space-y-2.5">
          {ordenadas.map((v) => (
            <CartaoVariacao key={v.id} produto={produto} variacao={v} outras={ordenadas.filter((x) => x.id !== v.id)}
              aberta={abertaId === v.id} onAlternar={() => setAbertaId(abertaId === v.id ? null : v.id)} />
          ))}
        </ul>
      ) : fichaProduto ? (
        <ReceitaUnica produto={produto} ficha={fichaProduto} />
      ) : (
        <div className="rounded-xl border border-dashed border-borda-forte p-4 text-[13px] text-texto-suave">
          Nenhum tamanho cadastrado. Adicione abaixo (ex.: <strong>Redonda 20 cm</strong>) ou, para itens sem tamanho como docinhos,{' '}
          <button type="button" className="font-semibold text-cacau-600 hover:underline" onClick={() => void criarReceitaUnica()}>use uma receita única</button>.
        </div>
      )}
      {!(ordenadas.length === 0 && fichaProduto) && <NovaVariacao produto={produto} variacoes={ordenadas} onCriada={setAbertaId} />}
    </Secao>
  )
}

/* ------------------------------------------------------------ Receita única (produto sem tamanhos) */
function ReceitaUnica({ produto, ficha }: { produto: Produto; ficha: Ficha }) {
  const invalidar = useInvalidar()
  const atualizarFicha = async (campos: Partial<Ficha>) => {
    const { error } = await supabase.from('fichas_tecnicas').update(campos).eq('id', ficha.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('fichas', 'produtos')
  }
  const preco = Number(produto.preco_sugerido ?? 0)
  return (
    <div className="space-y-4 rounded-2xl border border-borda p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo={`A receita rende (${produto.unidade_venda})`} htmlFor="ru-rend" dica="Ex.: uma panela rende 100 docinhos.">
          <Input id="ru-rend" key={String(ficha.rendimento)} inputMode="decimal" defaultValue={br(ficha.rendimento)}
            onBlur={(e) => { const n = lerNumero(e.target.value); if (n > 0 && n !== Number(ficha.rendimento)) void atualizarFicha({ rendimento: n }) }} />
        </Campo>
        <ResumoCusto rotulo={`Custo por ${produto.unidade_venda}`} custo={Number(ficha.custo_unitario)} preco={preco} />
        <ResumoCusto rotulo="Custo da receita inteira" custo={Number(ficha.custo_total)} />
      </div>
      <ItensReceita ficha={ficha} />
      <CustosExtras ficha={ficha} />
    </div>
  )
}

/* ------------------------------------------------------------ Cartão de cada tamanho/forma */
function CartaoVariacao({ produto, variacao: v, outras, aberta, onAlternar }: {
  produto: Produto; variacao: Variacao; outras: Variacao[]; aberta: boolean; onAlternar: () => void
}) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: fichas = [] } = useFichas()
  const ficha = fichas.find((f) => f.id === v.ficha_tecnica_id) ?? null
  const custo = ficha ? Number(ficha.custo_total) : null
  const porFatia = custo && v.rendimento_fatias ? custo / v.rendimento_fatias : null

  const atualizar = async (campos: Partial<Variacao>) => {
    const novo = { ...v, ...campos }
    const { error } = await supabase.from('variacoes_produtos').update({ ...campos, nome: nomeVariacao(novo) }).eq('id', v.id)
    if (error) return void toast.error(mensagemErro(error))
    if (ficha && ('tipo_forma' in campos || 'tamanho' in campos || 'faixa' in campos || 'peso_g' in campos)) {
      await supabase.from('fichas_tecnicas').update({ nome: `${produto.nome} · ${nomeVariacao(novo)}`, peso_unitario_g: novo.peso_g ?? null }).eq('id', ficha.id)
    }
    await invalidar('produtos', 'fichas')
  }
  const criarReceita = async () => {
    const { data, error } = await supabase.from('fichas_tecnicas').insert({
      empresa_id: empresa.id, nome: `${produto.nome} · ${v.nome}`, tipo: 'produto', rendimento: 1, unidade_rendimento: 'un', peso_unitario_g: v.peso_g,
    }).select('id').single()
    if (error) return void toast.error(mensagemErro(error))
    await supabase.from('variacoes_produtos').update({ ficha_tecnica_id: data.id }).eq('id', v.id)
    await invalidar('produtos', 'fichas')
  }
  const remover = async () => {
    if (!window.confirm(`Remover "${v.nome}" e a receita deste tamanho?`)) return
    const { error } = await supabase.from('variacoes_produtos').delete().eq('id', v.id)
    if (error) return void toast.error(mensagemErro(error))
    if (ficha) await supabase.from('fichas_tecnicas').delete().eq('id', ficha.id)
    await invalidar('produtos', 'fichas')
  }
  const campoTexto = (k: 'tamanho' | 'faixa', rotulo: string, ph: string) => (
    <Campo rotulo={rotulo} htmlFor={`v-${k}-${v.id}`}>
      <Input id={`v-${k}-${v.id}`} defaultValue={v[k] ?? ''} placeholder={ph} onBlur={(e) => e.target.value.trim() !== (v[k] ?? '') && void atualizar({ [k]: e.target.value.trim() || null })} />
    </Campo>
  )

  return (
    <li className={cn('overflow-hidden rounded-2xl border border-borda bg-white', !v.ativo && 'opacity-60')}>
      <button type="button" onClick={onAlternar} aria-expanded={aberta} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-creme/50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-choco-800">{v.nome}{!v.ativo && <Badge className="ml-2 py-0 text-[11px]">Oculto</Badge>}</p>
          <p className="text-[12px] text-texto-suave">
            {[v.rendimento_fatias && `rende ${v.rendimento_fatias} fatias`, v.peso_g && `${formatarQuantidade(Number(v.peso_g) / 1000)} kg`].filter(Boolean).join(' · ') || 'Rendimento não informado'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-[12.5px]">
          {ficha ? (
            <span className="text-right"><span className="block text-texto-suave">custo</span><span className="font-semibold tabular-nums">{formatarMoeda(custo)}</span></span>
          ) : <Badge tom="alerta" className="py-0 text-[11px]">Sem receita</Badge>}
          {porFatia !== null && <span className="hidden text-right sm:block"><span className="block text-texto-suave">por fatia</span><span className="font-semibold tabular-nums">{formatarMoeda(porFatia)}</span></span>}
          <span className="text-right"><span className="block text-texto-suave">preço</span><span className="font-semibold tabular-nums">{formatarMoeda(v.preco)}</span></span>
          <span className="w-10 text-right"><span className="block text-texto-suave">margem</span><Margem preco={Number(v.preco)} custo={custo} /></span>
          <ChevronDown className={cn('size-4 text-texto-suave transition-transform', aberta && 'rotate-180')} />
        </div>
      </button>

      {aberta && (
        <div key={v.id} className="space-y-4 border-t border-borda bg-creme/30 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Campo rotulo="Forma" htmlFor={`v-forma-${v.id}`}>
              <Select id={`v-forma-${v.id}`} value={v.tipo_forma ?? ''} onChange={(e) => void atualizar({ tipo_forma: e.target.value || null })}>
                <option value="">—</option>{tiposForma.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Campo>
            {campoTexto('tamanho', 'Tamanho', '20 cm')}
            {campoTexto('faixa', 'Faixa / recheio', 'Especial')}
            <Campo rotulo="Fatias" htmlFor={`v-fat-${v.id}`}>
              <Input id={`v-fat-${v.id}`} inputMode="numeric" defaultValue={v.rendimento_fatias ?? ''}
                onBlur={(e) => { const n = num(e.target.value); const r = n ? Math.round(n) : null; if (r !== v.rendimento_fatias) void atualizar({ rendimento_fatias: r }) }} />
            </Campo>
            <Campo rotulo="Peso final (g)" htmlFor={`v-peso-${v.id}`}>
              <Input id={`v-peso-${v.id}`} inputMode="decimal" defaultValue={br(v.peso_g)}
                onBlur={(e) => { const n = num(e.target.value); if (n !== (v.peso_g === null ? null : Number(v.peso_g))) void atualizar({ peso_g: n && n > 0 ? n : null }) }} />
            </Campo>
            <Campo rotulo="Preço (R$)" htmlFor={`v-preco-${v.id}`}>
              <Input id={`v-preco-${v.id}`} inputMode="decimal" defaultValue={br(Number(v.preco))}
                onBlur={(e) => { const n = lerNumero(e.target.value); if (n >= 0 && n !== Number(v.preco)) void atualizar({ preco: n }) }} />
            </Campo>
          </div>

          {ficha ? (
            <>
              <ItensReceita ficha={ficha} />
              <CopiarReceita destino={ficha} variacao={v} outras={outras} />
              <CustosExtras ficha={ficha} />
              <MonitorRendimento variacao={v} ficha={ficha} />
            </>
          ) : (
            <Button variante="secundario" tamanho="sm" onClick={() => void criarReceita()}><Plus className="size-4" />Montar a receita deste tamanho</Button>
          )}

          <div className="flex justify-end gap-2 border-t border-borda pt-3">
            <Button variante="fantasma" tamanho="sm" onClick={() => void atualizar({ ativo: !v.ativo })}><Power className="size-3.5" />{v.ativo ? 'Ocultar' : 'Mostrar'}</Button>
            <Button variante="fantasma" tamanho="sm" className="text-erro" onClick={() => void remover()}><Trash2 className="size-3.5" />Remover tamanho</Button>
          </div>
        </div>
      )}
    </li>
  )
}

/* ------------------------------------------------------------ Ingredientes da receita */
export function useItensReceita(fichaId: string | null | undefined) {
  const empresa = useEmpresa()
  return useQuery({
    enabled: !!fichaId,
    queryKey: ['fichas', empresa.id, 'itens', fichaId],
    queryFn: async () => exigir(await supabase.from('ficha_tecnica_itens').select('*').eq('ficha_id', fichaId!).order('ordem').order('created_at')),
  })
}

function ItensReceita({ ficha }: { ficha: Ficha }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: insumos = [] } = useInsumos()
  const { data: itens = [], isLoading } = useItensReceita(ficha.id)
  const [insumoId, setInsumoId] = useState('')
  const [qtd, setQtd] = useState('')
  const [unidade, setUnidade] = useState('g')
  const [ocupado, setOcupado] = useState(false)

  const custoItem = (i: ItemReceita) => {
    const ins = insumos.find((x) => x.id === i.insumo_id)
    if (!ins) return null
    const q = converterUnidade(Number(i.quantidade), i.unidade_codigo, ins.unidade_codigo, ins.densidade_g_ml, ins.peso_unitario_g)
    return q === null ? null : (q * Number(ins.custo_unitario)) / (1 - Number(i.perda_pct) / 100)
  }
  const mudar = async (i: ItemReceita, campos: Partial<ItemReceita>) => {
    const { error } = await supabase.from('ficha_tecnica_itens').update(campos).eq('id', i.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('fichas', 'produtos')
  }
  const remover = async (id: string) => {
    const { error } = await supabase.from('ficha_tecnica_itens').delete().eq('id', id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('fichas', 'produtos')
  }
  const n = lerNumero(qtd)
  const adicionar = async (e: FormEvent) => {
    e.preventDefault()
    if (!insumoId || !(n > 0)) return
    setOcupado(true)
    const { error } = await supabase.from('ficha_tecnica_itens').insert({ empresa_id: empresa.id, ficha_id: ficha.id, insumo_id: insumoId, quantidade: n, unidade_codigo: unidade, ordem: itens.length + 1 })
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    setInsumoId(''); setQtd('')
    await invalidar('fichas', 'produtos')
  }
  const semCusto = itens.some((i) => { const ins = insumos.find((x) => x.id === i.insumo_id); return ins && Number(ins.custo_unitario) === 0 })
  const pesoMassa = itens.reduce((s, i) => {
    const ins = insumos.find((x) => x.id === i.insumo_id)
    const g = converterUnidade(Number(i.quantidade), i.unidade_codigo, 'g', ins?.densidade_g_ml, ins?.peso_unitario_g)
    return g === null ? s : s + g
  }, 0)

  return (
    <div>
      <p className="mb-2 text-[12px] font-semibold tracking-wide text-texto-suave uppercase">Receita (quantidades para 1 {ficha.rendimento > 1 ? 'receita' : 'unidade'})</p>
      {isLoading ? <Carregando /> : itens.length > 0 && (
        <ul className="divide-y divide-borda/70 rounded-xl border border-borda bg-white">
          {itens.map((i) => {
            const ins = insumos.find((x) => x.id === i.insumo_id)
            const c = custoItem(i)
            return (
              <li key={i.id} className="flex items-center gap-2 px-3 py-1.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-medium text-choco-800">{ins?.nome ?? 'Insumo removido'}</span>
                <Input aria-label="Quantidade" inputMode="decimal" defaultValue={br(Number(i.quantidade))} className="h-8 w-20 text-right text-[13px]"
                  onBlur={(e) => { const q = lerNumero(e.target.value); if (q > 0 && q !== Number(i.quantidade)) void mudar(i, { quantidade: q }) }} />
                <Select aria-label="Unidade" value={i.unidade_codigo} onChange={(e) => void mudar(i, { unidade_codigo: e.target.value })} className="h-8 w-20 px-2 text-[12.5px]">
                  {unidadesMedida.map((u) => <option key={u.codigo} value={u.codigo}>{u.codigo}</option>)}
                </Select>
                <span className={cn('w-20 text-right tabular-nums', c === null && 'text-erro')} title={c === null ? 'Sem conversão entre as unidades: informe densidade ou peso unitário no insumo.' : undefined}>
                  {c === null ? 'conversão?' : formatarMoeda(c)}
                </span>
                <Button variante="fantasma" tamanho="icone" className="size-7 text-erro" aria-label="Remover ingrediente" onClick={() => void remover(i.id)}><Trash2 className="size-3.5" /></Button>
              </li>
            )
          })}
          <li className="flex justify-between px-3 py-1.5 text-[12.5px] text-texto-suave">
            <span>{pesoMassa > 0 && `Massa total dos ingredientes ≈ ${formatarQuantidade(pesoMassa / 1000)} kg`}</span>
            <span className="font-semibold text-choco-800">Ingredientes: {formatarMoeda(ficha.custo_ingredientes)}</span>
          </li>
        </ul>
      )}
      {semCusto && <p className="mt-2 flex gap-1.5 text-[12.5px] text-alerta"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />Há insumos sem custo. Registre uma entrada com preço no estoque.</p>}
      <form onSubmit={adicionar} className="mt-2 grid gap-2 sm:grid-cols-[1fr_6rem_6rem_auto]">
        <Select aria-label="Insumo" value={insumoId} onChange={(e) => { setInsumoId(e.target.value); const ins = insumos.find((x) => x.id === e.target.value); if (ins) setUnidade(ins.unidade_codigo === 'kg' ? 'g' : ins.unidade_codigo === 'l' ? 'ml' : ins.unidade_codigo) }}>
          <option value="">Adicionar insumo…</option>
          {insumos.filter((x) => x.ativo).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </Select>
        <Input aria-label="Quantidade" inputMode="decimal" placeholder="Qtd." value={qtd} onChange={(e) => setQtd(e.target.value)} />
        <Select aria-label="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)}>
          {unidadesMedida.map((u) => <option key={u.codigo} value={u.codigo}>{u.codigo}</option>)}
        </Select>
        <Button type="submit" variante="secundario" carregando={ocupado} disabled={!insumoId || !(n > 0)}><Plus className="size-4" />Adicionar</Button>
      </form>
      {insumos.length === 0 && <p className="mt-1 text-[12px] text-texto-suave">Cadastre os insumos em Estoque para montar a receita.</p>}
    </div>
  )
}

/* ------------------------------------------------------------ Copiar receita de outro tamanho */
function CopiarReceita({ destino, variacao, outras }: { destino: Ficha; variacao: Variacao; outras: Variacao[] }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const fontes = outras.filter((o) => o.ficha_tecnica_id)
  const [origem, setOrigem] = useState('')
  const [fator, setFator] = useState('1')
  const [ocupado, setOcupado] = useState(false)
  const fonte = fontes.find((o) => o.id === origem)
  useEffect(() => {
    if (!fonte) return
    const a = medida(fonte.tamanho), b = medida(variacao.tamanho)
    // Formas redondas/quadradas escalam pela área (proporção do lado ao quadrado)
    setFator(a && b ? br(Math.round((b / a) ** 2 * 100) / 100) : '1')
  }, [fonte, variacao.tamanho])
  if (!fontes.length) return null
  const f = lerNumero(fator)

  const copiar = async () => {
    if (!fonte || !(f > 0)) return
    setOcupado(true)
    try {
      const itens = exigir(await supabase.from('ficha_tecnica_itens').select('*').eq('ficha_id', fonte.ficha_tecnica_id!))
      if (!itens.length) throw new Error('A receita de origem está vazia.')
      await supabase.from('ficha_tecnica_itens').delete().eq('ficha_id', destino.id)
      const { error } = await supabase.from('ficha_tecnica_itens').insert(itens.map((i, k) => ({
        empresa_id: empresa.id, ficha_id: destino.id, insumo_id: i.insumo_id, quantidade: Math.round(Number(i.quantidade) * f * 1000) / 1000,
        unidade_codigo: i.unidade_codigo, perda_pct: i.perda_pct, ordem: k + 1,
      })))
      if (error) throw error
      await invalidar('fichas', 'produtos')
      toast.success('Receita copiada. Ajuste as quantidades se precisar.')
      setOrigem('')
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-white/70 p-3">
      <Campo rotulo="Copiar receita de outro tamanho" htmlFor={`cp-${variacao.id}`} className="min-w-48 flex-1">
        <Select id={`cp-${variacao.id}`} value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="">Selecione…</option>{fontes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Select>
      </Campo>
      <Campo rotulo="Multiplicar por" htmlFor={`cpf-${variacao.id}`} className="w-28" dica={fonte ? 'Sugerido pela área' : undefined}>
        <Input id={`cpf-${variacao.id}`} inputMode="decimal" value={fator} onChange={(e) => setFator(e.target.value)} />
      </Campo>
      <Button variante="contorno" tamanho="sm" className="mb-0.5" carregando={ocupado} disabled={!fonte || !(f > 0)} onClick={() => void copiar()}><Copy className="size-3.5" />Copiar (substitui)</Button>
    </div>
  )
}

/* ------------------------------------------------------------ Custos extras e rendimento */
function CustosExtras({ ficha }: { ficha: Ficha }) {
  const invalidar = useInvalidar()
  const { data: cfg } = useConfiguracoes()
  const atualizar = async (campos: Partial<Ficha>) => {
    const { error } = await supabase.from('fichas_tecnicas').update(campos).eq('id', ficha.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('fichas', 'produtos')
  }
  const campo = (k: 'custo_embalagem' | 'custo_mao_obra' | 'outros_custos', rotulo: string) => (
    <Campo rotulo={rotulo} htmlFor={`${k}-${ficha.id}`}>
      <Input id={`${k}-${ficha.id}`} key={String(ficha[k])} inputMode="decimal" defaultValue={br(Number(ficha[k]))}
        onBlur={(e) => { const n = lerNumero(e.target.value || '0'); if (n >= 0 && n !== Number(ficha[k])) void atualizar({ [k]: n }) }} />
    </Campo>
  )
  const maoObra = ficha.tempo_preparo_min && cfg?.custo_hora_mao_obra ? (ficha.tempo_preparo_min / 60) * Number(cfg.custo_hora_mao_obra) : null
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Campo rotulo="Tempo de preparo (min)" htmlFor={`tp-${ficha.id}`} dica={maoObra !== null ? <button type="button" className="font-semibold text-cacau-600 hover:underline" onClick={() => void atualizar({ custo_mao_obra: Math.round(maoObra * 100) / 100 })}>Mão de obra: {formatarMoeda(maoObra)}</button> : undefined}>
        <Input id={`tp-${ficha.id}`} inputMode="numeric" defaultValue={ficha.tempo_preparo_min ?? ''}
          onBlur={(e) => { const n = num(e.target.value); const r = n ? Math.round(n) : null; if (r !== ficha.tempo_preparo_min) void atualizar({ tempo_preparo_min: r }) }} />
      </Campo>
      {campo('custo_embalagem', 'Embalagem (R$)')}
      {campo('custo_mao_obra', 'Mão de obra (R$)')}
      {campo('outros_custos', 'Gás, energia… (R$)')}
    </div>
  )
}

function ResumoCusto({ rotulo, custo, preco }: { rotulo: string; custo: number; preco?: number }) {
  return (
    <div className="rounded-xl bg-creme px-3.5 py-2">
      <p className="text-[12px] font-semibold text-texto-suave">{rotulo}</p>
      <p className="font-display text-[17px] font-semibold tabular-nums">{formatarMoeda(custo)}{preco ? <span className="ml-2 text-[12.5px] font-normal">margem <Margem preco={preco} custo={custo} /></span> : null}</p>
    </div>
  )
}

/** Mostra o rendimento esperado para a equipe conferir na produção. */
function MonitorRendimento({ variacao: v, ficha }: { variacao: Variacao; ficha: Ficha }) {
  const { data: cfg } = useConfiguracoes()
  const custo = Number(ficha.custo_total)
  const sugerido = custo * (1 + Number(cfg?.margem_lucro_padrao ?? 100) / 100)
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <ResumoCusto rotulo="Custo total" custo={custo} />
      <div className="rounded-xl bg-creme px-3.5 py-2">
        <p className="text-[12px] font-semibold text-texto-suave">Rendimento esperado</p>
        <p className="font-display text-[17px] font-semibold">{v.rendimento_fatias ? `${v.rendimento_fatias} fatias` : '—'}</p>
        {v.peso_g && v.rendimento_fatias ? <p className="text-[11.5px] text-texto-suave">≈ {Math.round(Number(v.peso_g) / v.rendimento_fatias)} g por fatia</p> : null}
      </div>
      <ResumoCusto rotulo="Custo por fatia" custo={v.rendimento_fatias ? custo / v.rendimento_fatias : 0} />
      <div className="rounded-xl bg-creme px-3.5 py-2">
        <p className="text-[12px] font-semibold text-texto-suave">Preço sugerido</p>
        <p className="font-display text-[17px] font-semibold text-cacau-700 tabular-nums">{formatarMoeda(sugerido)}</p>
        <p className="text-[11.5px] text-texto-suave">custo + {cfg?.margem_lucro_padrao ?? 100}%</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Novo tamanho/forma */
function NovaVariacao({ produto, variacoes, onCriada }: { produto: Produto; variacoes: Variacao[]; onCriada: (id: string) => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const [v, setV] = useState({ forma: 'Redonda', tamanho: '', faixa: '', fatias: '', peso: '', preco: '', copiar: '' })
  const [ocupado, setOcupado] = useState(false)
  const fonte = variacoes.find((x) => x.id === v.copiar)
  const fator = useMemo(() => {
    const a = medida(fonte?.tamanho), b = medida(v.tamanho)
    return a && b ? Math.round((b / a) ** 2 * 100) / 100 : 1
  }, [fonte, v.tamanho])
  const preco = lerNumero(v.preco)
  const valido = (v.tamanho.trim() || v.faixa.trim()) && v.preco.trim() !== '' && preco >= 0

  const criar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    setOcupado(true)
    try {
      const nome = nomeVariacao({ tipo_forma: v.forma, tamanho: v.tamanho.trim(), faixa: v.faixa.trim() })
      const peso = num(v.peso)
      const { data: ficha, error: e1 } = await supabase.from('fichas_tecnicas').insert({
        empresa_id: empresa.id, nome: `${produto.nome} · ${nome}`, tipo: 'produto', rendimento: 1, unidade_rendimento: 'un', peso_unitario_g: peso && peso > 0 ? peso : null,
      }).select('id').single()
      if (e1) throw e1
      const fatias = num(v.fatias)
      const { data: nova, error: e2 } = await supabase.from('variacoes_produtos').insert({
        empresa_id: empresa.id, produto_id: produto.id, nome, tipo_forma: v.forma, tamanho: v.tamanho.trim() || null, faixa: v.faixa.trim() || null,
        rendimento_fatias: fatias ? Math.round(fatias) : null, peso_g: peso && peso > 0 ? peso : null, preco, ficha_tecnica_id: ficha.id, ordem: variacoes.length + 1,
      }).select('id').single()
      if (e2) throw e2
      if (fonte?.ficha_tecnica_id) {
        const itens = exigir(await supabase.from('ficha_tecnica_itens').select('*').eq('ficha_id', fonte.ficha_tecnica_id))
        if (itens.length) {
          const { error: e3 } = await supabase.from('ficha_tecnica_itens').insert(itens.map((i, k) => ({
            empresa_id: empresa.id, ficha_id: ficha.id, insumo_id: i.insumo_id, quantidade: Math.round(Number(i.quantidade) * fator * 1000) / 1000,
            unidade_codigo: i.unidade_codigo, perda_pct: i.perda_pct, ordem: k + 1,
          })))
          if (e3) throw e3
        }
      }
      await invalidar('produtos', 'fichas')
      setV({ ...v, tamanho: '', faixa: '', fatias: '', peso: '', preco: '', copiar: '' })
      onCriada(nova.id)
    } catch (err) {
      toast.error(mensagemErro(err))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={criar} className="mt-3 space-y-3 rounded-2xl border border-dashed border-borda-forte p-4">
      <p className="text-[13px] font-semibold text-choco-800">Adicionar tamanho / forma</p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Campo rotulo="Forma" htmlFor="nv-forma">
          <Select id="nv-forma" value={v.forma} onChange={(e) => setV({ ...v, forma: e.target.value })}>{tiposForma.map((t) => <option key={t}>{t}</option>)}</Select>
        </Campo>
        <Campo rotulo="Tamanho" htmlFor="nv-tam"><Input id="nv-tam" placeholder="20 cm" value={v.tamanho} onChange={(e) => setV({ ...v, tamanho: e.target.value })} /></Campo>
        <Campo rotulo="Faixa / recheio" htmlFor="nv-faixa"><Input id="nv-faixa" placeholder="Tradicional" value={v.faixa} onChange={(e) => setV({ ...v, faixa: e.target.value })} /></Campo>
        <Campo rotulo="Rende (fatias)" htmlFor="nv-fat"><Input id="nv-fat" inputMode="numeric" value={v.fatias} onChange={(e) => setV({ ...v, fatias: e.target.value })} /></Campo>
        <Campo rotulo="Peso final (g)" htmlFor="nv-peso"><Input id="nv-peso" inputMode="decimal" value={v.peso} onChange={(e) => setV({ ...v, peso: e.target.value })} /></Campo>
        <Campo rotulo="Preço (R$)" htmlFor="nv-preco" obrigatorio><Input id="nv-preco" inputMode="decimal" value={v.preco} onChange={(e) => setV({ ...v, preco: e.target.value })} /></Campo>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {variacoes.some((x) => x.ficha_tecnica_id) && (
          <Campo rotulo="Começar com a receita de" htmlFor="nv-cp" className="min-w-56 flex-1"
            dica={fonte ? `Quantidades × ${br(fator)}${fator !== 1 ? ' (proporção da área da forma)' : ''}. Dá para ajustar depois.` : 'Opcional: copia e ajusta pela área da forma.'}>
            <Select id="nv-cp" value={v.copiar} onChange={(e) => setV({ ...v, copiar: e.target.value })}>
              <option value="">Receita em branco</option>{variacoes.filter((x) => x.ficha_tecnica_id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </Select>
          </Campo>
        )}
        <Button type="submit" variante="secundario" className="ml-auto" carregando={ocupado} disabled={!valido}><Plus className="size-4" />Adicionar e montar receita</Button>
      </div>
      {produto.unidade_venda !== 'un' && <p className="text-[12px] text-texto-suave">Cada tamanho é vendido por unidade; a receita é a quantidade para 1 unidade desse tamanho.</p>}
    </form>
  )
}
