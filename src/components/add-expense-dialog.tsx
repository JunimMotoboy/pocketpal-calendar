import { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORIES, PAYMENT_METHODS, type Category, type PaymentMethod } from "@/lib/categories";
import { formatBRLInput, parseBRLInput } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ExpenseItem = {
  id: string;
  description: string;
  amount: number;
  category: Category;
  payment_method: string | null;
  spent_on: string;
  notes: string | null;
  card_id?: string | null;
  installments?: number | null;
};

type CardOption = { id: string; name: string; limit_amount: number };


export function ExpenseDialog({
  userId,
  defaultDate,
  expense,
  onSaved,
  trigger,
}: {
  userId: string;
  defaultDate?: Date;
  expense?: ExpenseItem;
  onSaved: () => void;
  trigger?: React.ReactNode;
}) {
  const isEdit = !!expense;
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => defaultDate ?? new Date(), [defaultDate]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("comida");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cardId, setCardId] = useState<string | "none">("none");
  const [cards, setCards] = useState<CardOption[]>([]);
  const [installments, setInstallments] = useState<string>("1");
  const [date, setDate] = useState<Date>(initial);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("cards").select("id, name, limit_amount").order("created_at", { ascending: false })
      .then(({ data }) => setCards((data ?? []) as CardOption[]));
  }, [open]);


  useEffect(() => {
    if (open && isEdit && expense) {
      setDescription(expense.description);
      setAmount(formatBRLInput(String(Math.round(Number(expense.amount) * 100))));
      setCategory(expense.category);
      setPaymentMethod((expense.payment_method as PaymentMethod) || "pix");
      setCardId(expense.card_id ?? "none");
      setInstallments(String(expense.installments ?? 1));
      setDate(parseISO(expense.spent_on));
      setNotes(expense.notes || "");
    }
    if (open && !isEdit) {
      setDescription("");
      setAmount("");
      setCategory("comida");
      setPaymentMethod("pix");
      setCardId("none");
      setInstallments("1");
      setDate(defaultDate ?? new Date());
      setNotes("");
    }
  }, [open, isEdit, expense, defaultDate]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!description.trim() || isNaN(value) || value < 0) {
      toast.error("Preencha descrição e valor válidos.");
      return;
    }
    setBusy(true);
    const linkedCard = paymentMethod === "credito" && cardId !== "none" ? cardId : null;
    const inst = paymentMethod === "credito" ? Math.max(1, parseInt(installments, 10) || 1) : 1;
    if (isEdit && expense) {
      const { error } = await supabase
        .from("expenses")
        .update({
          description: description.trim(),
          amount: value,
          category,
          payment_method: paymentMethod,
          card_id: linkedCard,
          installments: inst,
          spent_on: format(date, "yyyy-MM-dd"),
          notes: notes.trim() || null,
        })
        .eq("id", expense.id);
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Gasto atualizado!");
    } else {
      const { error } = await supabase.from("expenses").insert({
        user_id: userId,
        description: description.trim(),
        amount: value,
        category,
        payment_method: paymentMethod,
        card_id: linkedCard,
        installments: inst,
        spent_on: format(date, "yyyy-MM-dd"),
        notes: notes.trim() || null,
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Gasto registrado!");
    }

    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="lg" className="shadow-[var(--shadow-soft)]">
            <Plus className="mr-1 h-4 w-4" /> Novo gasto
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar gasto" : "Registrar novo gasto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="desc">Descrição</Label>
              <Input id="desc" placeholder="Ex.: Almoço no restaurante" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amt">Valor (R$)</Label>
              <Input id="amt" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-cat">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger id="exp-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: c.color }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="exp-pay">Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger id="exp-pay"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {p.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === "credito" && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="exp-card">Cartão</Label>
                <Select value={cardId} onValueChange={(v) => setCardId(v as string)}>
                  <SelectTrigger id="exp-card"><SelectValue placeholder="Selecione um cartão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem cartão vinculado</SelectItem>
                    {cards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cards.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum cartão cadastrado. Vá em <strong>Cartões</strong> para adicionar.</p>
                )}
              </div>
            )}
            {paymentMethod === "credito" && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="exp-inst">Parcelas</Label>
                <Input id="exp-inst" type="number" min={1} max={48} value={installments} onChange={(e) => setInstallments(e.target.value)} />
                {(() => {
                  const v = parseFloat(amount.replace(",", "."));
                  const n = Math.max(1, parseInt(installments, 10) || 1);
                  if (!isNaN(v) && v > 0 && n > 1) {
                    return <p className="text-xs text-muted-foreground">{n}x de R$ {(v / n).toFixed(2).replace(".", ",")}</p>;
                  }
                  return null;
                })()}
              </div>
            )}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="exp-date">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="exp-date" variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Salvando..." : isEdit ? "Atualizar gasto" : "Salvar gasto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddExpenseDialog(props: {
  userId: string;
  defaultDate?: Date;
  onAdded: () => void;
}) {
  return <ExpenseDialog {...props} onSaved={props.onAdded} />;
}
