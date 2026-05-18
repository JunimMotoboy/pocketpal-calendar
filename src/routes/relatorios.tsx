import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CAT_MAP, PAY_MAP, INC_MAP, formatBRL, CATEGORIES, PAYMENT_METHODS, INCOME_SOURCES } from "@/lib/categories";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Gastei" },
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
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
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

function ReportsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [month, setMonth] = useState<Date>(new Date());
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [incomes, setIncomes] = useState<IncomeRow[]>([]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");

    (async () => {
      const [e, i] = await Promise.all([
        supabase.from("expenses").select("amount, category, payment_method").gte("spent_on", from).lte("spent_on", to),
        supabase.from("incomes").select("amount, source").gte("received_on", from).lte("received_on", to),
      ]);
      setExpenses(((e.data ?? []) as ExpenseRow[]).map((r) => ({ ...r, amount: Number(r.amount) })));
      setIncomes(((i.data ?? []) as IncomeRow[]).map((r) => ({ ...r, amount: Number(r.amount) })));
    })();
  }, [user, month]);

  const catTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) m[e.category] = (m[e.category] ?? 0) + e.amount;
    return m;
  }, [expenses]);

  const payTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) {
      const k = e.payment_method ?? "outros";
      m[k] = (m[k] ?? 0) + e.amount;
    }
    return m;
  }, [expenses]);

  const incTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of incomes) m[i.source] = (m[i.source] ?? 0) + i.amount;
    return m;
  }, [incomes]);

  const totalExp = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalInc = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const saldo = totalInc - totalExp;

  const catMeta = Object.fromEntries(CATEGORIES.map((c) => [c.value, { label: c.label, color: `oklch(var(--cat-${c.value}-fallback))` }])) as Record<string, { label: string; color: string }>;
  // We need actual color values — read from CAT_MAP
  for (const c of CATEGORIES) catMeta[c.value] = { label: c.label, color: c.color };
  const payMeta: Record<string, { label: string; color: string }> = {};
  const palette = ["oklch(0.55 0.18 280)", "oklch(0.7 0.17 40)", "oklch(0.65 0.18 150)", "oklch(0.65 0.15 230)", "oklch(0.7 0.17 330)", "oklch(0.75 0.16 75)", "oklch(0.6 0.02 220)"];
  PAYMENT_METHODS.forEach((p, idx) => { payMeta[p.value] = { label: p.label, color: palette[idx % palette.length] }; });
  const incMeta: Record<string, { label: string; color: string }> = {};
  INCOME_SOURCES.forEach((s) => { incMeta[s.value] = { label: s.label, color: s.color }; });
  void CAT_MAP; void PAY_MAP; void INC_MAP;

  const catData = buildPieData(catTotals, catMeta);
  const payData = buildPieData(payTotals, payMeta);
  const incData = buildPieData(incTotals, incMeta);

  if (loading || !user) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[180px] rounded-lg border border-border bg-card px-4 py-2 text-center font-semibold capitalize">
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="text-2xl font-bold text-emerald-600">{formatBRL(totalInc)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Gastos</p>
          <p className="text-2xl font-bold text-rose-600">{formatBRL(totalExp)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatBRL(saldo)}</p>
        </CardContent></Card>
      </section>

      <Tabs defaultValue="categorias">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categorias">Gastos por categoria</TabsTrigger>
          <TabsTrigger value="pagamento">Forma de pagamento</TabsTrigger>
          <TabsTrigger value="entradas">Entradas por fonte</TabsTrigger>
        </TabsList>
        <TabsContent value="categorias" className="mt-4">
          <PieCard title="Distribuição dos gastos por categoria" data={catData} total={totalExp} />
        </TabsContent>
        <TabsContent value="pagamento" className="mt-4">
          <PieCard title="Gastos por forma de pagamento" data={payData} total={totalExp} />
        </TabsContent>
        <TabsContent value="entradas" className="mt-4">
          <PieCard title="Entradas por fonte" data={incData} total={totalInc} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
