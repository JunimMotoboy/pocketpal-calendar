import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Target, Save, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CATEGORIES, CAT_MAP, formatBRL, type Category } from "@/lib/categories";
import { formatBRLInput, parseBRLInput } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos por categoria — Nix Wallet" },
      { name: "description", content: "Defina limites mensais por categoria e acompanhe o quanto já gastou." },
    ],
  }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    const from = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const to = format(endOfMonth(new Date()), "yyyy-MM-dd");
    (async () => {
      setBusy(true);
      const [b, e, f] = await Promise.all([
        supabase.from("category_budgets").select("category, monthly_limit"),
        supabase.from("expenses").select("category, amount").gte("spent_on", from).lte("spent_on", to),
        supabase.from("fixed_expenses").select("category, amount").eq("active", true),
      ]);
      const ls: Record<string, string> = {};
      for (const row of b.data ?? []) {
        ls[row.category] = formatBRLInput(String(Math.round(Number(row.monthly_limit) * 100)));
      }
      setLimits(ls);
      const sp: Record<string, number> = {};
      for (const r of (e.data ?? []) as { category: string; amount: number }[]) {
        sp[r.category] = (sp[r.category] ?? 0) + Number(r.amount);
      }
      for (const r of (f.data ?? []) as { category: string; amount: number }[]) {
        sp[r.category] = (sp[r.category] ?? 0) + Number(r.amount);
      }
      setSpent(sp);
      setBusy(false);
    })();
  }, [user]);

  const save = async (cat: Category) => {
    if (!user) return;
    const value = parseBRLInput(limits[cat] ?? "");
    if (isNaN(value) || value < 0) { toast.error("Valor inválido."); return; }
    setSavingKey(cat);
    if (value === 0) {
      const { error } = await supabase.from("category_budgets").delete().eq("user_id", user.id).eq("category", cat);
      if (error) toast.error(error.message); else toast.success("Orçamento removido");
    } else {
      const { error } = await supabase
        .from("category_budgets")
        .upsert({ user_id: user.id, category: cat, monthly_limit: value }, { onConflict: "user_id,category" });
      if (error) toast.error(error.message); else toast.success("Orçamento salvo");
    }
    setSavingKey(null);
  };

  const rows = useMemo(() => CATEGORIES.map((c) => {
    const limit = parseBRLInput(limits[c.value] ?? "");
    const used = spent[c.value] ?? 0;
    const pct = limit > 0 ? Math.min(200, (used / limit) * 100) : 0;
    const status: "ok" | "warn" | "over" = limit === 0 ? "ok" : pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
    return { cat: c, limit, used, pct, status };
  }), [limits, spent]);

  if (loading || !user) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section
        className="mb-8 overflow-hidden rounded-2xl border border-border/60 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <p className="flex items-center gap-2 text-sm opacity-90"><Target className="h-4 w-4" /> Orçamento mensal por categoria</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Defina seus limites</h1>
        <p className="mt-1 text-sm opacity-90">Deixe em branco (ou zero) para não controlar uma categoria.</p>
      </section>

      <Card>
        <CardHeader><CardTitle className="text-base">Categorias</CardTitle></CardHeader>
        <CardContent>
          {busy ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="space-y-5">
              {rows.map(({ cat, limit, used, pct, status }) => {
                const Icon = cat.icon;
                const barColor =
                  status === "over" ? "bg-rose-500"
                  : status === "warn" ? "bg-amber-500"
                  : "bg-emerald-500";
                return (
                  <li key={cat.value} className="space-y-2 rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `color-mix(in oklab, ${cat.color} 15%, transparent)` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: cat.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Gasto: <span className="tabular-nums">{formatBRL(used)}</span>
                          {limit > 0 && <> · de <span className="tabular-nums">{formatBRL(limit)}</span></>}
                        </p>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`budget-${cat.value}`} className="text-xs">Limite (R$)</Label>
                          <Input
                            id={`budget-${cat.value}`}
                            inputMode="decimal"
                            value={limits[cat.value] ?? ""}
                            onChange={(e) => setLimits((p) => ({ ...p, [cat.value]: formatBRLInput(e.target.value) }))}
                            placeholder="0,00"
                            className="h-9 w-32"
                          />
                        </div>
                        <Button size="sm" onClick={() => save(cat.value)} disabled={savingKey === cat.value} aria-label={`Salvar limite de ${cat.label}`}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {limit > 0 && (
                      <>
                        <Progress value={Math.min(100, pct)} className="h-2" indicatorClassName={barColor} />
                        <div className="flex items-center justify-between text-xs">
                          <span className={status === "over" ? "font-semibold text-rose-600" : status === "warn" ? "font-semibold text-amber-600" : "text-muted-foreground"}>
                            {status === "over" && <><AlertTriangle className="mr-1 inline h-3 w-3" /> Limite excedido</>}
                            {status === "warn" && <><AlertTriangle className="mr-1 inline h-3 w-3" /> Próximo do limite</>}
                            {status === "ok" && <>Dentro do orçamento</>}
                          </span>
                          <span className="tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
