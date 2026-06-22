import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  Calendar as CalIcon,
  Sparkles,
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
  Palette,
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

export function AppSidebar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pers } = usePersonalization();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const loc = useLocation();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

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
      return (
        <SidebarMenuItem key={it.to}>
          <SidebarMenuButton asChild isActive={active} tooltip={it.label}>
            <Link
              to={it.to}
              preload="intent"
              className={cn(
                "flex items-center gap-2",
                active && "bg-primary/10 text-primary font-medium"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{it.label}</span>
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
