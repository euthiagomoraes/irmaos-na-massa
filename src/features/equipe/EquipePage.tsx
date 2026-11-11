import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Handshake, KeyRound, Lock, Plus, ShieldCheck } from 'lucide-react'
import { exigir, supabase } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { Badge, Button, Card, CardTitulo, Carregando, EstadoErro, EstadoVazio, Input } from '@/components/ui'
import { CabecalhoPagina, Interruptor, Kpi } from '@/components/ui/estrutura'
import { cn, formatarMoeda, iniciais, isoLocal, lerNumero, mensagemErro } from '@/lib/utils'
import { FormularioPessoa, rotuloTipo, type Pessoa, type TipoPessoa } from './FormularioPessoa'

const cores = ['bg-cacau-600', 'bg-rosa-500', 'bg-dourado-500', 'bg-oliva-700', 'bg-rosa-300', 'bg-dourado-600', 'bg-choco-800']
const tomTipo: Record<TipoPessoa, 'dourado' | 'neutro'> = { socio: 'dourado', colaborador: 'neutro' }
const tipoDe = (p: Pessoa): TipoPessoa => (p.tipo === 'colaborador' ? 'colaborador' : 'socio')
const ordemTipo: Record<TipoPessoa, number> = { socio: 0, colaborador: 1 }
const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

function descricaoRemuneracao(p: Pessoa) {
  const fixo = p.valor_fixo ? `${formatarMoeda(p.valor_fixo)}/mês` : ''
  if (p.remuneracao === 'fixo') return fixo
  if (p.remuneracao === 'misto') return `${fixo} + ${pct(Number(p.participacao_lucro))} do lucro`
  return `${pct(Number(p.participacao_lucro))} do lucro`
}

