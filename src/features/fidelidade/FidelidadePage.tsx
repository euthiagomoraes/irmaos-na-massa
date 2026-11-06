import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Award, Gift, Pencil, Plus, RotateCcw, Sparkles, Trophy, Users } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase, type Tabela } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useClientesBasico, useInvalidar, useProdutos } from '@/lib/consultas'
import { Badge, Button, Campo, Card, Carregando, EstadoErro, EstadoVazio, Input, Select, Textarea } from '@/components/ui'
import { Abas, CabecalhoPagina, CampoBusca, DialogoMotivo, Gaveta, Interruptor, Kpi, LinhaClicavel, Modal, Pilulas, Secao } from '@/components/ui/estrutura'
import { cn, formatarMoeda, hojeIso, lerNumero, mensagemErro, normalizarTexto } from '@/lib/utils'

type Programa = Tabela<'programas_fidelidade'>
type Participante = Tabela<'fidelidade_participantes'> & { cliente: { nome: string; whatsapp: string | null } | null }
type Recompensa = Tabela<'recompensas'>
type Aba = 'participantes' | 'recompensas' | 'programas'

const tiposPrograma: Record<string, string> = {
  pontos: 'Pontos por compra', cartao: 'Cartão fidelidade', vip: 'Cliente VIP', indicacao: 'Indicação', aniversario: 'Aniversário', recompensas: 'Recompensas',
}
const rotulosMov: Record<string, string> = {
  credito_compra: 'Compra', credito_indicacao: 'Indicação', credito_manual: 'Crédito manual', bonus: 'Bônus',
  debito_manual: 'Débito manual', resgate: 'Resgate', expiracao: 'Expiração', estorno: 'Estorno',
}

function useProgramas() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['fidelidade', empresa.id, 'programas'],
    queryFn: async () => exigir(await supabase.from('programas_fidelidade').select('*').eq('empresa_id', empresa.id).order('created_at')),
  })
}

export function FidelidadePage() {
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'participantes'
  const { data: programas = [], isLoading } = useProgramas()
  const [programaId, setProgramaId] = useState('')
  useEffect(() => { if (!programaId && programas.length) setProgramaId(programas.find((p) => p.ativo)?.id ?? programas[0].id) }, [programas, programaId])
  const programa = programas.find((p) => p.id === programaId) ?? null

  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Fidelidade" descricao="Pontos por compra, indicações e recompensas, com histórico auditável."
        acoes={programas.length > 1 ? (
          <Select value={programaId} onChange={(e) => setProgramaId(e.target.value)} className="w-64" aria-label="Programa">
            {programas.map((p) => <option key={p.id} value={p.id}>{p.nome}{!p.ativo ? ' (inativo)' : ''}</option>)}
          </Select>
        ) : undefined} />
      <Abas ativa={aba} onChange={(a) => setParams(a === 'participantes' ? {} : { aba: a }, { replace: true })} abas={[
        { id: 'participantes', rotulo: 'Participantes', icone: <Users className="size-4" /> },
        { id: 'recompensas', rotulo: 'Recompensas e resgates', icone: <Gift className="size-4" /> },
        { id: 'programas', rotulo: 'Programas', icone: <Award className="size-4" /> },
      ]} />
      {isLoading ? <Carregando /> : aba === 'programas' || !programa ? <Programas /> : aba === 'participantes' ? <Participantes programa={programa} /> : <Recompensas programa={programa} />}
    </div>
  )
}

