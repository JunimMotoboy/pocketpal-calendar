// Export filtered incomes as CSV or PDF.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { INC_MAP, formatBRL, type IncomeSource } from "@/lib/categories";

export type ExportIncome = {
  description: string;
  amount: number;
  source: IncomeSource;
  received_on: string; // yyyy-mm-dd
  notes: string | null;
};

type Opts = {
  items: ExportIncome[];
  periodLabel: string;
  sourceLabel: string;
  total: number;
};

function slug(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function csvEscape(v: string) {
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function downloadIncomesCsv(opts: Opts) {
  const lines: string[] = [];
  lines.push(`Periodo,${csvEscape(opts.periodLabel)}`);
  lines.push(`Fonte,${csvEscape(opts.sourceLabel)}`);
  lines.push("");
  lines.push("Data,Descricao,Fonte,Valor,Observacoes");
  for (const it of opts.items) {
    const date = format(new Date(it.received_on + "T00:00:00"), "dd/MM/yyyy");
    lines.push([
      date,
      csvEscape(it.description),
      csvEscape(INC_MAP[it.source]?.label ?? it.source),
      it.amount.toFixed(2).replace(".", ","),
      csvEscape(it.notes ?? ""),
    ].join(","));
  }
  lines.push("");
  lines.push(`Total,,,${opts.total.toFixed(2).replace(".", ",")},`);
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `entradas-${slug(opts.periodLabel)}-${slug(opts.sourceLabel)}.csv`);
}

export function downloadIncomesPdf(opts: Opts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Entradas de dinheiro", 40, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Período: ${opts.periodLabel}`, 40, 70);
  doc.text(`Fonte: ${opts.sourceLabel}`, 40, 85);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 40, 100);

  autoTable(doc, {
    startY: 120,
    head: [["Data", "Descrição", "Fonte", "Valor"]],
    body: opts.items.map((it) => [
      format(new Date(it.received_on + "T00:00:00"), "dd/MM/yyyy"),
      it.description + (it.notes ? `\n${it.notes}` : ""),
      INC_MAP[it.source]?.label ?? it.source,
      formatBRL(it.amount),
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [34, 139, 87], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 70 },
      2: { cellWidth: 90 },
      3: { halign: "right", cellWidth: 80 },
    },
    alternateRowStyles: { fillColor: [245, 250, 247] },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(`Total: ${formatBRL(opts.total)}`, pageWidth - 40, finalY + 30, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${opts.items.length} registro(s)`, 40, finalY + 30);

  doc.save(`entradas-${slug(opts.periodLabel)}-${slug(opts.sourceLabel)}.pdf`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
