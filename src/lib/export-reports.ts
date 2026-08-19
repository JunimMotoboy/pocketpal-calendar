// Export report sections (Resumo, Categorias, Pagamento, Entradas, Tendência, Orçamentos)
// as CSV or PDF, respecting the active period filter.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/categories";

export type ReportTable = {
  title: string;
  head: string[];
  rows: (string | number)[][];
  footer?: string;
};

export type ReportExport = {
  sectionLabel: string;
  periodLabel: string;
  tables: ReportTable[];
};

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function csvEscape(v: string | number) {
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function baseName(opts: ReportExport) {
  return `relatorio-${slug(opts.sectionLabel)}-${slug(opts.periodLabel)}`;
}

export function downloadReportCsv(opts: ReportExport) {
  const lines: string[] = [];
  lines.push(`Relatorio,${csvEscape(opts.sectionLabel)}`);
  lines.push(`Periodo,${csvEscape(opts.periodLabel)}`);
  lines.push(`Gerado em,${csvEscape(format(new Date(), "dd/MM/yyyy HH:mm"))}`);
  for (const t of opts.tables) {
    lines.push("");
    lines.push(csvEscape(t.title));
    lines.push(t.head.map(csvEscape).join(","));
    for (const r of t.rows) lines.push(r.map(csvEscape).join(","));
    if (t.footer) lines.push(csvEscape(t.footer));
  }
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${baseName(opts)}.csv`);
}

export function downloadReportPdf(opts: ReportExport) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Relatório — ${opts.sectionLabel}`, 40, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Período: ${opts.periodLabel}`, 40, 70);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 40, 85);

  let y = 105;
  for (const t of opts.tables) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(t.title, 40, y);
    autoTable(doc, {
      startY: y + 10,
      head: [t.head],
      body: t.rows.map((r) => r.map((c) => String(c))),
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [39, 70, 120], textColor: 255 },
      alternateRowStyles: { fillColor: [244, 247, 252] },
      margin: { left: 40, right: 40 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 30;
    if (t.footer) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text(t.footer, 40, y - 14);
    }
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
  }

  doc.save(`${baseName(opts)}.pdf`);
}

export function money(n: number) {
  return formatBRL(n);
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
