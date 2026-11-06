import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Banknote, Pencil, Plus, RotateCcw, Trash2, Wallet, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useCategoriasFinanceiras, useClientesBasico, useFormasPagamento, useFornecedores, useInvalidar } from '@/lib/consultas'
import { Badge, Button, Campo, Card, Carregando, EstadoErro, EstadoVazio, Input, Select, Textarea } from '@/components/ui'
import { CabecalhoTabela, CampoBusca, DialogoMotivo, Gaveta, Kpi, LinhaClicavel, Modal, Pilulas, Secao } from '@/components/ui/estrutura'
import { cn, dataLocal, formatarMoeda, hojeIso, lerNumero, mensagemErro, normalizarTexto } from '@/lib/utils'

export type TipoConta = 'pagar' | 'receber'
type Filtro = 'abertas' | 'vencidas' | 'quitadas' | 'canceladas' | 'todas'

interface ContaUnificada {
  id: string; descricao: string; valor: number; baixado: number; vencimento: string; competencia: string; status: string
  categoria_id: string | null; pessoa: string | null; pessoa_id: string | null; documento: string | null; observacoes: string | null
  pedido_id: string | null; compra_id: string | null; recorrente: boolean
}

export const tomConta: Record<string, 'alerta' | 'info' | 'sucesso' | 'neutro'> = { aberta: 'alerta', parcial: 'info', quitada: 'sucesso', cancelada: 'neutro' }
export const rotuloConta: Record<string, string> = { aberta: 'Em aberto', parcial: 'Parcial', quitada: 'Quitada', cancelada: 'Cancelada' }

function useContas(tipo: TipoConta) {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['financeiro', empresa.id, 'contas', tipo],
    queryFn: async (): Promise<ContaUnificada[]> => {
      if (tipo === 'pagar') {
        const r = exigir(await supabase.from('contas_pagar').select('*, fornecedor:fornecedores(nome)').eq('empresa_id', empresa.id).order('vencimento').limit(3000))
        return r.map((c) => ({
          id: c.id, descricao: c.descricao, valor: Number(c.valor), baixado: Number(c.valor_pago), vencimento: c.vencimento, competencia: c.competencia,
          status: c.status, categoria_id: c.categoria_id, pessoa: (c.fornecedor as { nome: string } | null)?.nome ?? null, pessoa_id: c.fornecedor_id,
          documento: c.documento, observacoes: c.observacoes, pedido_id: null, compra_id: c.compra_id, recorrente: !!c.despesa_recorrente_id,
        }))
      }
      const r = exigir(await supabase.from('contas_receber').select('*, cliente:clientes(nome)').eq('empresa_id', empresa.id).order('vencimento').limit(3000))
      return r.map((c) => ({
        id: c.id, descricao: c.descricao, valor: Number(c.valor), baixado: Number(c.valor_recebido), vencimento: c.vencimento, competencia: c.competencia,
        status: c.status, categoria_id: c.categoria_id, pessoa: (c.cliente as { nome: string } | null)?.nome ?? null, pessoa_id: c.cliente_id,
        documento: null, observacoes: c.observacoes, pedido_id: c.pedido_id, compra_id: null, recorrente: false,
      }))
    },
  })
}

