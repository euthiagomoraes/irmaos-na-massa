import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { AlertTriangle, ArrowRight, Banknote, ChevronDown, Printer, RotateCcw, Trash2, XCircle } from 'lucide-react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { toast } from 'sonner'
import { exigir, supabase, type StatusPedido, type Tabela } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useClientesBasico, useConfiguracoes, useFormasPagamento, useInvalidar } from '@/lib/consultas'
import { Badge, Button, Campo, Carregando, EstadoErro, Input, Select, Textarea } from '@/components/ui'
import { DialogoMotivo, Gaveta, Secao } from '@/components/ui/estrutura'
import { cn, dataLocal, formatarMoeda, formatarQuantidade, hojeIso, lerNumero, mensagemErro } from '@/lib/utils'
import { AdicionarItem } from './AdicionarItem'
import { imprimirComprovante } from './comprovante'
import { formatarEndereco, itensBloqueados, origensPedido, proximoPasso, rotuloAcao, rotulosStatus, tomStatus, transicoes } from './utils'

export type Pedido = Tabela<'pedidos'>
export type ItemPedido = Tabela<'pedido_itens'> & { personalizacoes: Tabela<'pedido_personalizacoes'>[] }

export function usePedidoDetalhe(pedidoId: string | null) {
  const empresa = useEmpresa()
  return useQuery({
    enabled: !!pedidoId,
    queryKey: ['pedidos', empresa.id, 'detalhe', pedidoId],
    queryFn: async () => {
      const [p, itens, pags, hist] = await Promise.all([
        supabase.from('pedidos').select('*').eq('id', pedidoId!).single(),
        supabase.from('pedido_itens').select('*, personalizacoes:pedido_personalizacoes(*)').eq('pedido_id', pedidoId!).order('ordem').order('created_at'),
        supabase.from('pagamentos').select('*').eq('pedido_id', pedidoId!).order('created_at'),
        supabase.from('pedido_status_historico').select('*').eq('pedido_id', pedidoId!).order('created_at'),
      ])
      return { pedido: exigir(p), itens: exigir(itens) as ItemPedido[], pagamentos: exigir(pags), historico: exigir(hist) }
    },
  })
}

const gruposInvalidar = ['pedidos', 'insumos', 'movimentacoes', 'financeiro', 'clientes', 'fidelidade', 'agenda'] as const

