import { format } from 'date-fns'
import type { Tabela } from '@/lib/supabase'
import type { Empresa } from '@/contexts/AuthContext'
import { dataLocal, formatarMoeda, formatarQuantidade } from '@/lib/utils'
import { formatarTelefone } from '@/features/clientes/utils'
import { formatarEndereco, rotulosStatus } from './utils'
import type { ItemPedido, Pedido } from './EditorPedido'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Abre o comprovante do pedido numa nova janela pronta para imprimir ou salvar em PDF. */
export function imprimirComprovante({ empresa, pedido: p, itens, pagamentos, cliente, formas }: {
  empresa: Empresa
  pedido: Pedido
  itens: ItemPedido[]
  pagamentos: Tabela<'pagamentos'>[]
  cliente?: { nome: string; whatsapp: string | null; telefone: string | null } | null
  formas: Tabela<'formas_pagamento'>[]
}) {
  const w = window.open('', '_blank', 'width=720,height=900')
  if (!w) return
  const orcamento = p.status === 'orcamento' || p.status === 'aguardando_confirmacao'
  const end = (empresa.endereco ?? {}) as Record<string, string>
  const linhasItens = itens.map((i) => `
    <tr>
      <td>${esc(i.descricao)}${i.personalizacoes.length ? `<div class="sub">${i.personalizacoes.map((x) => `${esc(x.grupo)}: ${esc(x.descricao)}`).join(' · ')}</div>` : ''}${i.observacoes ? `<div class="sub">${esc(i.observacoes)}</div>` : ''}</td>
      <td class="n">${esc(formatarQuantidade(i.quantidade))}</td>
      <td class="n">${esc(formatarMoeda(Number(i.preco_unitario) + Number(i.acrescimos)))}</td>
      <td class="n">${esc(formatarMoeda(i.total))}</td>
    </tr>`).join('')
  const linhasPag = pagamentos.map((x) => `<tr><td>${esc(format(dataLocal(x.data_pagamento), 'dd/MM/yyyy'))} · ${esc(x.tipo)}${x.forma_pagamento_id ? ` · ${esc(formas.find((f) => f.id === x.forma_pagamento_id)?.nome)}` : ''}</td><td class="n">${esc(formatarMoeda(x.valor))}</td></tr>`).join('')

  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${orcamento ? 'Orçamento' : 'Pedido'} #${p.numero} · ${esc(empresa.nome)}</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#3a2016;margin:0;padding:32px;font-size:13px}
  header{display:flex;gap:16px;align-items:center;border-bottom:2px solid #E2AB75;padding-bottom:14px;margin-bottom:18px}
  header img{width:64px;height:64px;border-radius:50%;object-fit:cover} h1{font-size:20px;margin:0;color:#7C350A} h2{font-size:14px;margin:18px 0 6px;color:#7C350A}
  .muted{color:#7a6560} .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px} table{width:100%;border-collapse:collapse}
  td,th{padding:6px 4px;border-bottom:1px solid #eee;text-align:left;vertical-align:top} th{font-size:11px;text-transform:uppercase;color:#7a6560}
  .n{text-align:right;white-space:nowrap} .sub{font-size:11.5px;color:#7a6560} .tot td{border:0;padding:3px 4px} .tot .g td{font-size:16px;font-weight:700;border-top:2px solid #3a2016}
  .box{background:#FEF1E0;border-radius:10px;padding:10px 12px;margin-top:14px} footer{margin-top:28px;font-size:11.5px;color:#7a6560;text-align:center}
  @media print{body{padding:0} button{display:none}}
</style></head><body>
<header>
  <img src="${esc(empresa.logo_url || `${location.origin}/logo.webp`)}" alt="">
  <div><h1>${esc(empresa.nome_fantasia || empresa.nome)}</h1>
  <div class="muted">${[empresa.whatsapp && `WhatsApp ${formatarTelefone(empresa.whatsapp)}`, empresa.instagram, formatarEndereco(end)].filter(Boolean).map(esc).join(' · ')}</div></div>
  <div style="margin-left:auto;text-align:right"><strong style="font-size:16px">${orcamento ? 'Orçamento' : 'Pedido'} #${p.numero}</strong><div class="muted">${esc(rotulosStatus[p.status])}</div><div class="muted">${esc(format(new Date(p.created_at), 'dd/MM/yyyy'))}</div></div>
</header>
<div class="grid">
  <div><span class="muted">Cliente</span><br><strong>${esc(cliente?.nome ?? 'Não informado')}</strong>${cliente?.whatsapp || cliente?.telefone ? `<br>${esc(formatarTelefone(cliente.whatsapp ?? cliente.telefone))}` : ''}</div>
  <div><span class="muted">${p.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada'}</span><br><strong>${p.data_entrega ? esc(format(dataLocal(p.data_entrega), 'dd/MM/yyyy')) : 'A combinar'}${p.horario_entrega ? ` às ${esc(p.horario_entrega.slice(0, 5))}` : ''}</strong>
  ${p.tipo_entrega === 'entrega' && formatarEndereco(p.endereco_entrega) ? `<br>${esc(formatarEndereco(p.endereco_entrega))}` : ''}</div>
</div>
<h2>Itens</h2>
<table><thead><tr><th>Descrição</th><th class="n">Qtd.</th><th class="n">Unit.</th><th class="n">Total</th></tr></thead><tbody>${linhasItens || '<tr><td colspan="4" class="muted">Sem itens</td></tr>'}</tbody></table>
<table class="tot" style="margin-top:8px;width:50%;margin-left:auto">
  <tr><td>Subtotal</td><td class="n">${esc(formatarMoeda(p.subtotal))}</td></tr>
  ${Number(p.desconto) > 0 ? `<tr><td>Desconto</td><td class="n">- ${esc(formatarMoeda(p.desconto))}</td></tr>` : ''}
  ${Number(p.taxa_entrega) > 0 ? `<tr><td>Entrega</td><td class="n">${esc(formatarMoeda(p.taxa_entrega))}</td></tr>` : ''}
  <tr class="g"><td>Total</td><td class="n">${esc(formatarMoeda(p.total))}</td></tr>
  ${Number(p.valor_pago) > 0 ? `<tr><td>Pago</td><td class="n">${esc(formatarMoeda(p.valor_pago))}</td></tr><tr><td><strong>Restante</strong></td><td class="n"><strong>${esc(formatarMoeda(Math.max(Number(p.saldo), 0)))}</strong></td></tr>` : ''}
</table>
${linhasPag ? `<h2>Pagamentos</h2><table>${linhasPag}</table>` : ''}
${p.observacoes ? `<div class="box"><strong>Observações</strong><br>${esc(p.observacoes).replace(/\n/g, '<br>')}</div>` : ''}
${orcamento && p.validade_orcamento ? `<p class="muted">Orçamento válido até ${esc(format(dataLocal(p.validade_orcamento), 'dd/MM/yyyy'))}.</p>` : ''}
<footer>Obrigado pela preferência! ♥</footer>
<p style="text-align:center;margin-top:16px"><button onclick="window.print()" style="padding:10px 18px;border-radius:10px;border:0;background:#7C350A;color:#fff;font-weight:600;cursor:pointer">Imprimir / salvar PDF</button></p>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`)
  w.document.close()
}
