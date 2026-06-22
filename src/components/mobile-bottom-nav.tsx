import { Link, useLocation } from "@tanstack/react-router";
import {
  Calendar as CalIcon,
  TrendingUp,
  CreditCard,
  PieChart,
  LayoutGrid,
  TrendingDown,
  CalendarClock,
  Target,
  Trophy,
  Sparkles,
  Palette,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const PRIMARY = [
  { to: "/", label: "Painel", icon: CalIcon },
  { to: "/entradas", label: "Entradas", icon: TrendingUp },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/relatorios", label: "Relatórios", icon: PieChart },
] as const;

const MORE = [
  { to: "/despesas-fixas", label: "Despesas Fixas", icon: CalendarClock },
  { to: "/investimentos", label: "Investimentos", icon: TrendingDown },
  { to: "/orcamentos", label: "Orçamentos", icon: Target },
  { to: "/metas", label: "Metas", icon: Trophy },
  { to: "/dicas", label: "Dicas IA", icon: Sparkles },
  { to: "/personalizar", label: "Personalizar", icon: Palette },
] as const;

export function MobileBottomNav() {
  const { user } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const moreActive = MORE.some((m) => m.to === loc.pathname);

  return (
    <nav
      aria-label="Navegação rápida"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {PRIMARY.map((t) => {
          const active = loc.pathname === t.to;
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                preload="intent"
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/15"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Mais opções"
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                    moreActive && "bg-primary/15"
                  )}
                >
                  <LayoutGrid className="h-5 w-5" />
                </span>
                <span>Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <SheetHeader className="text-left">
                <SheetTitle>Mais opções</SheetTitle>
              </SheetHeader>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {MORE.map((m) => {
                  const Icon = m.icon;
                  const active = loc.pathname === m.to;
                  return (
                    <Link
                      key={m.to}
                      to={m.to}
                      preload="intent"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 p-3 text-center text-xs font-medium transition-colors",
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "bg-card hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          active ? "bg-primary/20 text-primary" : "bg-muted text-foreground/80"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="leading-tight">{m.label}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
