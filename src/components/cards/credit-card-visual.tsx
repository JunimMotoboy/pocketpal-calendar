import { Clock } from "lucide-react";
import { BRAND_LABEL, BRAND_GRADIENT, type CardBrand } from "@/lib/card-brand";

type Props = {
  name: string;
  dueDay: number;
  brand: CardBrand;
  /** days until due date; null when not viewing the current month */
  daysUntilDue: number | null;
};

export function CreditCardVisual({ name, dueDay, brand, daysUntilDue }: Props) {
  const dueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 5;
  const overdue = daysUntilDue !== null && daysUntilDue < 0;

  return (
    <div
      className="relative m-4 mb-0 overflow-hidden rounded-2xl p-4 text-white shadow-lg"
      style={{ backgroundImage: BRAND_GRADIENT[brand], minHeight: 140 }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-black/20 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{BRAND_LABEL[brand]}</p>
          <p className="mt-0.5 text-base font-bold leading-tight">{name}</p>
        </div>
        <div className="flex h-7 w-10 items-center justify-center rounded-md bg-yellow-300/80 shadow-inner">
          <div className="h-4 w-7 rounded-sm border border-yellow-700/40 bg-gradient-to-br from-yellow-200 to-yellow-500" />
        </div>
      </div>
      <div className="relative mt-5 font-mono text-base tracking-[0.25em] opacity-90">•••• •••• •••• ••••</div>
      <div className="relative mt-3 flex items-end justify-between text-[10px] opacity-90">
        <div>
          <p className="font-bold uppercase tracking-wider opacity-70">Vencimento</p>
          <p className="font-mono text-sm tabular-nums">{String(dueDay).padStart(2, "0")}/mês</p>
        </div>
        <span className="rounded-md border border-white/30 bg-white/10 px-2 py-0.5 font-bold uppercase tracking-wider backdrop-blur-sm">
          {brand === "outros" ? "Crédito" : BRAND_LABEL[brand]}
        </span>
      </div>
      {(dueSoon || overdue) && (
        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow ${
            overdue ? "bg-destructive text-destructive-foreground" : "bg-amber-400 text-amber-950 motion-safe:animate-pulse"
          }`}
        >
          <Clock className="h-3 w-3" />
          {overdue ? "Vencido" : `${daysUntilDue}d`}
        </span>
      )}
    </div>
  );
}
