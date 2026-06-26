## Objetivo
Elevar a página **Cartões** em quatro frentes que você selecionou: visual, organização das informações, novas funcionalidades e usabilidade mobile.

## 1. Visual / estética
- Substituir o "hero" atual por um **header colapsável** que ao rolar vira uma barra fina fixa com o total da fatura do mês (sticky).
- Redesenhar o "cartão flutuante" com:
  - Acabamento de vidro (`backdrop-blur`) + textura sutil de ruído.
  - Bandeira detectada automaticamente (Visa/Master/Elo/Amex) por prefixo do nome ou últimos 4 dígitos.
  - Animação de **flip** ao tocar (frente: dados; verso: limite, fatura, vencimento).
- Tipografia monoespaçada para números (já usada) com `tabular-nums` consistente em todos os totais.
- Cores derivadas da cor primária do cartão (gradiente automático claro→escuro).

## 2. Organização das informações
Reagrupar o conteúdo de cada cartão em **3 abas internas** (Tabs) dentro do card:
1. **Fatura** — total do mês, barra de limite, sugestão mínima/recomendada, breakdown compras × parcelas.
2. **Parcelas** — lista das parcelas ativas do mês com checkbox (move o bloco hoje solto para dentro do cartão a que pertence).
3. **Histórico** — meses anteriores com pago/pendente.

Mantém uma seção **global** no topo só com:
- KPI: total a pagar este mês (somando todos os cartões).
- Mini-gráfico de barras dos últimos 6 meses (tendência da fatura consolidada).

## 3. Novas funcionalidades
- **Alerta de vencimento próximo** (≤ 5 dias): badge pulsante no card + entrada no painel de Lembretes.
- **Comparativo entre cartões** (quando há 2+): barra horizontal mostrando peso de cada cartão na fatura total do mês.
- **Marcar fatura inteira como paga** com um clique (cria automaticamente os pagamentos individuais de todas as parcelas do mês + registra `card_invoice_payments`).
- **Exportar fatura do mês** em PDF/CSV (parcelas + compras do mês selecionado).
- **Projeção de parcelas futuras**: mini-timeline mostrando o valor previsto de fatura nos próximos 6 meses considerando parcelas já lançadas.

## 4. Usabilidade mobile
- Cards em carrossel horizontal com `snap` (em telas <640px) — hoje empilham e exigem muito scroll.
- Sticky tab bar dentro do card para alternar Fatura/Parcelas/Histórico sem perder contexto.
- Botão flutuante (FAB) "Nova compra no cartão" visível só em mobile.
- Toques com área mínima de 44px nos checkboxes de parcela.
- `prefers-reduced-motion`: desativa flip e pulsos.

## Detalhes técnicos
- Sem migrações novas — tudo reusa `cards`, `card_purchases`, `card_installment_payments`, `card_invoice_payments`.
- Bandeira: util `src/lib/card-brand.ts` (regex sobre últimos 4/nome).
- Export PDF: `jspdf` + `jspdf-autotable` (instalar via `bun add`).
- Projeção: derivar do array já calculado de parcelas (`startDate + installmentIndex`).
- Carrossel: usar `Carousel` do shadcn já presente.
- Flip: CSS `transform-style: preserve-3d` + `prefers-reduced-motion`.

## Entregáveis (arquivos)
- `src/lib/card-brand.ts` (novo)
- `src/components/credit-card-visual.tsx` (novo — extrai o visual flutuante com flip e bandeira)
- `src/components/cards/invoice-tab.tsx`, `installments-tab.tsx`, `history-tab.tsx` (novos — quebram o monólito de `cartoes.tsx`)
- `src/lib/export-invoice.ts` (novo)
- `src/routes/cartoes.tsx` (refatorado)

## Ordem de execução
1. Extrair componentes + bandeira + flip (visual + organização).
2. Carrossel mobile + sticky tabs + FAB.
3. Alerta de vencimento + comparativo + "marcar tudo pago".
4. Exportar PDF/CSV + projeção 6 meses.

Posso seguir nessa ordem ou prefere priorizar alguma etapa primeiro?