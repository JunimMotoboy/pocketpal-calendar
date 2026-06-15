import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Plus, Trash2, CheckCircle2, Pencil, Search, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/categories";
import { formatBRLInput, parseBRLInput } from "@/lib/currency";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Nix Wallet" },
      { name: "description", content: "Crie e acompanhe suas metas financeiras." },
    ],
  }),
  component: MetasPage,
});

type Frequency = "diaria" | "semanal" | "quinzenal" | "mensal";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  frequency: Frequency;
  completed: boolean;
};

const FREQ_LABEL: Record<Frequency, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

const emptyForm = { name: "", target: "", frequency: "mensal" as Frequency };

function MetasPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [paceByGoal, setPaceByGoal] = useState<Record<string, { perDay: number; firstDate: string; count: number }>>({});
  const [loading, setLoading] = useState(true);

  // create/edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // contribute dialog
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [contribValue, setContribValue] = useState("");

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/auth" });
  }, [user, authLoading, nav]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar metas");
    else setGoals((data ?? []) as Goal[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (g: Goal) => {
    setEditingId(g.id);
    setForm({
      name: g.name,
      target: formatBRLInput(String(Math.round(Number(g.target_amount) * 100))),
      frequency: g.frequency,
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const value = parseBRLInput(form.target);
    if (!form.name.trim()) return toast.error("Informe um nome para a meta");
    if (!value || value <= 0) return toast.error("Informe um valor válido");

    if (editingId) {
      const goal = goals.find((g) => g.id === editingId);
      const completed = goal ? Number(goal.current_amount) >= value : false;
      const { error } = await supabase
        .from("goals")
        .update({
          name: form.name.trim(),
          target_amount: value,
          frequency: form.frequency,
          completed,
        })
        .eq("id", editingId);
      if (error) return toast.error("Erro ao atualizar meta");
      toast.success("Meta atualizada!");
    } else {
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        name: form.name.trim(),
        target_amount: value,
        frequency: form.frequency,
      });
      if (error) return toast.error("Erro ao criar meta");
      toast.success("Meta criada!");
    }
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !contribGoal) return;
    const value = parseBRLInput(contribValue);
    if (!value || value <= 0) return toast.error("Informe um valor válido");

    const newAmount = Number(contribGoal.current_amount) + value;
    const completed = newAmount >= Number(contribGoal.target_amount);

    const { error: cErr } = await supabase.from("goal_contributions").insert({
      user_id: user.id,
      goal_id: contribGoal.id,
      amount: value,
      contributed_on: new Date().toISOString().slice(0, 10),
    });
    if (cErr) return toast.error("Erro ao registrar valor");

    const { error: uErr } = await supabase
      .from("goals")
      .update({ current_amount: newAmount, completed })
      .eq("id", contribGoal.id);
    if (uErr) return toast.error("Erro ao atualizar meta");

    if (completed && !contribGoal.completed) {
      toast.success("🎉 Parabéns! Você concluiu sua meta.");
    } else {
      toast.success("Progresso adicionado!");
    }
    setContribValue("");
    setContribGoal(null);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    await supabase.from("goal_contributions").delete().eq("goal_id", id);
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Meta excluída");
      load();
    }
    setDeleteTarget(null);
  };

  if (authLoading || !user) {
    return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Metas</h1>
        </div>
        <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="goal-name">Nome da meta</Label>
                <Input
                  id="goal-name"
                  placeholder="Ex: Reserva de Emergência"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-target">Valor da meta (R$)</Label>
                <Input
                  id="goal-target"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: formatBRLInput(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-frequency">Frequência</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Frequency })}>
                  <SelectTrigger id="goal-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Diária</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Sem metas ainda"
          description="Defina objetivos como viagem, reserva de emergência ou um curso, e acompanhe o progresso a cada aporte."
          action={<Button onClick={() => { setEditingId(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Criar primeira meta</Button>}
        />
      ) : (() => {
        const q = search.trim().toLowerCase();
        const filtered = q ? goals.filter((g) => g.name.toLowerCase().includes(q)) : goals;
        return (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar meta pelo nome..."
              className="pl-9"
              aria-label="Buscar metas"
            />
          </div>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma meta encontrada para "{search}".
              </CardContent>
            </Card>
          ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((g) => {
            const current = Number(g.current_amount);
            const target = Number(g.target_amount);
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            return (
              <Card key={g.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <span className="truncate">{g.name}</span>
                        {g.completed && (
                          <Badge className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Concluída
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Frequência: {FREQ_LABEL[g.frequency]}
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(g)}
                        aria-label="Editar meta"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(g)}
                        aria-label="Excluir meta"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm">
                      <b>{formatBRL(current)}</b>{" "}
                      <span className="text-muted-foreground">de {formatBRL(target)}</span>
                    </span>
                    <span className="text-sm font-semibold">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                  {g.completed ? (
                    <p className="text-sm text-green-600 font-medium">
                      🎉 Parabéns! Você concluiu sua meta.
                    </p>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setContribGoal(g)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Valor
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
          )}
        </>
        );
      })()}


      <Dialog open={!!contribGoal} onOpenChange={(o) => !o && setContribGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Valor — {contribGoal?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContribute} className="space-y-1">
            <Label htmlFor="contrib-value">Valor (R$)</Label>
            <Input
              id="contrib-value"
              inputMode="decimal"
              placeholder="0,00"
              value={contribValue}
              onChange={(e) => setContribValue(formatBRLInput(e.target.value))}
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground pt-1">
              O valor será registrado na data de hoje e aparecerá no calendário do painel.
            </p>
            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setContribGoal(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir a meta <strong>{deleteTarget?.name}</strong> e todos os seus aportes? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
