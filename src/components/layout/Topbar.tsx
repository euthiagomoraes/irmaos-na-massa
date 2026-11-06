import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import * as Popover from '@radix-ui/react-popover'
import * as Menu from '@radix-ui/react-dropdown-menu'
import {
  Menu as MenuIcon, Search, Bell, Plus, LogOut, Settings, Building2, Check, ClipboardList, UserRound, Cake, Package,
  AlertTriangle, CalendarClock, Gift, Inbox, Loader2, CircleAlert,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth, useEmpresa, nomesPapeis } from '@/contexts/AuthContext'
import { Badge, Dica } from '@/components/ui'
import { cn, iniciais, mensagemErro } from '@/lib/utils'
import { toast } from 'sonner'

/* ------------------------------------------------------------ Busca global */
const iconesBusca = { cliente: UserRound, pedido: ClipboardList, produto: Cake, insumo: Package } as const
const rotasBusca: Record<string, string> = { cliente: '/clientes', pedido: '/pedidos', produto: '/produtos', insumo: '/estoque' }
const rotulosBusca: Record<string, string> = { cliente: 'Clientes', pedido: 'Pedidos', produto: 'Produtos', insumo: 'Insumos' }

function BuscaGlobal({ aberta, onAbertaChange }: { aberta: boolean; onAbertaChange: (v: boolean) => void }) {
  const empresa = useEmpresa()
  const navigate = useNavigate()
  const [termo, setTermo] = useState('')
  const [debounced, setDebounced] = useState('')
  const [ativo, setAtivo] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(termo.trim()), 220)
    return () => clearTimeout(t)
  }, [termo])
  useEffect(() => { if (!aberta) { setTermo(''); setDebounced('') } }, [aberta])

  const { data, isFetching, error } = useQuery({
    queryKey: ['busca', empresa.id, debounced],
    enabled: debounced.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('busca_global', { p_empresa: empresa.id, p_termo: debounced })
      if (error) throw error
      return data
    },
    staleTime: 15_000,
  })
  const resultados = useMemo(() => data ?? [], [data])
  useEffect(() => setAtivo(0), [resultados])

  const abrir = (tipo: string) => {
    onAbertaChange(false)
    navigate(rotasBusca[tipo] ?? '/')
  }

  return (
    <Dialog.Root open={aberta} onOpenChange={onAbertaChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-choco-900/25 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-borda bg-white shadow-elevada animate-surgir">
          <Dialog.Title className="sr-only">Pesquisa global</Dialog.Title>
          <Dialog.Description className="sr-only">Pesquise clientes, pedidos, produtos e insumos</Dialog.Description>
          <div className="flex items-center gap-3 border-b border-borda px-4">
            <Search className="size-[18px] text-choco-500" aria-hidden />
            <input
              autoFocus
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(a + 1, resultados.length - 1)) }
                if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)) }
                if (e.key === 'Enter' && resultados[ativo]) abrir(resultados[ativo].tipo)
              }}
              placeholder="Buscar clientes, pedidos (#número), produtos, insumos…"
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-cinza"
              aria-label="Termo de pesquisa"
            />
            {isFetching && <Loader2 className="size-4 animate-spin text-cacau-500" aria-hidden />}
          </div>
          <div className="rolagem-fina max-h-[55vh] overflow-y-auto p-2" role="listbox">
            {debounced.length < 2 ? (
              <p className="px-3 py-8 text-center text-[13px] text-texto-suave">Digite ao menos 2 letras para pesquisar.</p>
            ) : error ? (
              <p className="px-3 py-8 text-center text-[13px] text-erro">{mensagemErro(error)}</p>
            ) : !isFetching && resultados.length === 0 ? (
              <p className="px-3 py-8 text-center text-[13px] text-texto-suave">Nenhum resultado para “{debounced}”.</p>
            ) : (
              resultados.map((r, i) => {
                const Icone = iconesBusca[r.tipo as keyof typeof iconesBusca] ?? Search
                const cabecalho = i === 0 || resultados[i - 1].tipo !== r.tipo
                return (
                  <div key={`${r.tipo}-${r.id}`}>
                    {cabecalho && <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-texto-suave uppercase">{rotulosBusca[r.tipo]}</p>}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === ativo}
                      onMouseEnter={() => setAtivo(i)}
                      onClick={() => abrir(r.tipo)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', i === ativo && 'bg-rosa-100/70')}
                    >
                      <span className="grid size-8 place-items-center rounded-lg bg-creme text-cacau-600"><Icone className="size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-choco-800">{r.titulo}</span>
                        {r.subtitulo && <span className="block truncate text-[12.5px] text-texto-suave">{r.subtitulo}</span>}
                      </span>
                    </button>
                  </div>
                )
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t border-borda bg-creme/60 px-4 py-2 text-[11.5px] text-texto-suave">
            <span>↑↓ navegar · Enter abrir · Esc fechar</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ------------------------------------------------------------ Notificações */
interface Notificacao { tipo: string; nivel: 'info' | 'alerta' | 'critico'; id: string; titulo: string; descricao: string; rota: string }
const iconesNotif: Record<string, typeof Bell> = {
  estoque_baixo: Package, validade: AlertTriangle, entrega: CalendarClock, conta_vencida: CircleAlert, solicitacao: Inbox, aniversario: Gift,
}

function Notificacoes() {
  const empresa = useEmpresa()
  const { data, isLoading, error } = useQuery({
    queryKey: ['notificacoes', empresa.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('notificacoes', { p_empresa: empresa.id })
      if (error) throw error
      return (data as unknown as Notificacao[]) ?? []
    },
    refetchInterval: 60_000,
  })
  const lista = data ?? []
  const urgentes = lista.filter((n) => n.nivel !== 'info').length

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" aria-label={`Notificações${lista.length ? ` (${lista.length})` : ''}`} className="relative grid size-10 place-items-center rounded-xl text-choco-700 hover:bg-white">
          <Bell className="size-[19px]" />
          {lista.length > 0 && (
            <span className={cn('absolute top-1.5 right-1.5 grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] leading-[18px] font-bold text-white ring-2 ring-creme', urgentes ? 'bg-erro' : 'bg-cacau-600')}>
              {lista.length > 9 ? '9+' : lista.length}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-[min(380px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-borda bg-white shadow-elevada animate-surgir">
          <div className="flex items-center justify-between border-b border-borda px-4 py-3">
            <p className="font-display font-semibold">Notificações</p>
            {lista.length > 0 && <Badge tom={urgentes ? 'erro' : 'info'}>{lista.length}</Badge>}
          </div>
          <div className="rolagem-fina max-h-[60vh] overflow-y-auto p-2">
            {isLoading ? (
              <p className="flex items-center justify-center gap-2 py-8 text-[13px] text-texto-suave"><Loader2 className="size-4 animate-spin" />Carregando…</p>
            ) : error ? (
              <p className="py-8 text-center text-[13px] text-erro">{mensagemErro(error)}</p>
            ) : lista.length === 0 ? (
              <div className="py-10 text-center">
                <Check className="mx-auto mb-2 size-6 text-sucesso" />
                <p className="text-sm font-semibold text-choco-800">Tudo em dia!</p>
                <p className="text-[12.5px] text-texto-suave">Nenhum alerta de estoque, validade, entregas ou contas.</p>
              </div>
            ) : (
              lista.map((n) => {
                const Icone = iconesNotif[n.tipo] ?? Bell
                return (
                  <Popover.Close asChild key={`${n.tipo}-${n.id}`}>
                    <Link to={n.rota} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-creme">
                      <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                        n.nivel === 'critico' ? 'bg-erro-fundo text-erro' : n.nivel === 'alerta' ? 'bg-alerta-fundo text-alerta' : 'bg-rosa-100 text-cacau-600')}>
                        <Icone className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-choco-800">{n.titulo}</span>
                        <span className="block text-[12.5px] text-texto-suave">{n.descricao}</span>
                      </span>
                    </Link>
                  </Popover.Close>
                )
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/* ------------------------------------------------------------ Menu do usuário */
function MenuUsuario() {
  const { perfil, usuario, papel, vinculos, empresa, trocarEmpresa, sair } = useAuth()
  const navigate = useNavigate()
  const nome = perfil?.nome || usuario?.email || ''
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button type="button" className="flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 hover:bg-white" aria-label="Menu do perfil">
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-rosa-300 to-dourado-300 text-[13px] font-bold text-cacau-800">
            {iniciais(nome)}
          </span>
          <span className="hidden text-left leading-tight md:block">
            <span className="block max-w-[140px] truncate text-[13px] font-semibold text-choco-800">{perfil?.nome || 'Meu perfil'}</span>
            <span className="block text-[11.5px] text-texto-suave">{papel ? nomesPapeis[papel] : ''}</span>
          </span>
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={8} className="z-50 w-64 rounded-2xl border border-borda bg-white p-1.5 shadow-elevada animate-surgir">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-choco-800">{perfil?.nome || 'Sem nome'}</p>
            <p className="truncate text-[12.5px] text-texto-suave">{usuario?.email}</p>
          </div>
          <Menu.Separator className="my-1 h-px bg-borda" />
          {vinculos.length > 1 && (
            <>
              <Menu.Label className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-texto-suave uppercase">Empresa</Menu.Label>
              {vinculos.map((v) => (
                <Menu.Item
                  key={v.empresa.id}
                  onSelect={() => { if (v.empresa.id !== empresa?.id) trocarEmpresa(v.empresa.id).catch((e) => toast.error(mensagemErro(e))) }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-choco-800 outline-none data-[highlighted]:bg-creme"
                >
                  <Building2 className="size-4 text-choco-500" />
                  <span className="flex-1 truncate">{v.empresa.nome}</span>
                  {v.empresa.id === empresa?.id && <Check className="size-4 text-cacau-600" />}
                </Menu.Item>
              ))}
              <Menu.Separator className="my-1 h-px bg-borda" />
            </>
          )}
          <Menu.Item onSelect={() => navigate('/configuracoes')} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-choco-800 outline-none data-[highlighted]:bg-creme">
            <Settings className="size-4 text-choco-500" /> Configurações
          </Menu.Item>
          <Menu.Item onSelect={() => void sair()} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-erro outline-none data-[highlighted]:bg-erro-fundo">
            <LogOut className="size-4" /> Sair
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

/* ------------------------------------------------------------ Topbar */
export function Topbar({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const [buscaAberta, setBuscaAberta] = useState(false)
  const atalho = useRef(typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscaAberta((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-borda/60 bg-creme/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 lg:px-8">
        <button type="button" onClick={onAbrirMenu} className="grid size-10 place-items-center rounded-xl text-choco-700 hover:bg-white lg:hidden" aria-label="Abrir menu">
          <MenuIcon className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => setBuscaAberta(true)}
          className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-borda bg-white/80 px-3.5 text-left text-sm text-cinza transition hover:border-borda-forte hover:bg-white sm:max-w-md"
        >
          <Search className="size-4 shrink-0 text-choco-500" aria-hidden />
          <span className="truncate">Pesquisar…</span>
          <kbd className="ml-auto hidden rounded-md border border-borda bg-creme px-1.5 py-0.5 font-sans text-[11px] text-texto-suave sm:inline">{atalho.current}</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <Dica conteudo="O cadastro de pedidos chega na Fase 4">
              <span tabIndex={0}>
                <button type="button" disabled className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-cacau-600 px-3.5 text-[13px] font-semibold text-white opacity-50">
                  <Plus className="size-4" /> Novo pedido
                </button>
              </span>
            </Dica>
            <Dica conteudo="O cadastro de clientes chega na Fase 2">
              <span tabIndex={0}>
                <button type="button" disabled className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-borda-forte bg-white px-3.5 text-[13px] font-semibold text-choco-800 opacity-50">
                  <UserRound className="size-4" /> Novo cliente
                </button>
              </span>
            </Dica>
          </div>
          <Notificacoes />
          <MenuUsuario />
        </div>
      </div>
      <BuscaGlobal aberta={buscaAberta} onAbertaChange={setBuscaAberta} />
    </header>
  )
}
