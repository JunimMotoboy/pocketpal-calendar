import { CheckCircle2, ListPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBRL } from "@/lib/categories";
import type { CardItem, Installment } from "./types";

type Props = {
  card: CardItem;
  viewMonthKey: string;
  monthInstallments: Installment[];
  cardInstallments: Installment[];
  paidInstallments: Record<string, string>;
  pendingCount: number;
  onTogglePaid: (installmentId: string, isPaid: boolean) => void;
  onMarkAllPaid: (cardId: string) => void;
  onNewInstallment: (cardId: string) => void;
  onEditInstallment: (inst: Installment) => void;
  onDeleteInstallment: (inst: Installment) => void;
};

export function InstallmentsTab({
  card,
  viewMonthKey,
  monthInstallments,
  cardInstallments,
  paidInstallments,
  pendingCount,
  onTogglePaid,
  onMarkAllPaid,
  onNewInstallment,
  onEditInstallment,
  onDeleteInstallment,
}: Props) {
  return (
    <div className="space-y-3">
      {monthInstallments.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {monthInstallments.length} parcela{monthInstallments.length === 1 ? "" : "s"} ·{" "}
            {pendingCount} pendente
            {pendingCount === 1 ? "" : "s"}
          </p>
          {pendingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => onMarkAllPaid(card.id)}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" /> Marcar tudo
            </Button>
          )}
        </div>
      )}
      {monthInstallments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma parcela ativa neste mês.</p>
      ) : (
        <ul className="space-y-2">
          {monthInstallments.map((i) => {
            const paid = !!paidInstallments[`${i.id}|${viewMonthKey}`];
            return (
              <li
                key={`p-${i.id}`}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-2.5"
              >
                <Checkbox
                  checked={paid}
                  onCheckedChange={() => onTogglePaid(i.id, paid)}
                  aria-label={`Marcar ${i.description} como paga`}
                  className="h-5 w-5 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-xs font-semibold ${paid ? "text-muted-foreground line-through" : ""}`}
                  >
                    {i.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground">vence dia {card.due_day}</p>
                </div>
                <span
                  className={`text-xs font-bold tabular-nums ${paid ? "text-muted-foreground line-through" : ""}`}
                >
                  {formatBRL(Number(i.installment_value))}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-border/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold">Todos os parcelamentos</p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => onNewInstallment(card.id)}
          >
            <ListPlus className="mr-1 h-3 w-3" /> Adicionar
          </Button>
        </div>
        {cardInstallments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum parcelamento registrado.</p>
        ) : (
          <ul className="space-y-1.5">
            {cardInstallments.map((i) => {
              const [sy, sm] = i.start_month.split("-").map(Number);
              const startLabel = new Date(sy, sm - 1, 1).toLocaleDateString("pt-BR", {
                month: "short",
                year: "numeric",
              });
              return (
                <li key={i.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.description}</p>
                    <p className="tabular-nums text-muted-foreground">
                      {i.remaining_count}x de {formatBRL(Number(i.installment_value))} · a partir de{" "}
                      {startLabel}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEditInstallment(i)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onDeleteInstallment(i)}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
