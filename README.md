# Irmãos na Massa · Sistema de Gestão

ERP para confeitaria artesanal: pedidos sob encomenda, fichas técnicas e custos, estoque, financeiro, fidelidade e site público — tudo integrado no mesmo banco.

**Stack:** React 19 + TypeScript + Vite · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) · TanStack Query · React Hook Form + Zod · Recharts · Framer Motion · React Three Fiber · Vercel.

## Status das fases

| Fase | Escopo | Status |
|---|---|---|
| 1 · Fundação | Banco completo, segurança, autenticação, layout, dashboard, configurações | ✅ Entregue |
| 2 · Cadastros e estoque | Clientes, fornecedores, produtos, insumos, movimentações | Banco pronto · interface pendente |
| 3 · Produção e custos | Fichas técnicas, subpreparações, formação de preço | Banco pronto (cálculo de custo já funciona) |
| 4 · Pedidos | Orçamentos, encomendas, agenda, baixa de insumos | Banco pronto · fluxo de status pendente |
| 5 · Financeiro | Contas, fluxo de caixa, baixas | Banco pronto · funções de baixa pendentes |
| 6 · Fidelidade | Programas, pontos, resgates | Banco pronto (movimentação de pontos já funciona) |
| 7 · Site, relatórios, finalização | Site público SSR, blog, relatórios, exportações | Banco pronto |

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # já aponta para o projeto Supabase "Irmãos na Massa"
npm run dev
```

## Deploy na Vercel

1. Suba este repositório para o GitHub e importe-o na Vercel (o `vercel.json` já define build, rewrites de SPA e cabeçalhos de segurança).
2. Em **Settings → Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (valores em `.env.example`).
3. No Supabase, em **Authentication → URL Configuration**, defina o **Site URL** com o domínio da Vercel e adicione `https://SEU-DOMINIO/**` em **Redirect URLs** (necessário para confirmação de e-mail e recuperação de senha).

> Somente a chave **publicável** vai para o frontend. Toda a proteção dos dados é feita no banco por Row Level Security.

## Arquitetura do banco (`supabase/migrations`)

- **Multi-empresa:** toda tabela de negócio tem `empresa_id`; RLS libera apenas membros ativos da empresa. Tabelas filhas usam **FK composta `(empresa_id, x_id)`**, impossibilitando vincular registros de empresas diferentes.
- **Perfis:** `proprietario`, `administrador`, `gerente`, `atendente`, `producao` (`empresa_membros`). Exclusões exigem gestor.
- **Histórico imutável:** `movimentacoes_estoque`, `lancamentos_financeiros`, `pagamentos`, `fidelidade_movimentacoes`, `pedido_status_historico`, históricos de custo e `logs_operacoes` não aceitam UPDATE/DELETE — correções são feitas por **estorno**.
- **Saldos protegidos:** saldo de insumos, lotes, pontos, valores pagos e status de pedidos/contas só mudam pelas funções transacionais (travas por trigger).
- **Idempotência:** funções de movimentação aceitam `p_chave` (único por empresa), evitando lançamentos/baixas duplicadas.
- **Estoque:** conversões kg/g, l/ml, unidades, medidas caseiras, densidade (volume↔massa) e peso unitário (un↔g); consumo automático de lotes por validade (FEFO); custo médio ponderado.
- **Custos:** fichas com subpreparações recalculam sozinhas quando o preço de um insumo muda; o custo é **congelado no item do pedido** (`custo_unitario` + `ficha_snapshot`), preservando o histórico.
- **Faturamento ≠ recebido:** faturamento vem dos pedidos confirmados; recebido vem dos lançamentos de caixa.
- **Site público:** visitantes (`anon`) leem apenas conteúdo publicado; solicitações de orçamento entram pela função `site_solicitar_orcamento` (com limite anti-spam).

### Funções RPC disponíveis

`criar_empresa`, `dashboard_resumo`, `busca_global`, `notificacoes`, `movimentar_estoque`, `estornar_movimentacao`, `recalcular_custo_ficha`, `movimentar_pontos`, `estornar_pontos`, `converter_unidade`, `site_solicitar_orcamento`, `excluir_empresa`.

## Design system

Todas as cores foram amostradas da logo oficial (`public/logo-original.png`) e estão em `src/index.css`:

| Token | Cor | Origem na logo |
|---|---|---|
| `creme` | `#FEF1E0` | fundo da arte (a logo se funde ao fundo do app) |
| `cacau-600` | `#7C350A` | letreiro “IrMãos na Massa” — cor principal, títulos e botões |
| `choco-800` | `#4A2410` | textos |
| `rosa-500` / `rosa-300` | `#E2745C` / `#F4A58E` | rosas e laço |
| `dourado-500` / `dourado-600` | `#E2AB75` / `#D18A45` | suporte do bolo, estrelas e filetes |
| `oliva-700` | `#5F6A2E` | folhas |

Tipografia: **Fraunces** em modo “suave” (serifa arredondada como o letreiro) para títulos e valores, **DM Sans** para a interface e **Parisienne** para detalhes manuscritos. Todas hospedadas no próprio app. O ornamento “filete dourado + coração” (`<Ornamento />`) reproduz o detalhe da logo.

Gráficos: caramelo `#8A3A0C`, rosa `#E06C78` e oliva `#6E7A2E`, validados para daltonismo e contraste. O bolo 3D usa as mesmas cores da logo, carrega sob demanda e vira ilustração 2D no celular, sem WebGL ou com movimento reduzido.
