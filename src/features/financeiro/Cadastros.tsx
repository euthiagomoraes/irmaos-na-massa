import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarPlus, Pencil, Plus, Power, Repeat, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { exigir, supabase, type Tabela } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useCategoriasFinanceiras, useFormasPagamento, useFornecedores, useInvalidar } from '@/lib/consultas'
import { Badge, Button, Campo, Card, Carregando, EstadoErro, EstadoVazio, Input, Select } from '@/components/ui'
import { Modal } from '@/components/ui/estrutura'
import { cn, dataLocal, formatarMoeda, hojeIso, lerNumero, mensagemErro } from '@/lib/utils'

/* ------------------------------------------------------------ Despesas fixas */
type Recorrente = Tabela<'despesas_recorrentes'>
const frequencias: Record<string, string> = { semanal: 'Semanal', mensal: 'Mensal', bimestral: 'Bimestral', trimestral: 'Trimestral', anual: 'Anual' }

export function Recorrentes() {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { ehGestor } = useAuth()
  const { data: categorias = [] } = useCategoriasFinanceiras()
  const [editando, setEditando] = useState<Recorrente | null | undefined>(undefined)
  const [gerando, setGerando] = useState(false)
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['financeiro', empresa.id, 'recorrentes'],
    queryFn: async () => exigir(await supabase.from('despesas_recorrentes').select('*').eq('empresa_id', empresa.id).order('descricao')),
  })

  const gerar = async () => {
    setGerando(true)
    const { data: n, error: e } = await supabase.rpc('gerar_despesas_recorrentes', { p_empresa: empresa.id })
    setGerando(false)
    if (e) return void toast.error(mensagemErro(e))
    await invalidar('financeiro')
    toast.success(n ? `${n} conta(s) a pagar gerada(s) para os próximos 31 dias.` : 'Tudo em dia: nenhuma conta nova a gerar.')
  }
  const alternar = async (r: Recorrente) => {
    const { error: e } = await supabase.from('despesas_recorrentes').update({ ativo: !r.ativo }).eq('id', r.id)
    if (e) return void toast.error(mensagemErro(e))
    await invalidar('financeiro')
  }
  const excluir = async (r: Recorrente) => {
    if (!window.confirm(`Excluir a despesa fixa "${r.descricao}"? As contas já geradas são mantidas.`)) return
    const { error: e } = await supabase.from('despesas_recorrentes').delete().eq('id', r.id)
    if (e) return void toast.error(mensagemErro(e))
    await invalidar('financeiro')
  }
  const totalMensal = data.filter((r) => r.ativo).reduce((s, r) => s + Number(r.valor) * ({ semanal: 52 / 12, mensal: 1, bimestral: 0.5, trimestral: 1 / 3, anual: 1 / 12 }[r.frequencia] ?? 1), 0)

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-choco-800">Custo fixo estimado: {formatarMoeda(totalMensal)}/mês</p>
          <p className="text-[12.5px] text-texto-suave">Aluguel, energia, internet… Gere as contas a pagar do próximo período com um clique.</p>
        </div>
        <Button variante="contorno" carregando={gerando} onClick={() => void gerar()}><CalendarPlus className="size-4" />Gerar contas</Button>
        <Button onClick={() => setEditando(null)}><Plus className="size-4" />Nova despesa fixa</Button>
      </Card>
      <Card className="overflow-hidden">
        {isLoading ? <Carregando /> : error ? <div className="p-5"><EstadoErro mensagem={mensagemErro(error)} onTentarNovamente={() => void refetch()} /></div>
          : data.length === 0 ? <EstadoVazio icone={<Repeat className="size-6" />} titulo="Nenhuma despesa fixa" descricao="Cadastre despesas que se repetem para não esquecer nenhum vencimento." /> : (
            <ul className="divide-y divide-borda/70">
              {data.map((r) => (
                <li key={r.id} className={cn('flex flex-wrap items-center gap-3 px-5 py-3', !r.ativo && 'opacity-55')}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-choco-800">{r.descricao}</p>
                    <p className="text-[12.5px] text-texto-suave">
                      {frequencias[r.frequencia]}{r.frequencia !== 'semanal' && ` · dia ${r.dia_vencimento}`} · {categorias.find((c) => c.id === r.categoria_id)?.nome}
                      {r.ultima_geracao && ` · gerada até ${format(dataLocal(r.ultima_geracao), 'dd/MM/yy')}`}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatarMoeda(r.valor)}</span>
                  <Button variante="fantasma" tamanho="icone" className="size-8" aria-label="Editar" onClick={() => setEditando(r)}><Pencil className="size-3.5" /></Button>
                  <Button variante="fantasma" tamanho="icone" className="size-8" aria-label={r.ativo ? 'Pausar' : 'Reativar'} title={r.ativo ? 'Pausar' : 'Reativar'} onClick={() => void alternar(r)}><Power className="size-3.5" /></Button>
                  {ehGestor && <Button variante="fantasma" tamanho="icone" className="size-8 text-erro" aria-label="Excluir" onClick={() => void excluir(r)}><Trash2 className="size-3.5" /></Button>}
                </li>
              ))}
            </ul>
          )}
      </Card>
      <FormularioRecorrente item={editando} onFechar={() => setEditando(undefined)} />
    </div>
  )
}