/* ------------------------------------------------------------ Programas */
function Programas() {
  const { data: programas = [], isLoading, error } = useProgramas()
  const [editando, setEditando] = useState<Programa | null | undefined>(undefined)
  if (isLoading) return <Carregando />
  if (error) return <EstadoErro mensagem={mensagemErro(error)} />
  return (
    <div className="space-y-5">
      {programas.length === 0 ? (
        <Card><EstadoVazio icone={<Trophy className="size-6" />} titulo="Crie seu programa de fidelidade"
          descricao="Ex.: a cada R$ 10,00 em compras o cliente ganha 1 ponto; com 50 pontos troca por um bolo de pote."
          acao={<Button onClick={() => setEditando(null)}><Plus className="size-4" />Criar programa</Button>} /></Card>
      ) : (
        <>
          <div className="flex justify-end"><Button onClick={() => setEditando(null)}><Plus className="size-4" />Novo programa</Button></div>
          <div className="grid gap-4 md:grid-cols-2">
            {programas.map((p) => (
              <Card key={p.id} className={cn('space-y-2 p-5', !p.ativo && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[17px] font-semibold">{p.nome}</p>
                    <p className="text-[12.5px] text-texto-suave">{tiposPrograma[p.tipo]}{!p.ativo && ' · inativo'}</p>
                  </div>
                  <Button variante="fantasma" tamanho="sm" onClick={() => setEditando(p)}><Pencil className="size-3.5" />Editar</Button>
                </div>
                <ul className="space-y-1 text-[13px] text-choco-700">
                  {p.valor_por_ponto && <li>• 1 ponto a cada <strong>{formatarMoeda(p.valor_por_ponto)}</strong> em pedidos entregues</li>}
                  {p.pontos_por_indicacao > 0 && <li>• <strong>{p.pontos_por_indicacao} pontos</strong> por indicação</li>}
                  {p.limite_resgates_mes && <li>• Até {p.limite_resgates_mes} resgate(s) por mês</li>}
                  {p.data_fim && <li>• Válido até {format(new Date(`${p.data_fim}T12:00`), 'dd/MM/yyyy')}</li>}
                </ul>
                {p.descricao && <p className="text-[13px] text-texto-suave">{p.descricao}</p>}
              </Card>
            ))}
          </div>
        </>
      )}
      <FormularioPrograma programa={editando} onFechar={() => setEditando(undefined)} />
    </div>
  )
}

function FormularioPrograma({ programa, onFechar }: { programa: Programa | null | undefined; onFechar: () => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const [v, setV] = useState({ nome: '', tipo: 'pontos', descricao: '', valor: '10', indicacao: '0', limite: '', inicio: hojeIso(), fim: '', regras: '', ativo: true })
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    if (programa === undefined) return
    setV({
      nome: programa?.nome ?? 'Clube Irmãos na Massa', tipo: programa?.tipo ?? 'pontos', descricao: programa?.descricao ?? '',
      valor: programa?.valor_por_ponto ? String(programa.valor_por_ponto).replace('.', ',') : programa ? '' : '10',
      indicacao: String(programa?.pontos_por_indicacao ?? 0), limite: programa?.limite_resgates_mes ? String(programa.limite_resgates_mes) : '',
      inicio: programa?.data_inicio ?? hojeIso(), fim: programa?.data_fim ?? '', regras: programa?.regras ?? '', ativo: programa?.ativo ?? true,
    })
  }, [programa])
  const valorN = v.valor.trim() ? lerNumero(v.valor) : null
  const valido = v.nome.trim().length >= 2 && (valorN === null || valorN > 0)

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    setOcupado(true)
    const dados = {
      nome: v.nome.trim(), tipo: v.tipo, descricao: v.descricao.trim() || null, valor_por_ponto: valorN,
      pontos_por_indicacao: Math.max(0, Math.round(lerNumero(v.indicacao || '0')) || 0),
      limite_resgates_mes: v.limite.trim() ? Math.max(1, Math.round(lerNumero(v.limite))) : null,
      data_inicio: v.inicio, data_fim: v.fim || null, regras: v.regras.trim() || null, ativo: v.ativo,
    }
    const r = programa ? await supabase.from('programas_fidelidade').update(dados).eq('id', programa.id)
      : await supabase.from('programas_fidelidade').insert({ ...dados, empresa_id: empresa.id })
    setOcupado(false)
    if (r.error) return void toast.error(mensagemErro(r.error))
    await invalidar('fidelidade')
    onFechar()
  }

  return (
    <Modal aberto={programa !== undefined} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={programa ? 'Editar programa' : 'Novo programa'} largura="max-w-xl" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={!valido}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" htmlFor="pf-n" obrigatorio className="sm:col-span-2"><Input id="pf-n" autoFocus value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} /></Campo>
        <Campo rotulo="Tipo" htmlFor="pf-t">
          <Select id="pf-t" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>
            {Object.entries(tiposPrograma).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="R$ por ponto" htmlFor="pf-v" dica={valorN ? `R$ 100 em compras = ${Math.floor(100 / valorN)} pontos` : 'Vazio: não pontua por compra.'}>
          <Input id="pf-v" inputMode="decimal" value={v.valor} onChange={(e) => setV({ ...v, valor: e.target.value })} />
        </Campo>
        <Campo rotulo="Pontos por indicação" htmlFor="pf-i" dica="Para quem indicou, quando o indicado entra no programa."><Input id="pf-i" inputMode="numeric" value={v.indicacao} onChange={(e) => setV({ ...v, indicacao: e.target.value })} /></Campo>
        <Campo rotulo="Limite de resgates por mês" htmlFor="pf-l"><Input id="pf-l" inputMode="numeric" placeholder="Sem limite" value={v.limite} onChange={(e) => setV({ ...v, limite: e.target.value })} /></Campo>
        <Campo rotulo="Início" htmlFor="pf-ini"><Input id="pf-ini" type="date" value={v.inicio} onChange={(e) => setV({ ...v, inicio: e.target.value })} /></Campo>
        <Campo rotulo="Fim (opcional)" htmlFor="pf-fim"><Input id="pf-fim" type="date" value={v.fim} onChange={(e) => setV({ ...v, fim: e.target.value })} /></Campo>
        <Campo rotulo="Descrição para o cliente" htmlFor="pf-d" className="sm:col-span-2"><Textarea id="pf-d" className="min-h-14" value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></Campo>
        <Campo rotulo="Regras" htmlFor="pf-r" className="sm:col-span-2"><Textarea id="pf-r" className="min-h-14" value={v.regras} onChange={(e) => setV({ ...v, regras: e.target.value })} /></Campo>
        <div className="sm:col-span-2"><Interruptor id="pf-at" marcado={v.ativo} onChange={(a) => setV({ ...v, ativo: a })} rotulo="Programa ativo" descricao="Pontos são creditados automaticamente quando o pedido é entregue." /></div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------ Participantes */
function useParticipantes(programaId: string) {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['fidelidade', empresa.id, 'participantes', programaId],
    queryFn: async () => exigir(await supabase.from('fidelidade_participantes').select('*, cliente:clientes!fidelidade_participantes_empresa_id_cliente_id_fkey(nome, whatsapp)')
      .eq('programa_id', programaId).order('saldo_pontos', { ascending: false })) as Participante[],
  })
}

function Participantes({ programa }: { programa: Programa }) {
  const { data = [], isLoading, error, refetch } = useParticipantes(programa.id)
  const [busca, setBusca] = useState('')
  const [inscrevendo, setInscrevendo] = useState(false)
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const lista = useMemo(() => {
    const t = normalizarTexto(busca.trim())
    return data.filter((p) => !t || normalizarTexto(p.cliente?.nome ?? '').includes(t))
  }, [data, busca])
  const ativos = data.filter((p) => p.ativo)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi rotulo="Participantes ativos" valor={ativos.length} />
        <Kpi rotulo="Pontos em circulação" valor={ativos.reduce((s, p) => s + p.saldo_pontos, 0)} />
        <Kpi rotulo="Pontos já emitidos" valor={data.reduce((s, p) => s + p.pontos_acumulados, 0)} />
      </div>
      <Card className="flex flex-col gap-3 p-4 lg:flex-row">
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar participante" />
        <Button onClick={() => setInscrevendo(true)} disabled={!programa.ativo}><Plus className="size-4" />Inscrever cliente</Button>
      </Card>
      <Card className="overflow-hidden">
        {isLoading ? <Carregando /> : error ? <div className="p-5"><EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} /></div>
          : lista.length === 0 ? <EstadoVazio icone={<Users className="size-6" />} titulo="Nenhum participante" descricao="Inscreva clientes para que acumulem pontos a cada pedido entregue." /> : (
            <ul className="divide-y divide-borda/70">
              {lista.map((p, i) => (
                <li key={p.id}>
                  <LinhaClicavel onClick={() => setAbertoId(p.id)} className={cn('flex items-center gap-3', !p.ativo && 'opacity-55')}>
                    <span className={cn('grid size-8 place-items-center rounded-full text-[12px] font-bold', i < 3 && !busca ? 'bg-dourado-100 text-dourado-700' : 'bg-creme text-texto-suave')}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-choco-800">{p.cliente?.nome}</p>
                      <p className="text-[12px] text-texto-suave">Desde {format(new Date(`${p.data_adesao}T12:00`), 'dd/MM/yyyy')} · {p.pontos_acumulados} pontos acumulados{p.nivel && ` · ${p.nivel}`}</p>
                    </div>
                    <span className="font-display text-[18px] font-semibold text-cacau-700 tabular-nums">{p.saldo_pontos}<span className="ml-1 text-[12px] font-normal text-texto-suave">pts</span></span>
                  </LinhaClicavel>
                </li>
              ))}
            </ul>
          )}
      </Card>
      <Inscrever programa={programa} participantes={data} aberto={inscrevendo} onAbertoChange={setInscrevendo} />
      <FichaParticipante programa={programa} participante={data.find((p) => p.id === abertoId) ?? null} onFechar={() => setAbertoId(null)} />
    </div>
  )
}

