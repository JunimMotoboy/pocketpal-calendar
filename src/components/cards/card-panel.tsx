import { AlertTriangle, Download, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/categories";
import { detectCardBrand, BRAND_GRADIENT } from "@/lib/card-brand";
import { CreditCardVisual } from "./credit-card-visual";
import { InvoiceTab } from "./invoice-tab";
import { InstallmentsTab } from "./installments-tab";
import { HistoryTab } from "./history-tab";
import type { CardExpense, CardItem, Installment } from "./types";

type Props = {
  card: CardItem;
  viewMonth: Date;
  viewMonthKey: string;
  viewMonthLabel: string;
  daysUntilDue: number | null;
  monthInstallments: Installment[];
  monthPurchases: CardExpense[];
  cardInstallments: Installment[];
  allExpenses: CardExpense[];
  allInstallments: Installment[];
  paidInstallments: Record<string, string>;
  instMonth: number;
  spentInMonth: number;
  onExportCsv: (card: CardItem) => void;
  onEditCard: (card: CardItem) => void;
  onDeleteCard: (card: CardItem) => void;
  onTogglePaid: (installmentId: string, isPaid: boolean) => void;
  onMarkAllPaid: (cardId: string) => void;
  onNewInstallment: (cardId: string) => void;
  onEditInstallment: (inst: Installment) => void;
  onDeleteInstallment: (inst: Installment) => void;
};

export function CardPanel({
  card: c,
  viewMonth,
  viewMonthKey,
  viewMonthLabel,
  daysUntilDue,
  monthInstallments,
  monthPurchases,
  cardInstallments,
  allExpenses,
  allInstallments,
  paidInstallments,
  instMonth,
  spentInMonth,
  onExportCsv,
  onEditCard,
  onDeleteCard,
  onTogglePaid,
  onMarkAllPaid,
  onNewInstallment,
  onEditInstallment,
  onDeleteInstallment,
}: Props) {
  const brand = detectCardBrand(c.name, c.notes);
  const invoice = spentInMonth + instMonth;
  const pct = c.limit_amount > 0 ? Math.min(100, (invoice / Number(c.limit_amount)) * 100) : 0;
  const remaining = Number(c.limit_amount) - invoice;
  const danger = pct >= 80;
  const pendingCount = monthInstallments.filter((i) => !paidInstallments[`${i.id}|${viewMonthKey}`]).length;

  return (
    <Card className="group min-w-[88vw] shrink-0 snap-center overflow-hidden rounded-3xl border-border/60 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] sm:min-w-0 sm:shrink">
      <CreditCardVisual name={c.name} dueDay={c.due_day} brand={brand} daysUntilDue={daysUntilDue} />

      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pt-4">
        <CardTitle className="text-sm font-bold leading-none">
          Fatura ·{" "}
          <span className="capitalize">{viewMonth.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
        </CardTitle>
        <div className="flex">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onExportCsv(c)} aria-label="Exportar CSV">
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onEditCard(c)} aria-label="Editar">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onDeleteCard(c)} aria-label="Remover">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatBRL(invoice)}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total do mês</p>
          </div>
          <div className="text-right">
            <p className={`text-base font-bold tabular-nums ${remaining >= 0 ? "text-success" : "text-destructive"}`}>
              {formatBRL(Math.abs(remaining))}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {remaining >= 0 ? "Disponível" : "Excedido"}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${danger ? "bg-destructive" : ""}`}
              style={{ width: `${pct}%`, backgroundImage: danger ? undefined : BRAND_GRADIENT[brand] }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
            <span>{Math.round(pct)}% usado</span>
            <span>Limite {formatBRL(Number(c.limit_amount))}</span>
          </div>
        </div>
        {danger && (
          <p role="alert" className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Limite quase atingido
          </p>
        )}

        <Tabs defaultValue="fatura" className="w-full">
          <TabsList className="sticky top-12 z-10 grid w-full grid-cols-3">
            <TabsTrigger value="fatura">Fatura</TabsTrigger>
            <TabsTrigger value="parcelas">
              Parcelas{" "}
              {pendingCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{pendingCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="hist">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="fatura" className="pt-3">
            <InvoiceTab
              card={c}
              viewMonth={viewMonth}
              viewMonthLabel={viewMonthLabel}
              invoice={invoice}
              instMonth={instMonth}
              spentInMonth={spentInMonth}
              monthInstallments={monthInstallments}
              monthPurchases={monthPurchases}
              allExpenses={allExpenses}
              allInstallments={allInstallments}
            />
          </TabsContent>

          <TabsContent value="parcelas" className="pt-3">
            <InstallmentsTab
              card={c}
              viewMonthKey={viewMonthKey}
              monthInstallments={monthInstallments}
              cardInstallments={cardInstallments}
              paidInstallments={paidInstallments}
              pendingCount={pendingCount}
              onTogglePaid={onTogglePaid}
              onMarkAllPaid={onMarkAllPaid}
              onNewInstallment={onNewInstallment}
              onEditInstallment={onEditInstallment}
              onDeleteInstallment={onDeleteInstallment}
            />
          </TabsContent>

          <TabsContent value="hist" className="pt-3">
            <HistoryTab cardInstallments={cardInstallments} paidInstallments={paidInstallments} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
