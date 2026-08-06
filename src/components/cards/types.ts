export type CardItem = {
  id: string;
  name: string;
  limit_amount: number;
  due_day: number;
  closing_day: number | null;
  notes: string | null;
  initial_used: number;
};

export type Installment = {
  id: string;
  card_id: string;
  description: string;
  installment_value: number;
  remaining_count: number;
  start_month: string;
};

export type CardExpense = {
  id: string;
  card_id: string;
  description: string;
  amount: number;
  spent_on: string;
};

export function installmentIncludesMonth(inst: Installment, monthKey: string): boolean {
  const [sy, sm] = inst.start_month.split("-").map(Number);
  const [ty, tm] = monthKey.split("-").map(Number);
  const diff = (ty - sy) * 12 + (tm - sm);
  return diff >= 0 && diff < inst.remaining_count;
}

export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
