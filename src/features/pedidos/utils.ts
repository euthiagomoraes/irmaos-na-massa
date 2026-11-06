import type { StatusPedido } from '@/lib/supabase'

export const rotulosStatus: Record<StatusPedido, string> = {
  orcamento: 'Orçamento',
  aguardando_confirmacao: 'Aguardando confirmação',
  confirmado: 'Confirmado',
  aguardando_producao: 'Aguardando produção',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  saiu_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const tomStatus: Record<StatusPedido, 'neutro' | 'sucesso' | 'alerta' | 'erro' | 'info' | 'rosa' | 'dourado'> = {
  orcamento: 'dourado',
  aguardando_confirmacao: 'alerta',
  confirmado: 'info',
  aguardando_producao: 'info',
  em_producao: 'rosa',
  pronto: 'sucesso',
  saiu_entrega: 'sucesso',
  entregue: 'neutro',
  cancelado: 'erro',
}

/** Espelho das transições permitidas em public.pedido_alterar_status. */
export const transicoes: Record<StatusPedido, StatusPedido[]> = {
  orcamento: ['aguardando_confirmacao', 'confirmado', 'cancelado'],
  aguardando_confirmacao: ['orcamento', 'confirmado', 'cancelado'],
  confirmado: ['aguardando_producao', 'em_producao', 'cancelado'],
  aguardando_producao: ['confirmado', 'em_producao', 'cancelado'],
  em_producao: ['pronto', 'cancelado'],
  pronto: ['saiu_entrega', 'entregue', 'cancelado'],
  saiu_entrega: ['pronto', 'entregue'],
  entregue: [],
  cancelado: [],
}

/** Próximo passo "natural" do fluxo (botão principal). */
export function proximoPasso(s: StatusPedido, tipoEntrega: string): StatusPedido | null {
  switch (s) {
    case 'orcamento':
    case 'aguardando_confirmacao': return 'confirmado'
    case 'confirmado':
    case 'aguardando_producao': return 'em_producao'
    case 'em_producao': return 'pronto'
    case 'pronto': return tipoEntrega === 'entrega' ? 'saiu_entrega' : 'entregue'
    case 'saiu_entrega': return 'entregue'
    default: return null
  }
}

export const rotuloAcao: Partial<Record<StatusPedido, string>> = {
  aguardando_confirmacao: 'Enviado ao cliente',
  orcamento: 'Voltar a orçamento',
  confirmado: 'Confirmar pedido',
  aguardando_producao: 'Na fila de produção',
  em_producao: 'Iniciar produção',
  pronto: 'Marcar como pronto',
  saiu_entrega: 'Saiu para entrega',
  entregue: 'Marcar como entregue',
  cancelado: 'Cancelar pedido',
}

export const statusAbertos: StatusPedido[] = ['confirmado', 'aguardando_producao', 'em_producao', 'pronto', 'saiu_entrega']
export const statusOrcamento: StatusPedido[] = ['orcamento', 'aguardando_confirmacao']
export const itensBloqueados: StatusPedido[] = ['em_producao', 'pronto', 'saiu_entrega', 'entregue', 'cancelado']

export const origensPedido = [
  { valor: 'whatsapp', rotulo: 'WhatsApp' },
  { valor: 'instagram', rotulo: 'Instagram' },
  { valor: 'balcao', rotulo: 'Balcão' },
  { valor: 'telefone', rotulo: 'Telefone' },
  { valor: 'site', rotulo: 'Site' },
  { valor: 'outro', rotulo: 'Outro' },
] as const

export function formatarEndereco(e: unknown) {
  const end = (e ?? {}) as Record<string, string | undefined>
  return [[end.logradouro, end.numero].filter(Boolean).join(', '), end.complemento, end.bairro, [end.cidade, end.uf].filter(Boolean).join('/')]
    .filter(Boolean).join(' · ')
}
