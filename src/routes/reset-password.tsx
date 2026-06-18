import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Check, X, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Nix Wallet" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: ResetPasswordPage,
});

function passwordStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
const STRENGTH_LABELS = ["", "Fraca", "Razoável", "Boa", "Forte"];
const STRENGTH_COLORS = ["bg-muted", "bg-destructive", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase sends users back with a recovery token in the URL hash.
  // The client picks it up via detectSessionInUrl and emits PASSWORD_RECOVERY.
  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
        setReady(true);
      }
    });
    // Also check existing session (in case event already fired)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const hasRecovery =
        typeof window !== "undefined" &&
        (window.location.hash.includes("type=recovery") ||
          window.location.search.includes("type=recovery"));
      if (data.session && (hasRecovery || validSession)) setValidSession(true);
      setReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const checks = [
    { ok: password.length >= 8, label: "8+ caracteres" },
    { ok: /[A-Z]/.test(password), label: "1 maiúscula" },
    { ok: /[a-z]/.test(password), label: "1 minúscula" },
    { ok: /\d/.test(password), label: "1 número" },
  ];
  const pwError =
    password.length === 0
      ? null
      : password.length < 8
        ? "Mínimo de 8 caracteres."
        : !/[A-Z]/.test(password)
          ? "Inclua ao menos 1 letra maiúscula."
          : !/[a-z]/.test(password)
            ? "Inclua ao menos 1 letra minúscula."
            : null;
  const confirmError =
    confirm.length === 0 ? null : confirm !== password ? "As senhas não coincidem." : null;
  const canSubmit = !pwError && !confirmError && password.length > 0 && confirm.length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error(pwError || confirmError || "Verifique os campos.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("same") || m.includes("different")) toast.error("Use uma senha diferente da atual.");
      else if (m.includes("weak") || m.includes("password")) toast.error("Senha fraca. Tente uma mais forte.");
      else toast.error("Não foi possível atualizar a senha. Tente novamente.");
      return;
    }
    setDone(true);
    toast.success("Senha redefinida com sucesso!");
    await supabase.auth.signOut();
    setTimeout(() => nav({ to: "/auth" }), 1500);
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl animate-blob"
          style={{ backgroundImage: "var(--gradient-hero)" }} />
        <div className="absolute -bottom-32 -right-24 h-[26rem] w-[26rem] rounded-full opacity-30 blur-3xl animate-blob-delayed"
          style={{ backgroundImage: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_30%,hsl(var(--background))_75%)]" />
      </div>

      <Card className="relative w-full max-w-md overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] backdrop-blur animate-scale-in bg-card/80">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ backgroundImage: "var(--gradient-hero)" }} />

        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Redefinir senha
          </CardTitle>
          <CardDescription>
            Escolha uma nova senha segura para sua conta.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!ready ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : done ? (
            <div className="space-y-3 py-4 text-center animate-fade-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-7 w-7" />
              </div>
              <p className="text-sm text-muted-foreground">
                Senha redefinida. Redirecionando para o login...
              </p>
            </div>
          ) : !validSession ? (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Link inválido ou expirado. Solicite um novo email de redefinição.
              </div>
              <Button className="w-full" onClick={() => nav({ to: "/auth" })}>
                Voltar para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-pw" className="text-xs font-medium text-muted-foreground">
                  Nova senha
                </Label>
                <div className={cn(
                  "group relative flex items-center rounded-md border bg-background transition-all",
                  "focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary",
                  pwError && "border-destructive/60",
                  !pwError && password.length > 0 && "border-emerald-500/50"
                )}>
                  <Lock className="ml-3 h-4 w-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  <Input
                    id="new-pw"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                    className="mr-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pwError && (
                  <p className="text-xs text-destructive animate-fade-in">{pwError}</p>
                )}
              </div>

              {password.length > 0 && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-all duration-300",
                          i < strength ? STRENGTH_COLORS[strength] : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Força:{" "}
                    <span className="font-medium text-foreground">
                      {STRENGTH_LABELS[strength] || "—"}
                    </span>
                  </p>
                  <ul className="grid grid-cols-2 gap-1 text-xs">
                    {checks.map((c) => (
                      <li
                        key={c.label}
                        className={cn(
                          "flex items-center gap-1 transition-colors",
                          c.ok ? "text-emerald-500" : "text-muted-foreground"
                        )}
                      >
                        {c.ok ? <Check className="h-3 w-3 animate-scale-in" /> : <X className="h-3 w-3" />}
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pw" className="text-xs font-medium text-muted-foreground">
                  Confirmar nova senha
                </Label>
                <div className={cn(
                  "group relative flex items-center rounded-md border bg-background transition-all",
                  "focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary",
                  confirmError && "border-destructive/60",
                  !confirmError && confirm.length > 0 && "border-emerald-500/50"
                )}>
                  <Lock className="ml-3 h-4 w-4 shrink-0 text-muted-foreground group-focus-within:text-primary" />
                  <Input
                    id="confirm-pw"
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="mr-3 w-4">
                    {confirm.length > 0 && !confirmError && (
                      <Check className="h-4 w-4 text-emerald-500 animate-scale-in" />
                    )}
                    {confirmError && <X className="h-4 w-4 text-destructive animate-scale-in" />}
                  </div>
                </div>
                {confirmError && (
                  <p className="text-xs text-destructive animate-fade-in">{confirmError}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={busy || !canSubmit}
                className="group relative w-full overflow-hidden transition-transform active:scale-[0.98] shadow-[var(--shadow-soft)]"
                style={{ backgroundImage: "var(--gradient-hero)" }}
              >
                <span className="relative z-10 inline-flex items-center justify-center">
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Redefinir senha"
                  )}
                </span>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
