import { Link, useLocation } from "@tanstack/react-router";
import { Calendar as CalIcon, TrendingUp, CalendarClock, CreditCard, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const TABS = [
  { to: "/", label: "Painel", icon: CalIcon },
  { to: "/entradas", label: "Entradas", icon: TrendingUp },
  { to: "/despesas-fixas", label: "Fixas", icon: CalendarClock },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/relatorios", label: "Relatórios", icon: PieChart },
] as const;

export function MobileBottomNav() {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return null;

  return (
    <nav
      aria-label="Navegação rápida"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((t) => {
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
                    active ? "bg-primary/15" : ""
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
