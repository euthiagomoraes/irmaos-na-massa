import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, KeyRound, ShieldCheck, Wand2 } from 'lucide-react'
import { supabase, type Tabela } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useInvalidar } from '@/lib/consultas'
import { Button, Campo, Input } from '@/components/ui'
import { Interruptor, Modal } from '@/components/ui/estrutura'
import { cn, lerNumero, mensagemErro } from '@/lib/utils'

export type Pessoa = Tabela<'pessoas_equipe'>
export type TipoPessoa = 'socio' | 'colaborador'
export type Remuneracao = 'percentual' | 'fixo' | 'misto'

export const rotuloTipo: Record<TipoPessoa, string> = { socio: 'Sócio', colaborador: 'Colaborador' }
const rotuloRemuneracao: Record<Remuneracao, string> = { percentual: '% do lucro', fixo: 'Valor fixo', misto: 'Fixo + % do lucro' }

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const pctTexto = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

/** Senha provisória legível (sem caracteres ambíguos como 0/O, 1/l). */
function gerarSenha() {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(bytes, (b) => letras[b % letras.length]).join('')
}

/** Cria a conta (login) da pessoa pela Edge Function `criar-acesso`. */
export async function criarAcesso(pessoaId: string, senha: string) {
  const { data, error } = await supabase.functions.invoke('criar-acesso', { body: { pessoa_id: pessoaId, senha } })
  if (error) {
    // Erros da função vêm no corpo da resposta
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(corpo?.erro ?? 'Não foi possível criar o acesso. Verifique se a função "criar-acesso" está publicada no Supabase.')
  }
  return data as { ok: boolean; vinculado: boolean }
}

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
  const { usuario } = useAuth()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoPessoa>('socio')
  const [remuneracao, setRemuneracao] = useState<Remuneracao>('percentual')
  const [pct, setPct] = useState('')
  const [fixo, setFixo] = useState('')
  const [telefone, setTelefone] = useState('')
  const [pix, setPix] = useState('')
  const [email, setEmail] = useState('')
  const [criarLogin, setCriarLogin] = useState(true)
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  const ehVoce = !!pessoa?.user_id && pessoa.user_id === usuario?.id
  const temAcesso = !!pessoa?.user_id

  useEffect(() => {
    if (!aberto) return
    setNome(pessoa?.nome ?? '')
    setTipo(pessoa?.tipo === 'colaborador' ? 'colaborador' : 'socio')
    setRemuneracao((pessoa?.remuneracao as Remuneracao) ?? 'percentual')
    setPct(pessoa && pessoa.participacao_lucro ? pctTexto(Number(pessoa.participacao_lucro)) : '')
    setFixo(pessoa?.valor_fixo ? String(pessoa.valor_fixo).replace('.', ',') : '')
    setTelefone(pessoa?.telefone ?? '')
    setPix(pessoa?.chave_pix ?? '')
    // Primeiro cadastro: sugere o seu próprio e-mail (você também é sócio)
    const primeiro = !pessoa && pessoas.length === 0
    setEmail(pessoa ? (pessoa.email ?? '') : primeiro ? (usuario?.email ?? '') : '')
    setCriarLogin(!primeiro)
    setSenha('')
    setVerSenha(false)
    setAtivo(pessoa?.ativo ?? true)
    setErros({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, pessoa])

  const forma: Remuneracao = tipo === 'colaborador' ? remuneracao : 'percentual'
  const usaPct = forma !== 'fixo'
  const usaFixo = forma !== 'percentual'
  const jaDistribuido = pessoas.filter((p) => p.ativo && p.id !== pessoa?.id).reduce((s, p) => s + Number(p.participacao_lucro), 0)
  const disponivel = Math.max(0, 100 - jaDistribuido)
  const emailLimpo = email.trim().toLowerCase()
  const emailMudou = emailLimpo !== (pessoa?.email ?? '')
  // A conta só pode ser criada para quem ainda não tem acesso (ou trocou o e-mail)
  const podeCriarLogin = !!emailLimpo && ativo && (!temAcesso || emailMudou) && emailLimpo !== usuario?.email?.toLowerCase()
  const vaiCriarLogin = podeCriarLogin && criarLogin

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    const n = usaPct ? lerNumero(pct) : 0
    const f = usaFixo ? lerNumero(fixo) : null
    const novos: Record<string, string> = {}
    if (nome.trim().length < 2) novos.nome = 'Informe o nome'
    if (usaPct) {
      if (Number.isNaN(n) || n <= 0) novos.pct = 'Informe um percentual maior que zero'
      else if (n > 100) novos.pct = 'Máximo de 100%'
      else if (ativo && n > disponivel + 1e-9) novos.pct = `Disponível para distribuir: ${pctTexto(disponivel)}%`
    }
    if (usaFixo && (f === null || Number.isNaN(f) || f <= 0)) novos.fixo = 'Informe o valor mensal'
    if (emailLimpo && !EMAIL_VALIDO.test(emailLimpo)) novos.email = 'E-mail inválido'
    if (vaiCriarLogin && senha.length < 8) novos.senha = 'A senha precisa ter pelo menos 8 caracteres'
    setErros(novos)
    if (Object.keys(novos).length) return

    const dados = {
      nome: nome.trim(), tipo, remuneracao: forma,
      participacao_lucro: usaPct ? Math.round(n * 100) / 100 : 0,
      valor_fixo: usaFixo ? f : null,
      telefone: telefone.trim() || null, chave_pix: pix.trim() || null, email: emailLimpo || null, ativo,
    }
    setSalvando(true)
    try {
      const r = pessoa
        ? await supabase.from('pessoas_equipe').update(dados).eq('id', pessoa.id).select('id, user_id').single()
        : await supabase.from('pessoas_equipe').insert({ ...dados, empresa_id: empresa.id }).select('id, user_id').single()
      if (r.error) return void toast.error(r.error.code === '23505' ? 'Este e-mail já está no cadastro de outra pessoa.' : mensagemErro(r.error))

      const base = pessoa ? 'Cadastro atualizado.' : `${rotuloTipo[tipo]} cadastrado.`
      if (!dados.email) toast.success(base)
      else if (r.data.user_id) toast.success(`${base} Acesso liberado como ${rotuloTipo[tipo]}.`)
      else if (vaiCriarLogin) {
        try {
          await criarAcesso(r.data.id, senha)
          toast.success(`${base} Acesso criado: ${dados.email}. Passe a senha para a pessoa.`, { duration: 8000 })
        } catch (err) {
          toast.error(`${base} Mas o acesso não foi criado: ${mensagemErro(err)}`, { duration: 10000 })
        }
      } else toast.success(`${base} O acesso será liberado quando a pessoa criar a conta com ${dados.email}.`)

      await invalidar('pessoas_equipe', 'equipe')
      onAbertoChange(false)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} largura="max-w-lg" onSubmit={salvar}
      titulo={pessoa ? `Editar ${pessoa.nome}` : 'Nova pessoa'}
      descricao="Parte no lucro e acesso ao sistema, tudo no mesmo cadastro."
      rodape={<><Button variante="fantasma" onClick={() => onAbertoChange(false)}>Cancelar</Button><Button type="submit" carregando={salvando}>{pessoa ? 'Salvar' : 'Cadastrar'}</Button></>}>
      <div className="space-y-4">
        <Campo rotulo="Nome" htmlFor="pe-nome" obrigatorio erro={erros.nome}>
          <Input id="pe-nome" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={!!erros.nome} />
        </Campo>

        <Campo rotulo="Função" dica={ehVoce ? 'Você não pode alterar a sua própria função.' : undefined}>
          <fieldset disabled={ehVoce}>
            <Escolha rotulo="Função" valor={tipo} onChange={setTipo}
              opcoes={(['socio', 'colaborador'] as TipoPessoa[]).map((id) => ({ id, rotulo: rotuloTipo[id] }))} />
          </fieldset>
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

        {/* ------------------------------------------------ Acesso ao sistema */}
        <section className="space-y-3 rounded-2xl border border-borda p-4" aria-labelledby="pe-acesso-titulo">
          <div className="flex items-start gap-2">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-cacau-600" aria-hidden />
            <div>
              <h3 id="pe-acesso-titulo" className="text-[14px] font-semibold text-choco-800">Acesso ao sistema</h3>
              <p className="text-[12.5px] text-texto-suave">
                {tipo === 'socio' ? 'Sócio: acesso total, incluindo financeiro e divisão do lucro.' : 'Colaborador: pedidos, clientes, estoque e produtos.'}
              </p>
            </div>
          </div>

          <Campo rotulo="E-mail de login" htmlFor="pe-email" erro={erros.email}
            dica={ehVoce ? 'Este é o seu login e não pode ser alterado aqui.' : 'Deixe em branco para não dar acesso.'}>
            <Input id="pe-email" type="email" autoComplete="off" value={email} disabled={ehVoce}
              onChange={(e) => setEmail(e.target.value)} aria-invalid={!!erros.email} />
          </Campo>

          {temAcesso && !emailMudou && (
            <p className="flex items-center gap-2 rounded-xl bg-sucesso-fundo px-3 py-2 text-[12.5px] font-medium text-sucesso">
              <ShieldCheck className="size-4" aria-hidden />{ehVoce ? 'Este é você. Acesso ativo.' : 'Já tem acesso ao sistema com este e-mail.'}
            </p>
          )}

          {podeCriarLogin && (
            <>
              <Interruptor id="pe-criar" marcado={criarLogin} onChange={setCriarLogin} rotulo="Criar o login agora com uma senha inicial"
                descricao="Você define a senha e passa para a pessoa. Desmarcado, ela mesma cria a conta com este e-mail e o acesso é liberado sozinho." />
              {criarLogin && (
                <Campo rotulo="Senha inicial" htmlFor="pe-senha" obrigatorio erro={erros.senha}
                  dica={erros.senha ? undefined : 'Mínimo de 8 caracteres. A pessoa pode trocar depois em “Esqueci a senha”.'}
                  acao={<button type="button" onClick={() => { setSenha(gerarSenha()); setVerSenha(true) }}
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-cacau-600 hover:underline"><Wand2 className="size-3.5" />Gerar</button>}>
                  <div className="relative">
                    <Input id="pe-senha" type={verSenha ? 'text' : 'password'} autoComplete="new-password" value={senha}
                      onChange={(e) => setSenha(e.target.value)} aria-invalid={!!erros.senha} className="pr-10" />
                    <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-cinza hover:text-choco-700">
                      {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Campo>
              )}
            </>
          )}
        </section>

        {pessoa && !ehVoce && (
          <Interruptor id="pe-ativo" marcado={ativo} onChange={setAtivo} rotulo="Ativo"
            descricao="Desative quem saiu da sociedade ou da equipe: o acesso ao sistema é retirado e a parte no lucro volta a ficar disponível." />
        )}
      </div>
    </Modal>
  )
}
