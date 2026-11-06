import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompacto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

export const formatarMoeda = (v: number | string | null | undefined) => brl.format(Number(v ?? 0))
export const formatarMoedaCompacta = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0)
  return Math.abs(n) < 10000 ? brl.format(n).replace(/,00$/, '') : brlCompacto.format(n)
}
export const formatarNumero = (v: number | string | null | undefined) => numero.format(Number(v ?? 0))

/** Converte 'YYYY-MM-DD' em Date local (sem deslocamento de fuso). */
export function dataLocal(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d)
}
export function isoLocal(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export function iniciais(nome?: string | null) {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

export function primeiroNome(nome?: string | null) {
  return nome?.trim().split(/\s+/)[0] ?? ''
}

export function saudacao(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Traduz erros do Supabase/Postgres para mensagens claras em português. */
export function mensagemErro(erro: unknown): string {
  const e = erro as { message?: string; code?: string; status?: number } | null
  const msg = e?.message ?? ''
  const mapa: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
    'User already registered': 'Já existe uma conta com este e-mail.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'New password should be different from the old password.': 'A nova senha deve ser diferente da anterior.',
    'Failed to fetch': 'Não foi possível conectar. Verifique sua internet e tente novamente.',
  }
  for (const [k, v] of Object.entries(mapa)) if (msg.includes(k)) return v
  if (e?.status === 429 || /rate limit/i.test(msg)) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.'
  if (e?.code === '23505') return 'Já existe um registro com estes dados.'
  if (e?.code === '23503') return 'Este registro está vinculado a outros dados e não pode ser alterado assim.'
  if (e?.code === '42501') return 'Você não tem permissão para esta ação.'
  if (e?.code === 'P0001' && msg) return msg
  return msg || 'Algo deu errado. Tente novamente.'
}

export function lerPreferencia<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave)
    return v === null ? padrao : (JSON.parse(v) as T)
  } catch {
    return padrao
  }
}
export function salvarPreferencia(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* armazenamento indisponível: ignora */
  }
}

const quantidade = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
export const formatarQuantidade = (v: number | string | null | undefined, unidade?: string | null) =>
  `${quantidade.format(Number(v ?? 0))}${unidade ? ` ${unidade}` : ''}`

export const hojeIso = () => isoLocal(new Date())

export const normalizarTexto = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const slugificar = (s: string) =>
  normalizarTexto(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

/** Converte texto digitado ("1.234,56" ou "1234.56") em número. */
export function lerNumero(v: string | number | null | undefined): number {
  if (typeof v === 'number') return v
  const s = String(v ?? '').trim()
  if (!s) return 0
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s)
  return Number.isFinite(n) ? n : NaN
}

export const unidadesMedida = [
  { codigo: 'g', nome: 'Grama (g)' },
  { codigo: 'kg', nome: 'Quilograma (kg)' },
  { codigo: 'mg', nome: 'Miligrama (mg)' },
  { codigo: 'ml', nome: 'Mililitro (ml)' },
  { codigo: 'l', nome: 'Litro (l)' },
  { codigo: 'un', nome: 'Unidade (un)' },
  { codigo: 'dz', nome: 'Dúzia (dz)' },
  { codigo: 'cento', nome: 'Cento' },
  { codigo: 'cc', nome: 'Colher de chá (5 ml)' },
  { codigo: 'cs', nome: 'Colher de sopa (15 ml)' },
  { codigo: 'xic', nome: 'Xícara (240 ml)' },
] as const

/** Gera e baixa um CSV compatível com Excel (UTF-8 com BOM, separador ;). */
export function baixarCsv(nome: string, colunas: string[], linhas: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '')
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const conteudo = '﻿' + [colunas, ...linhas].map((l) => l.map(esc).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const fatoresUnidade: Record<string, { g: 'massa' | 'volume' | 'unidade'; f: number }> = {
  mg: { g: 'massa', f: 0.001 }, g: { g: 'massa', f: 1 }, kg: { g: 'massa', f: 1000 },
  ml: { g: 'volume', f: 1 }, l: { g: 'volume', f: 1000 }, cc: { g: 'volume', f: 5 }, cs: { g: 'volume', f: 15 }, xic: { g: 'volume', f: 240 },
  un: { g: 'unidade', f: 1 }, dz: { g: 'unidade', f: 12 }, cento: { g: 'unidade', f: 100 },
}

/** Espelho de public.converter_unidade. Retorna null quando falta densidade/peso unitário. */
export function converterUnidade(qtd: number, de: string, para: string, densidade?: number | null, pesoUnitario?: number | null): number | null {
  if (de === para) return qtd
  const d = fatoresUnidade[de], p = fatoresUnidade[para]
  if (!d || !p) return null
  const base = qtd * d.f
  if (d.g === p.g) return base / p.f
  const gramas = d.g === 'massa' ? base : d.g === 'volume' ? (densidade ? base * densidade : null) : (pesoUnitario ? base * pesoUnitario : null)
  if (gramas === null) return null
  if (p.g === 'massa') return gramas / p.f
  if (p.g === 'volume') return densidade ? gramas / densidade / p.f : null
  return pesoUnitario ? gramas / pesoUnitario / p.f : null
}
