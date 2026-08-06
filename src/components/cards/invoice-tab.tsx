import { formatBRL } from "@/lib/categories";
import { installmentIncludesMonth, monthKeyOf, type CardExpense, type CardItem, type Installment } from "./types";

type Props = {
  card: CardItem;
  viewMonth: Date;
  viewMonthLabel: string;
  invoice: number;
  instMonth: number;
  spentInMonth: number;
  monthInstallments: Installment[];
  monthPurchases: CardExpense[];
  allExpenses: CardExpense[];
  allInstallments: Installment[];
};

export function InvoiceTab({
  card,
  viewMonth,
  viewMonthLabel,
  invoice,
  instMonth,
  spentInMonth,
  monthInstallments,
  monthPurchases,
  allExpenses,
  allInstallments,
}: Props) {
  let histSum = 0;
  let histN = 0;
  for (let k = 1; k <= 3; k++) {
    const mk = monthKeyOf(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - k, 1));
    const s = allExpenses
      .filter((e) => e.card_id === card.id && e.spent_on.startsWith(mk))
      .reduce((a, e) => a + Number(e.amount), 0);
    const ii = allInstallments
      .filter((x) => x.card_id === card.id && installmentIncludesMonth(x, mk))
      .reduce((a, x) => a + Number(x.installment_value), 0);
    histSum += s + ii;
    histN++;
  }
  const histAvg = histN > 0 ? histSum / histN : 0;
  const minPay = Math.max(invoice * 0.15, 0);
  const aboveAvg = histAvg > 0 && invoice > histAvg * 1.2;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Parcelas</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums">{formatBRL(instMonth)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Compras</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums">{formatBRL(spentInMonth)}</p>
        </div>
      </div>

      {invoice > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Sugestão de pagamento</p>
            {aboveAvg && (
              <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                Acima da média
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-background/70 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Mínimo (15%)</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">{formatBRL(minPay)}</p>
            </div>
            <div className="rounded-xl bg-primary/15 px-3 py-2 ring-1 ring-primary/30">
              <p className="text-[9px] font-bold uppercase tracking-wider text-primary">Recomendado</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-primary">{formatBRL(invoice)}</p>
            </div>
          </div>
          {histAvg > 0 && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Média 3m: <span className="font-semibold tabular-nums">{formatBRL(histAvg)}</span>
            </p>
          )}
        </div>
      )}

      {(monthInstallments.length > 0 || monthPurchases.length > 0) && (
        <div className="rounded-lg border border-border/60 p-3">
          <p className="mb-2 text-xs font-semibold capitalize">Detalhamento · {viewMonthLabel}</p>
          <ul className="space-y-1 text-xs">
            {monthInstallments.map((i) => (
              <li key={`m-i-${i.id}`} className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  • {i.description} <span className="opacity-60">(parcela)</span>
                </span>
                <span className="tabular-nums">{formatBRL(Number(i.installment_value))}</span>
              </li>
            ))}
            {monthPurchases.map((e) => (
              <li key={`m-e-${e.id}`} className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  • {e.description || "Compra"}{" "}
                  <span className="opacity-60">
                    ({e.spent_on.slice(8, 10)}/{e.spent_on.slice(5, 7)})
                  </span>
                </span>
                <span className="tabular-nums">{formatBRL(Number(e.amount))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.notes && <p className="text-xs italic text-muted-foreground">{card.notes}</p>}
    </div>
  );
}
