import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORIES, PAYMENT_METHODS, type Category, type PaymentMethod } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AddExpenseDialog({
  userId,
  defaultDate,
  onAdded,
}: {
  userId: string;
  defaultDate?: Date;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => defaultDate ?? new Date(), [defaultDate]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("comida");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [date, setDate] = useState<Date>(initial);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setDescription("");
    setAmount("");
    setCategory("comida");
    setPaymentMethod("pix");
    setDate(defaultDate ?? new Date());
    setNotes("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!description.trim() || isNaN(value) || value < 0) {
      toast.error("Preencha descrição e valor válidos.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("expenses").insert({
      user_id: userId,
      description: description.trim(),
      amount: value,
      category,
      payment_method: paymentMethod,
      spent_on: format(date, "yyyy-MM-dd"),
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Gasto registrado!");
    reset();
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="shadow-[var(--shadow-soft)]">
          <Plus className="mr-1 h-4 w-4" /> Novo gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar novo gasto</DialogTitle>
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
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div className="col-span-2 space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd/MM/yyyy")}
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
            {busy ? "Salvando..." : "Salvar gasto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
