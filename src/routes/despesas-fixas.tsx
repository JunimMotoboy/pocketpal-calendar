import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Plus, Pencil, Trash2, Mail, BellRing, BellOff, Search } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, CAT_MAP, formatBRL, type Category } from "@/lib/categories";
import { formatBRLInput, parseBRLInput } from "@/lib/currency";

import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/despesas-fixas")({
  head: () => ({
    meta: [
      { title: "Despesas Fixas — Nix Wallet" },
      { name: "description", content: "Cadastre suas despesas fixas mensais e receba lembretes por e-mail um dia antes do vencimento." },
    ],
  }),
  component: FixedExpensesPage,
});

type FixedItem = {
  id: string;
  name: string;
  amount: number;
  category: Category;
  due_day: number;
  notify_email: string;
  active: boolean;
  notes: string | null;
};

function FixedExpensesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<FixedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedItem | null>(null);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("contas");
  const [dueDay, setDueDay] = useState("10");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FixedItem | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);
  useEffect(() => { if (user?.email && !notifyEmail) setNotifyEmail(user.email); }, [user, notifyEmail]);

  const load = async () => {
    const { data, error } = await supabase
      .from("fixed_expenses")
      .select("id, name, amount, category, due_day, notify_email, active, notes")
      .order("due_day", { ascending: true });
    if (error) { toast.error(error.message); return; }
    setItems((data ?? []) as FixedItem[]);
  };
  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const resetForm = () => {
    setName(""); setAmount(""); setCategory("contas"); setDueDay("10");
    setNotifyEmail(user?.email ?? ""); setNotes(""); setEditing(null);
  };

  const openEdit = (it: FixedItem) => {
    setEditing(it);
    setName(it.name);
    setAmount(formatBRLInput(String(Math.round(Number(it.amount) * 100))));
    setCategory(it.category);
    setDueDay(String(it.due_day));
    setNotifyEmail(it.notify_email);
    setNotes(it.notes || "");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseBRLInput(amount);
    const dd = parseInt(dueDay, 10);
    if (!name.trim() || isNaN(val) || val <= 0 || isNaN(dd) || dd < 1 || dd > 31) {
      toast.error("Preencha nome, valor e dia válidos."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail.trim())) {
      toast.error("E-mail inválido."); return;
    }
    setBusy(true);
    const payload = {
      name: name.trim(), amount: val, category, due_day: dd,
      notify_email: notifyEmail.trim(), notes: notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("fixed_expenses").update(payload).eq("id", editing.id)
      : await supabase.from("fixed_expenses").insert({ ...payload, user_id: user!.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Despesa atualizada!" : "Despesa fixa cadastrada!");
    resetForm(); setOpen(false); load();
  };

  const toggleActive = async (it: FixedItem) => {
    const { error } = await supabase.from("fixed_expenses").update({ active: !it.active }).eq("id", it.id);
    if (error) toast.error(error.message); else load();
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("fixed_expenses").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Removida"); load(); }
    setDeleteTarget(null);
  };

  if (loading || !user) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;

  const total = items.filter(i => i.active).reduce((s, i) => s + Number(i.amount), 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section
        className="mb-8 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl border border-border/60 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "linear-gradient(135deg, oklch(0.4 0.15 280) 0%, oklch(0.55 0.18 320) 60%, oklch(0.7 0.15 30) 100%)" }}
      >
        <div>
          <p className="flex items-center gap-2 text-sm opacity-90"><CalendarClock className="h-4 w-4" /> Total fixo mensal</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(total)}</p>
          <p className="mt-1 text-sm opacity-80">{items.filter(i => i.active).length} despesa(s) ativa(s) · aviso por e-mail 1 dia antes</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button size="lg" variant="secondary" onClick={() => resetForm()}><Plus className="mr-1 h-4 w-4" /> Nova despesa fixa</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar despesa fixa" : "Cadastrar despesa fixa"}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="fx-name">Nome</Label>
                  <Input id="fx-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aluguel, Internet, Netflix..." required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fx-amount">Valor (R$)</Label>
                  <Input id="fx-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(formatBRLInput(e.target.value))} placeholder="0,00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fx-due">Dia do vencimento</Label>
                  <Input id="fx-due" type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="fx-cat">Categoria</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                    <SelectTrigger id="fx-cat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="fx-email">E-mail para receber aviso</Label>
                  <Input id="fx-email" type="email" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} placeholder="voce@exemplo.com" required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="fx-notes">Observações</Label>
                  <Input id="fx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </section>

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Sem despesas fixas"
          description="Cadastre contas que se repetem todo mês (aluguel, streaming, internet) para receber lembretes e marcar como pagas no calendário."
          action={<Button onClick={() => { resetForm(); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Adicionar despesa fixa</Button>}
        />
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, categoria ou observações..."
              className="pl-9"
              aria-label="Buscar despesas fixas"
            />
          </div>
          {(() => {
            const q = search.trim().toLowerCase();
            const filtered = q
              ? items.filter((it) =>
                  it.name.toLowerCase().includes(q) ||
                  CAT_MAP[it.category]?.label.toLowerCase().includes(q) ||
                  (it.notes ?? "").toLowerCase().includes(q),
                )
              : items;
            if (filtered.length === 0) {
              return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma despesa encontrada para "{search}".</CardContent></Card>;
            }
            return (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((it) => {
            const cat = CAT_MAP[it.category];
            const Icon = cat.icon;
            return (
              <Card key={it.id} className={it.active ? "" : "opacity-60"}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: cat.color, color: "white" }}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {it.name}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Vence todo dia {it.due_day} · {cat.label}</p>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(it)} aria-label="Ativar/desativar">
                      {it.active ? <BellRing className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(it)} aria-label="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(it)} aria-label="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-2xl font-bold tabular-nums">{formatBRL(Number(it.amount))}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {it.notify_email}</p>
                  {it.notes && <p className="text-xs text-muted-foreground">{it.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
            );
          })()}
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover despesa fixa?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita e os lembretes por e-mail serão interrompidos.
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
