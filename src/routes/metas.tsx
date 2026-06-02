import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Plus, Trash2, CheckCircle2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/categories";
import { toast } from "sonner";

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

function MetasPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("mensal");

  // contribute dialog
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [contribValue, setContribValue] = useState("");

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

  const handleCreate = async () => {
    if (!user) return;
    const value = parseFloat(target.replace(",", "."));
    if (!name.trim()) return toast.error("Informe um nome para a meta");
    if (!value || value <= 0) return toast.error("Informe um valor válido");

    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      name: name.trim(),
      target_amount: value,
      frequency,
    });
    if (error) return toast.error("Erro ao criar meta");
    toast.success("Meta criada!");
    setName("");
    setTarget("");
    setFrequency("mensal");
    setOpenCreate(false);
    load();
  };

  const handleContribute = async () => {
    if (!user || !contribGoal) return;
    const value = parseFloat(contribValue.replace(",", "."));
    if (!value || value <= 0) return toast.error("Informe um valor válido");

    const newAmount = Number(contribGoal.current_amount) + value;
    const completed = newAmount >= Number(contribGoal.target_amount);

    const { error: cErr } = await supabase.from("goal_contributions").insert({
      user_id: user.id,
      goal_id: contribGoal.id,
      amount: value,
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

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta meta?")) return;
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Meta excluída");
    load();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Metas</h1>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome da meta</Label>
                <Input
                  placeholder="Ex: Reserva de Emergência"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Valor da meta (R$)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="100,00"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                  <SelectTrigger>
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
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma meta ainda. Clique em <b>+ Nova Meta</b> para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const current = Number(g.current_amount);
            const target = Number(g.target_amount);
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            return (
              <Card key={g.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {g.name}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(g.id)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

      <Dialog open={!!contribGoal} onOpenChange={(o) => !o && setContribGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Valor — {contribGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="15,00"
              value={contribValue}
              onChange={(e) => setContribValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContribGoal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleContribute}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
