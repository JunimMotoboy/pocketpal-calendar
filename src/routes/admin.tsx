import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Shield, Ban, CircleCheck, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listAppUsers, setUserSuspension, checkIsAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administração — Nix Wallet" }] }),
  component: AdminPage,
});

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
};

function AdminPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const listFn = useServerFn(listAppUsers);
  const suspendFn = useServerFn(setUserSuspension);
  const checkFn = useServerFn(checkIsAdmin);

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const load = async () => {
    setLoadingList(true);
    try {
      const { users } = await listFn();
      setUsers(users);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar usuários");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { isAdmin } = await checkFn();
        setAllowed(isAdmin);
        if (isAdmin) load();
      } catch {
        setAllowed(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleSuspend = async (u: UserRow, suspend: boolean) => {
    setBusy(u.id);
    try {
      await suspendFn({ data: { userId: u.id, suspend } });
      toast.success(suspend ? "Conta suspensa" : "Conta reativada");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    } finally {
      setBusy(null);
    }
  };

  if (loading || !user || allowed === null) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
      </div>
    );
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">Esta área é exclusiva para administradores.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section
        className="mb-8 overflow-hidden rounded-2xl border border-border/60 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "linear-gradient(135deg, oklch(0.35 0.18 280) 0%, oklch(0.55 0.2 320) 100%)" }}
      >
        <p className="flex items-center gap-2 text-sm opacity-90"><Shield className="h-4 w-4" /> Painel do administrador</p>
        <h1 className="mt-1 text-3xl font-bold">Usuários cadastrados</h1>
        <p className="mt-1 text-sm opacity-90">{users.length} usuário(s) no app</p>
      </section>

      {loadingList ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando usuários...
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const suspended = !!u.banned_until && new Date(u.banned_until) > new Date();
            const isSelf = u.id === user.id;
            return (
              <Card key={u.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{u.email || "(sem e-mail)"}</span>
                      {isSelf && <Badge variant="secondary">você</Badge>}
                      {suspended && <Badge variant="destructive">suspenso</Badge>}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Criado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      {u.last_sign_in_at && ` · último acesso ${new Date(u.last_sign_in_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  {!isSelf && (
                    suspended ? (
                      <Button size="sm" variant="outline" disabled={busy === u.id}
                        onClick={() => toggleSuspend(u, false)}>
                        <CircleCheck className="h-4 w-4 mr-1" /> Reativar
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={busy === u.id}>
                            <Ban className="h-4 w-4 mr-1" /> Suspender
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Suspender esta conta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O usuário <strong>{u.email}</strong> não conseguirá mais acessar o app até que você reative a conta.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => toggleSuspend(u, true)}>Suspender</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
