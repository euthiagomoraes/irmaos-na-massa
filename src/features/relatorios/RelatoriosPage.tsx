import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns'
import { BarChart3, Download, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { Button, Card, Carregando, EstadoErro, EstadoVazio, Input } from '@/components/ui'
import { Abas, CabecalhoPagina, Kpi, Pilulas } from '@/components/ui/estrutura'
import { baixarCsv, cn, dataLocal, formatarMoeda, formatarNumero, formatarQuantidade, isoLocal, mensagemErro } from '@/lib/utils'
import { formatarTelefone, linkWhatsApp } from '@/features/clientes/utils'

interface Relatorio {
  resumo: { faturamento: number; pedidos: number; cmv: number; clientes_atendidos: number; cancelados: number; orcamentos: number; recebido: number; pago: number; despesas: number }
  produtos: { nome: string; quantidade: number; receita: number; custo: number; lucro: number }[]
  clientes: { id: string; nome: string; pedidos: number; total: number; ultimo: string }[]
  recorrentes: number
  inativos: { id: string; nome: string; whatsapp: string | null; ultimo: string; pedidos: number; total: number }[]
  insumos: { nome: string; unidade: string; consumo: number; perda: number; valor: number; valor_perda: number }[]
  formas_pagamento: { nome: string; valor: number; quantidade: number }[]
  despesas_categoria: { nome: string; valor: number }[]
  fidelidade: { nome: string; participantes: number; pontos_emitidos: number; pontos_resgatados: number; resgates: number }[]
}

type Preset = 'mes' | 'mes_anterior' | '90d' | 'ano' | 'personalizado'
type Aba = 'vendas' | 'clientes' | 'insumos' | 'financeiro' | 'fidelidade'

function periodoDe(p: Preset) {
  const hoje = new Date()
  switch (p) {
    case 'mes': return { inicio: isoLocal(startOfMonth(hoje)), fim: isoLocal(hoje) }
    case 'mes_anterior': { const m = subMonths(hoje, 1); return { inicio: isoLocal(startOfMonth(m)), fim: isoLocal(endOfMonth(m)) } }
    case '90d': return { inicio: isoLocal(subDays(hoje, 89)), fim: isoLocal(hoje) }
    default: return { inicio: isoLocal(startOfYear(hoje)), fim: isoLocal(hoje) }
  }
}

export function RelatoriosPage() {
  const empresa = useEmpresa()
  const [preset, setPreset] = useState<Preset>('mes')
  const [custom, setCustom] = useState(periodoDe('mes'))
  const [aba, setAba] = useState<Aba>('vendas')
  const periodo = preset === 'personalizado' ? custom : periodoDe(preset)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['relatorios', empresa.id, periodo.inicio, periodo.fim],
    queryFn: async () => {
      const { data: r, error: e } = await supabase.rpc('relatorio_gerencial', { p_empresa: empresa.id, p_inicio: periodo.inicio, p_fim: periodo.fim })
      if (e) throw e
      return r as unknown as Relatorio
    },
    enabled: periodo.inicio <= periodo.fim,
  })

  const sufixo = `${periodo.inicio}_a_${periodo.fim}`
  const exportar = () => {
    if (!data) return
    const f = (n: number) => Math.round(Number(n) * 100) / 100
    if (aba === 'vendas') baixarCsv(`vendas-por-produto_${sufixo}`, ['Produto', 'Quantidade', 'Receita', 'Custo', 'Lucro', 'Margem %'],
      data.produtos.map((p) => [p.nome, f(p.quantidade), f(p.receita), f(p.custo), f(p.lucro), p.receita > 0 ? f((p.lucro / p.receita) * 100) : '']))
    if (aba === 'clientes') baixarCsv(`clientes_${sufixo}`, ['Cliente', 'Pedidos', 'Total', 'Último pedido', 'Situação'],
      [...data.clientes.map((c) => [c.nome, c.pedidos, f(c.total), c.ultimo, 'Ativo no período']), ...data.inativos.map((c) => [c.nome, c.pedidos, f(c.total), c.ultimo, 'Inativo (90+ dias)'])])
    if (aba === 'insumos') baixarCsv(`consumo-de-insumos_${sufixo}`, ['Insumo', 'Unidade', 'Consumo', 'Perda', 'Custo total', 'Custo das perdas'],
      data.insumos.map((i) => [i.nome, i.unidade, f(i.consumo), f(i.perda), f(i.valor), f(i.valor_perda)]))
    if (aba === 'financeiro') baixarCsv(`financeiro_${sufixo}`, ['Tipo', 'Nome', 'Valor'],
      [...data.formas_pagamento.map((x) => ['Recebimento', x.nome, f(x.valor)]), ...data.despesas_categoria.map((x) => ['Despesa', x.nome, f(x.valor)])])
    if (aba === 'fidelidade') baixarCsv(`fidelidade_${sufixo}`, ['Programa', 'Participantes', 'Pontos emitidos', 'Pontos resgatados', 'Resgates'],
      data.fidelidade.map((x) => [x.nome, x.participantes, x.pontos_emitidos, x.pontos_resgatados, x.resgates]))
  }

  return (
    <div className="space-y-5 print:space-y-3">
      <CabecalhoPagina titulo="Relatórios" descricao={`Período: ${format(dataLocal(periodo.inicio), 'dd/MM/yyyy')} a ${format(dataLocal(periodo.fim), 'dd/MM/yyyy')}`}
        acoes={<div className="flex gap-2 print:hidden">
          <Button variante="contorno" onClick={() => window.print()} disabled={!data}><Printer className="size-4" />PDF</Button>
          <Button variante="contorno" onClick={exportar} disabled={!data}><Download className="size-4" />Excel (CSV)</Button>
        </div>} />
      <Card className="flex flex-wrap items-center gap-3 p-4 print:hidden">
        <Pilulas ativa={preset} onChange={setPreset} opcoes={[
          { id: 'mes', rotulo: 'Este mês' }, { id: 'mes_anterior', rotulo: 'Mês anterior' }, { id: '90d', rotulo: '90 dias' }, { id: 'ano', rotulo: 'Este ano' }, { id: 'personalizado', rotulo: 'Personalizado' },
        ]} />
        {preset === 'personalizado' && (
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="Início" className="h-9 w-40" value={custom.inicio} onChange={(e) => setCustom({ ...custom, inicio: e.target.value })} />
            <span className="text-texto-suave">a</span>
            <Input type="date" aria-label="Fim" className="h-9 w-40" value={custom.fim} onChange={(e) => setCustom({ ...custom, fim: e.target.value })} />
          </div>
        )}
      </Card>

      {isLoading ? <Carregando texto="Calculando…" /> : error ? <EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} /> : !data ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi rotulo="Faturamento" valor={formatarMoeda(data.resumo.faturamento)} detalhe={`${data.resumo.pedidos} pedidos`} />
            <Kpi rotulo="Lucro bruto" valor={formatarMoeda(data.resumo.faturamento - data.resumo.cmv)}
              detalhe={data.resumo.faturamento > 0 ? `margem ${((1 - data.resumo.cmv / data.resumo.faturamento) * 100).toFixed(0)}%` : undefined} />
            <Kpi rotulo="Resultado (lucro − despesas)" valor={formatarMoeda(data.resumo.faturamento - data.resumo.cmv - data.resumo.despesas)}
              tom={data.resumo.faturamento - data.resumo.cmv - data.resumo.despesas < 0 ? 'erro' : 'sucesso'} />
            <Kpi rotulo="Ticket médio" valor={formatarMoeda(data.resumo.pedidos ? data.resumo.faturamento / data.resumo.pedidos : 0)} detalhe={`${data.resumo.clientes_atendidos} clientes`} />
          </div>
          <Abas className="print:hidden" ativa={aba} onChange={setAba} abas={[
            { id: 'vendas', rotulo: 'Vendas e lucro' }, { id: 'clientes', rotulo: 'Clientes' }, { id: 'insumos', rotulo: 'Insumos e desperdício' },
            { id: 'financeiro', rotulo: 'Financeiro' }, { id: 'fidelidade', rotulo: 'Fidelidade' },
          ]} />
          {aba === 'vendas' && <Vendas d={data} />}
          {aba === 'clientes' && <Clientes d={data} />}
          {aba === 'insumos' && <Insumos d={data} />}
          {aba === 'financeiro' && <Financeiro d={data} />}
          {aba === 'fidelidade' && <Fidelidade d={data} />}
        </>
      )}
    </div>
  )
}

