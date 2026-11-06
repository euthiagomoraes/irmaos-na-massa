import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowRight, Globe, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase, type Tabela } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { useInvalidar } from '@/lib/consultas'
import { Badge, Button, Card, Carregando, EstadoErro, EstadoVazio, Select } from '@/components/ui'
import { Pilulas } from '@/components/ui/estrutura'
import { dataLocal, mensagemErro } from '@/lib/utils'
import { formatarTelefone, linkWhatsApp } from '@/features/clientes/utils'
import { NovoPedido } from './PedidosPage'

type Solicitacao = Tabela<'solicitacoes_orcamento'> & { itens: { descricao: string | null; quantidade: number; produto: { nome: string } | null }[] }
type StatusSol = Tabela<'solicitacoes_orcamento'>['status']

const rotulos: Record<StatusSol, string> = {
  nova: 'Nova', em_atendimento: 'Em atendimento', orcamento_enviado: 'Orçamento enviado', convertida: 'Virou pedido', nao_convertida: 'Não fechou', cancelada: 'Cancelada',
}
const tons: Record<StatusSol, 'rosa' | 'info' | 'dourado' | 'sucesso' | 'neutro' | 'erro'> = {
  nova: 'rosa', em_atendimento: 'info', orcamento_enviado: 'dourado', convertida: 'sucesso', nao_convertida: 'neutro', cancelada: 'erro',
}

export function Solicitacoes({ onAbrirPedido }: { onAbrirPedido: (id: string) => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const [filtro, setFiltro] = useState<'abertas' | 'todas'>('abertas')
  const [convertendo, setConvertendo] = useState<{ sol: Solicitacao; clienteId: string } | null>(null)

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['solicitacoes', empresa.id],
    queryFn: async () => exigir(await supabase.from('solicitacoes_orcamento')
      .select('*, itens:solicitacoes_orcamento_itens(descricao, quantidade, produto:produtos(nome))')
      .eq('empresa_id', empresa.id).order('created_at', { ascending: false }).limit(300)) as Solicitacao[],
  })
  const abertas = (s: Solicitacao) => ['nova', 'em_atendimento', 'orcamento_enviado'].includes(s.status)
  const lista = useMemo(() => data.filter((s) => filtro === 'todas' || abertas(s)), [data, filtro])

  const mudar = async (s: Solicitacao, status: StatusSol) => {
    const { error: e } = await supabase.from('solicitacoes_orcamento').update({ status }).eq('id', s.id)
    if (e) return void toast.error(mensagemErro(e))
    await invalidar('solicitacoes')
  }

  const converter = async (s: Solicitacao) => {
    try {
      let clienteId = s.cliente_id
      if (!clienteId) {
        const { data: existente } = await supabase.from('clientes').select('id').eq('empresa_id', empresa.id)
          .or(`whatsapp.eq.${s.telefone},telefone.eq.${s.telefone}`).limit(1).maybeSingle()
        clienteId = existente?.id ?? null
        if (!clienteId) {
          const { data: novo, error: e } = await supabase.from('clientes').insert({
            empresa_id: empresa.id, nome: s.nome, whatsapp: s.telefone, email: s.email, origem: 'site',
          }).select('id').single()
          if (e) throw e
          clienteId = novo.id
          toast.success(`Cliente ${s.nome} cadastrado.`)
        }
      }
      await invalidar('clientes')
      setConvertendo({ sol: s, clienteId })
    } catch (e) {
      toast.error(mensagemErro(e))
    }
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-[13px] text-texto-suave">Pedidos de orçamento enviados pelo formulário do site.</p>
        <Pilulas ativa={filtro} onChange={setFiltro} opcoes={[
          { id: 'abertas', rotulo: 'Em aberto', contagem: data.filter(abertas).length },
          { id: 'todas', rotulo: 'Todas', contagem: data.length },
        ]} />
      </Card>
      {isLoading ? <Carregando /> : error ? <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} />
        : lista.length === 0 ? <Card><EstadoVazio icone={<Globe className="size-6" />} titulo="Nenhuma solicitação" descricao="Quando o site estiver publicado, os pedidos de orçamento aparecem aqui." /></Card> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {lista.map((s) => {
              const wa = linkWhatsApp(s.telefone)
              return (
                <Card key={s.id} className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-[16px] font-semibold text-choco-800">{s.nome}</p>
                      <p className="text-[12.5px] text-texto-suave">Protocolo {s.protocolo} · {format(new Date(s.created_at), "dd/MM 'às' HH:mm")}</p>
                    </div>
                    <Badge tom={tons[s.status]}>{rotulos[s.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                    {wa ? <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-sucesso hover:underline"><MessageCircle className="size-3.5" />{formatarTelefone(s.telefone)}</a> : <span>{s.telefone}</span>}
                    {s.email && <span className="text-texto-suave">{s.email}</span>}
                    {s.data_evento && <span>Evento: <strong>{format(dataLocal(s.data_evento), 'dd/MM/yyyy')}</strong></span>}
                    {s.tipo_evento && <span>{s.tipo_evento}</span>}
                    {s.quantidade_pessoas && <span>{s.quantidade_pessoas} pessoas</span>}
                  </div>
                  {s.itens.length > 0 && <ul className="text-[13px] text-choco-700">{s.itens.map((i, k) => <li key={k}>• {i.quantidade}× {i.produto?.nome ?? i.descricao}</li>)}</ul>}
                  {s.mensagem && <p className="rounded-xl bg-creme px-3.5 py-2.5 text-[13px] whitespace-pre-line">{s.mensagem}</p>}
                  {s.referencia_url && <a href={s.referencia_url} target="_blank" rel="noreferrer" className="text-[12.5px] text-cacau-600 hover:underline">Ver referência</a>}
                  <div className="flex flex-wrap items-center gap-2 border-t border-borda pt-3">
                    <Select aria-label="Status" value={s.status} onChange={(e) => void mudar(s, e.target.value as StatusSol)} className="h-8 w-48 text-[12.5px]">
                      {Object.entries(rotulos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                    {s.pedido_id ? (
                      <Button variante="contorno" tamanho="sm" className="ml-auto" onClick={() => onAbrirPedido(s.pedido_id!)}>Abrir pedido<ArrowRight className="size-3.5" /></Button>
                    ) : abertas(s) && (
                      <Button tamanho="sm" className="ml-auto" onClick={() => void converter(s)}>Criar pedido<ArrowRight className="size-3.5" /></Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      <NovoPedido aberto={!!convertendo} onAbertoChange={(v) => { if (!v) setConvertendo(null) }} onCriado={onAbrirPedido}
        inicial={convertendo ? {
          cliente_id: convertendo.clienteId, data_entrega: convertendo.sol.data_evento ?? undefined, solicitacao_id: convertendo.sol.id, origem: 'site',
          observacoes: [convertendo.sol.tipo_evento, convertendo.sol.quantidade_pessoas && `${convertendo.sol.quantidade_pessoas} pessoas`, convertendo.sol.mensagem].filter(Boolean).join(' · ') || undefined,
        } : undefined} />
    </div>
  )
}
