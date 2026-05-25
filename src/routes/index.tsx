import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, isSameDay, parseISO, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Pencil, CalendarClock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORIES, CAT_MAP, formatBRL, type Category } from "@/lib/categories";
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

function Dashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fixedRaw, setFixedRaw] = useState<{ id: string; name: string; amount: number; category: Category; due_day: number }[]>([]);
  const [paidMap, setPaidMap] = useState<Map<string, string>>(new Map()); // key fixed_expense_id -> payment id
  const [cards, setCards] = useState<{ id: string; name: string; due_day: number }[]>([]);
  const [fetching, setFetching] = useState(false);

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
    const [expRes, fixRes, payRes, cardsRes] = await Promise.all([
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
  };

  useEffect(() => {
    if (user) load();
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

  const fixedDaysSet = useMemo(() => new Set(fixedDues.map((f) => f.dateKey)), [fixedDues]);

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
            <p className="text-sm/6 opacity-80">Total de {format(month, "MMMM 'de' yyyy", { locale: ptBR })}</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(totals.total)}</p>
            <p className="mt-1 text-sm opacity-80">{expenses.length} gasto{expenses.length === 1 ? "" : "s"} registrado{expenses.length === 1 ? "" : "s"}</p>
          </div>
          <AddExpenseDialog userId={user.id} defaultDate={selected} onAdded={load} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Calendar */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Calendário do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              month={month}
              onMonthChange={setMonth}
              locale={ptBR}
              className={cn("p-0 pointer-events-auto")}
              modifiers={{
                hasExpense: (d) => dayTotals.has(format(d, "yyyy-MM-dd")),
                hasFixed: (d) => fixedDaysSet.has(format(d, "yyyy-MM-dd")),
              }}
              modifiersClassNames={{
                hasExpense: "relative font-semibold text-primary after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-accent",
                hasFixed: "relative font-semibold text-destructive before:absolute before:top-1 before:right-1 before:h-1.5 before:w-1.5 before:rounded-full before:bg-destructive",
              }}
            />
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
              {dayFixed.length > 0 && (
                <ul className="mb-3 divide-y divide-border rounded-lg border border-dashed border-destructive/40 bg-destructive/5">
                  {dayFixed.map((f) => {
                    const cat = CAT_MAP[f.category];
                    const Icon = cat.icon;
                    const paid = paidMap.has(f.id);
                    return (
                      <li key={`fx-${f.id}`} className="flex items-center gap-3 px-3 py-2">
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
                          <p className={cn("truncate font-medium", paid && "line-through text-muted-foreground")}>{f.name}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="h-3 w-3" /> {paid ? "Paga este mês" : "Vence hoje"} · {cat.label}
                          </p>
                        </div>
                        <p className={cn("font-semibold tabular-nums", paid && "line-through text-muted-foreground")}>{formatBRL(f.amount)}</p>
                        <Link to="/despesas-fixas" aria-label="Gerenciar despesas fixas">
                          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {dayExpenses.length === 0 && dayFixed.length === 0 ? (
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por categoria neste mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((c) => {
                  const v = totals.byCat[c.value] ?? 0;
                  const pct = totals.total > 0 ? (v / totals.total) * 100 : 0;
                  const Icon = c.icon;
                  return (
                    <div key={c.value} className="rounded-xl border border-border/60 bg-card p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: c.color }} />
                          <span className="text-sm font-medium">{c.label}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{formatBRL(v)}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