export function Contas({ tipo }: { tipo: TipoConta }) {
  const { data = [], isLoading, error, refetch } = useContas(tipo)
  const { data: categorias = [] } = useCategoriasFinanceiras()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [editando, setEditando] = useState<ContaUnificada | null | undefined>(undefined)
  const hoje = hojeIso()

  const aberta = (c: ContaUnificada) => c.status === 'aberta' || c.status === 'parcial'
  const vencida = (c: ContaUnificada) => aberta(c) && c.vencimento < hoje
  const lista = useMemo(() => {
    const t = normalizarTexto(busca.trim())
    const l = data.filter((c) => {
      if (filtro === 'abertas' && !aberta(c)) return false
      if (filtro === 'vencidas' && !vencida(c)) return false
      if (filtro === 'quitadas' && c.status !== 'quitada') return false
      if (filtro === 'canceladas' && c.status !== 'cancelada') return false
      return !t || normalizarTexto(c.descricao).includes(t) || normalizarTexto(c.pessoa ?? '').includes(t)
    })
    return filtro === 'quitadas' || filtro === 'todas' || filtro === 'canceladas' ? [...l].reverse() : l
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, busca, filtro, hoje])

  const totalAberto = data.filter(aberta).reduce((s, c) => s + c.valor - c.baixado, 0)
  const totalVencido = data.filter(vencida).reduce((s, c) => s + c.valor - c.baixado, 0)
  const proximos7 = data.filter((c) => aberta(c) && c.vencimento >= hoje && c.vencimento <= format(new Date(Date.now() + 7 * 864e5), 'yyyy-MM-dd')).reduce((s, c) => s + c.valor - c.baixado, 0)
  const selecionada = data.find((c) => c.id === abertaId) ?? null
  const nomeCat = (id: string | null) => categorias.find((c) => c.id === id)?.nome

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi rotulo={tipo === 'pagar' ? 'A pagar' : 'A receber'} valor={formatarMoeda(totalAberto)} />
        <Kpi rotulo="Vencido" valor={formatarMoeda(totalVencido)} tom={totalVencido > 0 ? 'erro' : undefined} />
        <Kpi rotulo="Próximos 7 dias" valor={formatarMoeda(proximos7)} />
      </div>
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <CampoBusca valor={busca} onChange={setBusca} placeholder={`Buscar por descrição ou ${tipo === 'pagar' ? 'fornecedor' : 'cliente'}`} />
          <Button onClick={() => setEditando(null)}><Plus className="size-4" />{tipo === 'pagar' ? 'Nova conta a pagar' : 'Nova conta a receber'}</Button>
        </div>
        <Pilulas ativa={filtro} onChange={setFiltro} opcoes={[
          { id: 'abertas', rotulo: 'Em aberto', contagem: data.filter(aberta).length },
          { id: 'vencidas', rotulo: 'Vencidas', contagem: data.filter(vencida).length },
          { id: 'quitadas', rotulo: tipo === 'pagar' ? 'Pagas' : 'Recebidas', contagem: data.filter((c) => c.status === 'quitada').length },
          { id: 'canceladas', rotulo: 'Canceladas' },
          { id: 'todas', rotulo: 'Todas' },
        ]} />
      </Card>
      <Card className="overflow-hidden">
        {isLoading ? <Carregando /> : error ? <div className="p-5"><EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} /></div>
          : lista.length === 0 ? <EstadoVazio icone={<Wallet className="size-6" />} titulo="Nenhuma conta neste filtro"
            descricao={tipo === 'receber' ? 'Pedidos confirmados geram contas a receber automaticamente.' : 'Compras confirmadas e despesas fixas geram contas a pagar automaticamente.'} /> : (
            <>
              <CabecalhoTabela className="grid-cols-[6.5rem_minmax(0,2fr)_minmax(0,1fr)_7rem_8rem]">
                <span>Vencimento</span><span>Descrição</span><span>Categoria</span><span>Status</span><span className="text-right">Saldo</span>
              </CabecalhoTabela>
              <ul className="divide-y divide-borda/70">
                {lista.map((c) => (
                  <li key={c.id}>
                    <LinhaClicavel onClick={() => setAbertaId(c.id)} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-0.5 md:grid-cols-[6.5rem_minmax(0,2fr)_minmax(0,1fr)_7rem_8rem]">
                      <span className={cn('text-[13px] tabular-nums', vencida(c) ? 'font-semibold text-erro' : 'text-choco-700')}>{format(dataLocal(c.vencimento), 'dd/MM/yy')}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-choco-800">{c.descricao}</p>
                        <p className="truncate text-[12px] text-texto-suave">{[c.pessoa, c.recorrente && 'Despesa fixa', c.documento && `Doc. ${c.documento}`].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className="hidden truncate text-[13px] text-texto-suave md:block">{nomeCat(c.categoria_id) ?? '—'}</span>
                      <span className="hidden md:block"><Badge tom={tomConta[c.status]}>{rotuloConta[c.status]}</Badge></span>
                      <span className="text-right">
                        <span className="block text-[13.5px] font-semibold tabular-nums">{formatarMoeda(c.status === 'quitada' || c.status === 'cancelada' ? c.valor : c.valor - c.baixado)}</span>
                        {c.status === 'parcial' && <span className="block text-[11.5px] text-texto-suave">de {formatarMoeda(c.valor)}</span>}
                      </span>
                    </LinhaClicavel>
                  </li>
                ))}
              </ul>
            </>
          )}
      </Card>
      <DetalheConta tipo={tipo} conta={selecionada} onFechar={() => setAbertaId(null)} onEditar={(c) => setEditando(c)} />
      <FormularioConta tipo={tipo} conta={editando} onFechar={() => setEditando(undefined)} onSalva={(id) => setAbertaId(id)} />
    </div>
  )
}

