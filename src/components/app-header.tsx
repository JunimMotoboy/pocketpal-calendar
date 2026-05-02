import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Wallet, Calendar as CalIcon, Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  const items = [
    { to: "/", label: "Painel", icon: CalIcon },
    { to: "/dicas", label: "Dicas IA", icon: Sparkles },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-soft)]"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">Gastei</span>
        </Link>

        {user && (
          <nav className="flex items-center gap-1">
            {items.map((it) => {
              const active = loc.pathname === it.to;
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{it.label}</span>
                </Link>
              );
            })}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-1">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Sair</span>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
