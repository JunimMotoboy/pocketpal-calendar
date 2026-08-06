import { formatBRL } from "@/lib/categories";
import { installmentIncludesMonth, type Installment } from "./types";

type Props = {
  cardInstallments: Installment[];
  paidInstallments: Record<string, string>;
};

export function HistoryTab({ cardInstallments, paidInstallments }: Props) {
  const byMonth: Record<string, { id: string; description: string; value: number }[]> = {};
  for (const i of cardInstallments) {
    for (const key of Object.keys(paidInstallments)) {
      const [instId, mk] = key.split("|");
      if (instId !== i.id) continue;
      (byMonth[mk] ||= []).push({ id: i.id, description: i.description, value: Number(i.installment_value) });
    }
  }
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
  if (months.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum pagamento registrado ainda.</p>;
  }

  return (
    <div className="space-y-2">
      {months.map((mk) => {
        const [y, m] = mk.split("-").map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        const list = byMonth[mk];
        const totalPaid = list.reduce((s, x) => s + x.value, 0);
        let pending = 0;
        for (const i of cardInstallments) {
          if (installmentIncludesMonth(i, mk) && !paidInstallments[`${i.id}|${mk}`]) {
            pending += Number(i.installment_value);
          }
        }
        return (
          <div key={mk} className="rounded-lg border border-border/60 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium capitalize">{label}</span>
              <span className="tabular-nums text-success">{formatBRL(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Pendente</span>
              <span className="tabular-nums">{formatBRL(pending)}</span>
            </div>
            <ul className="mt-1 space-y-0.5 pl-3">
              {list.map((p) => (
                <li key={`${mk}-${p.id}`} className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">• {p.description}</span>
                  <span className="tabular-nums">{formatBRL(p.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
