import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, User as UserIcon, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Nix Wallet" },
      { name: "description", content: "Acesse sua conta." },
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

const STRENGTH_COLORS = ["bg-muted", "bg-destructive", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];

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
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

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
    else toast.success("Email reenviado.");
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = forgotEmail.trim();
    if (!emailRegex.test(value)) {
      triggerShake("fg-email");
      toast.error("Email inválido.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(translateAuthError(error.message));
      return;
    }
    setForgotSent(true);
    toast.success("Link enviado!");
  };

  useEffect(() => {
    if (!loading && user) {
      if (pendingEmail) toast.success("Email confirmado!");
      nav({ to: "/" });
    }
  }, [user, loading, nav, pendingEmail]);

  useEffect(() => {
    if (!pendingEmail) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        toast.success("Confirmado!");
        nav({ to: "/" });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [pendingEmail, nav]);

  const translateAuthError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes("invalid login") || m.includes("invalid credentials")) return "Email ou senha inválidos.";
    if (m.includes("email not confirmed")) return "Confirme seu email primeiro.";
    if (m.includes("user already registered") || m.includes("already registered")) return "Email já cadastrado.";
    if (m.includes("invalid email")) return "Email inválido.";
    if (m.includes("password")) return "Senha fraca. Mínimo 8 caracteres, 1 maiúscula e 1 minúscula.";
    if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um pouco.";
    if (m.includes("network")) return "Erro de conexão.";
    return "Erro. Tente novamente.";
  };

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "Mínimo 8 caracteres.";
    if (!/[A-Z]/.test(pw)) return "Falta 1 maiúscula.";
    if (!/[a-z]/.test(pw)) return "Falta 1 minúscula.";
    return null;
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) {
      triggerShake("li-email");
      toast.error("Informe um email válido.");
      return;
    }
    if (!password) {
      triggerShake("li-pass");
      toast.error("Informe sua senha.");
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
      toast.error("Informe seu nome.");
      return;
    }
    if (!emailValid) {
      triggerShake("su-email");
      toast.error("Informe um email válido.");
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
      toast.success("Conta criada! Verifique seu email.");
    }
  };

  const pwChecks = [
    { ok: password.length >= 8, label: "8+ chars" },
    { ok: /[A-Z]/.test(password), label: "A-Z" },
    { ok: /[a-z]/.test(password), label: "a-z" },
    { ok: /\d/.test(password), label: "0-9" },
  ];

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 py-8">
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

      <div className="relative grid w-full max-w-5xl gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-4 text-center md:text-left animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Seu dinheiro,{" "}
            <span
              className="bg-clip-text text-transparent inline-block min-w-[8ch]"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              <TypewriterCycle words={["sob controle", "sem stress", "com clareza", "no azul"]} />
              <span className="ml-0.5 inline-block w-[2px] h-[0.9em] align-[-0.1em] bg-primary animate-caret" aria-hidden />
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Gastos, metas e dicas num só lugar.
          </p>
        </div>

        <Card className={cn("relative overflow-hidden border-border/60 shadow-[var(--shadow-elegant)] backdrop-blur animate-scale-in bg-card/80")}>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ backgroundImage: "var(--gradient-hero)" }} />
          {pendingEmail ? (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  Confirme seu email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center py-2">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full opacity-40 blur-xl animate-pulse" style={{ backgroundImage: "var(--gradient-hero)" }} />
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground" style={{ backgroundImage: "var(--gradient-hero)" }}>
                      <Mail className="h-6 w-6" />
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Link enviado para <strong>{pendingEmail}</strong>.
                </p>
                <Button onClick={handleResend} disabled={resending} className="w-full">
                  {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Reenviar
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setPendingEmail(null)}>
                  Voltar
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Acessar</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="signup">Criar conta</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="data-[state=active]:animate-fade-in">
                    {forgotMode ? (
                      forgotSent ? (
                        <div className="mt-4 space-y-4 animate-fade-in text-center">
                          <div className="flex items-center justify-center py-2">
                            <div className="relative">
                              <div className="absolute inset-0 rounded-full opacity-40 blur-xl animate-pulse" style={{ backgroundImage: "var(--gradient-hero)" }} />
                              <div className="relative flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground" style={{ backgroundImage: "var(--gradient-hero)" }}>
                                <Mail className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Link enviado para <strong>{forgotEmail}</strong>.
                          </p>
                          <Button variant="outline" className="w-full" onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}>
                            Voltar
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={onForgot} className="mt-4 space-y-4 animate-fade-in">
                          <FloatingField
                            id="fg-email"
                            placeholder="Email"
                            type="email"
                            icon={Mail}
                            value={forgotEmail}
                            onChange={setForgotEmail}
                            valid={forgotEmail.length > 0 && emailRegex.test(forgotEmail.trim())}
                            invalid={forgotEmail.length > 3 && !emailRegex.test(forgotEmail.trim())}
                            autoComplete="email"
                            required
                            shakeTick={shakeTick}
                            error={fieldError === "fg-email"}
                          />
                          <SubmitButton busy={busy} label="Enviar link" busyLabel="Enviando..." />
                          <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Voltar para o login
                          </button>
                        </form>
                      )
                    ) : (
                      <form onSubmit={onLogin} className="mt-4 space-y-4">
                        <FloatingField
                          id="li-email"
                          placeholder="Email"
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
                          placeholder="Senha"
                          value={password}
                          onChange={setPassword}
                          show={showPw}
                          onToggle={() => setShowPw((s) => !s)}
                          autoComplete="current-password"
                          shakeTick={shakeTick}
                          error={fieldError === "li-pass"}
                        />
                        <div className="flex justify-end">
                          <button type="button" onClick={() => setForgotMode(true)} className="text-xs font-medium text-primary hover:underline transition-colors">
                            Esqueci a senha
                          </button>
                        </div>
                        <SubmitButton busy={busy} label="Entrar" busyLabel="Entrando..." />
                      </form>
                    )}
                  </TabsContent>

                  <TabsContent value="signup" className="data-[state=active]:animate-fade-in">
                    <form onSubmit={onSignup} className="mt-4 space-y-4">
                      <FloatingField
                        id="su-name"
                        placeholder="Nome"
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
                        placeholder="Email"
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
                        placeholder="Senha"
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
                          <div className="flex flex-wrap gap-2 text-xs">
                            {pwChecks.map((c) => (
                              <span key={c.label} className={cn("flex items-center gap-1", c.ok ? "text-emerald-500" : "text-muted-foreground")}>
                                {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {c.label}
                              </span>
                            ))}
                          </div>
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
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 rounded-full opacity-40 blur-xl animate-pulse" style={{ backgroundImage: "var(--gradient-hero)" }} />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground" style={{ backgroundImage: "var(--gradient-hero)" }}>
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{tab === "login" ? "Entrando..." : "Criando..."}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* --------------- Subcomponents --------------- */

function FloatingField({
  id,
  placeholder,
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
  placeholder: string;
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
    <div className={cn("space-y-1", shaking && "animate-shake")}>
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
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
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
  placeholder,
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
  placeholder: string;
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
    <div className={cn("space-y-1", shaking && "animate-shake")}>
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
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
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
