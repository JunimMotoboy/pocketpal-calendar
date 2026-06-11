import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, TrendingUp, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { INCOME_SOURCES, INC_MAP, formatBRL, type IncomeSource } from "@/lib/categories";
import { formatBRLInput, parseBRLInput } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/entradas")({
  head: () => ({
    meta: [
      { title: "Entradas — Nix Wallet" },
      { name: "description", content: "Registre todo o dinheiro que entra: salário, freelances, vendas e mais." },
    ],
  }),
  component: IncomesPage,
});

type Income = {
  id: string;
  description: string;
  amount: number;
  source: IncomeSource;
  received_on: string;
  notes: string | null;
};

function IncomesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Income[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);
  const [search, setSearch] = useState("");

  // form
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<IncomeSource>("salario");
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("incomes")
      .select("id, description, amount, source, received_on, notes")
      .order("received_on", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Income[]);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const total = useMemo(() => items.reduce((s, i) => s + Number(i.amount), 0), [items]);
  const monthTotal = useMemo(() => {
    const now = new Date();
    const m = format(now, "yyyy-MM");
    return items.filter((i) => i.received_on.startsWith(m)).reduce((s, i) => s + Number(i.amount), 0);
  }, [items]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseBRLInput(amount);
    if (!description.trim() || isNaN(value) || value <= 0) {
      toast.error("Preencha descrição e valor válidos.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("incomes").insert({
      user_id: user!.id,
      description: description.trim(),
      amount: value,
      source,
      received_on: format(date, "yyyy-MM-dd"),
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Entrada registrada!");
    setDescription(""); setAmount(""); setSource("salario"); setDate(new Date()); setNotes("");
    setOpen(false);
    load();
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("incomes").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Entrada removida"); load(); }
    setDeleteTarget(null);
  };

  if (loading || !user) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section
        className="mb-8 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl border border-border/60 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "linear-gradient(135deg, oklch(0.5 0.16 155) 0%, oklch(0.65 0.16 155) 50%, oklch(0.7 0.14 190) 100%)" }}
      >
        <div>
          <p className="flex items-center gap-2 text-sm opacity-90"><TrendingUp className="h-4 w-4" /> Entradas no mês</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(monthTotal)}</p>
          <p className="mt-1 text-sm opacity-80">Total geral: {formatBRL(total)} · {items.length} registros</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" variant="secondary"><Plus className="mr-1 h-4 w-4" /> Nova entrada</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Registrar nova entrada</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="inc-desc">Descrição</Label>
                  <Input id="inc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Salário maio" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inc-amount">Valor (R$)</Label>
                  <Input id="inc-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(formatBRLInput(e.target.value))} placeholder="0,00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inc-source">Fonte</Label>
                  <Select value={source} onValueChange={(v) => setSource(v as IncomeSource)}>
                    <SelectTrigger id="inc-source"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INCOME_SOURCES.map((s) => {
                        const Icon = s.icon;
                        return (
                          <SelectItem key={s.value} value={s.value}>
                            <span className="flex items-center gap-2"><Icon className="h-4 w-4" style={{ color: s.color }} />{s.label}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="inc-date">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button id="inc-date" variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />{format(date, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="inc-notes">Observações</Label>
                  <Textarea id="inc-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar entrada"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </section>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Histórico de entradas</CardTitle>
          {items.length > 0 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por descrição, fonte ou observação..."
                className="pl-9"
                aria-label="Buscar entradas"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma entrada registrada ainda.</p>
          ) : (() => {
            const q = search.trim().toLowerCase();
            const filtered = q
              ? items.filter((i) =>
                  i.description.toLowerCase().includes(q) ||
                  (INC_MAP[i.source]?.label ?? "").toLowerCase().includes(q) ||
                  (i.notes ?? "").toLowerCase().includes(q),
                )
              : items;
            if (filtered.length === 0) {
              return <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma entrada encontrada para "{search}".</p>;
            }
            return (
            <ul className="divide-y divide-border">
              {filtered.map((i) => {
                const src = INC_MAP[i.source];
                const Icon = src.icon;
                return (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in oklab, ${src.color} 15%, transparent)` }}>
                      <Icon className="h-5 w-5" style={{ color: src.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{i.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {src.label} · {format(new Date(i.received_on + "T00:00:00"), "dd 'de' MMM yyyy", { locale: ptBR })}
                        {i.notes ? ` · ${i.notes}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums text-emerald-600">+{formatBRL(Number(i.amount))}</p>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(i)} aria-label="Remover entrada"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  </li>
                );
              })}
            </ul>
            );
          })()}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir a entrada <strong>{deleteTarget?.description}</strong> ({formatBRL(Number(deleteTarget?.amount ?? 0))})? Esta ação não pode ser desfeita.
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