function Tabela({ colunas, linhas, vazio = 'Sem dados no período.' }: { colunas: { rotulo: string; num?: boolean }[]; linhas: React.ReactNode[][]; vazio?: string }) {
  if (!linhas.length) return <Card><EstadoVazio icone={<BarChart3 className="size-6" />} titulo={vazio} /></Card>
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-[13px]">
        <thead><tr className="border-b border-borda bg-creme/50 text-[11.5px] tracking-wide text-texto-suave uppercase">
          {colunas.map((c) => <th key={c.rotulo} className={cn('px-4 py-2.5 font-semibold', c.num ? 'text-right' : 'text-left')}>{c.rotulo}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-borda/70">
          {linhas.map((l, i) => <tr key={i}>{l.map((cel, j) => <td key={j} className={cn('px-4 py-2.5', colunas[j].num && 'text-right tabular-nums')}>{cel}</td>)}</tr>)}
        </tbody>
      </table>
    </Card>
  )
}

function Barra({ valor, max, tom = 'bg-serie-1' }: { valor: number; max: number; tom?: string }) {
  return <div className="h-1.5 w-full rounded-full bg-creme-escuro"><div className={cn('h-1.5 rounded-full', tom)} style={{ width: `${max > 0 ? Math.max((valor / max) * 100, 2) : 0}%` }} /></div>
}

function Vendas({ d }: { d: Relatorio }) {
  const max = Math.max(0, ...d.produtos.map((p) => Number(p.receita)))
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-texto-suave">Pedidos confirmados no período (orçamentos e cancelados ficam de fora). Custo = receita do produto no momento do pedido.</p>
      <Tabela colunas={[{ rotulo: 'Produto' }, { rotulo: 'Qtd.', num: true }, { rotulo: 'Receita', num: true }, { rotulo: 'Custo', num: true }, { rotulo: 'Lucro', num: true }, { rotulo: 'Margem', num: true }]}
        linhas={d.produtos.map((p) => {
          const m = p.receita > 0 ? (p.lucro / p.receita) * 100 : null
          return [
            <div key="n" className="min-w-40"><p className="font-medium text-choco-800">{p.nome}</p><Barra valor={Number(p.receita)} max={max} /></div>,
            formatarNumero(p.quantidade), formatarMoeda(p.receita), Number(p.custo) > 0 ? formatarMoeda(p.custo) : <span key="c" className="text-texto-suave">sem ficha</span>,
            <span key="l" className={Number(p.lucro) < 0 ? 'text-erro' : ''}>{formatarMoeda(p.lucro)}</span>,
            m === null || Number(p.custo) === 0 ? '—' : <span key="m" className={cn('font-semibold', m < 30 ? 'text-erro' : m < 50 ? 'text-alerta' : 'text-sucesso')}>{m.toFixed(0)}%</span>,
          ]
        })} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi rotulo="Pedidos criados" valor={d.resumo.orcamentos} />
        <Kpi rotulo="Convertidos em venda" valor={d.resumo.pedidos} detalhe={d.resumo.orcamentos ? `${((d.resumo.pedidos / d.resumo.orcamentos) * 100).toFixed(0)}% de conversão` : undefined} />
        <Kpi rotulo="Cancelados" valor={d.resumo.cancelados} tom={d.resumo.cancelados ? 'alerta' : undefined} />
      </div>
    </div>
  )
}

