import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, ChevronLeft, ChevronRight, Search, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL } from "@/lib/categories";
import { formatBRLInput, parseBRLInput } from "@/lib/currency";
import { detectCardBrand, BRAND_GRADIENT } from "@/lib/card-brand";
import { downloadInvoiceCsv } from "@/lib/export-invoice";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { CardPanel } from "@/components/cards/card-panel";
import {
  installmentIncludesMonth,
  monthKeyOf,
  type CardExpense,
  type CardItem,
  type Installment,
} from "@/components/cards/types";

export const Route = createFileRoute("/cartoes")({
  head: () => ({
    meta: [
      { title: "Cartões — Nix Wallet" },
      {
        name: "description",
        content: "Cadastre seus cartões de crédito e acompanhe a fatura acumulada.",
      },
    ],
  }),
  component: CardsPage,
});

const today = new Date();
const currentMonthKey = monthKeyOf(today);

function CardsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const viewMonthKey = monthKeyOf(viewMonth);
  const viewMonthLabel = viewMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const [items, setItems] = useState<CardItem[]>([]);
  const [allExpenses, setAllExpenses] = useState<CardExpense[]>([]);

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [paidInstallments, setPaidInstallments] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CardItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CardItem | null>(null);
  const [confirmDeleteInst, setConfirmDeleteInst] = useState<Installment | null>(null);

  const [name, setName] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [closingDay, setClosingDay] = useState("");
  const [initialUsed, setInitialUsed] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  // Installment dialog state
  const [instOpen, setInstOpen] = useState(false);
  const [instCardId, setInstCardId] = useState<string | null>(null);
  const [instEditing, setInstEditing] = useState<Installment | null>(null);
  const [instDesc, setInstDesc] = useState("");
  const [instValue, setInstValue] = useState("");
  const [instCount, setInstCount] = useState("1");
  const [instStart, setInstStart] = useState(currentMonthKey);
  const [instBusy, setInstBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const load = async () => {
    if (!user) return;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 24);
    const cutoffISO = cutoff.toISOString().slice(0, 10);

    // Paraleliza todas as leituras — antes eram 4 requests em série.
    const [cardsRes, expRes, instRes, paidRes] = await Promise.all([
      supabase
        .from("cards")
        .select("id, name, limit_amount, due_day, closing_day, notes, initial_used")
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("id, card_id, description, amount, spent_on")
        .eq("payment_method", "credito")
        .not("card_id", "is", null)
        .gte("spent_on", cutoffISO),
      supabase
        .from("card_installments")
        .select("id, card_id, description, installment_value, remaining_count, start_month")
        .order("created_at", { ascending: false }),
      supabase.from("card_installment_payments").select("id, installment_id, month_key"),
    ]);

    if (cardsRes.error) {
      toast.error(cardsRes.error.message);
      return;
    }
    setItems((cardsRes.data ?? []) as CardItem[]);

    setAllExpenses(
      (
        (expRes.data ?? []) as {
          id: string;
          card_id: string;
          description: string;
          amount: number;
          spent_on: string;
        }[]
      ).map((e) => ({ ...e, amount: Number(e.amount) })),
    );

    setInstallments((instRes.data ?? []) as Installment[]);

    const map: Record<string, string> = {};
    for (const p of (paidRes.data ?? []) as {
      id: string;
      installment_id: string;
      month_key: string;
    }[]) {
      map[`${p.installment_id}|${p.month_key}`] = p.id;
    }
    setPaidInstallments(map);
  };
  useEffect(() => {
    if (user) load(); /* eslint-disable-next-line */
  }, [user]);

  const expensesByCardThisMonth = useMemo(() => {
    const map: Record<string, typeof allExpenses> = {};
    for (const e of allExpenses) {
      if (e.spent_on && e.spent_on.startsWith(viewMonthKey)) {
        (map[e.card_id] ||= []).push(e);
      }
    }
    return map;
  }, [allExpenses, viewMonthKey]);

  const spentMonth = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [id, arr] of Object.entries(expensesByCardThisMonth)) {
      map[id] = arr.reduce((s, e) => s + Number(e.amount), 0);
    }
    return map;
  }, [expensesByCardThisMonth]);

  const installmentsByCardThisMonth = useMemo(() => {
    const map: Record<string, Installment[]> = {};
    installments.forEach((i) => {
      if (installmentIncludesMonth(i, viewMonthKey)) {
        (map[i.card_id] ||= []).push(i);
      }
    });
    return map;
  }, [installments, viewMonthKey]);

  const installmentMonthByCard = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [id, arr] of Object.entries(installmentsByCardThisMonth)) {
      map[id] = arr.reduce(
        (s, i) =>
          s + (paidInstallments[`${i.id}|${viewMonthKey}`] ? 0 : Number(i.installment_value)),
        0,
      );
    }
    return map;
  }, [installmentsByCardThisMonth, paidInstallments, viewMonthKey]);

  const toggleInstallmentPaid = async (instId: string, isPaid: boolean) => {
    if (!user) return;
    const key = `${instId}|${viewMonthKey}`;
    if (isPaid) {
      const existingId = paidInstallments[key];
      if (!existingId) return;
      setPaidInstallments((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
      const { error } = await supabase
        .from("card_installment_payments")
        .delete()
        .eq("id", existingId);
      if (error) {
        toast.error(error.message);
        load();
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      setPaidInstallments((prev) => ({ ...prev, [key]: tempId }));
      const { data, error } = await supabase
        .from("card_installment_payments")
        .insert({ user_id: user.id, installment_id: instId, month_key: viewMonthKey })
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        setPaidInstallments((prev) => {
          const n = { ...prev };
          delete n[key];
          return n;
        });
      } else if (data) {
        setPaidInstallments((prev) => ({ ...prev, [key]: data.id }));
      }
    }
  };

  // Mark ALL installments of a card paid for the selected month
  const markAllInstallmentsPaid = async (cardId: string) => {
    if (!user) return;
    const list = (installmentsByCardThisMonth[cardId] ?? []).filter(
      (i) => !paidInstallments[`${i.id}|${viewMonthKey}`],
    );
    if (list.length === 0) {
      toast.info("Nenhuma parcela pendente neste mês.");
      return;
    }
    const rows = list.map((i) => ({
      user_id: user.id,
      installment_id: i.id,
      month_key: viewMonthKey,
    }));
    // optimistic
    const temp: Record<string, string> = {};
    list.forEach((i) => (temp[`${i.id}|${viewMonthKey}`] = `temp-${i.id}`));
    setPaidInstallments((prev) => ({ ...prev, ...temp }));
    const { data, error } = await supabase
      .from("card_installment_payments")
      .insert(rows)
      .select("id, installment_id");
    if (error) {
      toast.error(error.message);
      load();
      return;
    }
    setPaidInstallments((prev) => {
      const next = { ...prev };
      for (const r of (data ?? []) as { id: string; installment_id: string }[]) {
        next[`${r.installment_id}|${viewMonthKey}`] = r.id;
      }
      return next;
    });
    toast.success(
      `${list.length} parcela${list.length === 1 ? "" : "s"} marcada${list.length === 1 ? "" : "s"} como paga${list.length === 1 ? "" : "s"}.`,
    );
  };

  const totalLimit = useMemo(() => items.reduce((s, i) => s + Number(i.limit_amount), 0), [items]);
  const totalInvoice = useMemo(
    () =>
      items.reduce((s, i) => s + (spentMonth[i.id] ?? 0) + (installmentMonthByCard[i.id] ?? 0), 0),
    [items, spentMonth, installmentMonthByCard],
  );

  // Trend chart: invoice consolidated for last 6 months (paid+pending parcels + purchases)
  const trend6 = useMemo(() => {
    const arr: { key: string; label: string; total: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - k, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      let total = 0;
      for (const c of items) {
        const s = allExpenses
          .filter((e) => e.card_id === c.id && e.spent_on.startsWith(mk))
          .reduce((a, e) => a + Number(e.amount), 0);
        const i = installments
          .filter((x) => x.card_id === c.id && installmentIncludesMonth(x, mk))
          .reduce((a, x) => a + Number(x.installment_value), 0);
        total += s + i;
      }
      arr.push({
        key: mk,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        total,
      });
    }
    return arr;
  }, [items, allExpenses, installments, viewMonth]);
  const trendMax = useMemo(() => Math.max(1, ...trend6.map((t) => t.total)), [trend6]);

  const resetForm = () => {
    setName("");
    setLimitAmount("");
    setDueDay("10");
    setClosingDay("");
    setInitialUsed("");
    setNotes("");
    setEditing(null);
  };
  const openEdit = (c: CardItem) => {
    setEditing(c);
    setName(c.name);
    setLimitAmount(formatBRLInput(String(Math.round(Number(c.limit_amount) * 100))));
    setDueDay(String(c.due_day));
    setClosingDay(c.closing_day ? String(c.closing_day) : "");
    setInitialUsed(
      c.initial_used ? formatBRLInput(String(Math.round(Number(c.initial_used) * 100))) : "",
    );
    setNotes(c.notes || "");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lim = parseBRLInput(limitAmount);
    const dd = parseInt(dueDay, 10);
    const cd = closingDay ? parseInt(closingDay, 10) : null;
    if (!name.trim() || isNaN(lim) || lim < 0 || isNaN(dd) || dd < 1 || dd > 31) {
      toast.error("Preencha nome, limite e dia de vencimento válidos.");
      return;
    }
    if (cd !== null && (cd < 1 || cd > 31)) {
      toast.error("Dia de fechamento inválido.");
      return;
    }
    const iu = initialUsed ? parseBRLInput(initialUsed) : 0;
    if (isNaN(iu) || iu < 0) {
      toast.error("Limite utilizado inválido.");
      return;
    }
    setBusy(true);
    if (editing) {
      const { error } = await supabase
        .from("cards")
        .update({
          name: name.trim(),
          limit_amount: lim,
          due_day: dd,
          closing_day: cd,
          initial_used: iu,
          notes: notes.trim() || null,
        })
        .eq("id", editing.id);
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Cartão atualizado!");
    } else {
      const { error } = await supabase.from("cards").insert({
        user_id: user!.id,
        name: name.trim(),
        limit_amount: lim,
        due_day: dd,
        closing_day: cd,
        initial_used: iu,
        notes: notes.trim() || null,
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Cartão cadastrado!");
    }
    resetForm();
    setOpen(false);
    load();
  };

  const confirmRemove = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("cards").delete().eq("id", confirmDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Cartão removido");
      load();
    }
    setConfirmDelete(null);
  };

  const openInstallmentNew = (cardId: string) => {
    setInstCardId(cardId);
    setInstEditing(null);
    setInstDesc("");
    setInstValue("");
    setInstCount("1");
    setInstStart(currentMonthKey);
    setInstOpen(true);
  };
  const openInstallmentEdit = (i: Installment) => {
    setInstCardId(i.card_id);
    setInstEditing(i);
    setInstDesc(i.description);
    setInstValue(formatBRLInput(String(Math.round(Number(i.installment_value) * 100))));
    setInstCount(String(i.remaining_count));
    setInstStart(i.start_month.slice(0, 7));
    setInstOpen(true);
  };
  const submitInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseBRLInput(instValue);
    const c = parseInt(instCount, 10);
    if (!instDesc.trim() || isNaN(v) || v <= 0 || isNaN(c) || c < 1) {
      toast.error("Preencha descrição, valor e número de parcelas restantes.");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(instStart)) {
      toast.error("Informe o mês inicial das parcelas.");
      return;
    }
    setInstBusy(true);
    const start_month = `${instStart}-01`;
    if (instEditing) {
      const { error } = await supabase
        .from("card_installments")
        .update({
          description: instDesc.trim(),
          installment_value: v,
          remaining_count: c,
          start_month,
        })
        .eq("id", instEditing.id);
      setInstBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Parcelamento atualizado!");
    } else {
      const { error } = await supabase.from("card_installments").insert({
        user_id: user!.id,
        card_id: instCardId!,
        description: instDesc.trim(),
        installment_value: v,
        remaining_count: c,
        start_month,
      });
      setInstBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Parcelamento adicionado!");
    }
    setInstOpen(false);
    load();
  };
  const confirmRemoveInst = async () => {
    if (!confirmDeleteInst) return;
    const { error } = await supabase
      .from("card_installments")
      .delete()
      .eq("id", confirmDeleteInst.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Parcelamento removido");
      load();
    }
    setConfirmDeleteInst(null);
  };

  if (loading || !user)
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );

  const q = search.trim().toLowerCase();
  const filteredCards = q
    ? items.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.notes ?? "").toLowerCase().includes(q),
      )
    : items;

  // Days until due (only relevant for current real month)
  const realToday = new Date();
  const isViewingCurrentMonth =
    viewMonth.getFullYear() === realToday.getFullYear() &&
    viewMonth.getMonth() === realToday.getMonth();
  const daysUntil = (dueDay: number) => {
    if (!isViewingCurrentMonth) return null;
    const due = new Date(realToday.getFullYear(), realToday.getMonth(), dueDay);
    const diff = Math.ceil(
      (due.getTime() - realToday.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  const exportCsv = (c: CardItem) => {
    const purchases = expensesByCardThisMonth[c.id] ?? [];
    const inst = installmentsByCardThisMonth[c.id] ?? [];
    const rows = [
      ...inst.map((i) => ({
        kind: "parcela" as const,
        description: i.description,
        date: `${String(c.due_day).padStart(2, "0")}/${viewMonthKey.slice(5, 7)}/${viewMonthKey.slice(0, 4)}`,
        amount: Number(i.installment_value),
      })),
      ...purchases.map((e) => ({
        kind: "compra" as const,
        description: e.description || "Compra",
        date: `${e.spent_on.slice(8, 10)}/${e.spent_on.slice(5, 7)}/${e.spent_on.slice(0, 4)}`,
        amount: Number(e.amount),
      })),
    ];
    const total = rows.reduce((s, r) => s + r.amount, 0);
    downloadInvoiceCsv({ cardName: c.name, monthLabel: viewMonthLabel, items: rows, total });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* Sticky condensed header */}
      <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-border/60 bg-background/85 px-4 py-2 backdrop-blur-md sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Fatura {viewMonth.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
            </p>
            <p className="text-lg font-extrabold tabular-nums leading-none">
              {formatBRL(totalInvoice)}
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[6.5rem] text-center text-[11px] font-semibold capitalize">
              {viewMonthLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hero header */}
      <section
        className="relative mb-6 overflow-hidden rounded-3xl px-6 pt-8 pb-8 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">
              Total da Fatura
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight tabular-nums">
              {formatBRL(totalInvoice)}
            </h1>
            <p className="pt-1 text-xs opacity-80">
              Limite total: <span className="font-semibold">{formatBRL(totalLimit)}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-2xl border border-primary-foreground/25 bg-primary-foreground/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
              {items.length} {items.length === 1 ? "cartão" : "cartões"}
            </span>
            <Dialog
              open={open}
              onOpenChange={(v) => {
                if (!v) resetForm();
                setOpen(v);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full shadow-md"
                  onClick={() => resetForm()}
                >
                  <Plus className="mr-1 h-4 w-4" /> Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar cartão" : "Cadastrar cartão"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="card-name">Nome do cartão</Label>
                      <Input
                        id="card-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex.: Nubank, Itaú Visa..."
                        required
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="card-limit">Limite (R$)</Label>
                      <Input
                        id="card-limit"
                        inputMode="decimal"
                        value={limitAmount}
                        onChange={(e) => setLimitAmount(formatBRLInput(e.target.value))}
                        placeholder="0,00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-due">Dia do vencimento</Label>
                      <Input
                        id="card-due"
                        type="number"
                        min={1}
                        max={31}
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-close">Dia do fechamento (opcional)</Label>
                      <Input
                        id="card-close"
                        type="number"
                        min={1}
                        max={31}
                        value={closingDay}
                        onChange={(e) => setClosingDay(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="card-used">Limite já utilizado (R$)</Label>
                      <Input
                        id="card-used"
                        inputMode="decimal"
                        value={initialUsed}
                        onChange={(e) => setInitialUsed(formatBRLInput(e.target.value))}
                        placeholder="0,00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor já gasto antes de começar a registrar aqui.
                      </p>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="card-notes">Observações</Label>
                      <Input
                        id="card-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Bandeira, banco, etc."
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Salvando..." : editing ? "Atualizar cartão" : "Salvar cartão"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative z-10 mt-5 inline-flex items-center gap-1 rounded-full border border-primary-foreground/25 bg-primary-foreground/15 p-1 backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-primary-foreground hover:bg-primary-foreground/25"
            onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[8.5rem] text-center text-xs font-semibold capitalize">
            {viewMonthLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-primary-foreground hover:bg-primary-foreground/25"
            onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Trend chart + comparativo entre cartões */}
      {items.length > 0 && (
        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em]">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Tendência (6 meses)
              </h2>
            </div>
            <div className="flex h-28 items-end gap-2">
              {trend6.map((t) => {
                const pct = (t.total / trendMax) * 100;
                const isCurrent = t.key === viewMonthKey;
                return (
                  <div key={t.key} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[9px] font-bold tabular-nums text-muted-foreground">
                      {t.total > 0 ? formatBRL(t.total).replace("R$\u00a0", "") : "—"}
                    </span>
                    <div className="flex h-20 w-full items-end">
                      <div
                        className={`w-full rounded-t-md transition-all ${isCurrent ? "" : "bg-muted-foreground/30"}`}
                        style={{
                          height: `${Math.max(pct, 4)}%`,
                          backgroundImage: isCurrent ? "var(--gradient-hero)" : undefined,
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] capitalize ${isCurrent ? "font-bold text-primary" : "text-muted-foreground"}`}
                    >
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {items.length >= 2 && totalInvoice > 0 && (
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
              <h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em]">
                Comparativo do mês
              </h2>
              <ul className="space-y-2.5">
                {items.map((c) => {
                  const inv = (spentMonth[c.id] ?? 0) + (installmentMonthByCard[c.id] ?? 0);
                  const pct = totalInvoice > 0 ? (inv / totalInvoice) * 100 : 0;
                  const brand = detectCardBrand(c.name, c.notes);
                  return (
                    <li key={c.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="truncate font-semibold">{c.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatBRL(inv)} · {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundImage: BRAND_GRADIENT[brand] }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Adicione seu primeiro cartão para registrar compras parceladas e acompanhar a fatura mensal."
          action={
            <Button
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Adicionar cartão
            </Button>
          }
        />
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cartão por nome ou observação..."
              className="pl-9"
            />
          </div>

          {filteredCards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhum cartão encontrado para "{search}".
              </CardContent>
            </Card>
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0">
              {filteredCards.map((c) => (
                <CardPanel
                  key={c.id}
                  card={c}
                  viewMonth={viewMonth}
                  viewMonthKey={viewMonthKey}
                  viewMonthLabel={viewMonthLabel}
                  daysUntilDue={daysUntil(c.due_day)}
                  monthInstallments={installmentsByCardThisMonth[c.id] ?? []}
                  monthPurchases={expensesByCardThisMonth[c.id] ?? []}
                  cardInstallments={installments.filter((i) => i.card_id === c.id)}
                  allExpenses={allExpenses}
                  allInstallments={installments}
                  paidInstallments={paidInstallments}
                  instMonth={installmentMonthByCard[c.id] ?? 0}
                  spentInMonth={spentMonth[c.id] ?? 0}
                  onExportCsv={exportCsv}
                  onEditCard={openEdit}
                  onDeleteCard={setConfirmDelete}
                  onTogglePaid={toggleInstallmentPaid}
                  onMarkAllPaid={markAllInstallmentsPaid}
                  onNewInstallment={openInstallmentNew}
                  onEditInstallment={openInstallmentEdit}
                  onDeleteInstallment={setConfirmDeleteInst}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={instOpen} onOpenChange={setInstOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {instEditing ? "Editar parcelamento" : "Adicionar parcelamento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitInstallment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inst-desc">Descrição</Label>
              <Input
                id="inst-desc"
                value={instDesc}
                onChange={(e) => setInstDesc(e.target.value)}
                placeholder="Ex.: TV Samsung, Geladeira..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inst-value">Valor da parcela (R$)</Label>
                <Input
                  id="inst-value"
                  inputMode="decimal"
                  value={instValue}
                  onChange={(e) => setInstValue(formatBRLInput(e.target.value))}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inst-count">Parcelas restantes</Label>
                <Input
                  id="inst-count"
                  type="number"
                  min={1}
                  max={48}
                  value={instCount}
                  onChange={(e) => setInstCount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inst-start">Mês da primeira parcela restante</Label>
              <Input
                id="inst-start"
                type="month"
                value={instStart}
                onChange={(e) => setInstStart(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                As parcelas serão exibidas no calendário a partir deste mês.
              </p>
            </div>
            {(() => {
              const v = parseBRLInput(instValue);
              const c = parseInt(instCount, 10);
              if (!isNaN(v) && v > 0 && !isNaN(c) && c > 0) {
                return (
                  <p className="text-xs text-muted-foreground">
                    Total restante: {formatBRL(v * c)}
                  </p>
                );
              }
              return null;
            })()}
            <Button type="submit" className="w-full" disabled={instBusy}>
              {instBusy
                ? "Salvando..."
                : instEditing
                  ? "Atualizar parcelamento"
                  : "Salvar parcelamento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cartão <strong>{confirmDelete?.name}</strong>? Esta
              ação não pode ser desfeita e também removerá os parcelamentos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDeleteInst}
        onOpenChange={(v) => !v && setConfirmDeleteInst(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover parcelamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir o parcelamento <strong>{confirmDeleteInst?.description}</strong>? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveInst}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
