import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Pencil, TrendingDown } from "lucide-react";
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
import { INVESTMENT_TYPES, INV_MAP, formatBRL, type InvestmentType } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { formatBRLInput, parseBRLInput } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/investimentos")({
  head: () => ({
    meta: [
      { title: "Investimentos — Nix Wallet" },
      { name: "description", content: "Acompanhe seus investimentos: renda fixa, variável, cripto e mais." },
    ],
  }),
  component: InvestmentsPage,
});

type Investment = {
  id: string;
  name: string;
  amount: number;
  type: InvestmentType;
  invested_on: string;
  expected_return: number | null;
  notes: string | null;
};

function InvestmentsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Investment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<InvestmentType>("renda_fixa");
  const [expected, setExpected] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("investments")
      .select("id, name, amount, type, invested_on, expected_return, notes")
      .order("invested_on", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Investment[]);
  };
  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const total = useMemo(() => items.reduce((s, i) => s + Number(i.amount), 0), [items]);
  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of items) m[i.type] = (m[i.type] ?? 0) + Number(i.amount);
    return m;
  }, [items]);


  const resetForm = () => {
    setName("");
    setAmount("");
    setType("renda_fixa");
    setExpected("");
    setDate(new Date());
    setNotes("");
    setEditing(null);
  };

  const openEdit = (item: Investment) => {
    setEditing(item);
    setName(item.name);
    setAmount(formatBRLInput(String(Math.round(Number(item.amount) * 100))));
    setType(item.type);
    setExpected(item.expected_return ? String(item.expected_return).replace(".", ",") : "");
    setDate(parseISO(item.invested_on));
    setNotes(item.notes || "");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!name.trim() || isNaN(value) || value < 0) {
      toast.error("Preencha nome e valor válidos.");
      return;
    }
    setBusy(true);
    const expectedVal = expected ? parseFloat(expected.replace(",", ".")) : null;
    if (editing) {
      const { error } = await supabase
        .from("investments")
        .update({
          name: name.trim(),
          amount: value,
          type,
          expected_return: expectedVal,
          invested_on: format(date, "yyyy-MM-dd"),
          notes: notes.trim() || null,
        })
        .eq("id", editing.id);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Investimento atualizado!");
    } else {
      const { error } = await supabase.from("investments").insert({
        user_id: user!.id,
        name: name.trim(),
        amount: value,
        type,
        expected_return: expectedVal,
        invested_on: format(date, "yyyy-MM-dd"),
        notes: notes.trim() || null,
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Investimento registrado!");
    }
    resetForm();
    setOpen(false);
    load();
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("investments").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Investimento removido"); load(); }
    setDeleteTarget(null);
  };

  if (loading || !user) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section
        className="mb-8 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl border border-border/60 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "linear-gradient(135deg, oklch(0.4 0.15 280) 0%, oklch(0.55 0.18 280) 50%, oklch(0.72 0.16 35) 100%)" }}
      >
        <div>
          <p className="flex items-center gap-2 text-sm opacity-90"><TrendingDown className="h-4 w-4 rotate-180" /> Total investido</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(total)}</p>
          <p className="mt-1 text-sm opacity-80">{items.length} aplicaç{items.length === 1 ? "ão" : "ões"}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button size="lg" variant="secondary" onClick={() => resetForm()}><Plus className="mr-1 h-4 w-4" /> Novo investimento</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar investimento" : "Registrar investimento"}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="inv-name">Nome</Label>
                  <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Tesouro Selic 2029" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-amount">Valor (R$)</Label>
                  <Input id="inv-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-type">Tipo</Label>
                  <Select value={type} onValueChange={(v) => setType(v as InvestmentType)}>
                    <SelectTrigger id="inv-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INVESTMENT_TYPES.map((t) => {
                        const Icon = t.icon;
                        return (
                          <SelectItem key={t.value} value={t.value}>
                            <span className="flex items-center gap-2"><Icon className="h-4 w-4" style={{ color: t.color }} />{t.label}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-expected">Rendimento esperado (% a.a.)</Label>
                  <Input id="inv-expected" inputMode="decimal" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="Ex.: 12,5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-date">Data da aplicação</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button id="inv-date" variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />{format(date, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="inv-notes">Observações</Label>
                  <Textarea id="inv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar investimento" : "Salvar investimento"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Por tipo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {INVESTMENT_TYPES.map((t) => {
              const v = byType[t.value] ?? 0;
              if (v === 0) return null;
              const pct = total > 0 ? (v / total) * 100 : 0;
              const Icon = t.icon;
              return (
                <div key={t.value}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><Icon className="h-4 w-4" style={{ color: t.color }} />{t.label}</span>
                    <span className="font-semibold tabular-nums">{formatBRL(v)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              );
            })}
            {total === 0 && <p className="text-sm text-muted-foreground">Nenhum investimento ainda.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Aplicações</CardTitle></CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Adicione seu primeiro investimento.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((i) => {
                  const t = INV_MAP[i.type];
                  const Icon = t.icon;
                  return (
                    <li key={i.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in oklab, ${t.color} 15%, transparent)` }}>
                        <Icon className="h-5 w-5" style={{ color: t.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{i.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.label} · {format(new Date(i.invested_on + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                          {i.expected_return ? ` · ${i.expected_return}% a.a.` : ""}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums">{formatBRL(Number(i.amount))}</p>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(i)} aria-label="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(i)} aria-label="Remover"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover investimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{deleteTarget?.name}</strong> ({formatBRL(Number(deleteTarget?.amount ?? 0))})? Esta ação não pode ser desfeita.
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