function Clientes({ d }: { d: Relatorio }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi rotulo="Clientes atendidos" valor={d.resumo.clientes_atendidos} />
        <Kpi rotulo="Recorrentes (2+ pedidos)" valor={d.recorrentes} />
        <Kpi rotulo="Inativos há 90+ dias" valor={d.inativos.length} tom={d.inativos.length ? 'alerta' : undefined} />
      </div>
      <h3 className="font-display text-[16px] font-semibold">Quem mais comprou</h3>
      <Tabela colunas={[{ rotulo: 'Cliente' }, { rotulo: 'Pedidos', num: true }, { rotulo: 'Total', num: true }, { rotulo: 'Último', num: true }]}
        linhas={d.clientes.map((c) => [c.nome, c.pedidos, formatarMoeda(c.total), format(dataLocal(c.ultimo), 'dd/MM/yy')])} />
      <h3 className="font-display text-[16px] font-semibold">Clientes para reconquistar</h3>
      <Tabela vazio="Nenhum cliente inativo." colunas={[{ rotulo: 'Cliente' }, { rotulo: 'Último pedido', num: true }, { rotulo: 'Pedidos', num: true }, { rotulo: 'Já gastou', num: true }, { rotulo: '' }]}
        linhas={d.inativos.map((c) => {
          const wa = linkWhatsApp(c.whatsapp)
          return [c.nome, format(dataLocal(c.ultimo), 'dd/MM/yy'), c.pedidos, formatarMoeda(c.total),
            wa ? <a key="w" href={wa} target="_blank" rel="noreferrer" className="font-semibold text-sucesso hover:underline">{formatarTelefone(c.whatsapp)}</a> : '—']
        })} />
    </div>
  )
}

