import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  Calendar as CalIcon,
  LogOut,
  TrendingUp,
  TrendingDown,
  PieChart,
  CreditCard,
  CalendarClock,
  Shield,
  Moon,
  Sun,
  Trophy,
  Target,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { usePersonalization } from "@/hooks/use-personalization";
import { useNavCounts } from "@/hooks/use-nav-counts";
import { Badge } from "@/components/ui/badge";
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
] as const;

export function AppSidebar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pers } = usePersonalization();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const loc = useLocation();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const { counts } = useNavCounts();

  const badgeMap: Record<string, { value: number; tone: "default" | "warn" | "danger"; title: string }> = {
    "/despesas-fixas": { value: counts.fixedDueSoon, tone: "warn", title: "Vencem em até 7 dias" },
    "/metas": { value: counts.goalsActive, tone: "default", title: "Metas em andamento" },
    "/orcamentos": { value: counts.budgetsExceeded, tone: "danger", title: "Orçamentos estourados" },
  };

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const initials = (pers.displayName || user?.email || "U")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isActive = (path: string) => loc.pathname === path;

  const renderItems = (items: ReadonlyArray<{ to: string; label: string; icon: typeof CalIcon }>) =>
    items.map((it) => {
      const Icon = it.icon;
      const active = isActive(it.to);
      const badge = badgeMap[it.to];
      const showBadge = badge && badge.value > 0;
      return (
        <SidebarMenuItem key={it.to}>
          <SidebarMenuButton asChild isActive={active} tooltip={it.label}>
            <Link
              to={it.to}
              preload="intent"
              className={cn(
                "relative flex items-center gap-2 transition-colors",
                active && "bg-primary/10 text-primary font-semibold",
                active &&
                  "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:content-['']"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              <span className="flex-1 truncate">{it.label}</span>
              {showBadge && !collapsed && (
                <Badge
                  variant="secondary"
                  title={badge.title}
                  className={cn(
                    "ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    badge.tone === "danger" && "bg-destructive/15 text-destructive",
                    badge.tone === "warn" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    badge.tone === "default" && "bg-primary/15 text-primary"
                  )}
                >
                  {badge.value > 99 ? "99+" : badge.value}
                </Badge>
              )}
              {showBadge && collapsed && (
                <span
                  className={cn(
                    "absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-sidebar",
                    badge.tone === "danger" && "bg-destructive",
                    badge.tone === "warn" && "bg-amber-500",
                    badge.tone === "default" && "bg-primary"
                  )}
                />
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });


  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/60">
        <Link to="/" className="flex items-center gap-2 px-1 py-1">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-soft)]"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            <Wallet className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight truncate">Nix Wallet</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Favoritos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(FAVORITOS)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Mais</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(MAIS)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems([{ to: "/admin", label: "Admin", icon: Shield }])}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Personalizar">
              <Link to="/personalizar" preload="intent" className="flex items-center gap-2">
                <Avatar className="h-6 w-6 ring-1 ring-primary/30">
                  {pers.avatar ? <AvatarImage src={pers.avatar} alt="" /> : null}
                  <AvatarFallback
                    className="text-[10px] text-primary-foreground"
                    style={{ backgroundImage: "var(--gradient-hero)" }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{pers.displayName || "Perfil"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip={theme === "dark" ? "Tema claro" : "Tema escuro"}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
