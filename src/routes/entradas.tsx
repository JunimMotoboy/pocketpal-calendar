import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addMonths, endOfMonth, format, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon, Plus, Trash2, TrendingUp, Search, ChevronLeft, ChevronRight,
  Pencil, ArrowUp, ArrowDown, Minus, Filter,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { INCOME_SOURCES, INC_MAP, formatBRL, type IncomeSource } from "@/lib/categories";
import { formatBRLInput, parseBRLInput } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

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

const emptyForm = () => ({
  description: "",
  amount: "",
  source: "salario" as IncomeSource,
  date: new Date(),
  notes: "",
});

function IncomesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Income[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | IncomeSource>("all");
  const [anchor, setAnchor] = useState<Date>(new Date());

  const [form, setForm] = useState(emptyForm());
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

  // Open edit dialog with pre-fill
  useEffect(() => {
    if (editing) {
      setForm({
        description: editing.description,
        amount: formatBRLInput(String(Math.round(Number(editing.amount) * 100))),
        source: editing.source,
        date: new Date(editing.received_on + "T00:00:00"),
        notes: editing.notes ?? "",
      });
      setOpen(true);
    }
  }, [editing]);

  const monthItems = useMemo(
    () => items.filter((i) => isSameMonth(new Date(i.received_on + "T00:00:00"), anchor)),
    [items, anchor],
  );
  const prevMonthItems = useMemo(() => {
    const prev = subMonths(anchor, 1);
    return items.filter((i) => isSameMonth(new Date(i.received_on + "T00:00:00"), prev));
  }, [items, anchor]);

  const monthTotal = useMemo(() => monthItems.reduce((s, i) => s + Number(i.amount), 0), [monthItems]);
  const prevTotal = useMemo(() => prevMonthItems.reduce((s, i) => s + Number(i.amount), 0), [prevMonthItems]);
  const diffPct = prevTotal > 0 ? ((monthTotal - prevTotal) / prevTotal) * 100 : monthTotal > 0 ? 100 : 0;

  const avgPerDay = useMemo(() => {
    const days = endOfMonth(anchor).getDate();
    return monthTotal / days;
  }, [monthTotal, anchor]);

  const bySource = useMemo(() => {
    const map = new Map<IncomeSource, number>();
    monthItems.forEach((i) => map.set(i.source, (map.get(i.source) ?? 0) + Number(i.amount)));
    return [...map.entries()]
      .map(([source, total]) => ({ source, total, pct: monthTotal > 0 ? (total / monthTotal) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [monthItems, monthTotal]);

  const trend = useMemo(() => {
    const arr: { label: string; total: number; date: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(anchor, i);
      const total = items
        .filter((x) => isSameMonth(new Date(x.received_on + "T00:00:00"), d))
        .reduce((s, x) => s + Number(x.amount), 0);
      arr.push({ label: format(d, "MMM", { locale: ptBR }), total, date: d });
    }
    return arr;
  }, [items, anchor]);
  const trendMax = Math.max(1, ...trend.map((t) => t.total));

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthItems.filter((i) => {
      if (sourceFilter !== "all" && i.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        i.description.toLowerCase().includes(q) ||
        (INC_MAP[i.source]?.label ?? "").toLowerCase().includes(q) ||
        (i.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [monthItems, search, sourceFilter]);

  const resetForm = () => { setForm(emptyForm()); setEditing(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseBRLInput(form.amount);
    if (!form.description.trim() || isNaN(value) || value <= 0) {
      toast.error("Preencha descrição e valor válidos.");
      return;
    }
    setBusy(true);
    const payload = {
      description: form.description.trim(),
      amount: value,
      source: form.source,
      received_on: format(form.date, "yyyy-MM-dd"),
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("incomes").update(payload).eq("id", editing.id)
      : await supabase.from("incomes").insert({ ...payload, user_id: user!.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Entrada atualizada!" : "Entrada registrada!");
    resetForm();
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

  const monthLabel = format(anchor, "MMMM 'de' yyyy", { locale: ptBR });
  const isCurrentMonth = isSameMonth(anchor, new Date());

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* HERO */}
      <section
        className="mb-6 overflow-hidden rounded-2xl border border-border/60 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "linear-gradient(135deg, oklch(0.5 0.16 155) 0%, oklch(0.65 0.16 155) 50%, oklch(0.7 0.14 190) 100%)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <TrendingUp className="h-4 w-4" />
              <span className="capitalize">{monthLabel}</span>
              {!isCurrentMonth && (
                <button type="button" onClick={() => setAnchor(new Date())} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide hover:bg-white/25">
                  Voltar ao atual
                </button>
              )}
            </div>
            <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(monthTotal)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs opacity-90">
              <span className="flex items-center gap-1">
                {diffPct > 0 ? <ArrowUp className="h-3 w-3" /> : diffPct < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {diffPct >= 0 ? "+" : ""}{diffPct.toFixed(1)}% vs mês anterior ({formatBRL(prevTotal)})
              </span>
              <span>·</span>
              <span>{monthItems.length} {monthItems.length === 1 ? "registro" : "registros"}</span>
              <span>·</span>
              <span>média {formatBRL(avgPerDay)}/dia</span>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-white/15 p-1 backdrop-blur">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => setAnchor((d) => subMonths(d, 1))} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-8 gap-2 px-2 text-primary-foreground hover:bg-white/20">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="text-xs font-medium">{format(anchor, "MMM/yy", { locale: ptBR })}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={anchor} onSelect={(d) => d && setAnchor(startOfMonth(d))} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => setAnchor((d) => addMonths(d, 1))} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Trend sparkline */}
        <div className="mt-5 flex items-end gap-2">
          {trend.map((t, idx) => {
            const h = Math.max(6, Math.round((t.total / trendMax) * 60));
            const active = isSameMonth(t.date, anchor);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setAnchor(t.date)}
                className="group flex flex-1 flex-col items-center gap-1"
                aria-label={`Ver ${t.label}`}
              >
                <span className="text-[10px] opacity-80">{t.total > 0 ? formatBRL(t.total).replace("R$", "").trim() : "—"}</span>
                <span
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    active ? "bg-white" : "bg-white/40 group-hover:bg-white/70",
                  )}
                  style={{ height: `${h}px` }}
                />
                <span className={cn("text-[10px] capitalize", active ? "font-bold" : "opacity-80")}>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary"><Plus className="mr-1 h-4 w-4" /> Nova entrada</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Editar entrada" : "Registrar nova entrada"}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="inc-desc">Descrição</Label>
                    <Input id="inc-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ex.: Salário maio" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inc-amount">Valor (R$)</Label>
                    <Input id="inc-amount" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: formatBRLInput(e.target.value) }))} placeholder="0,00" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inc-source">Fonte</Label>
                    <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v as IncomeSource }))}>
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
                          <CalendarIcon className="mr-2 h-4 w-4" />{format(form.date, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.date} onSelect={(d) => d && setForm((f) => ({ ...f, date: d }))} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="inc-notes">Observações</Label>
                    <Textarea id="inc-notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Salvando..." : editing ? "Salvar alterações" : "Salvar entrada"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* BREAKDOWN */}
      {bySource.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribuição por fonte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bySource.map(({ source, total, pct }) => {
              const src = INC_MAP[source];
              const Icon = src.icon;
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => setSourceFilter((cur) => (cur === source ? "all" : source))}
                  className={cn(
                    "block w-full rounded-lg border p-3 text-left transition-colors",
                    sourceFilter === source ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/50",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4" style={{ color: src.color }} />
                      {src.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatBRL(total)} <span className="text-xs font-normal text-muted-foreground">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: src.color }} />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base capitalize">Entradas de {format(anchor, "MMMM", { locale: ptBR })}</CardTitle>
            {sourceFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                {INC_MAP[sourceFilter].label}
                <button onClick={() => setSourceFilter("all")} className="ml-1 opacity-70 hover:opacity-100" aria-label="Limpar filtro">×</button>
              </Badge>
            )}
          </div>
          {monthItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar descrição, fonte ou nota..."
                  className="pl-9"
                  aria-label="Buscar entradas"
                />
              </div>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Fonte" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  {INCOME_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {monthItems.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              bordered={false}
              title={`Nenhuma entrada em ${format(anchor, "MMMM", { locale: ptBR })}`}
              description="Registre salários, freelas ou rendimentos deste mês para acompanhar seu saldo e comprometimento."
              action={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Nova entrada</Button>}
            />
          ) : filteredList.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma entrada encontrada com os filtros atuais.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredList.map((i) => {
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
                        {src.label} · {format(new Date(i.received_on + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })}
                        {i.notes ? ` · ${i.notes}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums text-emerald-600">+{formatBRL(Number(i.amount))}</p>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(i)} aria-label="Editar entrada">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(i)} aria-label="Remover entrada">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
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
