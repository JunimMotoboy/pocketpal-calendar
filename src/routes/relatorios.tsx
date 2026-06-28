import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, PieChart as PieIcon, Filter, CreditCard, TrendingUp, Target, AlertTriangle, LineChart as LineIcon, ArrowUpRight, ArrowDownRight, Sparkles, PiggyBank, Trophy } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatBRL, CATEGORIES, PAYMENT_METHODS, INCOME_SOURCES } from "@/lib/categories";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Nix Wallet" },
      { name: "description", content: "Veja seus gastos e entradas do mês em gráficos de pizza." },
    ],
  }),
  component: ReportsPage,
});

type ExpenseRow = { amount: number; category: string; payment_method: string | null };
type IncomeRow = { amount: number; source: string };

function buildPieData(map: Record<string, number>, metaMap: Record<string, { label: string; color: string }>) {
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: metaMap[key]?.label ?? key,
      value: Number(value.toFixed(2)),
      color: metaMap[key]?.color ?? "var(--cat-outros)",
    }))
    .sort((a, b) => b.value - a.value);
}

function PieCard({ title, data, total }: { title: string; data: { name: string; value: number; color: string }[]; total: number }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="flex h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <PieIcon className="h-10 w-10 opacity-30" />
          Sem dados para este período.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">Total {formatBRL(total)}</p>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={110}
                paddingAngle={2}
                stroke="var(--background)"
                strokeWidth={2}
              >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--foreground)",
                }}
                formatter={(v: number, n) => [formatBRL(v), n as string]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetBars({
  catTotals,
  budgets,
}: {
  catTotals: Record<string, number>;
  budgets: Record<string, number>;
}) {
  const rows = useMemo(() => {
    const data = CATEGORIES.map((c) => {
      const limit = budgets[c.value] ?? 0;
      if (limit <= 0) return null;
      const used = catTotals[c.value] ?? 0;
      const pct = Math.min(200, (used / limit) * 100);
      const status: "ok" | "warn" | "over" = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
      return { cat: c, limit, used, pct, status };
    }).filter(Boolean) as {
      cat: (typeof CATEGORIES)[number];
      limit: number;
      used: number;
      pct: number;
      status: "ok" | "warn" | "over";
    }[];
    return data.sort((a, b) => b.pct - a.pct);
  }, [catTotals, budgets]);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Orçamento por categoria</CardTitle></CardHeader>
        <CardContent className="flex h-[220px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Target className="h-10 w-10 opacity-30" />
          Nenhum orçamento definido.
          <br />
          <span className="text-xs">Vá em Orçamentos para configurar limites mensais.</span>
        </CardContent>
      </Card>
    );
  }

  const totalBudget = rows.reduce((s, r) => s + r.limit, 0);
  const totalUsed = rows.reduce((s, r) => s + r.used, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orçamento por categoria</CardTitle>
        <p className="text-sm text-muted-foreground">
          Utilizado {formatBRL(totalUsed)} de {formatBRL(totalBudget)}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {rows.map(({ cat, limit, used, pct, status }) => {
            const Icon = cat.icon;
            const barColor =
              status === "over" ? "bg-rose-500"
                : status === "warn" ? "bg-amber-500"
                : "bg-emerald-500";
            return (
              <li key={cat.value} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: cat.color }} />
                  <span className="text-sm font-medium">{cat.label}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {formatBRL(used)} / {formatBRL(limit)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={
                      status === "over"
                        ? "font-semibold text-rose-600"
                        : status === "warn"
                          ? "font-semibold text-amber-600"
                          : "text-muted-foreground"
                    }
                  >
                    {status === "over" && <><AlertTriangle className="mr-1 inline h-3 w-3" /> Excedido</>}
                    {status === "warn" && <><AlertTriangle className="mr-1 inline h-3 w-3" /> Próximo do limite</>}
                    {status === "ok" && "Dentro do orçamento"}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function ReportsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"month" | "range">("month");
  const [month, setMonth] = useState<Date>(new Date());
  const [rangeFrom, setRangeFrom] = useState<Date>(startOfMonth(subMonths(new Date(), 2)));
  const [rangeTo, setRangeTo] = useState<Date>(new Date());
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [fixed, setFixed] = useState<{ amount: number; category: string; payment_method: string | null }[]>([]);
  const [investTotal, setInvestTotal] = useState(0);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [fetching, setFetching] = useState(false);
  const [trend, setTrend] = useState<{ key: string; label: string; gastos: number; entradas: number }[]>([]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  // Período efetivo do filtro
  const period = useMemo(() => {
    if (mode === "month") {
      return { from: startOfMonth(month), to: endOfMonth(month), monthsSpan: 1, anchor: month };
    }
    const a = rangeFrom <= rangeTo ? rangeFrom : rangeTo;
    const b = rangeFrom <= rangeTo ? rangeTo : rangeFrom;
    const from = startOfMonth(a);
    const to = endOfMonth(b);
    const monthsSpan = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
    return { from, to, monthsSpan, anchor: b };
  }, [mode, month, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!user) return;
    const from = format(period.from, "yyyy-MM-dd");
    const to = format(period.to, "yyyy-MM-dd");
    const trendStart = format(startOfMonth(subMonths(period.anchor, 5)), "yyyy-MM-dd");
    const trendEnd = format(endOfMonth(period.anchor), "yyyy-MM-dd");

    (async () => {
      setFetching(true);
      const [e, i, f, inv, b, te, ti, tinv] = await Promise.all([
        supabase.from("expenses").select("amount, category, payment_method").gte("spent_on", from).lte("spent_on", to),
        supabase.from("incomes").select("amount, source").gte("received_on", from).lte("received_on", to),
        supabase.from("fixed_expenses").select("amount, category, payment_method").eq("active", true),
        supabase.from("investments").select("amount").gte("invested_on", from).lte("invested_on", to),
        supabase.from("category_budgets").select("category, monthly_limit"),
        supabase.from("expenses").select("amount, spent_on").gte("spent_on", trendStart).lte("spent_on", trendEnd),
        supabase.from("incomes").select("amount, received_on").gte("received_on", trendStart).lte("received_on", trendEnd),
        supabase.from("investments").select("amount, invested_on").gte("invested_on", trendStart).lte("invested_on", trendEnd),
      ]);
      setExpenses(((e.data ?? []) as ExpenseRow[]).map((r) => ({ ...r, amount: Number(r.amount) })));
      setIncomes(((i.data ?? []) as IncomeRow[]).map((r) => ({ ...r, amount: Number(r.amount) })));
      const fixedRowsRaw = ((f.data ?? []) as { amount: number; category: string; payment_method: string | null }[]).map((r) => ({ ...r, amount: Number(r.amount) }));
      // Despesas fixas multiplicam pelo número de meses no período
      const fixedRows = fixedRowsRaw.map((r) => ({ ...r, amount: r.amount * period.monthsSpan }));
      setFixed(fixedRows);
      setInvestTotal(((inv.data ?? []) as { amount: number }[]).reduce((s, r) => s + Number(r.amount), 0));
      const bud: Record<string, number> = {};
      for (const row of (b.data ?? []) as { category: string; monthly_limit: number }[]) {
        bud[row.category] = Number(row.monthly_limit) * period.monthsSpan;
      }
      setBudgets(bud);

      // Build 6-month trend ending at the period anchor
      const fixedSumMonthly = fixedRowsRaw.reduce((s, r) => s + r.amount, 0);
      const months: { key: string; label: string; gastos: number; entradas: number }[] = [];
      for (let k = 5; k >= 0; k--) {
        const d = subMonths(period.anchor, k);
        months.push({
          key: format(d, "yyyy-MM"),
          label: format(d, "MMM", { locale: ptBR }),
          gastos: fixedSumMonthly,
          entradas: 0,
        });
      }
      const idx: Record<string, number> = {};
      months.forEach((m, ix) => { idx[m.key] = ix; });
      for (const r of (te.data ?? []) as { amount: number; spent_on: string }[]) {
        const k = r.spent_on.slice(0, 7);
        if (idx[k] !== undefined) months[idx[k]].gastos += Number(r.amount);
      }
      for (const r of (tinv.data ?? []) as { amount: number; invested_on: string }[]) {
        const k = r.invested_on.slice(0, 7);
        if (idx[k] !== undefined) months[idx[k]].gastos += Number(r.amount);
      }
      for (const r of (ti.data ?? []) as { amount: number; received_on: string }[]) {
        const k = r.received_on.slice(0, 7);
        if (idx[k] !== undefined) months[idx[k]].entradas += Number(r.amount);
      }
      setTrend(months);
      setFetching(false);
    })();
  }, [user, period]);

  const catTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) m[e.category] = (m[e.category] ?? 0) + e.amount;
    for (const f of fixed) m[f.category] = (m[f.category] ?? 0) + f.amount;
    if (investTotal > 0) m["investimento"] = (m["investimento"] ?? 0) + investTotal;
    return m;
  }, [expenses, fixed, investTotal]);

  const payTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) {
      const k = e.payment_method ?? "outros";
      m[k] = (m[k] ?? 0) + e.amount;
    }
    for (const f of fixed) {
      const k = f.payment_method ?? "boleto";
      m[k] = (m[k] ?? 0) + f.amount;
    }
    if (investTotal > 0) m["investimento"] = (m["investimento"] ?? 0) + investTotal;
    return m;
  }, [expenses, fixed, investTotal]);

  const incTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of incomes) m[i.source] = (m[i.source] ?? 0) + i.amount;
    return m;
  }, [incomes]);

  const totalExp = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0) + fixed.reduce((s, f) => s + f.amount, 0) + investTotal,
    [expenses, fixed, investTotal]
  );
  const totalInc = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const saldo = totalInc - totalExp;

  const catMeta: Record<string, { label: string; color: string }> = {};
  for (const c of CATEGORIES) catMeta[c.value] = { label: c.label, color: c.color };
  catMeta["investimento"] = { label: "Investimentos", color: "oklch(0.6 0.18 260)" };
  const payMeta: Record<string, { label: string; color: string }> = {};
  const palette = ["oklch(0.55 0.18 280)", "oklch(0.7 0.17 40)", "oklch(0.65 0.18 150)", "oklch(0.65 0.15 230)", "oklch(0.7 0.17 330)", "oklch(0.75 0.16 75)", "oklch(0.6 0.02 220)"];
  PAYMENT_METHODS.forEach((p, idx) => { payMeta[p.value] = { label: p.label, color: palette[idx % palette.length] }; });
  payMeta["investimento"] = { label: "Investimento", color: "oklch(0.6 0.18 260)" };
  const incMeta: Record<string, { label: string; color: string }> = {};
  INCOME_SOURCES.forEach((s) => { incMeta[s.value] = { label: s.label, color: s.color }; });

  const catData = buildPieData(catTotals, catMeta);
  const payData = buildPieData(payTotals, payMeta);
  const incData = buildPieData(incTotals, incMeta);

  if (loading || !user) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="sr-only">Relatórios</h1>
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("month")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${mode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-pressed={mode === "month"}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setMode("range")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${mode === "range" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-pressed={mode === "range"}
            >
              Intervalo
            </button>
          </div>

          {mode === "month" ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <div className="min-w-[180px] rounded-lg border border-border bg-card px-4 py-2 text-center font-semibold capitalize">
                {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={format(rangeFrom, "yyyy-MM")}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-").map(Number);
                  if (y && m) setRangeFrom(new Date(y, m - 1, 1));
                }}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"
                aria-label="Mês inicial"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <input
                type="month"
                value={format(rangeTo, "yyyy-MM")}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-").map(Number);
                  if (y && m) setRangeTo(new Date(y, m - 1, 1));
                }}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"
                aria-label="Mês final"
              />
              <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                {period.monthsSpan} {period.monthsSpan === 1 ? "mês" : "meses"}
              </span>
            </div>
          )}
        </div>
        {fetching && <p className="text-xs text-muted-foreground" role="status">Atualizando...</p>}
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        {(() => {
          const prev = trend.length >= 2 ? trend[trend.length - 2] : null;
          const curr = trend.length >= 1 ? trend[trend.length - 1] : null;
          const delta = (now: number, before: number) => {
            if (!before) return null;
            return ((now - before) / before) * 100;
          };
          const dInc = prev && curr ? delta(curr.entradas, prev.entradas) : null;
          const dExp = prev && curr ? delta(curr.gastos, prev.gastos) : null;
          const Pill = ({ v, invert = false }: { v: number | null; invert?: boolean }) => {
            if (v === null || !isFinite(v)) return null;
            const up = v >= 0;
            const good = invert ? !up : up;
            const Icon = up ? ArrowUpRight : ArrowDownRight;
            return (
              <span className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${good ? "text-emerald-600" : "text-rose-600"}`}>
                <Icon className="h-3 w-3" />
                {Math.abs(v).toFixed(0)}% vs mês anterior
              </span>
            );
          };
          return (
            <>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-emerald-600">{formatBRL(totalInc)}</p>
                <Pill v={dInc} />
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Gastos</p>
                <p className="text-2xl font-bold text-rose-600">{formatBRL(totalExp)}</p>
                <Pill v={dExp} invert />
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatBRL(saldo)}</p>
              </CardContent></Card>
            </>
          );
        })()}
      </section>

      <Tabs defaultValue="resumo">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="resumo">
            <Sparkles className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="sm:hidden sr-only">Resumo</span>
            <span className="hidden sm:inline">Resumo</span>
          </TabsTrigger>
          <TabsTrigger value="categorias">
            <Filter className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="sm:hidden sr-only">Gastos por categoria</span>
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="pagamento">
            <CreditCard className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="sm:hidden sr-only">Forma de pagamento</span>
            <span className="hidden sm:inline">Pagamento</span>
          </TabsTrigger>
          <TabsTrigger value="entradas">
            <TrendingUp className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="sm:hidden sr-only">Entradas por fonte</span>
            <span className="hidden sm:inline">Entradas</span>
          </TabsTrigger>
          <TabsTrigger value="tendencia">
            <LineIcon className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="sm:hidden sr-only">Tendência</span>
            <span className="hidden sm:inline">Tendência</span>
          </TabsTrigger>
          <TabsTrigger value="orcamentos">
            <Target className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="sm:hidden sr-only">Orçamentos</span>
            <span className="hidden sm:inline">Orçamentos</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="resumo" className="mt-4">
          <InsightsPanel
            totalInc={totalInc}
            totalExp={totalExp}
            catTotals={catTotals}
            payTotals={payTotals}
            budgets={budgets}
            trend={trend}
          />
        </TabsContent>
        <TabsContent value="categorias" className="mt-4">
          <PieCard title="Distribuição dos gastos por categoria" data={catData} total={totalExp} />
        </TabsContent>
        <TabsContent value="pagamento" className="mt-4">
          <PieCard title="Gastos por forma de pagamento" data={payData} total={totalExp} />
        </TabsContent>
        <TabsContent value="entradas" className="mt-4">
          <PieCard title="Entradas por fonte" data={incData} total={totalInc} />
        </TabsContent>
        <TabsContent value="tendencia" className="mt-4">
          <TrendCard data={trend} />
        </TabsContent>
        <TabsContent value="orcamentos" className="mt-4">
          <BudgetBars catTotals={catTotals} budgets={budgets} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function TrendCard({ data }: { data: { key: string; label: string; gastos: number; entradas: number }[] }) {
  const hasData = data.some((d) => d.gastos > 0 || d.entradas > 0);
  const avgExp = data.length ? data.reduce((s, d) => s + d.gastos, 0) / data.length : 0;
  const avgInc = data.length ? data.reduce((s, d) => s + d.entradas, 0) / data.length : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tendência dos últimos 6 meses</CardTitle>
        <p className="text-sm text-muted-foreground">
          Média mensal: entradas {formatBRL(avgInc)} · gastos {formatBRL(avgExp)}
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <LineIcon className="h-10 w-10 opacity-30" />
            Sem histórico suficiente ainda.
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                  }}
                  formatter={(v: number, n) => [formatBRL(v), n as string]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke="oklch(0.65 0.18 150)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="gastos" name="Gastos" stroke="oklch(0.6 0.2 25)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightsPanel({
  totalInc,
  totalExp,
  catTotals,
  payTotals,
  budgets,
  trend,
}: {
  totalInc: number;
  totalExp: number;
  catTotals: Record<string, number>;
  payTotals: Record<string, number>;
  budgets: Record<string, number>;
  trend: { key: string; label: string; gastos: number; entradas: number }[];
}) {
  const saldo = totalInc - totalExp;
  const savingsRate = totalInc > 0 ? (saldo / totalInc) * 100 : 0;
  const topCats = Object.entries(catTotals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totalCats = topCats.reduce((s, [, v]) => s + v, 0);
  const catMetaIdx: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {};
  for (const c of CATEGORIES) catMetaIdx[c.value] = { label: c.label, color: c.color, icon: c.icon };
  const topPay = Object.entries(payTotals).sort((a, b) => b[1] - a[1])[0];
  const payLabel = topPay ? (PAYMENT_METHODS.find((p) => p.value === topPay[0])?.label ?? topPay[0]) : "—";

  // 3-month average vs current
  const last3 = trend.slice(-3);
  const avg3 = last3.length ? last3.reduce((s, d) => s + d.gastos, 0) / last3.length : 0;
  const curr = trend.length ? trend[trend.length - 1].gastos : totalExp;
  const variation = avg3 > 0 ? ((curr - avg3) / avg3) * 100 : 0;

  // budget alerts
  const exceeded = Object.entries(budgets).filter(([cat, limit]) => limit > 0 && (catTotals[cat] ?? 0) > limit);

  const rateColor = savingsRate >= 20 ? "text-emerald-600" : savingsRate >= 0 ? "text-amber-600" : "text-rose-600";
  const rateLabel = savingsRate >= 20 ? "Ótima" : savingsRate >= 10 ? "Boa" : savingsRate >= 0 ? "Atenção" : "Negativa";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="h-4 w-4 text-primary" /> Taxa de poupança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <p className={`text-4xl font-bold tabular-nums ${rateColor}`}>{savingsRate.toFixed(1)}%</p>
            <span className={`text-xs font-medium ${rateColor}`}>{rateLabel}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Você guardou {formatBRL(Math.max(0, saldo))} de {formatBRL(totalInc)} em entradas.
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${savingsRate >= 20 ? "bg-emerald-500" : savingsRate >= 0 ? "bg-amber-500" : "bg-rose-500"}`}
              style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Meta saudável: ≥ 20% das entradas.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <LineIcon className="h-4 w-4 text-primary" /> Comparativo do mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-bold tabular-nums">{formatBRL(curr)}</p>
          <p className="text-xs text-muted-foreground">
            Média dos últimos 3 meses: <span className="font-medium tabular-nums">{formatBRL(avg3)}</span>
          </p>
          {avg3 > 0 && (
            <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${variation > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {variation > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(variation).toFixed(0)}% {variation > 0 ? "acima" : "abaixo"} da sua média
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Forma de pagamento mais usada: <span className="font-medium text-foreground">{payLabel}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" /> Top 5 categorias
          </CardTitle>
          <p className="text-xs text-muted-foreground">Onde seu dinheiro foi no mês.</p>
        </CardHeader>
        <CardContent>
          {topCats.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem gastos para o período.</p>
          ) : (
            <ul className="space-y-3">
              {topCats.map(([key, value]) => {
                const meta = catMetaIdx[key] ?? { label: key, color: "var(--cat-outros)", icon: Filter };
                const Icon = meta.icon;
                const pct = totalCats > 0 ? (value / totalCats) * 100 : 0;
                return (
                  <li key={key} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: meta.color }}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </span>
                      <span className="text-sm font-medium">{meta.label}</span>
                      <span className="ml-auto text-sm font-semibold tabular-nums">{formatBRL(value)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{pct.toFixed(0)}% do total</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {exceeded.length > 0 && (
        <Card className="md:col-span-2 border-rose-300/60 bg-rose-50/40 dark:bg-rose-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-rose-600">
              <AlertTriangle className="h-4 w-4" /> Orçamentos estourados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {exceeded.map(([cat, limit]) => {
                const meta = catMetaIdx[cat] ?? { label: cat, color: "var(--cat-outros)" };
                const used = catTotals[cat] ?? 0;
                const over = used - limit;
                return (
                  <li key={cat} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                    </span>
                    <span className="tabular-nums text-rose-600">+{formatBRL(over)} acima</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
