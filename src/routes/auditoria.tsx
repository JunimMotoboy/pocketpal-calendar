import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, LogIn, LogOut, KeyRound, UserCog, Eye, Download, Ban,
  UserPen, Loader2, Search, RefreshCw, TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAuditLogs } from "@/lib/audit.functions";
import { AUDIT_LABELS, type AuditEvent } from "@/lib/audit";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria e segurança — Nix Wallet" },
      { name: "description", content: "Trilha de auditoria com logins, mudanças de permissões e acessos a dados sensíveis por usuário." },
      { property: "og:title", content: "Auditoria e segurança — Nix Wallet" },
      { property: "og:description", content: "Acompanhe logins, permissões e acessos a dados sensíveis da sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

type LogRow = {
  id: string;
  user_id: string;
  actor_email: string | null;
  event: string;
  description: string;
  resource: string | null;
  target_user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

const EVENT_ICONS: Record<string, typeof LogIn> = {
  login: LogIn,
  login_failed: TriangleAlert,
  logout: LogOut,
  password_reset: KeyRound,
  permission_change: UserCog,
  sensitive_data_access: Eye,
  data_export: Download,
  account_suspension: Ban,
  profile_update: UserPen,
};

const EVENT_TONE: Record<string, string> = {
  login: "text-emerald-500 bg-emerald-500/10",
  login_failed: "text-destructive bg-destructive/10",
  logout: "text-muted-foreground bg-muted",
  password_reset: "text-amber-500 bg-amber-500/10",
  permission_change: "text-violet-500 bg-violet-500/10",
  sensitive_data_access: "text-blue-500 bg-blue-500/10",
  data_export: "text-blue-500 bg-blue-500/10",
  account_suspension: "text-destructive bg-destructive/10",
  profile_update: "text-muted-foreground bg-muted",
};

function fmt(dt: string) {
  return new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function AuditPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const listFn = useServerFn(listAuditLogs);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(true);
  const [days, setDays] = useState(30);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const load = async () => {
    setBusy(true);
    try {
      const res = await listFn({
        data: {
          days,
          limit: 300,
          ...(eventFilter !== "all" ? { event: eventFilter as AuditEvent } : {}),
        },
      });
      setLogs(res.logs as LogRow[]);
      setIsAdmin(res.isAdmin);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar a trilha de auditoria");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, days, eventFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.description.toLowerCase().includes(q) ||
        (l.actor_email ?? "").toLowerCase().includes(q) ||
        (l.resource ?? "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  const kpis = useMemo(() => {
    const count = (e: string) => filtered.filter((l) => l.event === e).length;
    return {
      total: filtered.length,
      logins: count("login"),
      failed: count("login_failed"),
      permission: count("permission_change") + count("account_suspension"),
      sensitive: count("sensitive_data_access") + count("data_export"),
    };
  }, [filtered]);

  const byUser = useMemo(() => {
    const map = new Map<string, { email: string; logs: LogRow[] }>();
    for (const l of filtered) {
      const entry = map.get(l.user_id) ?? { email: l.actor_email ?? l.user_id.slice(0, 8), logs: [] };
      entry.logs.push(l);
      map.set(l.user_id, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].logs.length - a[1].logs.length);
  }, [filtered]);

  if (loading || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section
        className="mb-6 overflow-hidden rounded-2xl border border-border/60 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "linear-gradient(135deg, oklch(0.32 0.12 250) 0%, oklch(0.52 0.16 200) 100%)" }}
      >
        <p className="flex items-center gap-2 text-sm opacity-90">
          <ShieldCheck className="h-4 w-4" /> {isAdmin ? "Trilha global (administrador)" : "Sua trilha de atividades"}
        </p>
        <h1 className="mt-1 text-3xl font-bold">Auditoria e segurança</h1>
        <p className="mt-1 text-sm opacity-90">
          Logins, mudanças de permissões e acessos a dados sensíveis dos últimos {days} dias
        </p>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Eventos", value: kpis.total, icon: ShieldCheck },
          { label: "Logins", value: kpis.logins, icon: LogIn },
          { label: "Falhas de login", value: kpis.failed, icon: TriangleAlert },
          { label: "Dados sensíveis", value: kpis.sensitive, icon: Eye },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="py-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <k.icon className="h-3.5 w-3.5" /> {k.label}
              </p>
              <p className="mt-1 text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por descrição, usuário ou recurso"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar eventos de auditoria"
          />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[190px]" aria-label="Filtrar por tipo de evento">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            {Object.entries(AUDIT_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[130px]" aria-label="Filtrar por período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
            <SelectItem value="365">1 ano</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load} aria-label="Atualizar trilha" disabled={busy}>
          <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>

      {busy ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando trilha...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum evento registrado"
          description="Ações de segurança como logins, mudanças de permissão e exportações aparecerão aqui automaticamente."
        />
      ) : (
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">Linha do tempo</TabsTrigger>
            <TabsTrigger value="users">Por usuário</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4 space-y-2">
            {filtered.map((l) => {
              const Icon = EVENT_ICONS[l.event] ?? ShieldCheck;
              return (
                <Card key={l.id}>
                  <CardContent className="flex items-start gap-3 py-3">
                    <span className={`mt-0.5 rounded-lg p-2 ${EVENT_TONE[l.event] ?? "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{AUDIT_LABELS[l.event as AuditEvent] ?? l.event}</Badge>
                        <span className="text-sm font-medium">{l.description}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {fmt(l.created_at)}
                        {isAdmin && l.actor_email ? ` · ${l.actor_email}` : ""}
                        {l.resource ? ` · ${l.resource}` : ""}
                        {l.ip_address ? ` · IP ${l.ip_address}` : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="users" className="mt-4 space-y-3">
            {byUser.map(([uid, info]) => (
              <Card key={uid}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {info.email}
                    {uid === user.id && <Badge variant="secondary">você</Badge>}
                    <span className="text-xs font-normal text-muted-foreground">{info.logs.length} evento(s)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {info.logs.slice(0, 8).map((l) => (
                    <p key={l.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{AUDIT_LABELS[l.event as AuditEvent] ?? l.event}</span>
                      {l.description} · {fmt(l.created_at)}
                    </p>
                  ))}
                  {info.logs.length > 8 && (
                    <p className="text-xs text-muted-foreground">+ {info.logs.length - 8} evento(s) anteriores</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}
