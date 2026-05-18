import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Wallet, Calendar as CalIcon, Sparkles, LogOut, TrendingUp, TrendingDown, PieChart, Menu, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Painel", icon: CalIcon },
  { to: "/entradas", label: "Entradas", icon: TrendingUp },
  { to: "/investimentos", label: "Investimentos", icon: TrendingDown },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/relatorios", label: "Relatórios", icon: PieChart },
  { to: "/dicas", label: "Dicas IA", icon: Sparkles },
];

export function AppHeader() {
  const { user } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  // Close mobile sheet whenever the route changes
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {NAV.map((it) => {
        const active = loc.pathname === it.to;
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={() => onClick?.()}
            preload="intent"
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </>
  );

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
          <>
            <nav className="hidden lg:flex items-center gap-1">
              <NavLinks />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-1">
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </Button>
            </nav>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="mt-8 flex flex-col gap-1">
                  <NavLinks onClick={() => setOpen(false)} />
                  <Button variant="ghost" onClick={() => { handleLogout(); setOpen(false); }} className="justify-start mt-4">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </header>
  );
}
