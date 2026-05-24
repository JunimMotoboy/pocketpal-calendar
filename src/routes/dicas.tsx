import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinancialTips } from "@/server/tips.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/dicas")({
  head: () => ({
    meta: [
      { title: "Dicas IA — Nix Wallet" },
      { name: "description", content: "Receba dicas personalizadas de IA para usar melhor o seu dinheiro." },
    ],
  }),
  component: TipsPage,
});

function renderMarkdown(md: string) {
  // Minimal markdown rendering: bullets and bold
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={out.length} className="my-3 list-disc space-y-2 pl-6 marker:text-primary">
          {bullets.map((b, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(b) }} />
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  const inline = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    const m = l.match(/^[-*]\s+(.*)$/);
    if (m) { bullets.push(m[1]); continue; }
    const h = l.match(/^#{1,6}\s+(.*)$/);
    if (h) { flush(); out.push(<h3 key={out.length} className="mt-4 text-lg font-semibold">{h[1]}</h3>); continue; }
    flush();
    out.push(<p key={out.length} className="my-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(l) }} />);
  }
  flush();
  return out;
}

function TipsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [tips, setTips] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const generate = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("category, amount, description, spent_on")
      .order("spent_on", { ascending: false })
      .limit(300);
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    const res = await getFinancialTips({
      data: { expenses: (data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) },
    });
    setBusy(false);
    if (res.error) toast.error(res.error);
    else setTips(res.tips);
  };

  if (loading || !user) {
    return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Card className="overflow-hidden border-border/60 shadow-[var(--shadow-elegant)]">
        <div className="p-6 text-primary-foreground" style={{ backgroundImage: "var(--gradient-hero)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/20 backdrop-blur">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dicas inteligentes</h1>
              <p className="text-sm opacity-90">A IA analisa seus gastos e sugere como economizar.</p>
            </div>
          </div>
        </div>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Suas dicas personalizadas</CardTitle>
          <Button onClick={generate} disabled={busy}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            {tips ? "Gerar novamente" : "Gerar dicas"}
          </Button>
        </CardHeader>
        <CardContent>
          {!tips && !busy && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Clique em <strong>Gerar dicas</strong> para receber recomendações com base nos seus gastos.
            </div>
          )}
          {busy && (
            <div className="space-y-2 py-4">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          )}
          {tips && <div className="prose prose-sm max-w-none text-foreground">{renderMarkdown(tips)}</div>}
        </CardContent>
      </Card>
    </main>
  );
}
