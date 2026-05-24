import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

function CardsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<CardItem[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CardItem | null>(null);

  const [name, setName] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [closingDay, setClosingDay] = useState("");
  const [initialUsed, setInitialUsed] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

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
      .select("card_id, amount")
      .eq("payment_method", "credito")
      .not("card_id", "is", null);
    const map: Record<string, number> = {};
    (exp as ExpenseSum[] | null)?.forEach((e) => {
      if (e.card_id) map[e.card_id] = (map[e.card_id] ?? 0) + Number(e.amount);
    });
    setSpent(map);
  };
  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const totalLimit = useMemo(() => items.reduce((s, i) => s + Number(i.limit_amount), 0), [items]);
  const totalSpent = useMemo(
    () => items.reduce((s, i) => s + (spent[i.id] ?? 0) + Number(i.initial_used ?? 0), 0),
    [items, spent],
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

  const remove = async (id: string) => {
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Cartão removido"); load(); }
  };

  if (loading || !user) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section
        className="mb-8 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl border border-border/60 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "linear-gradient(135deg, oklch(0.35 0.12 260) 0%, oklch(0.5 0.18 300) 60%, oklch(0.7 0.16 20) 100%)" }}
      >
        <div>
          <p className="flex items-center gap-2 text-sm opacity-90"><CreditCard className="h-4 w-4" /> Fatura acumulada</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(totalSpent)}</p>
          <p className="mt-1 text-sm opacity-80">de {formatBRL(totalLimit)} em {items.length} cartão{items.length === 1 ? "" : "ões"}</p>
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
            const used = (spent[c.id] ?? 0) + Number(c.initial_used ?? 0);
            const pct = c.limit_amount > 0 ? Math.min(100, (used / Number(c.limit_amount)) * 100) : 0;
            const remaining = Number(c.limit_amount) - used;
            const danger = pct >= 80;
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
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Fatura atual</p>
                      <p className="text-2xl font-bold tabular-nums">{formatBRL(used)}</p>
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
                  </p>
                  {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