function FormularioRecorrente({ item, onFechar }: { item: Recorrente | null | undefined; onFechar: () => void }) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { data: categorias = [] } = useCategoriasFinanceiras()
  const { data: fornecedores = [] } = useFornecedores()
  const [v, setV] = useState({ descricao: '', valor: '', categoria: '', fornecedor: '', frequencia: 'mensal', dia: '10', inicio: hojeIso(), fim: '' })
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    if (item === undefined) return
    setV({
      descricao: item?.descricao ?? '', valor: item ? String(item.valor).replace('.', ',') : '', categoria: item?.categoria_id ?? '',
      fornecedor: item?.fornecedor_id ?? '', frequencia: item?.frequencia ?? 'mensal', dia: String(item?.dia_vencimento ?? 10),
      inicio: item?.data_inicio ?? hojeIso(), fim: item?.data_fim ?? '',
    })
  }, [item])
  const n = lerNumero(v.valor), dia = Math.round(lerNumero(v.dia))
  const valido = v.descricao.trim().length >= 2 && n > 0 && !!v.categoria && dia >= 1 && dia <= 31

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    setOcupado(true)
    const dados = {
      descricao: v.descricao.trim(), valor: n, categoria_id: v.categoria, fornecedor_id: v.fornecedor || null,
      frequencia: v.frequencia, dia_vencimento: dia, data_inicio: v.inicio, data_fim: v.fim || null,
    }
    const r = item ? await supabase.from('despesas_recorrentes').update(dados).eq('id', item.id)
      : await supabase.from('despesas_recorrentes').insert({ ...dados, empresa_id: empresa.id })
    setOcupado(false)
    if (r.error) return void toast.error(mensagemErro(r.error))
    await invalidar('financeiro')
    onFechar()
  }

  return (
    <Modal aberto={item !== undefined} onAbertoChange={(a) => { if (!a) onFechar() }} titulo={item ? 'Editar despesa fixa' : 'Nova despesa fixa'} largura="max-w-lg" onSubmit={salvar}
      rodape={<><Button variante="fantasma" onClick={onFechar}>Cancelar</Button><Button type="submit" carregando={ocupado} disabled={!valido}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Descrição" htmlFor="dr-d" obrigatorio className="sm:col-span-2"><Input id="dr-d" autoFocus value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} placeholder="Ex.: Aluguel da cozinha" /></Campo>
        <Campo rotulo="Valor (R$)" htmlFor="dr-v" obrigatorio><Input id="dr-v" inputMode="decimal" value={v.valor} onChange={(e) => setV({ ...v, valor: e.target.value })} /></Campo>
        <Campo rotulo="Categoria" htmlFor="dr-c" obrigatorio>
          <Select id="dr-c" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}>
            <option value="">Selecione…</option>
            {categorias.filter((c) => c.ativo && c.tipo === 'despesa').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Frequência" htmlFor="dr-f">
          <Select id="dr-f" value={v.frequencia} onChange={(e) => setV({ ...v, frequencia: e.target.value })}>
            {Object.entries(frequencias).map(([k, n2]) => <option key={k} value={k}>{n2}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Dia do vencimento" htmlFor="dr-dia" dica={v.frequencia === 'semanal' ? 'Semanal: vence a cada 7 dias a partir do início.' : 'Em meses mais curtos, vence no último dia.'}>
          <Input id="dr-dia" inputMode="numeric" value={v.dia} onChange={(e) => setV({ ...v, dia: e.target.value })} disabled={v.frequencia === 'semanal'} />
        </Campo>
        <Campo rotulo="Início" htmlFor="dr-i"><Input id="dr-i" type="date" value={v.inicio} onChange={(e) => setV({ ...v, inicio: e.target.value })} /></Campo>
        <Campo rotulo="Fim (opcional)" htmlFor="dr-fim"><Input id="dr-fim" type="date" value={v.fim} onChange={(e) => setV({ ...v, fim: e.target.value })} /></Campo>
        <Campo rotulo="Fornecedor" htmlFor="dr-forn" className="sm:col-span-2">
          <Select id="dr-forn" value={v.fornecedor} onChange={(e) => setV({ ...v, fornecedor: e.target.value })}>
            <option value="">Nenhum</option>
            {fornecedores.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </Select>
        </Campo>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------ Categorias e formas de pagamento */
export function CadastrosFinanceiros() {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const { ehGestor } = useAuth()
  const { data: categorias = [], isLoading } = useCategoriasFinanceiras()
  const { data: formas = [] } = useFormasPagamento()
  const [novaCat, setNovaCat] = useState({ nome: '', tipo: 'despesa', grupo: '' })
  const [novaForma, setNovaForma] = useState({ nome: '', tipo: 'pix', taxa: '' })
  const [mostrarInativas, setMostrarInativas] = useState(false)

  const criarCat = async (e: FormEvent) => {
    e.preventDefault()
    if (novaCat.nome.trim().length < 2) return
    const { error } = await supabase.from('categorias_financeiras').insert({ empresa_id: empresa.id, nome: novaCat.nome.trim(), tipo: novaCat.tipo, grupo: novaCat.grupo.trim() || null, ordem: 50 })
    if (error) return void toast.error(error.code === '23505' ? 'Já existe uma categoria com este nome.' : mensagemErro(error))
    setNovaCat({ ...novaCat, nome: '', grupo: '' })
    await invalidar('categorias_financeiras')
  }
  const atualizarCat = async (id: string, campos: Partial<Tabela<'categorias_financeiras'>>) => {
    const { error } = await supabase.from('categorias_financeiras').update(campos).eq('id', id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('categorias_financeiras')
  }
  const criarForma = async (e: FormEvent) => {
    e.preventDefault()
    if (novaForma.nome.trim().length < 2) return
    const { error } = await supabase.from('formas_pagamento').insert({ empresa_id: empresa.id, nome: novaForma.nome.trim(), tipo: novaForma.tipo, taxa_percentual: lerNumero(novaForma.taxa || '0') || 0, ordem: formas.length + 1 })
    if (error) return void toast.error(error.code === '23505' ? 'Já existe uma forma com este nome.' : mensagemErro(error))
    setNovaForma({ nome: '', tipo: 'pix', taxa: '' })
    await invalidar('formas_pagamento')
  }
  const atualizarForma = async (id: string, campos: Partial<Tabela<'formas_pagamento'>>) => {
    const { error } = await supabase.from('formas_pagamento').update(campos).eq('id', id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('formas_pagamento')
  }

  if (isLoading) return <Carregando />
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-borda px-5 py-3">
          <p className="font-display text-[15px] font-semibold">Categorias</p>
          <label className="flex items-center gap-2 text-[12.5px] text-texto-suave"><input type="checkbox" className="accent-cacau-600" checked={mostrarInativas} onChange={(e) => setMostrarInativas(e.target.checked)} />Mostrar inativas</label>
        </div>
        <form onSubmit={criarCat} className="grid gap-2 border-b border-borda p-4 sm:grid-cols-[1fr_8rem_9rem_auto]">
          <Input placeholder="Nova categoria" aria-label="Nome" value={novaCat.nome} onChange={(e) => setNovaCat({ ...novaCat, nome: e.target.value })} />
          <Select aria-label="Tipo" value={novaCat.tipo} onChange={(e) => setNovaCat({ ...novaCat, tipo: e.target.value })}><option value="despesa">Despesa</option><option value="receita">Receita</option></Select>
          <Input placeholder="Grupo (opcional)" aria-label="Grupo" value={novaCat.grupo} onChange={(e) => setNovaCat({ ...novaCat, grupo: e.target.value })} />
          <Button type="submit" disabled={novaCat.nome.trim().length < 2}><Plus className="size-4" /></Button>
        </form>
        {(['receita', 'despesa'] as const).map((t) => (
          <div key={t}>
            <p className="bg-creme/50 px-5 py-1.5 text-[11.5px] font-semibold tracking-wide text-texto-suave uppercase">{t === 'receita' ? 'Receitas' : 'Despesas'}</p>
            <ul className="divide-y divide-borda/70">
              {categorias.filter((c) => c.tipo === t && (mostrarInativas || c.ativo)).map((c) => (
                <li key={c.id} className={cn('flex items-center gap-2 px-5 py-2', !c.ativo && 'opacity-55')}>
                  <Input defaultValue={c.nome} aria-label="Nome" className="h-8 flex-1 text-[13px]" disabled={c.sistema}
                    onBlur={(e) => e.target.value.trim().length >= 2 && e.target.value.trim() !== c.nome && void atualizarCat(c.id, { nome: e.target.value.trim() })} />
                  {c.grupo && <span className="hidden w-32 truncate text-[12px] text-texto-suave sm:block">{c.grupo}</span>}
                  {c.sistema ? <Badge className="py-0 text-[11px]">Sistema</Badge> : ehGestor && (
                    <Button variante="fantasma" tamanho="icone" className="size-7" title={c.ativo ? 'Desativar' : 'Ativar'} aria-label={c.ativo ? 'Desativar' : 'Ativar'} onClick={() => void atualizarCat(c.id, { ativo: !c.ativo })}><Power className="size-3.5" /></Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>

      <Card className="h-fit overflow-hidden">
        <p className="border-b border-borda px-5 py-3 font-display text-[15px] font-semibold">Formas de pagamento</p>
        <form onSubmit={criarForma} className="grid gap-2 border-b border-borda p-4 sm:grid-cols-[1fr_9rem_6rem_auto]">
          <Input placeholder="Nova forma" aria-label="Nome" value={novaForma.nome} onChange={(e) => setNovaForma({ ...novaForma, nome: e.target.value })} />
          <Select aria-label="Tipo" value={novaForma.tipo} onChange={(e) => setNovaForma({ ...novaForma, tipo: e.target.value })}>
            <option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao_credito">Crédito</option>
            <option value="cartao_debito">Débito</option><option value="transferencia">Transferência</option><option value="boleto">Boleto</option><option value="outro">Outro</option>
          </Select>
          <Input placeholder="Taxa %" aria-label="Taxa %" inputMode="decimal" value={novaForma.taxa} onChange={(e) => setNovaForma({ ...novaForma, taxa: e.target.value })} />
          <Button type="submit" disabled={novaForma.nome.trim().length < 2}><Plus className="size-4" /></Button>
        </form>
        <ul className="divide-y divide-borda/70">
          {formas.map((f) => (
            <li key={f.id} className={cn('flex items-center gap-2 px-5 py-2', !f.ativo && 'opacity-55')}>
              <Input defaultValue={f.nome} aria-label="Nome" className="h-8 flex-1 text-[13px]"
                onBlur={(e) => e.target.value.trim().length >= 2 && e.target.value.trim() !== f.nome && void atualizarForma(f.id, { nome: e.target.value.trim() })} />
              <Input defaultValue={String(f.taxa_percentual).replace('.', ',')} aria-label="Taxa %" inputMode="decimal" className="h-8 w-20 text-right text-[13px]"
                onBlur={(e) => { const n = lerNumero(e.target.value || '0'); if (n >= 0 && n <= 100 && n !== Number(f.taxa_percentual)) void atualizarForma(f.id, { taxa_percentual: n }) }} />
              <span className="text-[12px] text-texto-suave">%</span>
              <Button variante="fantasma" tamanho="icone" className="size-7" title={f.ativo ? 'Desativar' : 'Ativar'} aria-label={f.ativo ? 'Desativar' : 'Ativar'} onClick={() => void atualizarForma(f.id, { ativo: !f.ativo })}><Power className="size-3.5" /></Button>
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 text-[12.5px] text-texto-suave">As taxas são informativas: o valor recebido é registrado integralmente. Use-as para comparar formas de pagamento.</p>
      </Card>
    </div>
  )
}
