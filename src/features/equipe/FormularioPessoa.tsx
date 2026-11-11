import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase, type Tabela } from '@/lib/supabase'
import { useEmpresa } from '@/contexts/AuthContext'
import { useInvalidar } from '@/lib/consultas'
import { Button, Campo, Input } from '@/components/ui'
import { Interruptor, Modal } from '@/components/ui/estrutura'
import { cn, lerNumero, mensagemErro } from '@/lib/utils'

export type Pessoa = Tabela<'pessoas_equipe'>
export type TipoPessoa = 'proprietario' | 'socio' | 'colaborador'
export type Remuneracao = 'percentual' | 'fixo' | 'misto'

export const rotuloTipo: Record<TipoPessoa, string> = { proprietario: 'Proprietário', socio: 'Sócio', colaborador: 'Colaborador' }
const rotuloRemuneracao: Record<Remuneracao, string> = { percentual: '% do lucro', fixo: 'Valor fixo', misto: 'Fixo + % do lucro' }

const pctTexto = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

/** Botões de escolha única (type="button" para não enviar o formulário). */
function Escolha<T extends string>({ opcoes, valor, onChange, rotulo }: { opcoes: { id: T; rotulo: string }[]; valor: T; onChange: (v: T) => void; rotulo: string }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => onChange(o.id)}
          className={cn('inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors',
            valor === o.id ? 'bg-cacau-600 text-white' : 'bg-creme text-choco-700 hover:bg-rosa-100')}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export function FormularioPessoa({ aberto, onAbertoChange, pessoa, pessoas }: {
  aberto: boolean; onAbertoChange: (v: boolean) => void; pessoa: Pessoa | null; pessoas: Pessoa[]
}) {
  const empresa = useEmpresa()
  const invalidar = useInvalidar()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoPessoa>('socio')
  const [remuneracao, setRemuneracao] = useState<Remuneracao>('percentual')
  const [pct, setPct] = useState('')
  const [fixo, setFixo] = useState('')
  const [telefone, setTelefone] = useState('')
  const [pix, setPix] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  const temProprietario = pessoas.some((p) => p.ativo && p.tipo === 'proprietario' && p.id !== pessoa?.id)

  useEffect(() => {
    if (!aberto) return
    setNome(pessoa?.nome ?? '')
    setTipo((pessoa?.tipo as TipoPessoa) ?? (temProprietario ? 'socio' : 'proprietario'))
    setRemuneracao((pessoa?.remuneracao as Remuneracao) ?? 'percentual')
    setPct(pessoa && pessoa.participacao_lucro ? pctTexto(Number(pessoa.participacao_lucro)) : '')
    setFixo(pessoa?.valor_fixo ? String(pessoa.valor_fixo).replace('.', ',') : '')
    setTelefone(pessoa?.telefone ?? '')
    setPix(pessoa?.chave_pix ?? '')
    setAtivo(pessoa?.ativo ?? true)
    setErros({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, pessoa])

  const forma: Remuneracao = tipo === 'colaborador' ? remuneracao : 'percentual'
  const usaPct = forma !== 'fixo'
  const usaFixo = forma !== 'percentual'
  const jaDistribuido = pessoas.filter((p) => p.ativo && p.id !== pessoa?.id).reduce((s, p) => s + Number(p.participacao_lucro), 0)
  const disponivel = Math.max(0, 100 - jaDistribuido)

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    const n = usaPct ? lerNumero(pct) : 0
    const f = usaFixo ? lerNumero(fixo) : null
    const novos: Record<string, string> = {}
    if (nome.trim().length < 2) novos.nome = 'Informe o nome'
    if (tipo === 'proprietario' && temProprietario) novos.tipo = 'Já existe um proprietário ativo.'
    if (usaPct) {
      if (Number.isNaN(n) || n <= 0) novos.pct = 'Informe um percentual maior que zero'
      else if (n > 100) novos.pct = 'Máximo de 100%'
      else if (ativo && n > disponivel + 1e-9) novos.pct = `Disponível para distribuir: ${pctTexto(disponivel)}%`
    }
    if (usaFixo && (f === null || Number.isNaN(f) || f <= 0)) novos.fixo = 'Informe o valor mensal'
    setErros(novos)
    if (Object.keys(novos).length) return

    const dados = {
      nome: nome.trim(), tipo, remuneracao: forma,
      participacao_lucro: usaPct ? Math.round(n * 100) / 100 : 0,
      valor_fixo: usaFixo ? f : null,
      telefone: telefone.trim() || null, chave_pix: pix.trim() || null, ativo,
    }
    setSalvando(true)
    const r = pessoa
      ? await supabase.from('pessoas_equipe').update(dados).eq('id', pessoa.id)
      : await supabase.from('pessoas_equipe').insert({ ...dados, empresa_id: empresa.id })
    setSalvando(false)
    if (r.error) return void toast.error(r.error.code === '23505' ? 'Já existe um proprietário ativo.' : mensagemErro(r.error))
    await invalidar('pessoas_equipe')
    toast.success(pessoa ? 'Cadastro atualizado.' : `${rotuloTipo[tipo]} cadastrado.`)
    onAbertoChange(false)
  }

  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} largura="max-w-lg" onSubmit={salvar}
      titulo={pessoa ? `Editar ${pessoa.nome}` : 'Nova pessoa'}
      descricao="Sócios e colaboradores com a parte de cada um no lucro."
      rodape={<><Button variante="fantasma" onClick={() => onAbertoChange(false)}>Cancelar</Button><Button type="submit" carregando={salvando}>{pessoa ? 'Salvar' : 'Cadastrar'}</Button></>}>
      <div className="space-y-4">
        <Campo rotulo="Nome" htmlFor="pe-nome" obrigatorio erro={erros.nome}>
          <Input id="pe-nome" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={!!erros.nome} />
        </Campo>

        <Campo rotulo="Função" erro={erros.tipo}>
          <Escolha rotulo="Função" valor={tipo} onChange={setTipo}
            opcoes={(['proprietario', 'socio', 'colaborador'] as TipoPessoa[]).map((id) => ({ id, rotulo: rotuloTipo[id] }))} />
        </Campo>

        {tipo === 'colaborador' && (
          <Campo rotulo="Como recebe">
            <Escolha rotulo="Como recebe" valor={remuneracao} onChange={setRemuneracao}
              opcoes={(['percentual', 'fixo', 'misto'] as Remuneracao[]).map((id) => ({ id, rotulo: rotuloRemuneracao[id] }))} />
          </Campo>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {usaPct && (
            <Campo rotulo="Participação no lucro (%)" htmlFor="pe-pct" obrigatorio erro={erros.pct}
              dica={erros.pct ? undefined : `Disponível: ${pctTexto(disponivel)}% de 100%`}>
              <Input id="pe-pct" inputMode="decimal" placeholder="Ex.: 30" value={pct} onChange={(e) => setPct(e.target.value)} aria-invalid={!!erros.pct} />
            </Campo>
          )}
          {usaFixo && (
            <Campo rotulo="Valor fixo por mês (R$)" htmlFor="pe-fixo" obrigatorio erro={erros.fixo}>
              <Input id="pe-fixo" inputMode="decimal" placeholder="0,00" value={fixo} onChange={(e) => setFixo(e.target.value)} aria-invalid={!!erros.fixo} />
            </Campo>
          )}
          <Campo rotulo="WhatsApp" htmlFor="pe-tel"><Input id="pe-tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Campo>
          <Campo rotulo="Chave PIX" htmlFor="pe-pix"><Input id="pe-pix" value={pix} onChange={(e) => setPix(e.target.value)} /></Campo>
        </div>

        {pessoa && (
          <Interruptor id="pe-ativo" marcado={ativo} onChange={setAtivo} rotulo="Ativo"
            descricao="Desative quem saiu da sociedade ou da equipe; a parte dele volta a ficar disponível." />
        )}
      </div>
    </Modal>
  )
}
