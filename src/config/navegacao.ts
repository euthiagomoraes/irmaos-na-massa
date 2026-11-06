import {
  LayoutDashboard, ClipboardList, CalendarHeart, Cake, NotebookPen, Package, Users, Gift, Wallet, BarChart3, Settings, Globe,
  type LucideIcon,
} from 'lucide-react'

export interface ItemNavegacao {
  rota: string
  rotulo: string
  icone: LucideIcon
  /** Fase do plano em que o módulo é entregue. */
  fase: number
  descricao: string
  recursos: string[]
}

export const FASE_ATUAL = 1

export const navegacao: ItemNavegacao[] = [
  { rota: '/', rotulo: 'Visão geral', icone: LayoutDashboard, fase: 1, descricao: 'Indicadores do negócio em tempo real.', recursos: [] },
  {
    rota: '/pedidos', rotulo: 'Pedidos', icone: ClipboardList, fase: 4,
    descricao: 'Orçamentos, encomendas personalizadas e acompanhamento da produção até a entrega.',
    recursos: ['Orçamento → pedido com um clique', 'Personalizações (massa, recheio, cobertura, tema)', 'Pagamentos parciais e sinal', 'Baixa automática de insumos pela ficha técnica', 'Comprovante para impressão', 'Solicitações recebidas pelo site'],
  },
  {
    rota: '/agenda', rotulo: 'Agenda', icone: CalendarHeart, fase: 4,
    descricao: 'Calendário de entregas e retiradas com a carga de produção de cada dia.',
    recursos: ['Visão diária, semanal e mensal', 'Entregas e retiradas por horário', 'Alerta de antecedência mínima'],
  },
  {
    rota: '/produtos', rotulo: 'Produtos', icone: Cake, fase: 2,
    descricao: 'Cardápio completo com variações de tamanho, faixas de recheio e opções de personalização.',
    recursos: ['Bolos, docinhos, doces finos, cupcakes, mini bolos e kits', 'Variações com preço próprio (ex.: 15 cm · Especial)', 'Massas, recheios e coberturas do cardápio', 'Fotos e publicação na vitrine do site'],
  },
  {
    rota: '/fichas', rotulo: 'Fichas técnicas', icone: NotebookPen, fase: 3,
    descricao: 'Receitas com custo calculado automaticamente a partir do estoque.',
    recursos: ['Subpreparações (massas, recheios, coberturas)', 'Custo de ingredientes, embalagem e mão de obra', 'Formação de preço e margem', 'Histórico de custos preservado'],
  },
  {
    rota: '/estoque', rotulo: 'Insumos e estoque', icone: Package, fase: 2,
    descricao: 'Controle de ingredientes, embalagens e materiais com lotes e validade.',
    recursos: ['Entradas, saídas e ajustes com histórico', 'Conversão kg/g, l/ml, unidade e medidas caseiras', 'Lotes com consumo do que vence primeiro', 'Alertas de estoque mínimo e validade', 'Fornecedores e compras'],
  },
  {
    rota: '/clientes', rotulo: 'Clientes', icone: Users, fase: 2,
    descricao: 'Ficha completa de cada cliente com histórico e preferências.',
    recursos: ['Histórico de compras e ticket médio', 'Aniversários próximos', 'Preferências e restrições', 'Participação na fidelidade'],
  },
  {
    rota: '/fidelidade', rotulo: 'Fidelidade', icone: Gift, fase: 6,
    descricao: 'Programas de pontos, cliente VIP, indicações e recompensas.',
    recursos: ['Pontos por compra e por indicação', 'Recompensas e resgates', 'Histórico auditável com estorno justificado', 'Clientes mais engajados'],
  },
  {
    rota: '/financeiro', rotulo: 'Financeiro', icone: Wallet, fase: 5,
    descricao: 'Contas a pagar e a receber, fluxo de caixa e indicadores de lucro.',
    recursos: ['Faturamento separado do valor recebido', 'Despesas recorrentes', 'Fluxo de caixa por período', 'Custo dos produtos vendidos e margem'],
  },
  {
    rota: '/site', rotulo: 'Site e vitrine', icone: Globe, fase: 7,
    descricao: 'Site público, vitrine de produtos, blog de receitas e banners — tudo administrado daqui.',
    recursos: ['Publicação de produtos do cardápio', 'Blog com receitas e dicas', 'Banners, galeria e depoimentos', 'SEO e solicitações de orçamento'],
  },
  {
    rota: '/relatorios', rotulo: 'Relatórios', icone: BarChart3, fase: 7,
    descricao: 'Relatórios gerenciais com exportação para PDF e Excel.',
    recursos: ['Vendas e lucro por produto', 'Clientes recorrentes e inativos', 'Consumo e desperdício de insumos', 'Desempenho da fidelidade'],
  },
  { rota: '/configuracoes', rotulo: 'Configurações', icone: Settings, fase: 1, descricao: 'Dados da confeitaria, parâmetros e perfil.', recursos: [] },
]

export const nomesFases: Record<number, string> = {
  1: 'Fundação',
  2: 'Cadastros e estoque',
  3: 'Produção e custos',
  4: 'Pedidos',
  5: 'Financeiro',
  6: 'Fidelidade',
  7: 'Site, relatórios e finalização',
}
