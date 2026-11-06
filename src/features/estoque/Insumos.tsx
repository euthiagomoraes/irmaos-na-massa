import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, format } from 'date-fns'
import { AlertTriangle, ArrowLeftRight, Package, Pencil, Plus, Power, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useCategoriasInsumos, useConfiguracoes, useFornecedores, useInsumos, useInvalidar } from '@/lib/consultas'
import { Badge, Button, Card, Carregando, EstadoErro, EstadoVazio, Select } from '@/components/ui'
import { CabecalhoTabela, CampoBusca, DialogoMotivo, Gaveta, Kpi, LinhaClicavel, Pilulas, Secao } from '@/components/ui/estrutura'
import { cn, dataLocal, formatarMoeda, formatarQuantidade, mensagemErro, normalizarTexto } from '@/lib/utils'
import { FormularioInsumo, type Insumo } from './FormularioInsumo'
import { Movimentar, type TipoMov } from './Movimentar'

type Filtro = 'todos' | 'baixo' | 'vencendo' | 'embalagens' | 'inativos'

export const rotulosMov: Record<string, string> = {
  entrada: 'Entrada', saida: 'Saída', ajuste: 'Inventário', producao: 'Produção', perda: 'Perda', estorno: 'Estorno',
}

function useLotesVencendo() {
  const empresa = useEmpresa()
  const { data: cfg } = useConfiguracoes()
  const dias = cfg?.dias_alerta_validade ?? 7
  return useQuery({
    queryKey: ['insumos', empresa.id, 'lotes-vencendo', dias],
    queryFn: async () => {
      const limite = format(new Date(Date.now() + dias * 86400000), 'yyyy-MM-dd')
      return exigir(await supabase.from('lotes_insumos').select('id, insumo_id, data_validade, quantidade_atual, codigo_lote')
        .eq('empresa_id', empresa.id).gt('quantidade_atual', 0).not('data_validade', 'is', null).lte('data_validade', limite).order('data_validade'))
    },
  })
}