function Inscrever({ programa, participantes, aberto, onAbertoChange }: { programa: Programa; participantes: Participante[]; aberto: boolean; onAbertoChange: (v: boolean) => void }) {
  const invalidar = useInvalidar()
  const { data: clientes = [] } = useClientesBasico()
  const [cliente, setCliente] = useState('')
  const [indicou, setIndicou] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const inscritos = new Set(participantes.filter((p) => p.ativo).map((p) => p.cliente_id))
  const disponiveis = clientes.filter((c) => c.ativo && !inscritos.has(c.id))

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!cliente) return
    setOcupado(true)
    const { error } = await supabase.rpc('fidelidade_inscrever', { p_programa: programa.id, p_cliente: cliente, p_indicado_por: indicou || undefined })
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('fidelidade', 'clientes')
    toast.success(indicou && programa.pontos_por_indicacao > 0 ? `Inscrito! Quem indicou ganhou ${programa.pontos_por_indicacao} pontos.` : 'Cliente inscrito.')
    setCliente(''); setIndicou('')
    onAbertoChange(false)
  }

  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} titulo={`Inscrever em ${programa.nome}`} largura="max-w-md" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={() => onAbertoChange(false)}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={!cliente}>Inscrever</Button></>}>
      <div className="space-y-4">
        <Campo rotulo="Cliente" htmlFor="in-c" obrigatorio>
          <Select id="in-c" value={cliente} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Selecione…</option>
            {disponiveis.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Indicado por" htmlFor="in-i" dica={programa.pontos_por_indicacao > 0 ? `Quem indicou ganha ${programa.pontos_por_indicacao} pontos (se participar do programa).` : undefined}>
          <Select id="in-i" value={indicou} onChange={(e) => setIndicou(e.target.value)}>
            <option value="">Ninguém</option>
            {participantes.filter((p) => p.ativo && p.cliente_id !== cliente).map((p) => <option key={p.cliente_id} value={p.cliente_id}>{p.cliente?.nome}</option>)}
          </Select>
        </Campo>
      </div>
    </Modal>
  )
}

