import { isoLocal } from '@/lib/utils'

export type PresetPeriodo = 'hoje' | 'semana' | 'mes' | '30dias' | 'personalizado'

export const rotulosPeriodo: Record<PresetPeriodo, string> = {
  hoje: 'Hoje',
  semana: 'Esta semana',
  mes: 'Este mês',
  '30dias': 'Últimos 30 dias',
  personalizado: 'Personalizado',
}

export interface Periodo { inicio: string; fim: string }

export function calcularPeriodo(preset: Exclude<PresetPeriodo, 'personalizado'>, hoje = new Date()): Periodo {
  const fim = isoLocal(hoje)
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  switch (preset) {
    case 'hoje':
      return { inicio: fim, fim }
    case 'semana': {
      const diaSemana = (d.getDay() + 6) % 7 // segunda = 0
      d.setDate(d.getDate() - diaSemana)
      return { inicio: isoLocal(d), fim }
    }
    case 'mes':
      return { inicio: isoLocal(new Date(d.getFullYear(), d.getMonth(), 1)), fim }
    case '30dias':
      d.setDate(d.getDate() - 29)
      return { inicio: isoLocal(d), fim }
  }
}
