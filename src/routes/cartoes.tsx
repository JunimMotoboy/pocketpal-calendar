import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Pencil, Trash2, ListPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL } from "@/lib/categories";
import { toast } from "sonner";

export const Route = createFileRoute("/cartoes")({
  head: () => ({
    meta: [
      { title: "Cartões — Nix Wallet" },
      { name: "description", content: "Cadastre seus cartões de crédito e acompanhe a fatura acumulada." },
    ],
  }),
  component: CardsPage,
});

type CardItem = {
  id: string;
  name: string;
  limit_amount: number;
  due_day: number;
  closing_day: number | null;
  notes: string | null;
  initial_used: number;
};

type ExpenseSum = { card_id: string; amount: number };

type Installment = {
  id: string;
  card_id: string;
  description: string;
  installment_value: number;
  remaining_count: number;
  start_month: string; // YYYY-MM-DD (first day of month)
};

const today = new Date();
const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

// Helper: does an installment include the given YYYY-MM key?
function installmentIncludesMonth(inst: Installment, monthKey: string): boolean {
  const [sy, sm] = inst.start_month.split("-").map(Number);
  const [ty, tm] = monthKey.split("-").map(Number);
  const diff = (ty - sy) * 12 + (tm - sm);
  return diff >= 0 && diff < inst.remaining_count;
}

function CardsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const viewMonthKey = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}`;
  const viewMonthLabel = viewMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const [items, setItems] = useState<CardItem[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [spentMonth, setSpentMonth] = useState<Record<string, number>>({});
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CardItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CardItem | null>(null);

  const [name, setName] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [closingDay, setClosingDay] = useState("");
  const [initialUsed, setInitialUsed] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Installment dialog state
  const [instOpen, setInstOpen] = useState(false);
  const [instCardId, setInstCardId] = useState<string | null>(null);
  const [instEditing, setInstEditing] = useState<Installment | null>(null);
  const [instDesc, setInstDesc] = useState("");
  const [instValue, setInstValue] = useState("");
  const [instCount, setInstCount] = useState("1");
  const [instStart, setInstStart] = useState(currentMonthKey); // YYYY-MM
  const [instBusy, setInstBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("cards")
      .select("id, name, limit_amount, due_day, closing_day, notes, initial_used")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setItems((data ?? []) as CardItem[]);

    const { data: exp } = await supabase
      .from("expenses")
      .select("card_id, amount, spent_on")
      .eq("payment_method", "credito")
      .not("card_id", "is", null);
    const all: Record<string, number> = {};
    const mo: Record<string, number> = {};
    (exp as (ExpenseSum & { spent_on: string })[] | null)?.forEach((e) => {
      if (!e.card_id) return;
      all[e.card_id] = (all[e.card_id] ?? 0) + Number(e.amount);
      if (e.spent_on && e.spent_on.startsWith(currentMonthKey)) {
        mo[e.card_id] = (mo[e.card_id] ?? 0) + Number(e.amount);
      }
    });
    setSpent(all);
    setSpentMonth(mo);

    const { data: inst } = await supabase
      .from("card_installments")
      .select("id, card_id, description, installment_value, remaining_count, start_month")
      .order("created_at", { ascending: false });
    setInstallments((inst ?? []) as Installment[]);
  };
  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  // Total remaining of all installments per card
  const installmentTotalByCard = useMemo(() => {
    const map: Record<string, number> = {};
    installments.forEach((i) => {
      map[i.card_id] = (map[i.card_id] ?? 0) + Number(i.installment_value) * Number(i.remaining_count);
    });
    return map;
  }, [installments]);

  // Installment of CURRENT month per card (1 parcel each, only if month is in range)
  const installmentMonthByCard = useMemo(() => {
    const map: Record<string, number> = {};
    installments.forEach((i) => {
      if (installmentIncludesMonth(i, currentMonthKey)) {
        map[i.card_id] = (map[i.card_id] ?? 0) + Number(i.installment_value);
      }
    });
    return map;
  }, [installments]);

  const totalLimit = useMemo(() => items.reduce((s, i) => s + Number(i.limit_amount), 0), [items]);
  const totalInvoice = useMemo(
    () => items.reduce((s, i) => s + (spentMonth[i.id] ?? 0) + (installmentMonthByCard[i.id] ?? 0), 0),
    [items, spentMonth, installmentMonthByCard],
  );
  const totalUsed = useMemo(
    () => items.reduce((s, i) => s + (spent[i.id] ?? 0) + Number(i.initial_used ?? 0) + (installmentTotalByCard[i.id] ?? 0), 0),
    [items, spent, installmentTotalByCard],
  );

  const resetForm = () => {
    setName(""); setLimitAmount(""); setDueDay("10"); setClosingDay(""); setInitialUsed(""); setNotes(""); setEditing(null);
  };

  const openEdit = (c: CardItem) => {
    setEditing(c);
    setName(c.name);
    setLimitAmount(String(c.limit_amount).replace(".", ","));
    setDueDay(String(c.due_day));
    setClosingDay(c.closing_day ? String(c.closing_day) : "");
    setInitialUsed(c.initial_used ? String(c.initial_used).replace(".", ",") : "");
    setNotes(c.notes || "");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lim = parseFloat(limitAmount.replace(",", "."));
    const dd = parseInt(dueDay, 10);
    const cd = closingDay ? parseInt(closingDay, 10) : null;
    if (!name.trim() || isNaN(lim) || lim < 0 || isNaN(dd) || dd < 1 || dd > 31) {
      toast.error("Preencha nome, limite e dia de vencimento válidos.");
      return;
    }
    if (cd !== null && (cd < 1 || cd > 31)) { toast.error("Dia de fechamento inválido."); return; }
    const iu = initialUsed ? parseFloat(initialUsed.replace(",", ".")) : 0;
    if (isNaN(iu) || iu < 0) { toast.error("Limite utilizado inválido."); return; }
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from("cards").update({
        name: name.trim(), limit_amount: lim, due_day: dd, closing_day: cd, initial_used: iu, notes: notes.trim() || null,
      }).eq("id", editing.id);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Cartão atualizado!");
    } else {
      const { error } = await supabase.from("cards").insert({
        user_id: user!.id, name: name.trim(), limit_amount: lim, due_day: dd, closing_day: cd, initial_used: iu, notes: notes.trim() || null,
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Cartão cadastrado!");
    }
    resetForm(); setOpen(false); load();
  };

  const confirmRemove = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("cards").delete().eq("id", confirmDelete.id);
    if (error) toast.error(error.message);
    else { toast.success("Cartão removido"); load(); }
    setConfirmDelete(null);
  };

  const openInstallmentNew = (cardId: string) => {
    setInstCardId(cardId);
    setInstEditing(null);
    setInstDesc(""); setInstValue(""); setInstCount("1");
    setInstStart(currentMonthKey);
    setInstOpen(true);
  };

  const openInstallmentEdit = (i: Installment) => {
    setInstCardId(i.card_id);
    setInstEditing(i);
    setInstDesc(i.description);
    setInstValue(String(i.installment_value).replace(".", ","));
    setInstCount(String(i.remaining_count));
    setInstStart(i.start_month.slice(0, 7));
    setInstOpen(true);
  };

  const submitInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(instValue.replace(",", "."));
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
      const { error } = await supabase.from("card_installments").update({
        description: instDesc.trim(), installment_value: v, remaining_count: c, start_month,
      }).eq("id", instEditing.id);
      setInstBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Parcelamento atualizado!");
    } else {
      const { error } = await supabase.from("card_installments").insert({
        user_id: user!.id, card_id: instCardId!, description: instDesc.trim(),
        installment_value: v, remaining_count: c, start_month,
      });
      setInstBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Parcelamento adicionado!");
    }
    setInstOpen(false);
    load();
  };

  const removeInstallment = async (id: string) => {
    const { error } = await supabase.from("card_installments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Parcelamento removido"); load(); }
  };

  if (loading || !user) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section
        className="mb-8 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl border border-border/60 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "linear-gradient(135deg, oklch(0.35 0.12 260) 0%, oklch(0.5 0.18 300) 60%, oklch(0.7 0.16 20) 100%)" }}
      >
        <div>
          <p className="flex items-center gap-2 text-sm opacity-90"><CreditCard className="h-4 w-4" /> Fatura do mês</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(totalInvoice)}</p>
          <p className="mt-1 text-sm opacity-80">Limite total: {formatBRL(totalLimit)}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button size="lg" variant="secondary" onClick={() => resetForm()}><Plus className="mr-1 h-4 w-4" /> Novo cartão</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar cartão" : "Cadastrar cartão"}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nome do cartão</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank, Itaú Visa..." required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Limite (R$)</Label>
                  <Input inputMode="decimal" value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)} placeholder="0,00" required />
                </div>
                <div className="space-y-2">
                  <Label>Dia do vencimento</Label>
                  <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Dia do fechamento (opcional)</Label>
                  <Input type="number" min={1} max={31} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Limite já utilizado (R$)</Label>
                  <Input inputMode="decimal" value={initialUsed} onChange={(e) => setInitialUsed(e.target.value)} placeholder="0,00" />
                  <p className="text-xs text-muted-foreground">Valor já gasto antes de começar a registrar aqui.</p>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Observações</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bandeira, banco, etc." />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar cartão" : "Salvar cartão"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </section>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum cartão cadastrado ainda. Adicione um para acompanhar a fatura.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((c) => {
            const instTotal = installmentTotalByCard[c.id] ?? 0;
            const instMonth = installmentMonthByCard[c.id] ?? 0;
            const invoice = (spentMonth[c.id] ?? 0) + instMonth;
            const used = (spent[c.id] ?? 0) + Number(c.initial_used ?? 0) + instTotal;
            const pct = c.limit_amount > 0 ? Math.min(100, (used / Number(c.limit_amount)) * 100) : 0;
            const remaining = Number(c.limit_amount) - used;
            const danger = pct >= 80;
            const cardInst = installments.filter((i) => i.card_id === c.id);
            return (
              <Card key={c.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-4 w-4 text-primary" />
                      {c.name}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vence dia {c.due_day}{c.closing_day ? ` · fecha dia ${c.closing_day}` : ""}
                    </p>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(c)} aria-label="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Fatura do mês</p>
                      <p className="text-2xl font-bold tabular-nums">{formatBRL(invoice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Limite</p>
                      <p className="text-sm font-semibold tabular-nums">{formatBRL(Number(c.limit_amount))}</p>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: danger ? "oklch(0.62 0.22 25)" : "oklch(0.62 0.18 260)" }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {remaining >= 0 ? `Disponível: ${formatBRL(remaining)}` : `Acima do limite em ${formatBRL(-remaining)}`}
                    {Number(c.initial_used) > 0 && ` · inclui ${formatBRL(Number(c.initial_used))} de saldo anterior`}
                    {instTotal > 0 && ` · inclui ${formatBRL(instTotal)} em parcelas`}
                  </p>
                  {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}

                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold">Parcelamentos em andamento</p>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openInstallmentNew(c.id)}>
                        <ListPlus className="mr-1 h-3 w-3" /> Adicionar
                      </Button>
                    </div>
                    {cardInst.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum parcelamento registrado.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {cardInst.map((i) => {
                          const [sy, sm] = i.start_month.split("-").map(Number);
                          const startLabel = new Date(sy, sm - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
                          return (
                            <li key={i.id} className="flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{i.description}</p>
                                <p className="text-muted-foreground tabular-nums">
                                  {i.remaining_count}x de {formatBRL(Number(i.installment_value))} · a partir de {startLabel}
                                </p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openInstallmentEdit(i)} aria-label="Editar">
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeInstallment(i.id)} aria-label="Remover">
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={instOpen} onOpenChange={setInstOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{instEditing ? "Editar parcelamento" : "Adicionar parcelamento"}</DialogTitle></DialogHeader>
          <form onSubmit={submitInstallment} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={instDesc} onChange={(e) => setInstDesc(e.target.value)} placeholder="Ex.: TV Samsung, Geladeira..." required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor da parcela (R$)</Label>
                <Input inputMode="decimal" value={instValue} onChange={(e) => setInstValue(e.target.value)} placeholder="0,00" required />
              </div>
              <div className="space-y-2">
                <Label>Parcelas restantes</Label>
                <Input type="number" min={1} max={48} value={instCount} onChange={(e) => setInstCount(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mês da primeira parcela restante</Label>
              <Input type="month" value={instStart} onChange={(e) => setInstStart(e.target.value)} required />
              <p className="text-xs text-muted-foreground">As parcelas serão exibidas no calendário a partir deste mês.</p>
            </div>
            {(() => {
              const v = parseFloat(instValue.replace(",", "."));
              const c = parseInt(instCount, 10);
              if (!isNaN(v) && v > 0 && !isNaN(c) && c > 0) {
                return <p className="text-xs text-muted-foreground">Total restante: {formatBRL(v * c)}</p>;
              }
              return null;
            })()}
            <Button type="submit" className="w-full" disabled={instBusy}>{instBusy ? "Salvando..." : instEditing ? "Atualizar parcelamento" : "Salvar parcelamento"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cartão <strong>{confirmDelete?.name}</strong>?
              Esta ação não pode ser desfeita e também removerá os parcelamentos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