function FichaParticipante({ programa, participante: p, onFechar }: { programa: Programa; participante: Participante | null; onFechar: () => void }) {
  const empresa = useEmpresa()
  const { ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const [ajuste, setAjuste] = useState<'credito_manual' | 'debito_manual' | 'bonus' | null>(null)
  const [estornando, setEstornando] = useState<string | null>(null)
  const [resgatando, setResgatando] = useState(false)

  const extrato = useQuery({
    enabled: !!p,
    queryKey: ['fidelidade', empresa.id, 'extrato', p?.id],
    queryFn: async () => exigir(await supabase.from('fidelidade_movimentacoes').select('*').eq('participante_id', p!.id).order('created_at', { ascending: false }).limit(100)),
  })
  const estornados = new Set((extrato.data ?? []).map((m) => m.estorno_de).filter(Boolean))

  const alternar = async () => {
    if (!p) return
    const { error } = await supabase.from('fidelidade_participantes').update({ ativo: !p.ativo }).eq('id', p.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('fidelidade')
  }

  return (
    <Gaveta aberto={!!p} onFechar={onFechar} titulo={p?.cliente?.nome ?? ''} subtitulo={p ? `${programa.nome}${!p.ativo ? ' · inativo' : ''}` : undefined}
      rodape={p && <>
        <Button variante="fantasma" tamanho="sm" onClick={() => void alternar()}>{p.ativo ? 'Remover do programa' : 'Reativar'}</Button>
        <Button tamanho="sm" className="ml-auto" disabled={!p.ativo} onClick={() => setResgatando(true)}><Gift className="size-4" />Resgatar recompensa</Button>
      </>}>
      {p && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Kpi rotulo="Saldo" valor={`${p.saldo_pontos} pts`} />
            <Kpi rotulo="Acumulado" valor={`${p.pontos_acumulados} pts`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variante="suave" tamanho="sm" disabled={!p.ativo} onClick={() => setAjuste('bonus')}><Sparkles className="size-3.5" />Bônus</Button>
            <Button variante="suave" tamanho="sm" disabled={!p.ativo} onClick={() => setAjuste('credito_manual')}>+ Crédito</Button>
            <Button variante="suave" tamanho="sm" onClick={() => setAjuste('debito_manual')}>− Débito</Button>
          </div>
          <Secao titulo="Extrato">
            {extrato.isLoading ? <Carregando /> : (extrato.data ?? []).length === 0 ? <p className="text-[13px] text-texto-suave">Sem movimentações. Pontos entram quando um pedido deste cliente é entregue.</p> : (
              <ul className="divide-y divide-borda/70">
                {extrato.data!.map((m) => (
                  <li key={m.id} className={cn('flex items-center gap-3 py-2 text-[13px]', (m.tipo === 'estorno' || estornados.has(m.id)) && 'text-texto-suave')}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{rotulosMov[m.tipo]}{estornados.has(m.id) && <Badge className="ml-1.5 py-0 text-[11px]">Estornado</Badge>}</p>
                      <p className="truncate text-[12px] text-texto-suave">{format(new Date(m.created_at), 'dd/MM/yy HH:mm')}{m.motivo && ` · ${m.motivo}`}</p>
                    </div>
                    <span className={cn('font-semibold tabular-nums', m.pontos > 0 ? 'text-sucesso' : 'text-erro')}>{m.pontos > 0 ? '+' : ''}{m.pontos}</span>
                    <span className="w-14 text-right text-[12px] text-texto-suave tabular-nums">= {m.saldo_posterior}</span>
                    {ehGestor && m.tipo !== 'estorno' && !estornados.has(m.id) && (
                      <Button variante="fantasma" tamanho="icone" className="size-7" title="Estornar" aria-label="Estornar" onClick={() => setEstornando(m.id)}><RotateCcw className="size-3.5" /></Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Secao>
          <AjustePontos participante={p} tipo={ajuste} onFechar={() => setAjuste(null)} />
          <Resgatar programa={programa} participante={p} aberto={resgatando} onAbertoChange={setResgatando} />
        </>
      )}
      <DialogoMotivo aberto={!!estornando} onAbertoChange={(v) => { if (!v) setEstornando(null) }} titulo="Estornar pontos" perigo botao="Estornar"
        onConfirmar={async (m) => {
          const { error } = await supabase.rpc('estornar_pontos', { p_movimentacao_id: estornando!, p_motivo: m })
          if (error) { toast.error(mensagemErro(error)); throw error }
          await invalidar('fidelidade')
          toast.success('Pontos estornados.')
        }} />
    </Gaveta>
  )
}

function AjustePontos({ participante, tipo, onFechar }: { participante: Participante; tipo: 'credito_manual' | 'debito_manual' | 'bonus' | null; onFechar: () => void }) {
  const invalidar = useInvalidar()
  const [pontos, setPontos] = useState('')
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { if (tipo) { setPontos(''); setMotivo('') } }, [tipo])
  const n = Math.round(lerNumero(pontos))
  const valido = n > 0 && motivo.trim().length >= 3 && (tipo !== 'debito_manual' || n <= participante.saldo_pontos)

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido || !tipo) return
    setOcupado(true)
    const { error } = await supabase.rpc('movimentar_pontos', { p_participante_id: participante.id, p_tipo: tipo, p_pontos: n, p_motivo: motivo.trim(), p_chave: crypto.randomUUID() })
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('fidelidade')
    onFechar()
  }

  return (
    <Modal aberto={!!tipo} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={tipo === 'debito_manual' ? 'Debitar pontos' : tipo === 'bonus' ? 'Dar bônus' : 'Creditar pontos'} largura="max-w-sm" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={!valido}>Confirmar</Button></>}>
      <div className="space-y-4">
        <Campo rotulo="Pontos" htmlFor="aj-p" obrigatorio erro={tipo === 'debito_manual' && n > participante.saldo_pontos ? `Saldo: ${participante.saldo_pontos}` : undefined}>
          <Input id="aj-p" autoFocus inputMode="numeric" value={pontos} onChange={(e) => setPontos(e.target.value)} />
        </Campo>
        <Campo rotulo="Justificativa" htmlFor="aj-m" obrigatorio dica="Fica registrada no extrato."><Textarea id="aj-m" className="min-h-16" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
      </div>
    </Modal>
  )
}

function useRecompensas(programaId: string) {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['fidelidade', empresa.id, 'recompensas', programaId],
    queryFn: async () => exigir(await supabase.from('recompensas').select('*').eq('programa_id', programaId).order('pontos_necessarios')),
  })
}

function Resgatar({ programa, participante, aberto, onAbertoChange }: { programa: Programa; participante: Participante; aberto: boolean; onAbertoChange: (v: boolean) => void }) {
  const invalidar = useInvalidar()
  const { data: recompensas = [] } = useRecompensas(programa.id)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const resgatar = async (r: Recompensa) => {
    setOcupado(r.id)
    const { error } = await supabase.rpc('resgatar_recompensa', { p_participante: participante.id, p_recompensa: r.id })
    setOcupado(null)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('fidelidade')
    toast.success(`Resgate de "${r.nome}" registrado.`)
    onAbertoChange(false)
  }
  const ativas = recompensas.filter((r) => r.ativo)
  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} titulo="Resgatar recompensa" descricao={`Saldo: ${participante.saldo_pontos} pontos`} largura="max-w-md">
      {ativas.length === 0 ? <p className="text-[13px] text-texto-suave">Cadastre recompensas na aba “Recompensas e resgates”.</p> : (
        <ul className="space-y-2">
          {ativas.map((r) => {
            const pode = participante.saldo_pontos >= r.pontos_necessarios && (r.quantidade_disponivel === null || r.quantidade_disponivel > 0)
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-borda px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-choco-800">{r.nome}</p>
                  <p className="text-[12px] text-texto-suave">{r.pontos_necessarios} pontos{r.quantidade_disponivel !== null && ` · ${r.quantidade_disponivel} disponíveis`}</p>
                </div>
                <Button tamanho="sm" disabled={!pode} carregando={ocupado === r.id} onClick={() => void resgatar(r)}>Resgatar</Button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------ Recompensas e resgates */
function Recompensas({ programa }: { programa: Programa }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: recompensas = [], isLoading } = useRecompensas(programa.id)
  const [editando, setEditando] = useState<Recompensa | null | undefined>(undefined)
  const [filtro, setFiltro] = useState<'solicitado' | 'todos'>('solicitado')
  const [cancelando, setCancelando] = useState<string | null>(null)

  const resgates = useQuery({
    queryKey: ['fidelidade', empresa.id, 'resgates', programa.id],
    queryFn: async () => exigir(await supabase.from('resgates')
      .select('*, recompensa:recompensas!inner(nome, programa_id), participante:fidelidade_participantes(cliente:clientes!fidelidade_participantes_empresa_id_cliente_id_fkey(nome))')
      .eq('recompensa.programa_id', programa.id).order('created_at', { ascending: false }).limit(300)),
  })
  const entregar = async (id: string) => {
    const { error } = await supabase.from('resgates').update({ status: 'entregue' }).eq('id', id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('fidelidade')
  }
  const listaResg = (resgates.data ?? []).filter((r) => filtro === 'todos' || r.status === 'solicitado')

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="h-fit overflow-hidden">
        <div className="flex items-center justify-between border-b border-borda px-5 py-3">
          <p className="font-display text-[15px] font-semibold">Recompensas</p>
          <Button tamanho="sm" onClick={() => setEditando(null)}><Plus className="size-3.5" />Nova</Button>
        </div>
        {isLoading ? <Carregando /> : recompensas.length === 0 ? <EstadoVazio icone={<Gift className="size-6" />} titulo="Nenhuma recompensa" descricao="Ex.: 50 pontos = bolo de pote; 120 pontos = 10% de desconto." /> : (
          <ul className="divide-y divide-borda/70">
            {recompensas.map((r) => (
              <li key={r.id} className={cn('flex items-center gap-3 px-5 py-2.5', !r.ativo && 'opacity-55')}>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-dourado-100 font-display text-[14px] font-semibold text-dourado-700">{r.pontos_necessarios}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-choco-800">{r.nome}</p>
                  <p className="truncate text-[12px] text-texto-suave">{r.quantidade_disponivel !== null ? `${r.quantidade_disponivel} disponíveis` : 'Ilimitada'}{r.descricao && ` · ${r.descricao}`}</p>
                </div>
                <Button variante="fantasma" tamanho="icone" className="size-8" aria-label="Editar" onClick={() => setEditando(r)}><Pencil className="size-3.5" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="h-fit overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borda px-5 py-3">
          <p className="font-display text-[15px] font-semibold">Resgates</p>
          <Pilulas ativa={filtro} onChange={setFiltro} opcoes={[
            { id: 'solicitado', rotulo: 'A entregar', contagem: (resgates.data ?? []).filter((r) => r.status === 'solicitado').length },
            { id: 'todos', rotulo: 'Todos' },
          ]} />
        </div>
        {resgates.isLoading ? <Carregando /> : resgates.error ? <div className="p-5"><EstadoErro mensagem={mensagemErro(resgates.error)} /></div>
          : listaResg.length === 0 ? <EstadoVazio titulo="Nenhum resgate" /> : (
            <ul className="divide-y divide-borda/70">
              {listaResg.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-choco-800">{(r.participante as { cliente: { nome: string } | null } | null)?.cliente?.nome}</p>
                    <p className="truncate text-[12px] text-texto-suave">{(r.recompensa as { nome: string }).nome} · {r.pontos} pts · {format(new Date(r.created_at), 'dd/MM/yy')}</p>
                  </div>
                  {r.status === 'solicitado' ? (
                    <>
                      <Button variante="fantasma" tamanho="sm" onClick={() => setCancelando(r.id)}>Cancelar</Button>
                      <Button tamanho="sm" onClick={() => void entregar(r.id)}>Entregue</Button>
                    </>
                  ) : <Badge tom={r.status === 'entregue' ? 'sucesso' : 'neutro'}>{r.status === 'entregue' ? 'Entregue' : 'Cancelado'}</Badge>}
                </li>
              ))}
            </ul>
          )}
      </Card>
      <FormularioRecompensa programa={programa} recompensa={editando} onFechar={() => setEditando(undefined)} />
      <DialogoMotivo aberto={!!cancelando} onAbertoChange={(v) => { if (!v) setCancelando(null) }} titulo="Cancelar resgate" perigo botao="Cancelar resgate"
        descricao="Os pontos voltam para o saldo do cliente."
        onConfirmar={async (m) => {
          const { error } = await supabase.rpc('cancelar_resgate', { p_resgate: cancelando!, p_motivo: m })
          if (error) { toast.error(mensagemErro(error)); throw error }
          await invalidar('fidelidade')
        }} />
    </div>
  )
}

function FormularioRecompensa({ programa, recompensa, onFechar }: { programa: Programa; recompensa: Recompensa | null | undefined; onFechar: () => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: produtos = [] } = useProdutos()
  const [v, setV] = useState({ nome: '', descricao: '', pontos: '', qtd: '', produto: '', ativo: true })
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    if (recompensa === undefined) return
    setV({
      nome: recompensa?.nome ?? '', descricao: recompensa?.descricao ?? '', pontos: recompensa ? String(recompensa.pontos_necessarios) : '',
      qtd: recompensa?.quantidade_disponivel !== null && recompensa ? String(recompensa.quantidade_disponivel) : '', produto: recompensa?.produto_id ?? '', ativo: recompensa?.ativo ?? true,
    })
  }, [recompensa])
  const pts = Math.round(lerNumero(v.pontos))
  const valido = v.nome.trim().length >= 2 && pts > 0

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    setOcupado(true)
    const dados = {
      nome: v.nome.trim(), descricao: v.descricao.trim() || null, pontos_necessarios: pts,
      quantidade_disponivel: v.qtd.trim() ? Math.max(0, Math.round(lerNumero(v.qtd))) : null, produto_id: v.produto || null, ativo: v.ativo,
    }
    const r = recompensa ? await supabase.from('recompensas').update(dados).eq('id', recompensa.id)
      : await supabase.from('recompensas').insert({ ...dados, empresa_id: empresa.id, programa_id: programa.id })
    setOcupado(false)
    if (r.error) return void toast.error(mensagemErro(r.error))
    await invalidar('fidelidade')
    onFechar()
  }

  return (
    <Modal aberto={recompensa !== undefined} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={recompensa ? 'Editar recompensa' : 'Nova recompensa'} largura="max-w-md" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={!valido}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" htmlFor="rc-n" obrigatorio className="sm:col-span-2"><Input id="rc-n" autoFocus value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} placeholder="Ex.: Bolo de pote" /></Campo>
        <Campo rotulo="Pontos necessários" htmlFor="rc-p" obrigatorio><Input id="rc-p" inputMode="numeric" value={v.pontos} onChange={(e) => setV({ ...v, pontos: e.target.value })} /></Campo>
        <Campo rotulo="Quantidade disponível" htmlFor="rc-q"><Input id="rc-q" inputMode="numeric" placeholder="Ilimitada" value={v.qtd} onChange={(e) => setV({ ...v, qtd: e.target.value })} /></Campo>
        <Campo rotulo="Produto (opcional)" htmlFor="rc-pr" className="sm:col-span-2">
          <Select id="rc-pr" value={v.produto} onChange={(e) => setV({ ...v, produto: e.target.value })}>
            <option value="">Nenhum</option>
            {produtos.filter((x) => x.ativo).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Descrição" htmlFor="rc-d" className="sm:col-span-2"><Textarea id="rc-d" className="min-h-14" value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></Campo>
        <div className="sm:col-span-2"><Interruptor id="rc-at" marcado={v.ativo} onChange={(a) => setV({ ...v, ativo: a })} rotulo="Disponível para resgate" /></div>
      </div>
    </Modal>
  )
}