function DetalheConta({ tipo, conta: c, onFechar, onEditar }: { tipo: TipoConta; conta: ContaUnificada | null; onFechar: () => void; onEditar: (c: ContaUnificada) => void }) {
  const empresa = useEmpresa()
  const { ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const { data: formas = [] } = useFormasPagamento()
  const { data: categorias = [] } = useCategoriasFinanceiras()
  const [cancelando, setCancelando] = useState(false)
  const [estornando, setEstornando] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  const [forma, setForma] = useState('')
  const [dataB, setDataB] = useState(hojeIso())
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { setValor(''); setForma(''); setDataB(hojeIso()) }, [c?.id])

  const lancs = useQuery({
    enabled: !!c,
    queryKey: ['financeiro', empresa.id, 'lancamentos-conta', c?.id],
    queryFn: async () => exigir(await supabase.from('lancamentos_financeiros').select('*')
      .eq(tipo === 'pagar' ? 'conta_pagar_id' : 'conta_receber_id', c!.id).order('created_at')),
  })
  const estornados = new Set((lancs.data ?? []).map((l) => l.estorno_de).filter(Boolean))
  const saldo = c ? c.valor - c.baixado : 0
  const n = lerNumero(valor || String(saldo))
  const aberta = c && (c.status === 'aberta' || c.status === 'parcial')

  const baixar = async (e: FormEvent) => {
    e.preventDefault()
    if (!c || !(n > 0) || n > saldo + 0.001) return
    setOcupado(true)
    const args = { p_conta: c.id, p_valor: Math.round(n * 100) / 100, p_data: dataB, p_forma: forma || undefined, p_chave: crypto.randomUUID() }
    const { error } = tipo === 'pagar' ? await supabase.rpc('baixar_conta_pagar', args) : await supabase.rpc('baixar_conta_receber', args)
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('financeiro', 'pedidos')
    toast.success(tipo === 'pagar' ? 'Pagamento registrado.' : 'Recebimento registrado.')
  }
  const excluir = async () => {
    if (!c || !window.confirm('Excluir esta conta?')) return
    const { error } = await supabase.from(tipo === 'pagar' ? 'contas_pagar' : 'contas_receber').delete().eq('id', c.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('financeiro')
    onFechar()
  }

  return (
    <Gaveta aberto={!!c} onFechar={onFechar} titulo={c?.descricao ?? ''}
      subtitulo={c ? `${tipo === 'pagar' ? 'Conta a pagar' : 'Conta a receber'} · vence ${format(dataLocal(c.vencimento), 'dd/MM/yyyy')}` : undefined}
      cabecalhoExtra={c && <div className="mt-2"><Badge tom={tomConta[c.status]}>{rotuloConta[c.status]}</Badge></div>}
      rodape={c && <>
        {ehGestor && c.status === 'aberta' && c.baixado === 0 && !c.pedido_id && !c.compra_id && <Button variante="fantasma" tamanho="sm" className="text-erro" onClick={() => void excluir()}><Trash2 className="size-4" />Excluir</Button>}
        {ehGestor && aberta && c.baixado === 0 && !c.pedido_id && !c.compra_id && <Button variante="fantasma" tamanho="sm" onClick={() => setCancelando(true)}><XCircle className="size-4" />Cancelar</Button>}
        {aberta && !c.pedido_id && <Button variante="contorno" tamanho="sm" className="ml-auto" onClick={() => onEditar(c)}><Pencil className="size-4" />Editar</Button>}
      </>}>
      {c && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Kpi rotulo="Valor" valor={formatarMoeda(c.valor)} />
            <Kpi rotulo={tipo === 'pagar' ? 'Pago' : 'Recebido'} valor={formatarMoeda(c.baixado)} tom={c.baixado > 0 ? 'sucesso' : undefined} />
            <Kpi rotulo="Saldo" valor={formatarMoeda(Math.max(saldo, 0))} tom={saldo > 0 && c.vencimento < hojeIso() && aberta ? 'erro' : undefined} />
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-texto-suave">{tipo === 'pagar' ? 'Fornecedor' : 'Cliente'}</dt><dd>{c.pessoa ?? '—'}</dd>
            <dt className="text-texto-suave">Categoria</dt><dd>{categorias.find((x) => x.id === c.categoria_id)?.nome ?? '—'}</dd>
            <dt className="text-texto-suave">Competência</dt><dd>{format(dataLocal(c.competencia), 'MM/yyyy')}</dd>
            {c.pedido_id && <><dt className="text-texto-suave">Origem</dt><dd><Link className="font-semibold text-cacau-600 hover:underline" to={`/pedidos?id=${c.pedido_id}`}>Ver pedido</Link></dd></>}
            {c.compra_id && <><dt className="text-texto-suave">Origem</dt><dd>Compra de insumos</dd></>}
          </dl>
          {c.observacoes && <p className="text-[13px] whitespace-pre-line text-choco-700">{c.observacoes}</p>}

          {aberta && (
            <Secao titulo={tipo === 'pagar' ? 'Registrar pagamento' : 'Registrar recebimento'}>
              <form onSubmit={baixar} className="grid gap-3 rounded-xl border border-dashed border-borda-forte p-3.5 sm:grid-cols-[8rem_1fr_9rem] sm:items-end">
                <Campo rotulo="Valor (R$)" htmlFor="bx-v"><Input id="bx-v" inputMode="decimal" placeholder={String(saldo.toFixed(2)).replace('.', ',')} value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
                <Campo rotulo="Forma" htmlFor="bx-f">
                  <Select id="bx-f" value={forma} onChange={(e) => setForma(e.target.value)}>
                    <option value="">Não informada</option>
                    {formas.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </Select>
                </Campo>
                <Campo rotulo="Data" htmlFor="bx-d"><Input id="bx-d" type="date" value={dataB} onChange={(e) => setDataB(e.target.value)} /></Campo>
                <div className="flex justify-end sm:col-span-3"><Button type="submit" variante="secundario" carregando={ocupado} disabled={!(n > 0) || n > saldo + 0.001}><Banknote className="size-4" />{n >= saldo - 0.001 ? 'Quitar' : 'Registrar parcial'}</Button></div>
              </form>
            </Secao>
          )}

          <Secao titulo="Movimentações de caixa">
            {lancs.isLoading ? <Carregando /> : (lancs.data ?? []).length === 0 ? <p className="text-[13px] text-texto-suave">Nenhuma baixa registrada.</p> : (
              <ul className="divide-y divide-borda/70">
                {lancs.data!.map((l) => (
                  <li key={l.id} className={cn('flex items-center gap-3 py-2 text-[13px]', (l.estorno_de || estornados.has(l.id)) && 'text-texto-suave')}>
                    <span className="w-20 tabular-nums">{format(dataLocal(l.data_lancamento), 'dd/MM/yy')}</span>
                    <span className="min-w-0 flex-1 truncate">{l.descricao}{estornados.has(l.id) && <Badge className="ml-1.5 py-0 text-[11px]">Estornado</Badge>}</span>
                    <span className={cn('font-semibold tabular-nums', l.tipo === 'entrada' ? 'text-sucesso' : 'text-erro')}>{l.tipo === 'entrada' ? '+' : '−'}{formatarMoeda(l.valor)}</span>
                    {ehGestor && !l.estorno_de && !estornados.has(l.id) && (
                      <Button variante="fantasma" tamanho="icone" className="size-7" title="Estornar" aria-label="Estornar" onClick={() => setEstornando(l.id)}><RotateCcw className="size-3.5" /></Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </>
      )}
      <DialogoMotivo aberto={cancelando} onAbertoChange={setCancelando} titulo="Cancelar conta" perigo botao="Cancelar conta"
        onConfirmar={async (m) => {
          const { error } = await supabase.rpc('cancelar_conta', { p_tipo: tipo, p_conta: c!.id, p_motivo: m })
          if (error) { toast.error(mensagemErro(error)); throw error }
          await invalidar('financeiro')
          toast.success('Conta cancelada.')
        }} />
      <DialogoMotivo aberto={!!estornando} onAbertoChange={(v) => { if (!v) setEstornando(null) }} titulo="Estornar lançamento" perigo botao="Estornar"
        descricao="Gera o lançamento inverso e reabre o saldo da conta."
        onConfirmar={async (m) => {
          const { error } = await supabase.rpc('estornar_lancamento', { p_lancamento: estornando!, p_motivo: m })
          if (error) { toast.error(mensagemErro(error)); throw error }
          await invalidar('financeiro', 'pedidos')
          toast.success('Lançamento estornado.')
        }} />
    </Gaveta>
  )
}

function FormularioConta({ tipo, conta, onFechar, onSalva }: { tipo: TipoConta; conta: ContaUnificada | null | undefined; onFechar: () => void; onSalva: (id: string) => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: categorias = [] } = useCategoriasFinanceiras()
  const { data: fornecedores = [] } = useFornecedores()
  const { data: clientes = [] } = useClientesBasico()
  const [v, setV] = useState({ descricao: '', valor: '', vencimento: hojeIso(), competencia: hojeIso(), categoria: '', pessoa: '', documento: '', observacoes: '', parcelas: '1' })
  const [ocupado, setOcupado] = useState(false)
  const cats = categorias.filter((c) => c.tipo === (tipo === 'pagar' ? 'despesa' : 'receita') && (c.ativo || c.id === conta?.categoria_id))

  useEffect(() => {
    if (conta === undefined) return
    setV({
      descricao: conta?.descricao ?? '', valor: conta ? String(conta.valor).replace('.', ',') : '', vencimento: conta?.vencimento ?? hojeIso(),
      competencia: conta?.competencia ?? hojeIso(), categoria: conta?.categoria_id ?? '', pessoa: conta?.pessoa_id ?? '',
      documento: conta?.documento ?? '', observacoes: conta?.observacoes ?? '', parcelas: '1',
    })
  }, [conta])

  const nValor = lerNumero(v.valor)
  const nParc = Math.max(1, Math.min(24, Math.round(lerNumero(v.parcelas) || 1)))
  const valido = v.descricao.trim().length >= 2 && nValor > 0 && !!v.vencimento && (tipo === 'receber' || !!v.categoria)

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    setOcupado(true)
    try {
      const base = { descricao: v.descricao.trim(), categoria_id: v.categoria || null, observacoes: v.observacoes.trim() || null, competencia: v.competencia }
      if (conta) {
        const r = tipo === 'pagar'
          ? await supabase.from('contas_pagar').update({ ...base, categoria_id: v.categoria, valor: nValor, vencimento: v.vencimento, fornecedor_id: v.pessoa || null, documento: v.documento.trim() || null }).eq('id', conta.id)
          : await supabase.from('contas_receber').update({ ...base, valor: nValor, vencimento: v.vencimento, cliente_id: v.pessoa || null }).eq('id', conta.id)
        if (r.error) throw r.error
        await invalidar('financeiro')
        onFechar()
        return
      }
      // Parcelamento: divide o valor em N parcelas mensais
      const cent = Math.round(nValor * 100), parte = Math.floor(cent / nParc)
      const linhas = Array.from({ length: nParc }, (_, i) => {
        const venc = new Date(`${v.vencimento}T12:00`); venc.setMonth(venc.getMonth() + i)
        return {
          valor: (i === nParc - 1 ? cent - parte * (nParc - 1) : parte) / 100,
          vencimento: format(venc, 'yyyy-MM-dd'),
          descricao: nParc > 1 ? `${base.descricao} (${i + 1}/${nParc})` : base.descricao,
        }
      })
      if (tipo === 'pagar') {
        const { data, error } = await supabase.from('contas_pagar').insert(linhas.map((l) => ({
          ...base, ...l, empresa_id: empresa.id, categoria_id: v.categoria, fornecedor_id: v.pessoa || null, documento: v.documento.trim() || null,
        }))).select('id')
        if (error) throw error
        onSalva(data[0].id)
      } else {
        const { data, error } = await supabase.from('contas_receber').insert(linhas.map((l) => ({ ...base, ...l, empresa_id: empresa.id, cliente_id: v.pessoa || null }))).select('id')
        if (error) throw error
        onSalva(data[0].id)
      }
      await invalidar('financeiro')
      toast.success(nParc > 1 ? `${nParc} parcelas criadas.` : 'Conta criada.')
      onFechar()
    } catch (err) {
      toast.error(mensagemErro(err))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal aberto={conta !== undefined} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={conta ? 'Editar conta' : tipo === 'pagar' ? 'Nova conta a pagar' : 'Nova conta a receber'} largura="max-w-xl" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={!valido}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Descrição" htmlFor="fc-d" obrigatorio className="sm:col-span-2"><Input id="fc-d" autoFocus value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} placeholder={tipo === 'pagar' ? 'Ex.: Conta de energia' : 'Ex.: Encomenda para evento'} /></Campo>
        <Campo rotulo="Valor total (R$)" htmlFor="fc-v" obrigatorio><Input id="fc-v" inputMode="decimal" value={v.valor} onChange={(e) => setV({ ...v, valor: e.target.value })} /></Campo>
        <Campo rotulo={nParc > 1 ? '1º vencimento' : 'Vencimento'} htmlFor="fc-venc" obrigatorio><Input id="fc-venc" type="date" value={v.vencimento} onChange={(e) => setV({ ...v, vencimento: e.target.value })} /></Campo>
        <Campo rotulo="Categoria" htmlFor="fc-cat" obrigatorio={tipo === 'pagar'}>
          <Select id="fc-cat" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}>
            <option value="">Selecione…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo={tipo === 'pagar' ? 'Fornecedor' : 'Cliente'} htmlFor="fc-p">
          <Select id="fc-p" value={v.pessoa} onChange={(e) => setV({ ...v, pessoa: e.target.value })}>
            <option value="">Não informado</option>
            {(tipo === 'pagar' ? fornecedores : clientes).filter((x) => x.ativo || x.id === v.pessoa).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Competência" htmlFor="fc-comp" dica="Mês em que a despesa/receita aconteceu (DRE)."><Input id="fc-comp" type="date" value={v.competencia} onChange={(e) => setV({ ...v, competencia: e.target.value })} /></Campo>
        {!conta ? (
          <Campo rotulo="Parcelas" htmlFor="fc-parc" dica={nParc > 1 ? `${nParc}× de ~${formatarMoeda(nValor / nParc)}, mensais` : undefined}>
            <Input id="fc-parc" inputMode="numeric" value={v.parcelas} onChange={(e) => setV({ ...v, parcelas: e.target.value })} />
          </Campo>
        ) : <div />}
        {tipo === 'pagar' && <Campo rotulo="Nº do documento" htmlFor="fc-doc"><Input id="fc-doc" value={v.documento} onChange={(e) => setV({ ...v, documento: e.target.value })} /></Campo>}
        <Campo rotulo="Observações" htmlFor="fc-obs" className="sm:col-span-2"><Textarea id="fc-obs" className="min-h-14" value={v.observacoes} onChange={(e) => setV({ ...v, observacoes: e.target.value })} /></Campo>
      </div>
    </Modal>
  )
}
