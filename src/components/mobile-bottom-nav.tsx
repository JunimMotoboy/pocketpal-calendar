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
  Palette,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useNavCounts } from "@/hooks/use-nav-counts";
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
  { to: "/personalizar", label: "Personalizar", icon: Palette },
] as const;

export function MobileBottomNav() {
  const { user } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const { counts } = useNavCounts();
  if (!user) return null;

  const moreActive = MORE.some((m) => m.to === loc.pathname);

  const badgeMap: Record<string, { value: number; tone: "default" | "warn" | "danger" }> = {
    "/despesas-fixas": { value: counts.fixedDueSoon, tone: "warn" },
    "/metas": { value: counts.goalsActive, tone: "default" },
    "/orcamentos": { value: counts.budgetsExceeded, tone: "danger" },
  };
  const moreBadgeTotal = Object.values(badgeMap).reduce((s, b) => s + b.value, 0);

  const toneDot = (tone: "default" | "warn" | "danger") =>
    tone === "danger" ? "bg-destructive" : tone === "warn" ? "bg-amber-500" : "bg-primary";
  const tonePill = (tone: "default" | "warn" | "danger") =>
    tone === "danger"
      ? "bg-destructive text-destructive-foreground"
      : tone === "warn"
      ? "bg-amber-500 text-white"
      : "bg-primary text-primary-foreground";

  return (
    <nav
      aria-label="Navegação rápida"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {PRIMARY.map((t) => {
          const active = loc.pathname === t.to;
          const Icon = t.icon;
          const badge = badgeMap[t.to];
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                preload="intent"
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 w-12 items-center justify-center rounded-full transition-all",
                    active && "bg-primary/15 scale-105"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {badge && badge.value > 0 && (
                    <span
                      className={cn(
                        "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums ring-2 ring-background",
                        tonePill(badge.tone)
                      )}
                    >
                      {badge.value > 9 ? "9+" : badge.value}
                    </span>
                  )}
                </span>
                <span>{t.label}</span>
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                )}
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
                  "relative flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  moreActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 w-12 items-center justify-center rounded-full transition-all",
                    moreActive && "bg-primary/15 scale-105"
                  )}
                >
                  <LayoutGrid className="h-5 w-5" />
                  {moreBadgeTotal > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground tabular-nums ring-2 ring-background">
                      {moreBadgeTotal > 9 ? "9+" : moreBadgeTotal}
                    </span>
                  )}
                </span>
                <span>Mais</span>
                {moreActive && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                )}
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
                  const badge = badgeMap[m.to];
                  return (
                    <Link
                      key={m.to}
                      to={m.to}
                      preload="intent"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center text-xs font-medium transition-colors",
                        active
                          ? "border-primary/50 bg-primary/10 text-primary shadow-sm"
                          : "border-border/60 bg-card hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "relative flex h-10 w-10 items-center justify-center rounded-xl",
                          active ? "bg-primary/20 text-primary" : "bg-muted text-foreground/80"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {badge && badge.value > 0 && (
                          <span
                            className={cn(
                              "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                              toneDot(badge.tone)
                            )}
                          />
                        )}
                      </span>
                      <span className="leading-tight">{m.label}</span>
                      {badge && badge.value > 0 && (
                        <span
                          className={cn(
                            "absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                            tonePill(badge.tone)
                          )}
                        >
                          {badge.value > 99 ? "99+" : badge.value}
                        </span>
                      )}
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

