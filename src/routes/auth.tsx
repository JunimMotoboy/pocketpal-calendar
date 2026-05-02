import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wallet, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Gastei" },
      { name: "description", content: "Acesse sua conta para controlar seus gastos." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/" });
  }, [user, loading, nav]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else nav({ to: "/" });
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { display_name: name } },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Conta criada! Você já pode entrar.");
      nav({ to: "/" });
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      />
      <div className="relative grid w-full max-w-5xl gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3 w-3 text-accent" />
            Com dicas inteligentes de IA
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Veja para onde seu <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>dinheiro vai</span>.
          </h1>
          <p className="text-lg text-muted-foreground">
            Registre cada gasto por categoria, visualize tudo num calendário e receba dicas
            personalizadas para economizar mês a mês.
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Wallet className="h-5 w-5 text-primary" />
            Histórico salvo para sempre — acesse meses passados a qualquer momento.
          </div>
        </div>

        <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>Entre ou crie uma conta para começar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={onLogin} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="li-email">Email</Label>
                    <Input id="li-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="li-pass">Senha</Label>
                    <Input id="li-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={onSignup} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Nome</Label>
                    <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pass">Senha</Label>
                    <Input id="su-pass" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Criando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