export function EquipePage() {
  const empresa = useEmpresa()
  const { ehAdmin } = useAuth()
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Pessoa | null>(null)
  const [lucroDigitado, setLucroDigitado] = useState<string | null>(null)
  const [descontarFixos, setDescontarFixos] = useState(true)

  const pessoasQ = useQuery({
    queryKey: ['pessoas_equipe', empresa.id],
    enabled: ehAdmin,
    queryFn: async () => exigir(await supabase.from('pessoas_equipe').select('*').eq('empresa_id', empresa.id).order('nome')),
  })

  // Lucro líquido do mês corrente, para sugerir no simulador
  const lucroMesQ = useQuery({
    queryKey: ['dashboard', empresa.id, 'lucro-mes-equipe'],
    enabled: ehAdmin,
    queryFn: async () => {
      const hoje = new Date()
      const { data, error } = await supabase.rpc('dashboard_resumo', {
        p_empresa: empresa.id, p_inicio: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), p_fim: isoLocal(hoje),
      })
      if (error) throw error
      return Number((data as unknown as { kpis: { lucro_liquido: number } }).kpis.lucro_liquido ?? 0)
    },
  })

  const pessoas = useMemo(() => pessoasQ.data ?? [], [pessoasQ.data])
  const ativas = useMemo(() => pessoas.filter((p) => p.ativo)
    .sort((a, b) => ordemTipo[tipoDe(a)] - ordemTipo[tipoDe(b)] || Number(b.participacao_lucro) - Number(a.participacao_lucro)), [pessoas])
  const inativas = pessoas.filter((p) => !p.ativo)

  const distribuido = ativas.reduce((s, p) => s + Number(p.participacao_lucro), 0)
  const totalFixos = ativas.reduce((s, p) => s + Number(p.valor_fixo ?? 0), 0)
  const lucro = lucroDigitado !== null ? lerNumero(lucroDigitado) : (lucroMesQ.data ?? 0)
  const base = Math.max(0, (Number.isNaN(lucro) ? 0 : lucro) - (descontarFixos ? totalFixos : 0))
  const parte = (p: Pessoa) => (base * Number(p.participacao_lucro)) / 100
  const recebe = (p: Pessoa) => parte(p) + Number(p.valor_fixo ?? 0)

  const abrir = (p: Pessoa | null) => { setEditando(p); setFormAberto(true) }

  if (!ehAdmin) {
    return (
      <div className="space-y-5">
        <CabecalhoPagina titulo="Sócios e equipe" />
        <Card><EstadoVazio icone={<Lock className="size-6" />} titulo="Acesso restrito"
          descricao="A divisão do lucro e a remuneração da equipe só aparecem para administradores do sistema." /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Sócios e equipe" descricao="Cadastro único: parte de cada um no lucro e acesso ao sistema por e-mail."
        acoes={<Button onClick={() => abrir(null)}><Plus className="size-4" />Nova pessoa</Button>} />

      {pessoasQ.isLoading ? <Card><Carregando texto="Carregando equipe…" /></Card> : pessoasQ.error ? (
        <Card className="p-5"><EstadoErro mensagem={mensagemErro(pessoasQ.error)} onTentarNovamente={() => void pessoasQ.refetch()} /></Card>
      ) : pessoas.length === 0 ? (
        <Card>
          <EstadoVazio icone={<Handshake className="size-6" />} titulo="Ninguém cadastrado ainda"
            descricao="Cadastre os sócios (você incluído) e os colaboradores com a parte de cada um no lucro — ex.: 60%, 30% e 10%."
            acao={<Button onClick={() => abrir(null)}><Plus className="size-4" />Cadastrar o primeiro</Button>} />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi rotulo="Lucro distribuído" valor={pct(distribuido)} tom={distribuido > 100 ? 'erro' : undefined}
              detalhe={distribuido < 100 ? `${pct(100 - distribuido)} sem dono (fica no caixa)` : 'Todo o lucro tem dono'} />
            <Kpi rotulo="Pagamentos fixos" valor={formatarMoeda(totalFixos)} detalhe="por mês, somando os colaboradores" />
            <Kpi rotulo="Pessoas ativas" valor={ativas.length} detalhe={inativas.length ? `${inativas.length} inativa(s)` : undefined} />
          </div>

          <Card className="p-5">
            <CardTitulo titulo="Divisão do lucro" descricao="Simule quanto cada pessoa recebe a partir de um valor de lucro." />
            <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-creme" role="img"
              aria-label={ativas.filter((p) => Number(p.participacao_lucro) > 0).map((p) => `${p.nome} ${pct(Number(p.participacao_lucro))}`).join(', ')}>
              {ativas.filter((p) => Number(p.participacao_lucro) > 0).map((p, i) => (
                <div key={p.id} className={cn(cores[i % cores.length], 'h-full border-r-2 border-white last:border-r-0')} style={{ width: `${Number(p.participacao_lucro)}%` }} title={`${p.nome}: ${pct(Number(p.participacao_lucro))}`} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-choco-700">
              {ativas.filter((p) => Number(p.participacao_lucro) > 0).map((p, i) => (
                <span key={p.id} className="inline-flex items-center gap-1.5"><span className={cn('size-2.5 rounded-full', cores[i % cores.length])} />{p.nome} · {pct(Number(p.participacao_lucro))}</span>
              ))}
              {distribuido < 100 && <span className="inline-flex items-center gap-1.5 text-texto-suave"><span className="size-2.5 rounded-full bg-creme ring-1 ring-borda" />Livre · {pct(100 - distribuido)}</span>}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,16rem)_1fr] md:items-end">
              <div className="space-y-1.5">
                <label htmlFor="eq-lucro" className="text-[13px] font-semibold text-choco-700">Lucro a dividir (R$)</label>
                <Input id="eq-lucro" inputMode="decimal"
                  value={lucroDigitado ?? String((lucroMesQ.data ?? 0).toFixed(2)).replace('.', ',')}
                  onChange={(e) => setLucroDigitado(e.target.value)} />
                <p className="text-[12.5px] text-texto-suave">
                  {lucroDigitado === null ? 'Lucro líquido deste mês até hoje.' : (
                    <button type="button" className="font-semibold text-cacau-600 hover:underline" onClick={() => setLucroDigitado(null)}>Usar o lucro deste mês</button>
                  )}
                </p>
              </div>
              {totalFixos > 0 && (
                <Interruptor id="eq-desc" marcado={descontarFixos} onChange={setDescontarFixos}
                  rotulo={`Descontar os fixos (${formatarMoeda(totalFixos)}) antes de dividir`}
                  descricao="Desmarque se os salários já foram lançados como despesa no Financeiro." />
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_9rem] gap-4 border-b border-borda bg-creme/50 px-5 py-2.5 text-[11.5px] font-semibold tracking-wide text-texto-suave uppercase md:grid">
              <span>Pessoa</span><span>Como recebe</span><span className="text-right">Recebe na simulação</span>
            </div>
            <ul className="divide-y divide-borda/70">
              {[...ativas, ...inativas].map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => abrir(p)}
                    className={cn('grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors outline-none hover:bg-rosa-50 focus-visible:bg-rosa-50 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_9rem]',
                      !p.ativo && 'opacity-60')}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rosa-100 text-[13px] font-semibold text-cacau-700">{iniciais(p.nome)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold text-choco-800">{p.nome}</span>
                        <span className="flex flex-wrap gap-1">
                          <Badge tom={tomTipo[tipoDe(p)]} className="py-0 text-[11px]">{rotuloTipo[tipoDe(p)]}</Badge>
                          {!p.ativo && <Badge className="py-0 text-[11px]">Inativo</Badge>}
                          {p.ativo && p.user_id && <Badge tom="sucesso" className="py-0 text-[11px]"><KeyRound className="size-3" />Com acesso</Badge>}
                          {p.ativo && !p.user_id && p.email && <Badge tom="alerta" className="py-0 text-[11px]" title={`Libera quando a pessoa criar a conta com ${p.email}`}>Aguardando cadastro</Badge>}
                          <span className="text-[12px] text-texto-suave md:hidden">{descricaoRemuneracao(p)}</span>
                        </span>
                      </span>
                    </span>
                    <span className="hidden text-[13.5px] text-choco-700 md:block">{descricaoRemuneracao(p)}</span>
                    <span className="text-right text-[14px] font-semibold tabular-nums">
                      {p.ativo ? formatarMoeda(recebe(p)) : '—'}
                      {p.ativo && p.remuneracao === 'misto' && (
                        <span className="block text-[11.5px] font-normal text-texto-suave">{formatarMoeda(p.valor_fixo)} + {formatarMoeda(parte(p))}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-creme px-4 py-3 text-[12.5px] text-texto-suave">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cacau-600" aria-hidden />
        Cada perfil de acesso é aplicado diretamente no banco de dados (Row Level Security): mesmo fora do sistema, ninguém vê ou altera o que o seu perfil não permite.
      </p>

      <FormularioPessoa aberto={formAberto} onAbertoChange={setFormAberto} pessoa={editando} pessoas={pessoas} />
    </div>
  )
}
