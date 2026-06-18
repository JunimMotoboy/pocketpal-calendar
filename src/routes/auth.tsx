import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wallet, Sparkles, Mail, Lock, User as UserIcon, Eye, EyeOff, Check, X, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Nix Wallet" },
      { name: "description", content: "Acesse sua conta para controlar seus gastos." },
    ],
  }),
  component: AuthPage,
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["", "Fraca", "Razoável", "Boa", "Forte"];
const STRENGTH_COLORS = [
  "bg-muted",
  "bg-destructive",
  "bg-amber-500",
  "bg-blue-500",
  "bg-emerald-500",
];

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [shakeTick, setShakeTick] = useState(0);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const emailValid = email.length > 0 && emailRegex.test(email.trim());
  const emailInvalid = email.length > 3 && !emailValid;
  const strength = useMemo(() => passwordStrength(password), [password]);

  const triggerShake = (field?: string) => {
    setShakeTick((t) => t + 1);
    if (field) {
      setFieldError(field);
      setTimeout(() => setFieldError((f) => (f === field ? null : f)), 600);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResending(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: redirectUrl },
    });
    setResending(false);
    if (error) toast.error(translateAuthError(error.message));
    else toast.success("Email de verificação reenviado. Confira sua caixa de entrada.");
  };

  useEffect(() => {
    if (!loading && user) {
      if (pendingEmail) toast.success("Email confirmado! Redirecionando...");
      nav({ to: "/" });
    }
  }, [user, loading, nav, pendingEmail]);

  useEffect(() => {
    if (!pendingEmail) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        toast.success("Email confirmado com sucesso!");
        nav({ to: "/" });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [pendingEmail, nav]);

  const translateAuthError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes("invalid login") || m.includes("invalid credentials")) return "Email ou senha inválidos.";
    if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar.";
    if (m.includes("user already registered") || m.includes("already registered")) return "Este email já está cadastrado.";
    if (m.includes("invalid email")) return "Email inválido.";
    if (m.includes("password")) return "Senha inválida. Use no mínimo 8 caracteres, com 1 maiúscula e 1 minúscula.";
    if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
    if (m.includes("network")) return "Erro de conexão. Verifique sua internet.";
    return "Ocorreu um erro. Tente novamente.";
  };

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
    if (!/[A-Z]/.test(pw)) return "A senha deve conter pelo menos 1 letra maiúscula.";
    if (!/[a-z]/.test(pw)) return "A senha deve conter pelo menos 1 letra minúscula.";
    return null;
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) {
      triggerShake("li-email");
      toast.error("Por favor, informe um email válido.");
      return;
    }
    if (!password) {
      triggerShake("li-pass");
      toast.error("Por favor, informe sua senha.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      triggerShake("login");
      toast.error(translateAuthError(error.message));
    } else {
      nav({ to: "/" });
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerShake("su-name");
      toast.error("Por favor, informe seu nome.");
      return;
    }
    if (!emailValid) {
      triggerShake("su-email");
      toast.error("Por favor, informe um email válido.");
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      triggerShake("su-pass");
      toast.error(pwError);
      return;
    }
    setBusy(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectUrl, data: { display_name: name.trim() } },
    });
    setBusy(false);
    if (error) {
      triggerShake("signup");
      toast.error(translateAuthError(error.message));
    } else {
      setPendingEmail(email.trim());
      toast.success("Conta criada! Verifique seu email para confirmar.");
    }
  };

  const pwChecks = [
    { ok: password.length >= 8, label: "8+ caracteres" },
    { ok: /[A-Z]/.test(password), label: "1 maiúscula" },
    { ok: /[a-z]/.test(password), label: "1 minúscula" },
    { ok: /\d/.test(password), label: "1 número" },
  ];

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      {/* Animated background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl animate-blob"
          style={{ backgroundImage: "var(--gradient-hero)" }}
        />
        <div
          className="absolute -bottom-32 -right-24 h-[26rem] w-[26rem] rounded-full opacity-30 blur-3xl animate-blob-delayed"
          style={{ backgroundImage: "var(--gradient-hero)" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_30%,hsl(var(--background))_75%)]" />
      </div>

      <div className="relative grid w-full max-w-5xl gap-10 md:grid-cols-2 md:items-center">
        <div className="space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            Com dicas inteligentes de IA
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Veja para onde seu{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              dinheiro vai
            </span>
            .
          </h1>
          <p className="text-lg text-muted-foreground">
            Registre cada gasto por categoria, visualize tudo num calendário e receba dicas
            personalizadas para economizar mês a mês.
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Wallet className="h-5 w-5 text-primary" />
            Histórico salvo para sempre — acesse meses passados a qualquer momento.
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Seus dados são criptografados e nunca compartilhados.
          </div>
        </div>

        <Card
          className={cn(
            "relative overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] backdrop-blur",
            "animate-scale-in bg-card/80"
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          />
          {pendingEmail ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Verifique seu email
                </CardTitle>
                <CardDescription>
                  Enviamos um link de confirmação para <strong>{pendingEmail}</strong>. Clique no
                  link para ativar sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center py-4">
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-full opacity-40 blur-xl animate-pulse"
                      style={{ backgroundImage: "var(--gradient-hero)" }}
                    />
                    <div
                      className="relative flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground"
                      style={{ backgroundImage: "var(--gradient-hero)" }}
                    >
                      <Mail className="h-7 w-7" />
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Não recebeu? Verifique sua caixa de spam ou reenvie abaixo.
                </p>
                <Button onClick={handleResend} disabled={resending} className="w-full">
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reenviando...
                    </>
                  ) : (
                    "Reenviar email de verificação"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPendingEmail(null)}
                >
                  Voltar
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Bem-vindo</CardTitle>
                <CardDescription>Entre ou crie uma conta para começar</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="signup">Criar conta</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="data-[state=active]:animate-fade-in">
                    <form onSubmit={onLogin} className="mt-4 space-y-4">
                      <FloatingField
                        id="li-email"
                        label="Email"
                        type="email"
                        icon={Mail}
                        value={email}
                        onChange={setEmail}
                        valid={emailValid}
                        invalid={emailInvalid}
                        autoComplete="email"
                        required
                        shakeTick={shakeTick}
                        error={fieldError === "li-email"}
                      />
                      <PasswordField
                        id="li-pass"
                        label="Senha"
                        value={password}
                        onChange={setPassword}
                        show={showPw}
                        onToggle={() => setShowPw((s) => !s)}
                        autoComplete="current-password"
                        shakeTick={shakeTick}
                        error={fieldError === "li-pass"}
                      />
                      <SubmitButton busy={busy} label="Entrar" busyLabel="Entrando..." />
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="data-[state=active]:animate-fade-in">
                    <form onSubmit={onSignup} className="mt-4 space-y-4">
                      <FloatingField
                        id="su-name"
                        label="Nome"
                        icon={UserIcon}
                        value={name}
                        onChange={setName}
                        valid={name.trim().length >= 2}
                        autoComplete="name"
                        required
                        shakeTick={shakeTick}
                        error={fieldError === "su-name"}
                      />
                      <FloatingField
                        id="su-email"
                        label="Email"
                        type="email"
                        icon={Mail}
                        value={email}
                        onChange={setEmail}
                        valid={emailValid}
                        invalid={emailInvalid}
                        autoComplete="email"
                        required
                        shakeTick={shakeTick}
                        error={fieldError === "su-email"}
                      />
                      <PasswordField
                        id="su-pass"
                        label="Senha"
                        value={password}
                        onChange={setPassword}
                        show={showPw}
                        onToggle={() => setShowPw((s) => !s)}
                        autoComplete="new-password"
                        minLength={8}
                        shakeTick={shakeTick}
                        error={fieldError === "su-pass"}
                      />

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
                            Força da senha:{" "}
                            <span className="font-medium text-foreground">
                              {STRENGTH_LABELS[strength] || "—"}
                            </span>
                          </p>
                          <ul className="grid grid-cols-2 gap-1 text-xs">
                            {pwChecks.map((c) => (
                              <li
                                key={c.label}
                                className={cn(
                                  "flex items-center gap-1 transition-colors",
                                  c.ok ? "text-emerald-500" : "text-muted-foreground"
                                )}
                              >
                                {c.ok ? (
                                  <Check className="h-3 w-3 animate-scale-in" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                                {c.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <SubmitButton busy={busy} label="Criar conta" busyLabel="Criando..." />
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
          {busy && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/60 backdrop-blur-sm animate-fade-in">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full opacity-40 blur-xl animate-pulse"
                  style={{ backgroundImage: "var(--gradient-hero)" }}
                />
                <div
                  className="relative flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground"
                  style={{ backgroundImage: "var(--gradient-hero)" }}
                >
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground animate-fade-in">
                {tab === "login" ? "Entrando..." : "Criando conta..."}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ----------------- Subcomponents -----------------

function FloatingField({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  valid,
  invalid,
  autoComplete,
  required,
  shakeTick,
  error,
}: {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  valid?: boolean;
  invalid?: boolean;
  autoComplete?: string;
  required?: boolean;
  shakeTick?: number;
  error?: boolean;
}) {
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (error || (shakeTick && shakeTick > 0)) {
      setShaking(false);
      const t1 = setTimeout(() => setShaking(true), 10);
      const t2 = setTimeout(() => setShaking(false), 500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [shakeTick, error]);
  return (
    <div className={cn("space-y-1.5", shaking && "animate-shake")}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div
        className={cn(
          "group relative flex items-center rounded-md border bg-background transition-all",
          "focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary",
          invalid && "border-destructive/60 focus-within:ring-destructive/30 focus-within:border-destructive",
          error && "border-destructive animate-pulse-error",
          valid && !invalid && !error && "border-emerald-500/50"
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "ml-3 h-4 w-4 shrink-0 transition-colors",
              invalid ? "text-destructive" : valid ? "text-emerald-500" : "text-muted-foreground group-focus-within:text-primary"
            )}
          />
        )}
        <Input
          id={id}
          type={type}
          value={value}
          required={required}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="mr-3 w-4">
          {valid && !invalid && <Check className="h-4 w-4 text-emerald-500 animate-scale-in" />}
          {invalid && <X className="h-4 w-4 text-destructive animate-scale-in" />}
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  minLength,
  shakeTick,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
  minLength?: number;
  shakeTick?: number;
  error?: boolean;
}) {
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (error || (shakeTick && shakeTick > 0)) {
      setShaking(false);
      const t1 = setTimeout(() => setShaking(true), 10);
      const t2 = setTimeout(() => setShaking(false), 500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [shakeTick, error]);
  return (
    <div className={cn("space-y-1.5", shaking && "animate-shake")}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className={cn(
        "group relative flex items-center rounded-md border bg-background transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary",
        error && "border-destructive animate-pulse-error"
      )}>
        <Lock className="ml-3 h-4 w-4 shrink-0 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="mr-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <Button
      type="submit"
      disabled={busy}
      className={cn(
        "group relative w-full overflow-hidden transition-transform active:scale-[0.98]",
        "shadow-[var(--shadow-soft)]"
      )}
      style={{ backgroundImage: "var(--gradient-hero)" }}
    >
      <span className="relative z-10 inline-flex items-center justify-center">
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {busyLabel}
          </>
        ) : (
          label
        )}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
    </Button>
  );
}
