import { differenceInCalendarDays, format } from 'date-fns'
import { dataLocal } from '@/lib/utils'

export const origensCliente = [
  { valor: 'indicacao', rotulo: 'Indicação' },
  { valor: 'instagram', rotulo: 'Instagram' },
  { valor: 'whatsapp', rotulo: 'WhatsApp' },
  { valor: 'site', rotulo: 'Site' },
  { valor: 'balcao', rotulo: 'Balcão' },
  { valor: 'evento', rotulo: 'Evento / feira' },
  { valor: 'outro', rotulo: 'Outro' },
] as const

export const rotuloOrigem = (v?: string | null) => origensCliente.find((o) => o.valor === v)?.rotulo ?? v ?? ''

/** Formata telefone brasileiro: (11) 98888-7777 / (11) 3333-4444. */
export function formatarTelefone(v?: string | null) {
  const d = (v ?? '').replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return v ?? ''
}

export function linkWhatsApp(v?: string | null) {
  const d = (v ?? '').replace(/\D/g, '')
  if (d.length < 10) return null
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`
}

/** Dias até o próximo aniversário (0 = hoje). 29/02 conta como 28/02 em anos não bissextos. */
export function diasAteAniversario(nascimento: string, hoje = new Date()) {
  const n = dataLocal(nascimento)
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const proximo = (ano: number) => {
    const d = new Date(ano, n.getMonth(), n.getDate())
    return d.getMonth() !== n.getMonth() ? new Date(ano, n.getMonth() + 1, 0) : d
  }
  let p = proximo(base.getFullYear())
  if (p < base) p = proximo(base.getFullYear() + 1)
  return differenceInCalendarDays(p, base)
}

export function idade(nascimento: string, hoje = new Date()) {
  const n = dataLocal(nascimento)
  let i = hoje.getFullYear() - n.getFullYear()
  if (hoje.getMonth() < n.getMonth() || (hoje.getMonth() === n.getMonth() && hoje.getDate() < n.getDate())) i--
  return i
}

export const formatarAniversario = (nascimento: string) => format(dataLocal(nascimento), 'dd/MM')

export function textoAniversario(dias: number) {
  if (dias === 0) return 'Hoje!'
  if (dias === 1) return 'Amanhã'
  return `Em ${dias} dias`
}

/** Status que contam como venda (faturamento) no histórico do cliente. */
export const statusVenda = ['confirmado', 'aguardando_producao', 'em_producao', 'pronto', 'saiu_entrega', 'entregue'] as const

export const rotulosStatus: Record<string, string> = {
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
