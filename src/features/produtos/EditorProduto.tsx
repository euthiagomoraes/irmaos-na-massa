import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Cake, ImagePlus, Power, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { enviarImagem, exigir, supabase, type Tabela } from '@/lib/supabase'
import { useAuth, useEmpresa } from '@/contexts/AuthContext'
import { useCategoriasProdutos, useInvalidar, useOpcoesPersonalizacao, useProdutos } from '@/lib/consultas'
import { Button, Campo, Carregando, Input, Select, Textarea } from '@/components/ui'
import { Gaveta, Interruptor, Secao } from '@/components/ui/estrutura'
import { cn, formatarMoeda, lerNumero, mensagemErro, slugificar, unidadesMedida } from '@/lib/utils'
import { gruposOpcao, tiposProduto } from './ProdutosPage'
import { TamanhosEReceitas } from './Receitas'

type Produto = Tabela<'produtos'>

export function EditorProduto({ produtoId, onFechar }: { produtoId: string | null; onFechar: () => void }) {
  const empresa = useEmpresa()
  const { ehGestor } = useAuth()
  const invalidar = useInvalidar()
  const { data: produtos = [], isLoading } = useProdutos()
  const { data: categorias = [] } = useCategoriasProdutos()
  const { data: opcoes = [] } = useOpcoesPersonalizacao()
  const [enviando, setEnviando] = useState(false)
  const arquivo = useRef<HTMLInputElement>(null)
  const p = produtos.find((x) => x.id === produtoId)

  const vinculos = useQuery({
    enabled: !!produtoId,
    queryKey: ['produtos', empresa.id, 'opcoes', produtoId],
    queryFn: async () => exigir(await supabase.from('produtos_opcoes').select('opcao_id').eq('produto_id', produtoId!)).map((x) => x.opcao_id),
  })

  const atualizar = async (campos: Partial<Produto>) => {
    if (!p) return
    const { error } = await supabase.from('produtos').update(campos).eq('id', p.id)
    if (error) return void toast.error(error.code === '23505' ? 'Já existe um produto com este endereço (slug).' : mensagemErro(error))
    await invalidar('produtos')
  }
  const enviarFoto = async (f: File) => {
    if (!p) return
    setEnviando(true)
    try {
      const url = await enviarImagem(empresa.id, 'produtos', f)
      await atualizar({ foto_url: url })
      toast.success('Foto atualizada.')
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setEnviando(false)
    }
  }
  const alternarOpcao = async (opcaoId: string, marcado: boolean) => {
    if (!p) return
    const r = marcado
      ? await supabase.from('produtos_opcoes').insert({ empresa_id: empresa.id, produto_id: p.id, opcao_id: opcaoId })
      : await supabase.from('produtos_opcoes').delete().eq('produto_id', p.id).eq('opcao_id', opcaoId)
    if (r.error) return void toast.error(mensagemErro(r.error))
    await invalidar('produtos')
  }
  const excluir = async () => {
    if (!p || !window.confirm(`Excluir "${p.nome}"? Pedidos antigos mantêm a descrição do item.`)) return
    const { error } = await supabase.from('produtos').delete().eq('id', p.id)
    if (error) return void toast.error(mensagemErro(error))
    await invalidar('produtos')
    onFechar()
  }

  const marcadas = new Set(vinculos.data ?? [])
  const opcoesAtivas = opcoes.filter((o) => o.ativo)

  return (
    <Gaveta aberto={!!produtoId} onFechar={onFechar} largura="max-w-3xl" titulo={p?.nome ?? 'Produto'}
      subtitulo={p ? `${tiposProduto[p.tipo]}${!p.ativo ? ' · Inativo' : ''}` : undefined}
      rodape={p && <>
        {ehGestor && <Button variante="fantasma" tamanho="sm" className="text-erro" onClick={() => void excluir()}><Trash2 className="size-4" />Excluir</Button>}
        <Button variante="contorno" tamanho="sm" className="ml-auto" onClick={() => void atualizar({ ativo: !p.ativo })}><Power className="size-4" />{p.ativo ? 'Inativar' : 'Reativar'}</Button>
      </>}>
      {isLoading || !p ? <Carregando /> : (
        <div key={p.id} className="space-y-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative size-32 overflow-hidden rounded-2xl border border-borda bg-rosa-50">
              {p.foto_url ? <img src={p.foto_url} alt={p.nome} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-rosa-300"><Cake className="size-12" /></div>}
            </div>
            <div className="space-y-2">
              <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviarFoto(f); e.target.value = '' }} />
              <Button variante="contorno" tamanho="sm" carregando={enviando} onClick={() => arquivo.current?.click()}><ImagePlus className="size-4" />{p.foto_url ? 'Trocar foto' : 'Enviar foto'}</Button>
              {p.foto_url && <Button variante="fantasma" tamanho="sm" onClick={() => void atualizar({ foto_url: null })}>Remover foto</Button>}
              <p className="text-[12px] text-texto-suave">JPG, PNG ou WebP · até 5 MB.<br />Aparece na vitrine do site e nos pedidos.</p>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome" htmlFor="ep-nome">
              <Input id="ep-nome" defaultValue={p.nome} onBlur={(e) => e.target.value.trim().length >= 2 && e.target.value.trim() !== p.nome && void atualizar({ nome: e.target.value.trim() })} />
            </Campo>
            <Campo rotulo="Endereço no site" htmlFor="ep-slug" dica="Usado no link da vitrine.">
              <Input id="ep-slug" defaultValue={p.slug} onBlur={(e) => { const s = slugificar(e.target.value); if (s && s !== p.slug) void atualizar({ slug: s }) }} />
            </Campo>
            <Campo rotulo="Tipo" htmlFor="ep-tipo">
              <Select id="ep-tipo" value={p.tipo} onChange={(e) => void atualizar({ tipo: e.target.value })}>
                {Object.entries(tiposProduto).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Campo>
            <Campo rotulo="Categoria" htmlFor="ep-cat">
              <Select id="ep-cat" value={p.categoria_id ?? ''} onChange={(e) => void atualizar({ categoria_id: e.target.value || null })}>
                <option value="">Sem categoria</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </Campo>
            <Campo rotulo="Descrição" htmlFor="ep-desc" className="sm:col-span-2">
              <Textarea id="ep-desc" className="min-h-20" defaultValue={p.descricao ?? ''} onBlur={(e) => e.target.value !== (p.descricao ?? '') && void atualizar({ descricao: e.target.value || null })} />
            </Campo>
          </section>

          <Secao titulo="Venda e produção">
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo rotulo="Vendido por" htmlFor="ep-un">
                <Select id="ep-un" value={p.unidade_venda} onChange={(e) => void atualizar({ unidade_venda: e.target.value })}>
                  {unidadesMedida.map((u) => <option key={u.codigo} value={u.codigo}>{u.nome}</option>)}
                </Select>
              </Campo>
              <Campo rotulo="Pedido mínimo" htmlFor="ep-min">
                <Input id="ep-min" inputMode="decimal" defaultValue={p.quantidade_minima ?? ''} onBlur={(e) => { const s = e.target.value.trim(); const n = lerNumero(s); if (!s) void atualizar({ quantidade_minima: null }); else if (n > 0 && n !== Number(p.quantidade_minima)) void atualizar({ quantidade_minima: n }) }} />
              </Campo>
              <Campo rotulo="Tempo de produção (min)" htmlFor="ep-tempo">
                <Input id="ep-tempo" inputMode="numeric" defaultValue={p.tempo_producao_min ?? ''} onBlur={(e) => { const s = e.target.value.trim(); const n = Math.round(lerNumero(s)); if (!s) void atualizar({ tempo_producao_min: null }); else if (n >= 0 && n !== p.tempo_producao_min) void atualizar({ tempo_producao_min: n }) }} />
              </Campo>
              <Campo rotulo="Preço base (R$)" htmlFor="ep-preco" dica="Usado quando não há tamanhos cadastrados.">
                <Input id="ep-preco" inputMode="decimal" defaultValue={p.preco_sugerido ? String(p.preco_sugerido).replace('.', ',') : ''} onBlur={(e) => { const s = e.target.value.trim(); const n = lerNumero(s); if (!s) void atualizar({ preco_sugerido: null }); else if (n >= 0 && n !== Number(p.preco_sugerido)) void atualizar({ preco_sugerido: n }) }} />
              </Campo>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Interruptor id="ep-pers" marcado={p.personalizavel} onChange={(v) => void atualizar({ personalizavel: v })} rotulo="Personalizável" descricao="Cliente escolhe massa, recheio, tema…" />
              <Interruptor id="ep-cons" marcado={p.preco_sob_consulta} onChange={(v) => void atualizar({ preco_sob_consulta: v })} rotulo="Preço sob consulta" descricao="Não exibe preço no site." />
              <Interruptor id="ep-enc" marcado={p.disponivel_encomenda} onChange={(v) => void atualizar({ disponivel_encomenda: v })} rotulo="Aceita encomendas" />
            </div>
          </Secao>

          <TamanhosEReceitas produto={p} variacoes={p.variacoes} />

          {p.personalizavel && (
            <Secao titulo="Opções disponíveis neste produto">
              {opcoesAtivas.length === 0 ? <p className="text-[13px] text-texto-suave">Cadastre massas, recheios e coberturas na aba “Massas, recheios e coberturas”.</p> : (
                <div className="space-y-3">
                  {Object.entries(gruposOpcao).map(([g, nome]) => {
                    const lista = opcoesAtivas.filter((o) => o.grupo === g)
                    if (!lista.length) return null
                    return (
                      <div key={g}>
                        <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-texto-suave uppercase">{nome}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {lista.map((o) => {
                            const on = marcadas.has(o.id)
                            return (
                              <button key={o.id} type="button" aria-pressed={on} onClick={() => void alternarOpcao(o.id, !on)}
                                className={cn('rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors', on ? 'border-cacau-500 bg-cacau-600 text-white' : 'border-borda bg-white text-choco-700 hover:bg-creme')}>
                                {o.nome}{Number(o.acrescimo) > 0 && ` +${formatarMoeda(o.acrescimo)}`}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  <p className="text-[12px] text-texto-suave">Nenhuma marcada = todas as opções ativas ficam disponíveis no pedido.</p>
                </div>
              )}
            </Secao>
          )}
        </div>
      )}
    </Gaveta>
  )
}
