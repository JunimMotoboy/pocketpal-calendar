import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Wallet,
  Calendar as CalIcon,
  Sparkles,
  LogOut,
  TrendingUp,
  TrendingDown,
  PieChart,
  Menu,
  CreditCard,
  CalendarClock,
  Shield,
  Moon,
  Sun,
  Trophy,
  Target,
  Palette,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { usePersonalization } from "@/hooks/use-personalization";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const FAVORITOS = [
  { to: "/", label: "Painel", icon: CalIcon },
  { to: "/entradas", label: "Entradas", icon: TrendingUp },
  { to: "/despesas-fixas", label: "Despesas Fixas", icon: CalendarClock },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/relatorios", label: "Relatórios", icon: PieChart },
] as const;

const MAIS = [
  { to: "/investimentos", label: "Investimentos", icon: TrendingDown },
  { to: "/orcamentos", label: "Orçamentos", icon: Target },
  { to: "/metas", label: "Metas", icon: Trophy },
  { to: "/dicas", label: "Dicas IA", icon: Sparkles },
] as const;

const CONFIG = [
  { to: "/personalizar", label: "Personalizar", icon: Palette },
] as const;

type Item = { to: string; label: string; icon: typeof CalIcon };

export function AppHeader() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pers } = usePersonalization();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [query, setQuery] = useState("");

  const initials = (pers.displayName || user?.email || "U")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [loc.pathname]);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  const adminItems: ReadonlyArray<Item> = isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : [];

  const sections = useMemo(() => {
    const all: Array<{ title: string; items: ReadonlyArray<Item> }> = [
      { title: "Favoritos", items: FAVORITOS },
      { title: "Mais", items: MAIS },
      { title: "Configurações", items: CONFIG },
    ];
    if (adminItems.length) all.push({ title: "Sistema", items: adminItems });

    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all
      .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [query, adminItems]);

  const currentLabel = useMemo(() => {
    const all = [...FAVORITOS, ...MAIS, ...CONFIG, ...adminItems];
    return all.find((i) => i.to === loc.pathname)?.label ?? "Nix Wallet";
  }, [loc.pathname, adminItems]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
        {/* Left: desktop sidebar trigger + breadcrumb / mobile logo */}
        <div className="flex min-w-0 items-center gap-2">
          {user && (
            <SidebarTrigger className="hidden lg:inline-flex" aria-label="Alternar barra lateral" />
          )}
          <Link to="/" className="flex min-w-0 items-center gap-2 lg:hidden">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-[var(--shadow-soft)]"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              <Wallet className="h-4 w-4" />
            </div>
            <span className="truncate text-base font-bold tracking-tight">Nix Wallet</span>
          </Link>
          {user && (
            <span className="hidden lg:inline-block truncate text-sm font-medium text-muted-foreground">
              {currentLabel}
            </span>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
              className="lg:hidden"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Link to="/personalizar" aria-label="Personalizar" className="lg:hidden">
              <Avatar className="h-8 w-8 ring-2 ring-primary/30">
                {pers.avatar ? <AvatarImage src={pers.avatar} alt="" /> : null}
                <AvatarFallback
                  className="text-xs text-primary-foreground"
                  style={{ backgroundImage: "var(--gradient-hero)" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 flex flex-col">
                <SheetHeader className="border-b border-border/60 px-4 py-3 text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
                      style={{ backgroundImage: "var(--gradient-hero)" }}
                    >
                      <Wallet className="h-4 w-4" />
                    </div>
                    Nix Wallet
                  </SheetTitle>
                </SheetHeader>

                <div className="border-b border-border/60 px-3 py-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar página..."
                      className="h-9 pl-8 pr-8"
                      aria-label="Buscar página"
                    />
                    {query && (
                      <button
                        onClick={() => setQuery("")}
                        aria-label="Limpar busca"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2">
                  {sections.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma página encontrada.
                    </p>
                  ) : (
                    sections.map((sec) => (
                      <div key={sec.title} className="mb-3">
                        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          {sec.title}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {sec.items.map((it) => {
                            const active = loc.pathname === it.to;
                            const Icon = it.icon;
                            return (
                              <Link
                                key={it.to}
                                to={it.to}
                                onClick={() => setOpen(false)}
                                preload="intent"
                                className={cn(
                                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                  active
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground/80 hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{it.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-border/60 p-2">
                  <Button variant="ghost" onClick={toggleTheme} className="w-full justify-start">
                    {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    {theme === "dark" ? "Tema claro" : "Tema escuro"}
                  </Button>
                  <Button variant="ghost" onClick={() => { handleLogout(); setOpen(false); }} className="w-full justify-start text-destructive hover:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </header>
  );
}