export function EditorPedido({ pedidoId, onFechar }: { pedidoId: string | null; onFechar: () => void }) {
  const empresa = useEmpresa()
  const { ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const { data, isLoading, error } = usePedidoDetalhe(pedidoId)
  const { data: clientes = [] } = useClientesBasico()
  const { data: cfg } = useConfiguracoes()
  const { data: formas = [] } = useFormasPagamento()
  const [mudando, setMudando] = useState<StatusPedido | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [estornando, setEstornando] = useState<string | null>(null)

  const p = data?.pedido
  const editavel = p && p.status !== 'entregue' && p.status !== 'cancelado'
  const itensEditaveis = p && !itensBloqueados.includes(p.status)
  const cliente = clientes.find((c) => c.id === p?.cliente_id)

  const atualizar = async (campos: Partial<Pedido>) => {
    if (!p) return
    const { error: e } = await supabase.from('pedidos').update(campos).eq('id', p.id)
    if (e) return void toast.error(mensagemErro(e))
    await invalidar('pedidos', 'agenda')
  }
  const mudarStatus = async (s: StatusPedido, obs?: string) => {
    if (!p) return
    setMudando(s)
    const { error: e } = await supabase.rpc('pedido_alterar_status', { p_pedido: p.id, p_status: s, p_observacao: obs })
    setMudando(null)
    if (e) { toast.error(mensagemErro(e)); throw e }
    await invalidar(...gruposInvalidar)
    toast.success(`Pedido #${p.numero}: ${rotulosStatus[s].toLowerCase()}.`)
  }
  const excluirOrcamento = async () => {
    if (!p || !window.confirm(`Excluir o orçamento #${p.numero}?`)) return
    const { error: e } = await supabase.from('pedidos').delete().eq('id', p.id)
    if (e) return void toast.error(mensagemErro(e))
    await invalidar('pedidos', 'agenda')
    onFechar()
  }

  const prox = p ? proximoPasso(p.status, p.tipo_entrega) : null
  const outros = p ? transicoes[p.status].filter((s) => s !== prox && s !== 'cancelado') : []
  const pagamentosEstornados = new Set((data?.pagamentos ?? []).map((x) => x.estorno_de).filter(Boolean))
  const horasAte = p?.data_entrega ? (new Date(`${p.data_entrega}T${p.horario_entrega ?? '12:00'}`).getTime() - Date.now()) / 3600000 : null
  const prazoCurto = horasAte !== null && horasAte >= 0 && horasAte < (cfg?.antecedencia_minima_horas ?? 0) && p && ['orcamento', 'aguardando_confirmacao'].includes(p.status)

  return (
    <Gaveta aberto={!!pedidoId} onFechar={onFechar} largura="max-w-3xl"
      titulo={p ? `Pedido #${p.numero}` : 'Pedido'}
      subtitulo={p ? `${cliente?.nome ?? 'Cliente não informado'} · criado em ${format(new Date(p.created_at), 'dd/MM/yyyy')}` : undefined}
      cabecalhoExtra={p && <div className="mt-2 flex flex-wrap items-center gap-2"><Badge tom={tomStatus[p.status]}>{rotulosStatus[p.status]}</Badge>
        {p.status === 'cancelado' && p.motivo_cancelamento && <span className="text-[12px] text-texto-suave">Motivo: {p.motivo_cancelamento}</span>}</div>}
      rodape={p && data && <>
        {['orcamento', 'aguardando_confirmacao'].includes(p.status) && ehGestor && <Button variante="fantasma" tamanho="sm" className="text-erro" onClick={() => void excluirOrcamento()}><Trash2 className="size-4" />Excluir</Button>}
        {transicoes[p.status].includes('cancelado') && <Button variante="fantasma" tamanho="sm" className="text-erro" onClick={() => setCancelando(true)}><XCircle className="size-4" />Cancelar</Button>}
        <Button variante="contorno" tamanho="sm" onClick={() => imprimirComprovante({ empresa, pedido: p, itens: data.itens, pagamentos: data.pagamentos, cliente, formas })}><Printer className="size-4" />Comprovante</Button>
        <div className="ml-auto flex gap-2">
          {outros.length > 0 && (
            <Menu.Root>
              <Menu.Trigger asChild><Button variante="contorno" tamanho="sm">Outro status<ChevronDown className="size-3.5" /></Button></Menu.Trigger>
              <Menu.Portal>
                <Menu.Content align="end" sideOffset={6} className="z-[60] min-w-48 rounded-xl border border-borda bg-white p-1 shadow-elevada">
                  {outros.map((s) => (
                    <Menu.Item key={s} onSelect={() => void mudarStatus(s).catch(() => {})} className="cursor-pointer rounded-lg px-3 py-2 text-[13px] outline-none data-[highlighted]:bg-creme">
                      {rotuloAcao[s] ?? rotulosStatus[s]}
                    </Menu.Item>
                  ))}
                </Menu.Content>
              </Menu.Portal>
            </Menu.Root>
          )}
          {prox && <Button tamanho="sm" carregando={mudando === prox} onClick={() => void mudarStatus(prox).catch(() => {})}>{rotuloAcao[prox]}<ArrowRight className="size-4" /></Button>}
        </div>
      </>}>
      {isLoading ? <Carregando /> : error ? <EstadoErro mensagem={mensagemErro(error)} /> : p && data && (
        <div key={p.id} className="space-y-6">
          {cliente?.restricoes && (
            <div className="flex gap-2.5 rounded-xl border border-alerta/25 bg-alerta-fundo px-3.5 py-3 text-[13.5px] text-alerta">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /><div><p className="font-semibold">Restrições do cliente</p><p className="text-choco-800">{cliente.restricoes}</p></div>
            </div>
          )}
          {prazoCurto && <p className="rounded-xl bg-alerta-fundo px-3.5 py-2.5 text-[13px] text-alerta">Faltam {Math.max(Math.round(horasAte!), 0)} h para a entrega, menos que a antecedência mínima ({cfg?.antecedencia_minima_horas} h).</p>}
          {p.estoque_baixado_em && <p className="text-[12.5px] text-texto-suave">Insumos baixados do estoque em {format(new Date(p.estoque_baixado_em), "dd/MM 'às' HH:mm")}.</p>}

          <Secao titulo="Cliente e entrega">
            <fieldset disabled={!editavel} className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Cliente" htmlFor="ep-cli">
                <Select id="ep-cli" value={p.cliente_id ?? ''} onChange={(e) => void atualizar({ cliente_id: e.target.value || null })}>
                  <option value="">Não informado</option>
                  {clientes.filter((c) => c.ativo || c.id === p.cliente_id).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
              </Campo>
              <Campo rotulo="Origem" htmlFor="ep-orig">
                <Select id="ep-orig" value={p.origem} onChange={(e) => void atualizar({ origem: e.target.value })}>
                  {origensPedido.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                </Select>
              </Campo>
              <Campo rotulo="Data de entrega" htmlFor="ep-data">
                <Input id="ep-data" type="date" defaultValue={p.data_entrega ?? ''} onBlur={(e) => e.target.value !== (p.data_entrega ?? '') && void atualizar({ data_entrega: e.target.value || null })} />
              </Campo>
              <Campo rotulo="Horário" htmlFor="ep-hora">
                <Input id="ep-hora" type="time" defaultValue={p.horario_entrega?.slice(0, 5) ?? ''} onBlur={(e) => e.target.value !== (p.horario_entrega?.slice(0, 5) ?? '') && void atualizar({ horario_entrega: e.target.value || null })} />
              </Campo>
              <Campo rotulo="Tipo" htmlFor="ep-tipo">
                <Select id="ep-tipo" value={p.tipo_entrega} onChange={(e) => {
                  const t = e.target.value
                  void atualizar(t === 'entrega'
                    ? { tipo_entrega: t, taxa_entrega: Number(p.taxa_entrega) || Number(cfg?.taxa_entrega_padrao ?? 0), endereco_entrega: Object.keys((p.endereco_entrega ?? {}) as object).length ? p.endereco_entrega : (cliente?.endereco ?? {}) }
                    : { tipo_entrega: t, taxa_entrega: 0 })
                }}>
                  <option value="retirada">Retirada</option>
                  <option value="entrega">Entrega</option>
                </Select>
              </Campo>
              {['orcamento', 'aguardando_confirmacao'].includes(p.status) && (
                <Campo rotulo="Orçamento válido até" htmlFor="ep-val">
                  <Input id="ep-val" type="date" defaultValue={p.validade_orcamento ?? ''} onBlur={(e) => e.target.value !== (p.validade_orcamento ?? '') && void atualizar({ validade_orcamento: e.target.value || null })} />
                </Campo>
              )}
              {p.tipo_entrega === 'entrega' && <EnderecoEntrega pedido={p} onSalvar={(endereco_entrega) => void atualizar({ endereco_entrega })} />}
            </fieldset>
          </Secao>

          <Secao titulo="Itens">
            {data.itens.length === 0 ? <p className="text-[13px] text-texto-suave">Nenhum item. Adicione abaixo.</p> : (
              <ul className="divide-y divide-borda/70 rounded-xl border border-borda">
                {data.itens.map((it) => <LinhaItem key={it.id} item={it} editavel={!!itensEditaveis} />)}
              </ul>
            )}
            {itensEditaveis ? <AdicionarItem pedidoId={p.id} /> : editavel && <p className="mt-2 text-[12.5px] text-texto-suave">Os itens ficam travados a partir do início da produção.</p>}
          </Secao>

          <div className="grid gap-4 sm:grid-cols-[1fr_17rem]">
            <fieldset disabled={!editavel} className="grid content-start gap-4 sm:grid-cols-2">
              <Campo rotulo="Desconto (R$)" htmlFor="ep-desc">
                <Input id="ep-desc" inputMode="decimal" defaultValue={String(p.desconto).replace('.', ',')} onBlur={(e) => { const n = lerNumero(e.target.value || '0'); if (n >= 0 && n !== Number(p.desconto)) void atualizar({ desconto: n }) }} />
              </Campo>
              <Campo rotulo="Taxa de entrega (R$)" htmlFor="ep-taxa">
                <Input key={String(p.taxa_entrega)} id="ep-taxa" inputMode="decimal" defaultValue={String(p.taxa_entrega).replace('.', ',')} onBlur={(e) => { const n = lerNumero(e.target.value || '0'); if (n >= 0 && n !== Number(p.taxa_entrega)) void atualizar({ taxa_entrega: n }) }} />
              </Campo>
              <Campo rotulo="Observações (aparecem no comprovante)" htmlFor="ep-obs" className="sm:col-span-2">
                <Textarea id="ep-obs" className="min-h-16" defaultValue={p.observacoes ?? ''} onBlur={(e) => e.target.value !== (p.observacoes ?? '') && void atualizar({ observacoes: e.target.value || null })} />
              </Campo>
              <Campo rotulo="Anotações internas" htmlFor="ep-int" className="sm:col-span-2">
                <Textarea id="ep-int" className="min-h-16" defaultValue={p.observacoes_internas ?? ''} onBlur={(e) => e.target.value !== (p.observacoes_internas ?? '') && void atualizar({ observacoes_internas: e.target.value || null })} />
              </Campo>
            </fieldset>
            <div className="h-fit space-y-1.5 rounded-2xl bg-creme px-4 py-3.5 text-[13.5px]">
              <Linha rotulo="Subtotal" valor={p.subtotal} />
              {Number(p.desconto) > 0 && <Linha rotulo="Desconto" valor={-Number(p.desconto)} />}
              {Number(p.taxa_entrega) > 0 && <Linha rotulo="Entrega" valor={p.taxa_entrega} />}
              <div className="flex justify-between border-t border-borda pt-1.5 font-display text-[17px] font-semibold"><span>Total</span><span className="tabular-nums">{formatarMoeda(p.total)}</span></div>
              <Linha rotulo="Recebido" valor={p.valor_pago} classe="text-sucesso" />
              <div className={cn('flex justify-between font-semibold', Number(p.saldo) > 0 ? 'text-alerta' : 'text-sucesso')}><span>{Number(p.saldo) > 0 ? 'Falta receber' : 'Quitado'}</span><span className="tabular-nums">{formatarMoeda(Math.max(Number(p.saldo), 0))}</span></div>
            </div>
          </div>

          <Secao titulo="Pagamentos">
            {data.pagamentos.length > 0 && (
              <ul className="mb-3 divide-y divide-borda/70 rounded-xl border border-borda">
                {data.pagamentos.map((pg) => (
                  <li key={pg.id} className={cn('flex items-center gap-3 px-3.5 py-2 text-[13px]', (pagamentosEstornados.has(pg.id) || pg.tipo === 'estorno') && 'text-texto-suave')}>
                    <span className="w-20 tabular-nums">{format(dataLocal(pg.data_pagamento), 'dd/MM/yy')}</span>
                    <span className="flex-1 capitalize">{pg.tipo}{pg.forma_pagamento_id && ` · ${formas.find((f) => f.id === pg.forma_pagamento_id)?.nome ?? ''}`}
                      {pagamentosEstornados.has(pg.id) && <Badge className="ml-1.5 py-0 text-[11px]">Estornado</Badge>}{pg.observacoes && <span className="text-texto-suave"> · {pg.observacoes}</span>}</span>
                    <span className={cn('font-semibold tabular-nums', Number(pg.valor) < 0 && 'text-erro')}>{formatarMoeda(pg.valor)}</span>
                    {ehGestor && pg.tipo !== 'estorno' && !pagamentosEstornados.has(pg.id) && p.status !== 'entregue' && (
                      <Button variante="fantasma" tamanho="icone" className="size-7" title="Estornar" aria-label="Estornar pagamento" onClick={() => setEstornando(pg.id)}><RotateCcw className="size-3.5" /></Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {p.status !== 'cancelado' && Number(p.saldo) > 0 && Number(p.total) > 0 && <RegistrarPagamento pedido={p} />}
            {Number(p.total) <= 0 && <p className="text-[13px] text-texto-suave">Adicione itens para registrar pagamentos.</p>}
          </Secao>

          <Secao titulo="Histórico">
            <ol className="space-y-2 border-l-2 border-rosa-200 pl-4">
              {data.historico.map((h) => (
                <li key={h.id} className="text-[13px]">
                  <span className="font-semibold text-choco-800">{rotulosStatus[h.status_novo]}</span>
                  <span className="text-texto-suave"> · {format(new Date(h.created_at), "dd/MM/yy 'às' HH:mm")}</span>
                  {h.observacao && <p className="text-[12.5px] text-texto-suave">{h.observacao}</p>}
                </li>
              ))}
            </ol>
          </Secao>
        </div>
      )}

      <DialogoMotivo aberto={cancelando} onAbertoChange={setCancelando} titulo={`Cancelar pedido #${p?.numero ?? ''}`} perigo botao="Cancelar pedido"
        descricao={p && Number(p.valor_pago) > 0 ? 'Este pedido tem pagamentos. Estorne-os antes de cancelar.' : 'O pedido sai da agenda e a conta a receber é cancelada.'}
        onConfirmar={(m) => mudarStatus('cancelado', m)} />
      <DialogoMotivo aberto={!!estornando} onAbertoChange={(v) => { if (!v) setEstornando(null) }} titulo="Estornar pagamento" perigo botao="Estornar"
        descricao="Gera uma saída de caixa equivalente. O pagamento original continua no histórico."
        onConfirmar={async (m) => {
          const { error: e } = await supabase.rpc('pedido_estornar_pagamento', { p_pagamento: estornando!, p_motivo: m })
          if (e) { toast.error(mensagemErro(e)); throw e }
          await invalidar(...gruposInvalidar)
          toast.success('Pagamento estornado.')
        }} />
    </Gaveta>
  )
}

function Linha({ rotulo, valor, classe }: { rotulo: string; valor: number | string; classe?: string }) {
  return <div className={cn('flex justify-between', classe)}><span>{rotulo}</span><span className="tabular-nums">{formatarMoeda(valor)}</span></div>
}

function LinhaItem({ item: it, editavel }: { item: ItemPedido; editavel: boolean }) {
  const invalidar = useInvalidar()
  const remover = async () => {
    const { error } = await supabase.from('pedido_itens').delete().eq('id', it.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('pedidos')
  }
  const atualizar = async (campos: Partial<Tabela<'pedido_itens'>>) => {
    const { error } = await supabase.from('pedido_itens').update(campos).eq('id', it.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('pedidos')
  }
  const lucro = Number(it.total) - Number(it.custo_unitario) * Number(it.quantidade)
  return (
    <li className="flex items-start gap-3 px-3.5 py-2.5 text-[13px]">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-choco-800">{it.descricao}</p>
        {it.personalizacoes.length > 0 && (
          <p className="text-[12px] text-texto-suave">{it.personalizacoes.map((x) => `${x.grupo}: ${x.descricao}`).join(' · ')}</p>
        )}
        {it.observacoes && <p className="text-[12px] text-texto-suave italic">{it.observacoes}</p>}
        <p className="text-[11.5px] text-texto-suave">
          {formatarMoeda(it.preco_unitario)}{Number(it.acrescimos) > 0 && ` + ${formatarMoeda(it.acrescimos)}`} / un
          {Number(it.custo_unitario) > 0 && <> · custo {formatarMoeda(Number(it.custo_unitario) * Number(it.quantidade))} · lucro <span className={lucro < 0 ? 'text-erro' : 'text-sucesso'}>{formatarMoeda(lucro)}</span></>}
        </p>
      </div>
      {editavel ? (
        <Input aria-label="Quantidade" inputMode="decimal" defaultValue={String(it.quantidade).replace('.', ',')} className="h-8 w-16 text-right text-[13px]"
          onBlur={(e) => { const n = lerNumero(e.target.value); if (n > 0 && n !== Number(it.quantidade)) void atualizar({ quantidade: n }) }} />
      ) : <span className="w-16 text-right tabular-nums">{formatarQuantidade(it.quantidade)}×</span>}
      <span className="w-24 text-right font-semibold tabular-nums">{formatarMoeda(it.total)}</span>
      {editavel && <Button variante="fantasma" tamanho="icone" className="size-7 text-erro" aria-label="Remover item" onClick={() => void remover()}><Trash2 className="size-3.5" /></Button>}
    </li>
  )
}

function EnderecoEntrega({ pedido, onSalvar }: { pedido: Pedido; onSalvar: (e: Record<string, string>) => void }) {
  const e = (pedido.endereco_entrega ?? {}) as Record<string, string>
  const [v, setV] = useState(e)
  const salvar = () => { if (JSON.stringify(v) !== JSON.stringify(e)) onSalvar(v) }
  const campo = (k: string, rotulo: string, classe = '') => (
    <Campo rotulo={rotulo} htmlFor={`ee-${k}`} className={classe}>
      <Input id={`ee-${k}`} value={v[k] ?? ''} onChange={(ev) => setV({ ...v, [k]: ev.target.value })} onBlur={salvar} />
    </Campo>
  )
  return (
    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-6">
      {campo('logradouro', 'Endereço', 'sm:col-span-4')}{campo('numero', 'Número', 'sm:col-span-2')}
      {campo('bairro', 'Bairro', 'sm:col-span-3')}{campo('complemento', 'Complemento', 'sm:col-span-3')}
      {campo('cidade', 'Cidade', 'sm:col-span-4')}{campo('referencia', 'Referência', 'sm:col-span-2')}
      {!formatarEndereco(v) && <p className="text-[12px] text-alerta sm:col-span-6">Informe o endereço de entrega.</p>}
    </div>
  )
}

function RegistrarPagamento({ pedido }: { pedido: Pedido }) {
  const invalidar = useInvalidar()
  const { data: formas = [] } = useFormasPagamento()
  const [valor, setValor] = useState('')
  const [forma, setForma] = useState('')
  const [dataPg, setDataPg] = useState(hojeIso())
  const [ocupado, setOcupado] = useState(false)
  const n = lerNumero(valor || String(pedido.saldo))
  const valido = n > 0 && n <= Number(pedido.saldo) + 0.001

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    setOcupado(true)
    const { error } = await supabase.rpc('pedido_registrar_pagamento', {
      p_pedido: pedido.id, p_valor: Math.round(n * 100) / 100, p_forma: forma || undefined, p_data: dataPg, p_chave: crypto.randomUUID(),
    })
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    setValor('')
    await invalidar(...gruposInvalidar)
    toast.success('Pagamento registrado.')
  }
  const sinal = Math.round(Number(pedido.total) * 0.5 * 100) / 100

  return (
    <form onSubmit={registrar} className="grid gap-3 rounded-xl border border-dashed border-borda-forte p-3.5 sm:grid-cols-[8rem_1fr_9rem_auto] sm:items-end">
      <Campo rotulo="Valor (R$)" htmlFor="rp-v" dica={Number(pedido.valor_pago) === 0 && sinal < Number(pedido.saldo) ? <button type="button" className="font-semibold text-cacau-600 hover:underline" onClick={() => setValor(String(sinal).replace('.', ','))}>Sinal 50%: {formatarMoeda(sinal)}</button> : undefined}>
        <Input id="rp-v" inputMode="decimal" placeholder={String(pedido.saldo).replace('.', ',')} value={valor} onChange={(e) => setValor(e.target.value)} />
      </Campo>
      <Campo rotulo="Forma" htmlFor="rp-f">
        <Select id="rp-f" value={forma} onChange={(e) => setForma(e.target.value)}>
          <option value="">Não informada</option>
          {formas.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Select>
      </Campo>
      <Campo rotulo="Data" htmlFor="rp-d"><Input id="rp-d" type="date" value={dataPg} onChange={(e) => setDataPg(e.target.value)} /></Campo>
      <Button type="submit" variante="secundario" carregando={ocupado} disabled={!valido}><Banknote className="size-4" />Registrar</Button>
    </form>
  )
}
