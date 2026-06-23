import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type NavCounts = {
  fixedDueSoon: number;
  goalsActive: number;
  budgetsExceeded: number;
};

const EMPTY: NavCounts = { fixedDueSoon: 0, goalsActive: 0, budgetsExceeded: 0 };

export function useNavCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NavCounts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!user) { setCounts(EMPTY); return; }

    const today = new Date();
    const day = today.getDate();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const [{ data: fixed }, { data: goals }, { data: budgets }, { data: expenses }, { data: fixedAll }] = await Promise.all([
      supabase.from("fixed_expenses").select("due_day, active").eq("active", true),
      supabase.from("goals").select("completed, current_amount, target_amount"),
      supabase.from("category_budgets").select("category, monthly_limit"),
      supabase
        .from("expenses")
        .select("category, amount")
        .gte("spent_on", `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`)
        .lte("spent_on", `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`),
      supabase.from("fixed_expenses").select("category, amount, active").eq("active", true),
    ]);

    const fixedDueSoon = (fixed ?? []).filter((f: any) => {
      const d = Number(f.due_day);
      const diff = d - day;
      return diff >= 0 && diff <= 7;
    }).length;

    const goalsActive = (goals ?? []).filter((g: any) =>
      !g.completed && Number(g.current_amount) < Number(g.target_amount)
    ).length;

    const spentByCat: Record<string, number> = {};
    for (const e of expenses ?? []) {
      spentByCat[e.category] = (spentByCat[e.category] ?? 0) + Number(e.amount);
    }
    for (const f of fixedAll ?? []) {
      spentByCat[f.category] = (spentByCat[f.category] ?? 0) + Number(f.amount);
    }
    const budgetsExceeded = (budgets ?? []).filter((b: any) =>
      (spentByCat[b.category] ?? 0) > Number(b.monthly_limit)
    ).length;

    setCounts({ fixedDueSoon, goalsActive, budgetsExceeded });
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  return { counts, refresh };
}
