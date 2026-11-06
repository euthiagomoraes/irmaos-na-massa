import { useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, Cake, Gift, Mail, MapPin, MessageCircle, Pencil, Phone, Power, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { Badge, Button, Carregando, EstadoErro } from '@/components/ui'
import { dataLocal, formatarMoeda, iniciais, mensagemErro } from '@/lib/utils'
import type { Cliente } from './FormularioCliente'
import {
  diasAteAniversario, formatarAniversario, formatarTelefone, idade, linkWhatsApp, rotuloOrigem, rotulosStatus, statusVenda, textoAniversario,
} from './utils'

export interface ResumoCliente { pedidos: number; total: number; ultimo: string | null }

export function FichaCliente({
  cliente, resumo, indicadoPor, onFechar, onEditar,
}: {
  cliente: Cliente | null
  resumo?: ResumoCliente
  indicadoPor?: Cliente
  onFechar: () => void
  onEditar: (c: Cliente) => void
}) {
  return (
    <Dialog.Root open={!!cliente} onOpenChange={(v) => { if (!v) onFechar() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-choco-900/25 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-borda bg-white shadow-elevada animate-surgir">
          {cliente && <Conteudo cliente={cliente} resumo={resumo} indicadoPor={indicadoPor} onFechar={onFechar} onEditar={onEditar} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Conteudo({ cliente: c, resumo, indicadoPor, onFechar, onEditar }: {
  cliente: Cliente; resumo?: ResumoCliente; indicadoPor?: Cliente; onFechar: () => void; onEditar: (c: Cliente) => void
}) {
  const empresa = useEmpresa()
  const { ehGestor } = useAuth()
  const qc = useQueryClient()
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const detalhes = useQuery({
    queryKey: ['clientes', empresa.id, 'ficha', c.id],
    queryFn: async () => {
      const [pedidos, pontos] = await Promise.all([
        supabase.from('pedidos').select('id, numero, status, total, data_pedido, data_entrega')
          .eq('empresa_id', empresa.id).eq('cliente_id', c.id).order('data_pedido', { ascending: false }).limit(8),
        supabase.from('fidelidade_participantes').select('id, saldo_pontos, pontos_acumulados, nivel, programa:programas_fidelidade(nome)')
          .eq('empresa_id', empresa.id).eq('cliente_id', c.id).eq('ativo', true),
      ])
      if (pedidos.error) throw pedidos.error
      if (pontos.error) throw pontos.error
      return { pedidos: pedidos.data, pontos: pontos.data }
    },
  })

  const alternarAtivo = async () => {
    setOcupado(true)
    const { error } = await supabase.from('clientes').update({ ativo: !c.ativo }).eq('id', c.id).eq('empresa_id', empresa.id)
    setOcupado(false)
    if (error) return void toast.error(mensagemErro(error))
    await qc.invalidateQueries({ queryKey: ['clientes', empresa.id] })
    toast.success(c.ativo ? 'Cliente inativado.' : 'Cliente reativado.')
  }

  const excluir = async () => {
    setOcupado(true)
    const { error } = await supabase.from('clientes').delete().eq('id', c.id).eq('empresa_id', empresa.id)
    setOcupado(false)
    if (error) {
      setConfirmarExclusao(false)
      return void toast.error(error.code === '23503'
        ? 'Este cliente tem pedidos ou pontos registrados. Inative-o em vez de excluir, para preservar o histórico.'
        : mensagemErro(error))
    }
    await qc.invalidateQueries({ queryKey: ['clientes', empresa.id] })
    toast.success('Cliente excluído.')
    onFechar()
  }

  const end = (c.endereco ?? {}) as Record<string, string>
  const linhaEndereco = [[end.logradouro, end.numero].filter(Boolean).join(', '), end.complemento, end.bairro, [end.cidade, end.uf].filter(Boolean).join(' / ')]
    .filter(Boolean).join(' · ')
  const wa = linkWhatsApp(c.whatsapp)
  const dias = c.data_nascimento ? diasAteAniversario(c.data_nascimento) : null
  const ticket = resumo && resumo.pedidos > 0 ? resumo.total / resumo.pedidos : 0

  return (
    <>
      <div className="flex items-start gap-4 border-b border-borda bg-gradient-to-br from-white via-rosa-50 to-dourado-100/50 px-6 py-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-rosa-200 font-display text-lg font-semibold text-cacau-700">{iniciais(c.nome)}</span>
        <div className="min-w-0 flex-1">
          <Dialog.Title className="truncate font-display text-xl font-semibold">{c.nome}</Dialog.Title>
          <Dialog.Description className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-texto-suave">
            {!c.ativo && <Badge tom="neutro">Inativo</Badge>}
            {dias !== null && dias <= 7 && <Badge tom="rosa"><Cake className="size-3" />Aniversário {textoAniversario(dias).toLowerCase()}</Badge>}
            <span>Cliente desde {format(new Date(c.created_at), "MMM 'de' yyyy", { locale: ptBR })}</span>
          </Dialog.Description>
        </div>
        <Dialog.Close asChild><Button variante="fantasma" tamanho="icone" aria-label="Fechar"><X className="size-5" /></Button></Dialog.Close>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {c.restricoes && (
          <div className="flex gap-2.5 rounded-xl border border-alerta/25 bg-alerta-fundo px-3.5 py-3 text-[13.5px] text-alerta">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div><p className="font-semibold">Restrições e alergias</p><p className="text-choco-800">{c.restricoes}</p></div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Kpi rotulo="Pedidos" valor={String(resumo?.pedidos ?? 0)} />
          <Kpi rotulo="Total gasto" valor={formatarMoeda(resumo?.total ?? 0)} />
          <Kpi rotulo="Ticket médio" valor={formatarMoeda(ticket)} />
        </div>

        <Secao titulo="Contato">
          <ul className="space-y-2 text-[13.5px]">
            {c.whatsapp && (
              <Linha icone={<MessageCircle className="size-4" />}>
                {wa ? <a href={wa} target="_blank" rel="noreferrer" className="font-medium text-cacau-600 hover:underline">{formatarTelefone(c.whatsapp)}</a> : formatarTelefone(c.whatsapp)}
              </Linha>
            )}
            {c.telefone && <Linha icone={<Phone className="size-4" />}><a href={`tel:${c.telefone}`} className="hover:underline">{formatarTelefone(c.telefone)}</a></Linha>}
            {c.email && <Linha icone={<Mail className="size-4" />}><a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a></Linha>}
            {c.data_nascimento && (
              <Linha icone={<Cake className="size-4" />}>
                {formatarAniversario(c.data_nascimento)} · {idade(c.data_nascimento)} anos{dias !== null && dias <= 30 ? ` · ${textoAniversario(dias)}` : ''}
              </Linha>
            )}
            {linhaEndereco && <Linha icone={<MapPin className="size-4" />}>{linhaEndereco}{end.referencia ? <span className="block text-texto-suave">Ref.: {end.referencia}</span> : null}</Linha>}
            {!c.whatsapp && !c.telefone && !c.email && !linhaEndereco && !c.data_nascimento && <li className="text-texto-suave">Nenhum contato cadastrado.</li>}
          </ul>
        </Secao>

        {(c.preferencias.length > 0 || c.observacoes || c.origem || indicadoPor) && (
          <Secao titulo="Sobre o cliente">
            {c.preferencias.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">{c.preferencias.map((p) => <Badge key={p} tom="dourado">{p}</Badge>)}</div>
            )}
            {c.observacoes && <p className="mb-2 text-[13.5px] whitespace-pre-line text-choco-800">{c.observacoes}</p>}
            <p className="text-[13px] text-texto-suave">
              {c.origem && <>Chegou por <strong className="text-choco-700">{rotuloOrigem(c.origem)}</strong></>}
              {indicadoPor && <>{c.origem ? ' · ' : ''}Indicado(a) por <strong className="text-choco-700">{indicadoPor.nome}</strong></>}
            </p>
          </Secao>
        )}

        {detalhes.isLoading ? <Carregando /> : detalhes.error ? (
          <EstadoErro mensagem={mensagemErro(detalhes.error)} onTentarNovamente={() => void detalhes.refetch()} />
        ) : detalhes.data && (
          <>
            {detalhes.data.pontos.length > 0 && (
              <Secao titulo="Fidelidade">
                <ul className="space-y-2">
                  {detalhes.data.pontos.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl bg-creme px-3.5 py-2.5">
                      <Gift className="size-4 text-cacau-600" />
                      <span className="flex-1 text-[13.5px] font-medium">{(p.programa as { nome: string } | null)?.nome ?? 'Programa'}{p.nivel ? ` · ${p.nivel}` : ''}</span>
                      <span className="font-display text-[15px] font-semibold text-cacau-700">{p.saldo_pontos} pts</span>
                    </li>
                  ))}
                </ul>
              </Secao>
            )}
            <Secao titulo="Últimos pedidos">
              {detalhes.data.pedidos.length === 0 ? (
                <p className="text-[13.5px] text-texto-suave">Nenhum pedido ainda.</p>
              ) : (
                <ul className="divide-y divide-borda/70">
                  {detalhes.data.pedidos.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5 text-[13.5px]">
                      <span className="w-14 font-semibold text-choco-700">#{p.numero}</span>
                      <span className="flex-1 text-texto-suave">{format(dataLocal(p.data_entrega ?? p.data_pedido), 'dd/MM/yyyy')}</span>
                      <Badge tom={p.status === 'cancelado' ? 'erro' : p.status === 'entregue' ? 'sucesso' : (statusVenda as readonly string[]).includes(p.status) ? 'info' : 'neutro'}>{rotulosStatus[p.status] ?? p.status}</Badge>
                      <span className="w-24 text-right font-medium tabular-nums">{formatarMoeda(p.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Secao>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-borda bg-creme/40 px-6 py-3.5">
        {ehGestor && (confirmarExclusao ? (
          <>
            <span className="text-[13px] font-medium text-erro">Excluir definitivamente?</span>
            <Button variante="perigo" tamanho="sm" carregando={ocupado} onClick={() => void excluir()}>Excluir</Button>
            <Button variante="fantasma" tamanho="sm" onClick={() => setConfirmarExclusao(false)}>Não</Button>
          </>
        ) : (
          <Button variante="fantasma" tamanho="sm" className="text-erro" onClick={() => setConfirmarExclusao(true)}><Trash2 className="size-4" />Excluir</Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variante="contorno" tamanho="sm" carregando={ocupado && !confirmarExclusao} onClick={() => void alternarAtivo()}>
            <Power className="size-4" />{c.ativo ? 'Inativar' : 'Reativar'}
          </Button>
          <Button tamanho="sm" onClick={() => onEditar(c)}><Pencil className="size-4" />Editar</Button>
        </div>
      </div>
    </>
  )
}

function Kpi({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-borda/80 bg-white px-3 py-2.5">
      <p className="text-[11.5px] font-semibold tracking-wide text-texto-suave uppercase">{rotulo}</p>
      <p className="mt-0.5 truncate font-display text-[17px] font-semibold text-choco-800 tabular-nums">{valor}</p>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-2.5 font-display text-[15px] font-semibold">{titulo}</p>
      {children}
    </section>
  )
}

function Linha({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return <li className="flex gap-2.5"><span className="mt-0.5 text-cacau-500">{icone}</span><span className="min-w-0 flex-1">{children}</span></li>
}