export function Insumos() {
  const { data: insumos = [], isLoading, error, refetch } = useInsumos()
  const { data: categorias = [] } = useCategoriasInsumos()
  const { data: lotesVencendo = [] } = useLotesVencendo()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [categoria, setCategoria] = useState('')
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Insumo | null>(null)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [mov, setMov] = useState<{ insumo: Insumo; tipo: TipoMov } | null>(null)

  const vencendoPorInsumo = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of lotesVencendo) if (!m.has(l.insumo_id)) m.set(l.insumo_id, l.data_validade!)
    return m
  }, [lotesVencendo])

  const baixo = (i: Insumo) => i.ativo && Number(i.estoque_minimo) > 0 && Number(i.quantidade_atual) <= Number(i.estoque_minimo)
  const ativos = insumos.filter((i) => i.ativo)
  const contagem = {
    todos: ativos.length, baixo: ativos.filter(baixo).length, vencendo: ativos.filter((i) => vencendoPorInsumo.has(i.id)).length,
    embalagens: ativos.filter((i) => i.e_embalagem).length, inativos: insumos.length - ativos.length,
  }

  const lista = useMemo(() => {
    const t = normalizarTexto(busca.trim())
    return insumos.filter((i) => {
      if (filtro === 'inativos' ? i.ativo : !i.ativo) return false
      if (filtro === 'baixo' && !baixo(i)) return false
      if (filtro === 'vencendo' && !vencendoPorInsumo.has(i.id)) return false
      if (filtro === 'embalagens' && !i.e_embalagem) return false
      if (categoria && i.categoria_id !== categoria) return false
      return !t || normalizarTexto(i.nome).includes(t) || normalizarTexto(i.codigo ?? '').includes(t)
    })
  }, [insumos, busca, filtro, categoria, vencendoPorInsumo])

  const nomeCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nome
  const selecionado = insumos.find((i) => i.id === selecionadoId) ?? null

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar insumo por nome ou código" />
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-9 rounded-full text-[13px] lg:w-52" aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Button onClick={() => { setEditando(null); setFormAberto(true) }}><Plus className="size-4" />Novo insumo</Button>
        </div>
        <div className="mt-3">
          <Pilulas ativa={filtro} onChange={setFiltro} opcoes={[
            { id: 'todos', rotulo: 'Todos', contagem: contagem.todos },
            { id: 'baixo', rotulo: 'Estoque baixo', contagem: contagem.baixo },
            { id: 'vencendo', rotulo: 'Vencendo', contagem: contagem.vencendo },
            { id: 'embalagens', rotulo: 'Embalagens', contagem: contagem.embalagens },
            { id: 'inativos', rotulo: 'Inativos', contagem: contagem.inativos },
          ]} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? <Carregando texto="Carregando insumos…" /> : error ? (
          <div className="p-5"><EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} /></div>
        ) : insumos.length === 0 ? (
          <EstadoVazio icone={<Package className="size-6" />} titulo="Nenhum insumo cadastrado"
            descricao="Cadastre ingredientes e embalagens para controlar o estoque e calcular o custo das receitas."
            acao={<Button onClick={() => { setEditando(null); setFormAberto(true) }}><Plus className="size-4" />Cadastrar o primeiro</Button>} />
        ) : lista.length === 0 ? (
          <EstadoVazio titulo="Nenhum insumo neste filtro" />
        ) : (
          <>
            <CabecalhoTabela className="grid-cols-[minmax(0,2fr)_9rem_9rem_8rem_6.5rem]">
              <span>Insumo</span><span className="text-right">Saldo</span><span className="text-right">Mínimo</span><span className="text-right">Custo</span><span />
            </CabecalhoTabela>
            <ul className="divide-y divide-borda/70">
              {lista.map((i) => {
                const vence = vencendoPorInsumo.get(i.id)
                const dias = vence ? differenceInCalendarDays(dataLocal(vence), new Date()) : null
                return (
                  <li key={i.id} className="flex items-center">
                    <LinhaClicavel onClick={() => setSelecionadoId(i.id)} className="grid flex-1 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 md:grid-cols-[minmax(0,2fr)_9rem_9rem_8rem]">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-choco-800">{i.nome}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-texto-suave">
                          {nomeCategoria(i.categoria_id) && <span>{nomeCategoria(i.categoria_id)}</span>}
                          {baixo(i) && <Badge tom="alerta" className="py-0 text-[11px]"><AlertTriangle className="size-3" />Estoque baixo</Badge>}
                          {dias !== null && <Badge tom="erro" className="py-0 text-[11px]">{dias < 0 ? 'Lote vencido' : dias === 0 ? 'Vence hoje' : `Vence em ${dias}d`}</Badge>}
                        </div>
                      </div>
                      <span className={cn('text-right text-[14px] font-semibold tabular-nums', Number(i.quantidade_atual) < 0 ? 'text-erro' : baixo(i) ? 'text-alerta' : 'text-choco-800')}>
                        {formatarQuantidade(i.quantidade_atual, i.unidade_codigo)}
                      </span>
                      <span className="hidden text-right text-[13px] text-texto-suave tabular-nums md:block">{Number(i.estoque_minimo) > 0 ? formatarQuantidade(i.estoque_minimo, i.unidade_codigo) : '—'}</span>
                      <span className="hidden text-right text-[13px] tabular-nums md:block">{formatarMoeda(i.custo_unitario)}<span className="text-texto-suave">/{i.unidade_codigo}</span></span>
                    </LinhaClicavel>
                    <div className="hidden w-[6.5rem] justify-end pr-4 md:flex">
                      {i.ativo && <Button variante="suave" tamanho="sm" onClick={() => setMov({ insumo: i, tipo: 'entrada' })}><ArrowLeftRight className="size-3.5" />Mover</Button>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <FormularioInsumo aberto={formAberto} onAbertoChange={setFormAberto} insumo={editando} onSalvo={(id) => setSelecionadoId(id)} />
      <Movimentar insumo={mov?.insumo ?? null} tipoInicial={mov?.tipo} onFechar={() => setMov(null)} />
      <FichaInsumo insumo={selecionado} onFechar={() => setSelecionadoId(null)}
        onEditar={(i) => { setEditando(i); setFormAberto(true) }} onMovimentar={(i, t) => setMov({ insumo: i, tipo: t })} />
    </div>
  )
}

function FichaInsumo({ insumo: i, onFechar, onEditar, onMovimentar }: {
  insumo: Insumo | null; onFechar: () => void; onEditar: (i: Insumo) => void; onMovimentar: (i: Insumo, t: TipoMov) => void
}) {
  const empresa = useEmpresa()
  const { ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const { data: fornecedores = [] } = useFornecedores()
  const [estornando, setEstornando] = useState<string | null>(null)

  const detalhes = useQuery({
    enabled: !!i,
    queryKey: ['movimentacoes', empresa.id, 'insumo', i?.id],
    queryFn: async () => {
      const [lotes, movs] = await Promise.all([
        supabase.from('lotes_insumos').select('*').eq('insumo_id', i!.id).gt('quantidade_atual', 0).order('data_validade', { nullsFirst: false }),
        supabase.from('movimentacoes_estoque').select('*').eq('insumo_id', i!.id).order('created_at', { ascending: false }).limit(30),
      ])
      return { lotes: exigir(lotes), movs: exigir(movs) }
    },
  })

  const alternarAtivo = async () => {
    if (!i) return
    const { error } = await supabase.from('insumos').update({ ativo: !i.ativo }).eq('id', i.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('insumos')
    toast.success(i.ativo ? 'Insumo inativado.' : 'Insumo reativado.')
  }

  const estornados = new Set((detalhes.data?.movs ?? []).map((m) => m.estorno_de).filter(Boolean))
  const fornecedor = fornecedores.find((f) => f.id === i?.fornecedor_padrao_id)

  return (
    <Gaveta aberto={!!i} onFechar={onFechar} titulo={i?.nome ?? ''}
      subtitulo={i ? `${i.e_embalagem ? 'Embalagem/material' : 'Ingrediente'}${i.local_armazenamento ? ` · ${i.local_armazenamento}` : ''}${!i.ativo ? ' · Inativo' : ''}` : undefined}
      rodape={i && <>
        <Button variante="contorno" tamanho="sm" onClick={() => void alternarAtivo()}><Power className="size-4" />{i.ativo ? 'Inativar' : 'Reativar'}</Button>
        <div className="ml-auto flex gap-2">
          <Button variante="contorno" tamanho="sm" onClick={() => onEditar(i)}><Pencil className="size-4" />Editar</Button>
          {i.ativo && <Button tamanho="sm" onClick={() => onMovimentar(i, 'entrada')}><ArrowLeftRight className="size-4" />Movimentar</Button>}
        </div>
      </>}>
      {i && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Kpi rotulo="Saldo" valor={formatarQuantidade(i.quantidade_atual, i.unidade_codigo)} tom={Number(i.estoque_minimo) > 0 && Number(i.quantidade_atual) <= Number(i.estoque_minimo) ? 'alerta' : undefined} />
            <Kpi rotulo="Custo atual" valor={formatarMoeda(i.custo_unitario)} detalhe={`por ${i.unidade_codigo}`} />
            <Kpi rotulo="Custo médio" valor={formatarMoeda(i.custo_medio)} detalhe={`por ${i.unidade_codigo}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['entrada', 'saida', 'perda', 'ajuste'] as TipoMov[]).map((t) => (
              <Button key={t} variante="suave" tamanho="sm" disabled={!i.ativo} onClick={() => onMovimentar(i, t)}>{t === 'ajuste' ? 'Inventário' : rotulosMov[t]}</Button>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-texto-suave">Estoque mínimo</dt><dd>{formatarQuantidade(i.estoque_minimo, i.unidade_codigo)}</dd>
            {fornecedor && <><dt className="text-texto-suave">Fornecedor padrão</dt><dd>{fornecedor.nome}</dd></>}
            {i.densidade_g_ml && <><dt className="text-texto-suave">Densidade</dt><dd>{i.densidade_g_ml} g/ml</dd></>}
            {i.peso_unitario_g && <><dt className="text-texto-suave">Peso unitário</dt><dd>{i.peso_unitario_g} g</dd></>}
            {i.codigo && <><dt className="text-texto-suave">Código</dt><dd>{i.codigo}</dd></>}
          </dl>
          {i.observacoes && <p className="text-[13px] whitespace-pre-line text-choco-700">{i.observacoes}</p>}

          {detalhes.isLoading ? <Carregando /> : detalhes.error ? <EstadoErro mensagem={mensagemErro(detalhes.error)} /> : detalhes.data && (
            <>
              {detalhes.data.lotes.length > 0 && (
                <Secao titulo="Lotes em estoque">
                  <ul className="divide-y divide-borda/70 rounded-xl border border-borda">
                    {detalhes.data.lotes.map((l) => {
                      const d = l.data_validade ? differenceInCalendarDays(dataLocal(l.data_validade), new Date()) : null
                      return (
                        <li key={l.id} className="flex items-center gap-3 px-3.5 py-2 text-[13px]">
                          <span className="flex-1">{l.codigo_lote ? `Lote ${l.codigo_lote}` : 'Lote sem código'}</span>
                          <span className={cn('tabular-nums', d !== null && d <= 7 && 'font-semibold text-erro')}>{l.data_validade ? `Val. ${format(dataLocal(l.data_validade), 'dd/MM/yy')}` : 'Sem validade'}</span>
                          <span className="w-24 text-right font-medium tabular-nums">{formatarQuantidade(l.quantidade_atual, i.unidade_codigo)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </Secao>
              )}
              <Secao titulo="Últimas movimentações">
                {detalhes.data.movs.length === 0 ? <p className="text-[13px] text-texto-suave">Nenhuma movimentação ainda. Registre uma entrada para começar.</p> : (
                  <ul className="divide-y divide-borda/70">
                    {detalhes.data.movs.map((m) => {
                      const podeEstornar = ehGestor && m.tipo !== 'estorno' && !estornados.has(m.id) && m.origem_tipo !== 'pedido'
                      return (
                        <li key={m.id} className="flex items-start gap-3 py-2.5 text-[13px]">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-choco-800">
                              {rotulosMov[m.tipo]}{estornados.has(m.id) && <Badge tom="neutro" className="ml-1.5 py-0 text-[11px]">Estornada</Badge>}
                            </p>
                            <p className="truncate text-[12px] text-texto-suave">{format(new Date(m.created_at), 'dd/MM/yy HH:mm')}{m.motivo ? ` · ${m.motivo}` : ''}</p>
                          </div>
                          <span className={cn('font-semibold tabular-nums', Number(m.quantidade) > 0 ? 'text-sucesso' : 'text-erro')}>
                            {Number(m.quantidade) > 0 ? '+' : ''}{formatarQuantidade(m.quantidade, i.unidade_codigo)}
                          </span>
                          {podeEstornar && (
                            <Button variante="fantasma" tamanho="icone" className="size-7" aria-label="Estornar movimentação" title="Estornar" onClick={() => setEstornando(m.id)}>
                              <RotateCcw className="size-3.5" />
                            </Button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Secao>
            </>
          )}
        </>
      )}
      <DialogoMotivo aberto={!!estornando} onAbertoChange={(v) => { if (!v) setEstornando(null) }} titulo="Estornar movimentação"
        descricao="Gera a movimentação inversa e restaura o saldo. A original continua no histórico." botao="Estornar" perigo
        onConfirmar={async (motivo) => {
          const { error } = await supabase.rpc('estornar_movimentacao', { p_movimentacao_id: estornando!, p_motivo: motivo })
          if (error) { toast.error(mensagemErro(error)); throw error }
          await invalidar('insumos', 'movimentacoes', 'fichas')
          toast.success('Movimentação estornada.')
        }} />
    </Gaveta>
  )
}
