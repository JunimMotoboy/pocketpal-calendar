import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, isSameDay, parseISO, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Pencil, CalendarClock, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CAT_MAP, formatBRL, type Category } from "@/lib/categories";
import { AddExpenseDialog, ExpenseDialog } from "@/components/add-expense-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Nix Wallet" },
      { name: "description", content: "Veja seus gastos no calendário, organize por categorias e acompanhe seu mês." },
    ],
  }),
  component: Dashboard,
});

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: Category;
  payment_method: string | null;
  spent_on: string;
  notes: string | null;
  card_id: string | null;
};

type FixedDue = {
  id: string;
  name: string;
  amount: number;
  category: Category;
  due_day: number;
  date: Date;
  dateKey: string;
};

type GoalContribution = {
  id: string;
  goal_id: string;
  amount: number;
  contributed_on: string;
  goal_name: string;
};

type CardInstallment = {
  id: string;
  card_id: string;
  description: string;
  installment_value: number;
  remaining_count: number;
  start_month: string;
};

function Dashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fixedRaw, setFixedRaw] = useState<{ id: string; name: string; amount: number; category: Category; due_day: number }[]>([]);
  const [paidMap, setPaidMap] = useState<Map<string, string>>(new Map()); // key fixed_expense_id -> payment id
  const [cards, setCards] = useState<{ id: string; name: string; due_day: number }[]>([]);
  const [cardInstallments, setCardInstallments] = useState<CardInstallment[]>([]);
  const [invoicePaidMap, setInvoicePaidMap] = useState<Map<string, string>>(new Map()); // card_id -> payment id (for current viewed month)
  const [goalContribs, setGoalContribs] = useState<GoalContribution[]>([]);
  const [fetching, setFetching] = useState(false);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const load = async () => {
    if (!user) return;
    setFetching(true);
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");
    const y = month.getFullYear();
    const mo = month.getMonth() + 1;
    const [expRes, fixRes, payRes, cardsRes, gcRes, instRes, invPayRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("id, description, amount, category, payment_method, spent_on, notes, card_id, installments")
        .gte("spent_on", from)
        .lte("spent_on", to)
        .order("spent_on", { ascending: false }),
      supabase
        .from("fixed_expenses")
        .select("id, name, amount, category, due_day")
        .eq("active", true),
      supabase
        .from("fixed_expense_payments")
        .select("id, fixed_expense_id")
        .eq("year", y)
        .eq("month", mo),
      supabase.from("cards").select("id, name, due_day"),
      supabase
        .from("goal_contributions")
        .select("id, goal_id, amount, contributed_on")
        .gte("contributed_on", from)
        .lte("contributed_on", to),
      supabase
        .from("card_installments")
        .select("id, card_id, description, installment_value, remaining_count, start_month"),
      supabase
        .from("card_invoice_payments")
        .select("id, card_id")
        .eq("month_key", `${y}-${String(mo).padStart(2, "0")}`),
    ]);
    setFetching(false);
    if (expRes.error) toast.error(expRes.error.message);
    else setExpenses((expRes.data ?? []) as Expense[]);
    if (fixRes.error) toast.error(fixRes.error.message);
    else setFixedRaw((fixRes.data ?? []) as typeof fixedRaw);
    if (payRes.error) toast.error(payRes.error.message);
    else {
      const m = new Map<string, string>();
      for (const p of (payRes.data ?? []) as { id: string; fixed_expense_id: string }[]) {
        m.set(p.fixed_expense_id, p.id);
      }
      setPaidMap(m);
    }
    if (!cardsRes.error) setCards((cardsRes.data ?? []) as { id: string; name: string; due_day: number }[]);
    if (!instRes.error) setCardInstallments((instRes.data ?? []) as CardInstallment[]);
    if (invPayRes && !invPayRes.error) {
      const m = new Map<string, string>();
      for (const p of (invPayRes.data ?? []) as { id: string; card_id: string }[]) m.set(p.card_id, p.id);
      setInvoicePaidMap(m);
    }

    // Join contributions with goal names client-side
    const rawGc = (gcRes.data ?? []) as { id: string; goal_id: string; amount: number; contributed_on: string }[];
    if (rawGc.length > 0) {
      const ids = Array.from(new Set(rawGc.map((g) => g.goal_id)));
      const { data: goalsData } = await supabase.from("goals").select("id, name").in("id", ids);
      const nameMap = new Map<string, string>();
      for (const g of (goalsData ?? []) as { id: string; name: string }[]) nameMap.set(g.id, g.name);
      setGoalContribs(rawGc.map((c) => ({ ...c, amount: Number(c.amount), goal_name: nameMap.get(c.goal_id) ?? "Meta" })));
    } else {
      setGoalContribs([]);
    }
  };

  useEffect(() => {
    if (user) load();
    // When month changes, snap selected day into the new month so the day list refreshes too.
    setSelected((prev) => {
      if (prev.getFullYear() === month.getFullYear() && prev.getMonth() === month.getMonth()) return prev;
      const dim = getDaysInMonth(month);
      const day = Math.min(prev.getDate(), dim);
      return new Date(month.getFullYear(), month.getMonth(), day);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, month]);

  const togglePaid = async (f: FixedDue) => {
    if (!user) return;
    const existing = paidMap.get(f.id);
    if (existing) {
      const { error } = await supabase.from("fixed_expense_payments").delete().eq("id", existing);
      if (error) return toast.error(error.message);
      const next = new Map(paidMap); next.delete(f.id); setPaidMap(next);
    } else {
      const y = month.getFullYear();
      const mo = month.getMonth() + 1;
      const { data, error } = await supabase
        .from("fixed_expense_payments")
        .insert({ user_id: user.id, fixed_expense_id: f.id, year: y, month: mo, paid_on: format(new Date(), "yyyy-MM-dd") })
        .select("id")
        .single();
      if (error) return toast.error(error.message);
      const next = new Map(paidMap); next.set(f.id, data!.id); setPaidMap(next);
      toast.success("Marcada como paga");
    }
  };

  const toggleInvoicePaid = async (cardId: string, amount: number) => {
    if (!user) return;
    const existing = invoicePaidMap.get(cardId);
    if (existing) {
      const { error } = await supabase.from("card_invoice_payments").delete().eq("id", existing);
      if (error) return toast.error(error.message);
      const next = new Map(invoicePaidMap); next.delete(cardId); setInvoicePaidMap(next);
    } else {
      const { data, error } = await supabase
        .from("card_invoice_payments")
        .insert({ user_id: user.id, card_id: cardId, month_key: monthKey, amount })
        .select("id")
        .single();
      if (error) return toast.error(error.message);
      const next = new Map(invoicePaidMap); next.set(cardId, data!.id); setInvoicePaidMap(next);
      toast.success("Fatura marcada como paga");
    }
  };



  const fixedDues = useMemo<FixedDue[]>(() => {
    const dim = getDaysInMonth(month);
    const y = month.getFullYear();
    const m = month.getMonth();
    return fixedRaw.map((f) => {
      const day = Math.min(f.due_day, dim);
      const date = new Date(y, m, day);
      return {
        id: f.id,
        name: f.name,
        amount: Number(f.amount),
        category: f.category,
        due_day: f.due_day,
        date,
        dateKey: format(date, "yyyy-MM-dd"),
      };
    });
  }, [fixedRaw, month]);

  const dayExpenses = useMemo(
    () => expenses.filter((e) => isSameDay(parseISO(e.spent_on), selected)),
    [expenses, selected]
  );

  const dayFixed = useMemo(
    () => fixedDues.filter((f) => isSameDay(f.date, selected)),
    [fixedDues, selected]
  );

  const dayGoalContribs = useMemo(
    () => goalContribs.filter((c) => isSameDay(parseISO(c.contributed_on), selected)),
    [goalContribs, selected]
  );

  const goalContribDaysSet = useMemo(
    () => new Set(goalContribs.map((c) => c.contributed_on)),
    [goalContribs]
  );

  const totals = useMemo(() => {
    const byCat: Record<string, number> = {};
    let total = 0;
    for (const e of expenses) {
      byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount);
      total += Number(e.amount);
    }
    for (const f of fixedDues) {
      byCat[f.category] = (byCat[f.category] ?? 0) + Number(f.amount);
      total += Number(f.amount);
    }
    return { byCat, total };
  }, [expenses, fixedDues]);

  const dayTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) {
      m.set(e.spent_on, (m.get(e.spent_on) ?? 0) + Number(e.amount));
    }
    return m;
  }, [expenses]);

  // For each day with fixed dues, decide if ALL are paid (green) or any unpaid (red)
  const paidFixedDaysSet = useMemo(() => {
    const byDay = new Map<string, FixedDue[]>();
    for (const f of fixedDues) {
      const arr = byDay.get(f.dateKey) ?? [];
      arr.push(f);
      byDay.set(f.dateKey, arr);
    }
    const s = new Set<string>();
    for (const [key, arr] of byDay) {
      if (arr.every((f) => paidMap.has(f.id))) s.add(key);
    }
    return s;
  }, [fixedDues, paidMap]);

  const unpaidFixedDaysSet = useMemo(() => {
    const byDay = new Map<string, FixedDue[]>();
    for (const f of fixedDues) {
      const arr = byDay.get(f.dateKey) ?? [];
      arr.push(f);
      byDay.set(f.dateKey, arr);
    }
    const s = new Set<string>();
    for (const [key, arr] of byDay) {
      if (arr.some((f) => !paidMap.has(f.id))) s.add(key);
    }
    return s;
  }, [fixedDues, paidMap]);

  const cardDueDaysSet = useMemo(() => {
    const dim = getDaysInMonth(month);
    const y = month.getFullYear();
    const m = month.getMonth();
    return new Set(
      cards.map((c) => format(new Date(y, m, Math.min(c.due_day, dim)), "yyyy-MM-dd"))
    );
  }, [cards, month]);

  // Installments active in displayed month, grouped by card
  const installmentsByCardThisMonth = useMemo(() => {
    const map = new Map<string, { id: string; description: string; value: number }[]>();
    const ty = month.getFullYear();
    const tm = month.getMonth() + 1;
    for (const i of cardInstallments) {
      const [sy, sm] = i.start_month.split("-").map(Number);
      const diff = (ty - sy) * 12 + (tm - sm);
      if (diff >= 0 && diff < i.remaining_count) {
        const arr = map.get(i.card_id) ?? [];
        arr.push({ id: i.id, description: i.description, value: Number(i.installment_value) });
        map.set(i.card_id, arr);
      }
    }
    return map;
  }, [cardInstallments, month]);

  const monthCardExpensesByCard = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      if (e.payment_method === "credito" && e.card_id) {
        const arr = map.get(e.card_id) ?? [];
        arr.push(e);
        map.set(e.card_id, arr);
      }
    }
    return map;
  }, [expenses]);

  const cardsDueOnSelected = useMemo(() => {
    const key = format(selected, "yyyy-MM-dd");
    const dim = getDaysInMonth(month);
    const y = month.getFullYear();
    const m = month.getMonth();
    return cards
      .filter((c) => format(new Date(y, m, Math.min(c.due_day, dim)), "yyyy-MM-dd") === key)
      .map((c) => {
        const parts = installmentsByCardThisMonth.get(c.id) ?? [];
        const instTotal = parts.reduce((s, p) => s + p.value, 0);
        const purchases = monthCardExpensesByCard.get(c.id) ?? [];
        const expTotal = purchases.reduce((s, e) => s + Number(e.amount), 0);
        const invoiceTotal = instTotal + expTotal;
        return { ...c, installments: parts, installmentsTotal: instTotal, purchases, expensesTotal: expTotal, invoiceTotal };
      });
  }, [cards, selected, month, installmentsByCardThisMonth, monthCardExpensesByCard]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Gasto removido");
      load();
    }
  };

  if (loading || !user) {
    return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero summary */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-border/60 p-6 shadow-[var(--shadow-elegant)]" style={{ backgroundImage: "var(--gradient-hero)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4 text-primary-foreground">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <p className="text-sm/6 opacity-80">Total de {format(month, "MMMM 'de' yyyy", { locale: ptBR })}</p>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(totals.total)}</p>
            <p className="mt-1 text-sm opacity-80">{expenses.length} gasto{expenses.length === 1 ? "" : "s"} registrado{expenses.length === 1 ? "" : "s"}</p>
          </div>
          <AddExpenseDialog userId={user.id} defaultDate={selected} onAdded={load} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Calendar */}
        <Card className="h-fit">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-base">Calendário do mês</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => { if (d) { setSelected(d); setDayDialogOpen(true); } }}
              month={month}
              onMonthChange={setMonth}
              locale={ptBR}
              className={cn("p-0 pointer-events-auto w-full [--cell-size:2.75rem] sm:[--cell-size:2.4rem]")}
              classNames={{ root: "w-full", months: "w-full", month: "w-full" }}
              modifiers={{
                hasExpense: (d) => dayTotals.has(format(d, "yyyy-MM-dd")),
                hasFixedPaid: (d) => paidFixedDaysSet.has(format(d, "yyyy-MM-dd")),
                hasFixedUnpaid: (d) => unpaidFixedDaysSet.has(format(d, "yyyy-MM-dd")),
                hasCardDue: (d) => cardDueDaysSet.has(format(d, "yyyy-MM-dd")),
                hasGoal: (d) => goalContribDaysSet.has(format(d, "yyyy-MM-dd")),
              }}
              modifiersClassNames={{
                hasExpense: "relative font-semibold text-primary after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-accent",
                hasFixedUnpaid: "relative font-semibold text-destructive before:absolute before:top-1 before:right-1 before:h-2 before:w-2 before:rounded-full before:bg-destructive",
                hasFixedPaid: "relative font-semibold text-success before:absolute before:top-1 before:right-1 before:h-2 before:w-2 before:rounded-full before:bg-success",
                hasCardDue: "relative font-semibold text-warning-foreground bg-warning/30 rounded-md",
                hasGoal: "ring-2 ring-amber-500/60 rounded-md",
              }}
            />
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />Gasto</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" />Conta a pagar</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" />Conta paga</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-warning/60" />Fatura cartão</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm ring-2 ring-amber-500/60" />Meta</span>
            </div>
            {fetching && <p className="mt-2 text-xs text-muted-foreground">Atualizando...</p>}
          </CardContent>
        </Card>

        {/* Right column: day details + categories */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base capitalize">
                {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              <Badge variant="secondary">
                {formatBRL(dayExpenses.reduce((s, e) => s + Number(e.amount), 0))}
              </Badge>
            </CardHeader>
            <CardContent>
              {cardsDueOnSelected.length > 0 && (
                <ul className="mb-3 space-y-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                  {cardsDueOnSelected.map((c) => (
                    <li key={`cd-${c.id}`} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium">
                          <CalendarClock className="h-4 w-4 text-warning-foreground" />
                          Vence fatura: {c.name}
                        </span>
                        <span className="font-semibold tabular-nums">{formatBRL(c.invoiceTotal)}</span>
                      </div>
                      {c.installments.length > 0 && (
                        <ul className="ml-6 space-y-0.5 text-xs text-muted-foreground">
                          {c.installments.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-2">
                              <span className="truncate">• {p.description}</span>
                              <span className="tabular-nums">{formatBRL(p.value)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {dayFixed.length > 0 && (
                <ul className={cn("mb-3 divide-y rounded-lg border border-dashed")}>
                  {dayFixed.map((f) => {
                    const cat = CAT_MAP[f.category];
                    const Icon = cat.icon;
                    const paid = paidMap.has(f.id);
                    return (
                      <li
                        key={`fx-${f.id}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 transition-colors",
                          paid
                            ? "bg-success/10 border-success/40"
                            : "bg-destructive/5 border-destructive/40"
                        )}
                      >
                        <Checkbox
                          checked={paid}
                          onCheckedChange={() => togglePaid(f)}
                          aria-label={paid ? "Desmarcar pagamento" : "Marcar como paga"}
                        />
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `color-mix(in oklab, ${cat.color} 15%, transparent)` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: cat.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate font-medium", paid && "text-success")}>{f.name}</p>
                          <p className={cn("flex items-center gap-1 text-xs", paid ? "text-success" : "text-muted-foreground")}>
                            <CalendarClock className="h-3 w-3" /> {paid ? "Paga este mês" : "Vence hoje"} · {cat.label}
                          </p>
                        </div>
                        <p className={cn("font-semibold tabular-nums", paid && "text-success")}>{formatBRL(f.amount)}</p>
                        <Link to="/despesas-fixas" aria-label="Gerenciar despesas fixas">
                          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {dayGoalContribs.length > 0 && (
                <ul className="mb-3 divide-y rounded-lg border border-amber-500/30 bg-amber-500/5">
                  {dayGoalContribs.map((c) => (
                    <li key={`gc-${c.id}`} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                        <Trophy className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.goal_name}</p>
                        <p className="text-xs text-muted-foreground">Aporte para meta</p>
                      </div>
                      <p className="font-semibold tabular-nums text-amber-600">+{formatBRL(c.amount)}</p>
                      <Link to="/metas" aria-label="Ir para metas">
                        <Button variant="ghost" size="icon"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {dayExpenses.length === 0 && dayFixed.length === 0 && dayGoalContribs.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum gasto neste dia. Toque em <strong>Novo gasto</strong> para registrar.
                </p>
              ) : dayExpenses.length === 0 ? null : (
                <ul className="divide-y divide-border">
                  {dayExpenses.map((e) => {
                    const cat = CAT_MAP[e.category];
                    const Icon = cat.icon;
                    return (
                      <li key={e.id} className="flex items-center gap-3 py-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `color-mix(in oklab, ${cat.color} 15%, transparent)` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: cat.color }} />
                        </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat.label}{e.payment_method ? ` · ${e.payment_method}` : ""}{e.notes ? ` · ${e.notes}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums">{formatBRL(Number(e.amount))}</p>
                    <ExpenseDialog
                      userId={user.id}
                      expense={e}
                      onSaved={load}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Editar">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      }
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} aria-label="Remover">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <DailyGoals
            expenses={expenses}
            fixedDues={fixedDues}
            paidMap={paidMap}
            month={month}
          />
        </div>
      </div>

      {/* Day details modal */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {format(selected, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {cardsDueOnSelected.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Vencimentos de cartão</p>
                <ul className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                  {cardsDueOnSelected.map((c) => (
                    <li key={`md-cd-${c.id}`} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium">
                          <CalendarClock className="h-4 w-4 text-warning-foreground" />
                          Fatura: {c.name}
                        </span>
                        <span className="font-semibold tabular-nums">{formatBRL(c.invoiceTotal)}</span>
                      </div>
                      {(c.installments.length > 0 || c.purchases.length > 0) && (
                        <ul className="ml-6 space-y-0.5 text-xs text-muted-foreground">
                          {c.installments.map((p) => (
                            <li key={`md-cd-i-${p.id}`} className="flex items-center justify-between gap-2">
                              <span className="truncate">• {p.description} <span className="opacity-60">(parcela)</span></span>
                              <span className="tabular-nums">{formatBRL(p.value)}</span>
                            </li>
                          ))}
                          {c.purchases.map((e) => (
                            <li key={`md-cd-e-${e.id}`} className="flex items-center justify-between gap-2">
                              <span className="truncate">• {e.description}</span>
                              <span className="tabular-nums">{formatBRL(Number(e.amount))}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dayFixed.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Despesas fixas</p>
                <ul className="divide-y rounded-lg border">
                  {dayFixed.map((f) => {
                    const cat = CAT_MAP[f.category];
                    const Icon = cat.icon;
                    const paid = paidMap.has(f.id);
                    return (
                      <li key={`md-fx-${f.id}`} className={cn("flex items-center gap-3 px-3 py-2", paid ? "bg-success/10" : "bg-destructive/5")}>
                        <Checkbox checked={paid} onCheckedChange={() => togglePaid(f)} />
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, ${cat.color} 15%, transparent)` }}>
                          <Icon className="h-4 w-4" style={{ color: cat.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-medium", paid && "text-success")}>{f.name}</p>
                          <p className="text-xs text-muted-foreground">{cat.label} · {paid ? "Paga" : "A pagar"}</p>
                        </div>
                        <p className={cn("text-sm font-semibold tabular-nums", paid && "text-success")}>{formatBRL(f.amount)}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {dayExpenses.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Gastos do dia</p>
                <ul className="divide-y rounded-lg border">
                  {dayExpenses.map((e) => {
                    const cat = CAT_MAP[e.category];
                    const Icon = cat.icon;
                    return (
                      <li key={`md-ex-${e.id}`} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, ${cat.color} 15%, transparent)` }}>
                          <Icon className="h-4 w-4" style={{ color: cat.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.description}</p>
                          <p className="text-xs text-muted-foreground">{cat.label}{e.payment_method ? ` · ${e.payment_method}` : ""}</p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums">{formatBRL(Number(e.amount))}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {cardsDueOnSelected.length === 0 && dayFixed.length === 0 && dayExpenses.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nada registrado neste dia.</p>
            )}

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">Total de gastos do dia</span>
              <span className="text-base font-bold tabular-nums">
                {formatBRL(dayExpenses.reduce((s, e) => s + Number(e.amount), 0) + dayFixed.reduce((s, f) => s + Number(f.amount), 0))}
              </span>
            </div>

            <AddExpenseDialog userId={user.id} defaultDate={selected} onAdded={() => { load(); }} />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

const MOTIVATIONAL_MESSAGES = [
  "Parabéns! Controlar os gastos é o primeiro passo para a liberdade financeira.",
  "Excelente! Dias sem gastos são pequenas vitórias que se tornam grandes conquistas.",
  "Muito bem! Cada real economizado hoje é um investimento no seu futuro.",
  "Incrível! A disciplina de hoje constrói a tranquilidade de amanhã.",
  "Ótimo trabalho! Seu esforço para manter o controle está dando resultados.",
];

function DailyGoals({
  expenses,
  fixedDues,
  paidMap,
  month,
}: {
  expenses: Expense[];
  fixedDues: FixedDue[];
  paidMap: Map<string, string>;
  month: Date;
}) {
  const today = new Date();
  const todayKey = format(today, "yyyy-MM-dd");
  const isCurrentMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth();

  const loggedToday = expenses.some((e) => e.spent_on === todayKey);
  const overdueUnpaid = fixedDues.filter((f) => f.date <= today && !paidMap.has(f.id));
  const allOverdueSettled = isCurrentMonth ? overdueUnpaid.length === 0 : true;
  const reviewedMonth = isCurrentMonth;

  const [noExpensesToday, setNoExpensesToday] = useState(() => {
    try {
      return localStorage.getItem(`nixwallet:noexpenses:${todayKey}`) === "1";
    } catch {
      return false;
    }
  });

  const handleNoExpenses = () => {
    const next = !noExpensesToday;
    setNoExpensesToday(next);
    try {
      localStorage.setItem(`nixwallet:noexpenses:${todayKey}`, next ? "1" : "0");
    } catch {}
    if (next) {
      const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      toast.success(msg);
    }
  };

  const goals = [
    {
      key: "log",
      label: "Registrar um gasto hoje",
      desc: loggedToday
        ? "Você já registrou um gasto hoje."
        : "Anote pelo menos uma despesa para manter o controle.",
      done: loggedToday || noExpensesToday,
      interactive: false,
    },
    {
      key: "noexpense",
      label: "Não tive gastos hoje",
      desc: noExpensesToday
        ? "Você marcou que não teve gastos hoje. Continue assim!"
        : "Marque aqui se hoje não houve nenhuma despesa.",
      done: noExpensesToday,
      interactive: true,
      onToggle: handleNoExpenses,
    },
    {
      key: "pay",
      label: "Quitar contas vencidas até hoje",
      desc: allOverdueSettled
        ? "Tudo em dia este mês!"
        : `${overdueUnpaid.length} conta${overdueUnpaid.length === 1 ? "" : "s"} pendente${overdueUnpaid.length === 1 ? "" : "s"}.`,
      done: allOverdueSettled,
      interactive: false,
    },
    {
      key: "review",
      label: "Conferir o resumo do mês",
      desc: reviewedMonth ? "Você está olhando o mês atual." : "Volte para o mês atual para acompanhar suas finanças.",
      done: reviewedMonth,
      interactive: false,
    },
  ];

  const completed = goals.filter((g) => g.done).length;
  const pct = (completed / goals.length) * 100;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Metas diárias</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Pequenos passos para manter o app sempre atualizado.</p>
        </div>
        <Badge variant="secondary">{completed}/{goals.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ul className="space-y-2">
          {goals.map((g) => (
            <li
              key={g.key}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                g.done ? "border-success/40 bg-success/10" : "border-border/60 bg-card",
                (g as any).interactive && "cursor-pointer hover:border-primary/40"
              )}
              onClick={(g as any).interactive ? (g as any).onToggle : undefined}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  g.done ? "border-success bg-success text-success-foreground" : "border-muted-foreground/40"
                )}
                aria-hidden
              >
                {g.done ? "✓" : ""}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", g.done && "text-success")}>{g.label}</p>
                <p className="text-xs text-muted-foreground">{g.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
