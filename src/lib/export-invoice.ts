// Export a credit card invoice for a given month to CSV (browser-only).
import { formatBRL } from "@/lib/categories";

export type InvoiceItem = {
  kind: "compra" | "parcela";
  description: string;
  date: string; // dd/mm/yyyy
  amount: number;
};

export function downloadInvoiceCsv(opts: {
  cardName: string;
  monthLabel: string;
  items: InvoiceItem[];
  total: number;
}) {
  const lines: string[] = [];
  lines.push(`Cartao,${csvEscape(opts.cardName)}`);
  lines.push(`Mes,${csvEscape(opts.monthLabel)}`);
  lines.push("");
  lines.push("Tipo,Descricao,Data,Valor");
  for (const it of opts.items) {
    lines.push(`${it.kind},${csvEscape(it.description)},${it.date},${it.amount.toFixed(2).replace(".", ",")}`);
  }
  lines.push("");
  lines.push(`Total,,,${opts.total.toFixed(2).replace(".", ",")}`);
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fatura-${slug(opts.cardName)}-${slug(opts.monthLabel)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(v: string) {
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Marker so formatBRL stays imported if needed externally
export { formatBRL };
