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
import { CATEGORIES, CAT_MAP, formatBRL, type Category } from "@/lib/categories";
import { AddExpenseDialog, ExpenseDialog } from "@/components/add-expense-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Gastei" },
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
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const load = async () => {
    if (!user) return;
    setFetching(true);
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("expenses")
      .select("id, description, amount, category, payment_method, spent_on, notes, card_id, installments")
      .gte("spent_on", from)
      .lte("spent_on", to)
      .order("spent_on", { ascending: false });
    setFetching(false);
    if (error) toast.error(error.message);
    else setExpenses((data ?? []) as Expense[]);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, month]);

  const dayExpenses = useMemo(
    () => expenses.filter((e) => isSameDay(parseISO(e.spent_on), selected)),
    [expenses, selected]
  );

  const totals = useMemo(() => {
    const byCat: Record<string, number> = {};
    let total = 0;
    for (const e of expenses) {
      byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount);
      total += Number(e.amount);
    }
    return { byCat, total };
  }, [expenses]);

  const dayTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) {
      m.set(e.spent_on, (m.get(e.spent_on) ?? 0) + Number(e.amount));
    }
    return m;
  }, [expenses]);

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
              modifiers={{ hasExpense: (d) => dayTotals.has(format(d, "yyyy-MM-dd")) }}
              modifiersClassNames={{
                hasExpense: "relative font-semibold text-primary after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-accent",
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
              {dayExpenses.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum gasto neste dia. Toque em <strong>Novo gasto</strong> para registrar.
                </p>
              ) : (
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