function Insumos({ d }: { d: Relatorio }) {
  const perdas = d.insumos.reduce((s, i) => s + Number(i.valor_perda), 0)
  const total = d.insumos.reduce((s, i) => s + Number(i.valor), 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Kpi rotulo="Custo dos insumos consumidos" valor={formatarMoeda(total)} />
        <Kpi rotulo="Desperdício (perdas)" valor={formatarMoeda(perdas)} tom={perdas ? 'erro' : undefined} detalhe={total ? `${((perdas / total) * 100).toFixed(1)}% do consumo` : undefined} />
      </div>
      <Tabela colunas={[{ rotulo: 'Insumo' }, { rotulo: 'Consumo', num: true }, { rotulo: 'Perdas', num: true }, { rotulo: 'Custo', num: true }, { rotulo: 'Custo perdas', num: true }]}
        linhas={d.insumos.map((i) => [i.nome, formatarQuantidade(i.consumo, i.unidade), Number(i.perda) ? formatarQuantidade(i.perda, i.unidade) : '—', formatarMoeda(i.valor),
          Number(i.valor_perda) ? <span key="p" className="text-erro">{formatarMoeda(i.valor_perda)}</span> : '—'])} />
    </div>
  )
}

function Financeiro({ d }: { d: Relatorio }) {
  const maxF = Math.max(0, ...d.formas_pagamento.map((x) => Number(x.valor)))
  const maxD = Math.max(0, ...d.despesas_categoria.map((x) => Number(x.valor)))
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Recebido (caixa)" valor={formatarMoeda(d.resumo.recebido)} tom="sucesso" />
        <Kpi rotulo="Pago (caixa)" valor={formatarMoeda(d.resumo.pago)} />
        <Kpi rotulo="Despesas (competência)" valor={formatarMoeda(d.resumo.despesas)} />
        <Kpi rotulo="Faturado − recebido" valor={formatarMoeda(d.resumo.faturamento - d.resumo.recebido)} detalhe="diferença entre vendas e caixa" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-display text-[16px] font-semibold">Recebimentos por forma</h3>
          <Tabela colunas={[{ rotulo: 'Forma' }, { rotulo: 'Qtd.', num: true }, { rotulo: 'Valor', num: true }]}
            linhas={d.formas_pagamento.map((x) => [<div key="n"><p>{x.nome}</p><Barra valor={Number(x.valor)} max={maxF} tom="bg-serie-3" /></div>, x.quantidade, formatarMoeda(x.valor)])} />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-[16px] font-semibold">Despesas por categoria</h3>
          <Tabela colunas={[{ rotulo: 'Categoria' }, { rotulo: 'Valor', num: true }]}
            linhas={d.despesas_categoria.map((x) => [<div key="n"><p>{x.nome}</p><Barra valor={Number(x.valor)} max={maxD} tom="bg-serie-2" /></div>, formatarMoeda(x.valor)])} />
        </div>
      </div>
    </div>
  )
}

function Fidelidade({ d }: { d: Relatorio }) {
  const linhas = useMemo(() => d.fidelidade.map((x) => [x.nome, x.participantes, x.pontos_emitidos, x.pontos_resgatados, x.resgates]), [d])
  return <Tabela vazio="Nenhum programa de fidelidade." colunas={[{ rotulo: 'Programa' }, { rotulo: 'Participantes', num: true }, { rotulo: 'Pontos emitidos', num: true }, { rotulo: 'Pontos resgatados', num: true }, { rotulo: 'Resgates', num: true }]} linhas={linhas} />
}
