import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEmpresa } from '@/contexts/AuthContext'
import { exigir, supabase } from '@/lib/supabase'

/** Cadastros de apoio usados em vários módulos (cache compartilhado). */
export function useInsumos() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['insumos', empresa.id],
    queryFn: async () => exigir(await supabase.from('insumos').select('*').eq('empresa_id', empresa.id).order('nome').limit(5000)),
  })
}

export function useCategoriasInsumos() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['categorias_insumos', empresa.id],
    queryFn: async () => exigir(await supabase.from('categorias_insumos').select('*').eq('empresa_id', empresa.id).order('ordem').order('nome')),
    staleTime: 5 * 60_000,
  })
}

export function useFornecedores() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['fornecedores', empresa.id],
    queryFn: async () => exigir(await supabase.from('fornecedores').select('*').eq('empresa_id', empresa.id).order('nome')),
  })
}

export function useFormasPagamento() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['formas_pagamento', empresa.id],
    queryFn: async () => exigir(await supabase.from('formas_pagamento').select('*').eq('empresa_id', empresa.id).order('ordem').order('nome')),
    staleTime: 5 * 60_000,
  })
}

export function useCategoriasFinanceiras() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['categorias_financeiras', empresa.id],
    queryFn: async () => exigir(await supabase.from('categorias_financeiras').select('*').eq('empresa_id', empresa.id).order('tipo').order('ordem').order('nome')),
    staleTime: 5 * 60_000,
  })
}

export function useFichas() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['fichas', empresa.id],
    queryFn: async () => exigir(await supabase.from('fichas_tecnicas').select('*').eq('empresa_id', empresa.id).order('nome')),
  })
}

export function useProdutos() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['produtos', empresa.id],
    queryFn: async () => exigir(await supabase.from('produtos')
      .select('*, variacoes:variacoes_produtos(*), categoria:categorias_produtos(id, nome)')
      .eq('empresa_id', empresa.id).order('nome')),
  })
}

export function useCategoriasProdutos() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['categorias_produtos', empresa.id],
    queryFn: async () => exigir(await supabase.from('categorias_produtos').select('*').eq('empresa_id', empresa.id).order('ordem').order('nome')),
  })
}

export function useOpcoesPersonalizacao() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['opcoes_personalizacao', empresa.id],
    queryFn: async () => exigir(await supabase.from('opcoes_personalizacao').select('*').eq('empresa_id', empresa.id).order('grupo').order('ordem').order('nome')),
  })
}

export function useClientesBasico() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['clientes', empresa.id, 'basico'],
    queryFn: async () => exigir(await supabase.from('clientes').select('id, nome, whatsapp, telefone, endereco, restricoes, ativo')
      .eq('empresa_id', empresa.id).order('nome').limit(5000)),
  })
}

export function useConfiguracoes() {
  const empresa = useEmpresa()
  return useQuery({
    queryKey: ['configuracoes', empresa.id],
    queryFn: async () => exigir(await supabase.from('configuracoes').select('*').eq('empresa_id', empresa.id).single()),
    staleTime: 5 * 60_000,
  })
}

/** Invalida grupos de consultas da empresa atual (ex.: ['insumos', 'movimentacoes']). */
export function useInvalidar() {
  const qc = useQueryClient()
  const empresa = useEmpresa()
  return (...grupos: string[]) => Promise.all([
    ...grupos.map((g) => qc.invalidateQueries({ queryKey: [g, empresa.id] })),
    qc.invalidateQueries({ queryKey: ['dashboard', empresa.id] }),
    qc.invalidateQueries({ queryKey: ['notificacoes', empresa.id] }),
  ])
}
