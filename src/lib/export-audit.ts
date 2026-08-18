// Export filtered audit trail as CSV or PDF.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AUDIT_LABELS, type AuditEvent } from "@/lib/audit";

export type ExportAuditLog = {
  actor_email: string | null;
  user_id: string;
  event: string;
  description: string;
  resource: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type Opts = {
  items: ExportAuditLog[];
  periodLabel: string;
  eventLabel: string;
  userLabel: string;
};

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function csvEscape(v: string) {
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function label(event: string) {
  return AUDIT_LABELS[event as AuditEvent] ?? event;
}

function fmt(dt: string) {
  return format(new Date(dt), "dd/MM/yyyy HH:mm:ss");
}

function baseName(opts: Opts) {
  return `auditoria-${slug(opts.periodLabel)}-${slug(opts.eventLabel)}-${slug(opts.userLabel)}`;
}

export function downloadAuditCsv(opts: Opts) {
  const lines: string[] = [];
  lines.push(`Periodo,${csvEscape(opts.periodLabel)}`);
  lines.push(`Evento,${csvEscape(opts.eventLabel)}`);
  lines.push(`Usuario,${csvEscape(opts.userLabel)}`);
  lines.push("");
  lines.push("Data/Hora,Usuario,Evento,Descricao,Recurso,IP,User agent");
  for (const it of opts.items) {
    lines.push(
      [
        fmt(it.created_at),
        csvEscape(it.actor_email ?? it.user_id),
        csvEscape(label(it.event)),
        csvEscape(it.description),
        csvEscape(it.resource ?? ""),
        csvEscape(it.ip_address ?? ""),
        csvEscape(it.user_agent ?? ""),
      ].join(",")
    );
  }
  lines.push("");
  lines.push(`Total de eventos,${opts.items.length}`);
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${baseName(opts)}.csv`);
}

export function downloadAuditPdf(opts: Opts) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Trilha de auditoria", 40, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Período: ${opts.periodLabel}`, 40, 70);
  doc.text(`Evento: ${opts.eventLabel}`, 40, 85);
  doc.text(`Usuário: ${opts.userLabel}`, 40, 100);
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    40,
    115
  );

  autoTable(doc, {
    startY: 135,
    head: [["Data/Hora", "Usuário", "Evento", "Descrição", "Recurso", "IP"]],
    body: opts.items.map((it) => [
      fmt(it.created_at),
      it.actor_email ?? it.user_id.slice(0, 8),
      label(it.event),
      it.description,
      it.resource ?? "-",
      it.ip_address ?? "-",
    ]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [39, 70, 120], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 140 },
      2: { cellWidth: 110 },
      4: { cellWidth: 110 },
      5: { cellWidth: 80 },
    },
    alternateRowStyles: { fillColor: [244, 247, 252] },
  });

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 135;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(`${opts.items.length} evento(s)`, pageWidth - 40, finalY + 28, { align: "right" });

  doc.save(`${baseName(opts)}.pdf`);
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
