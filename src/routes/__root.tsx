import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/app-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useTheme } from "@/hooks/use-theme";
import { usePersonalization } from "@/hooks/use-personalization";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você está procurando não existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nix Wallet — Controle de gastos pessoais" },
      { name: "description", content: "Registre seus gastos por categoria, visualize no calendário e receba dicas personalizadas de economia." },
      { property: "og:title", content: "Nix Wallet — Controle de gastos pessoais" },
      { name: "twitter:title", content: "Nix Wallet — Controle de gastos pessoais" },
      { property: "og:description", content: "Registre seus gastos por categoria, visualize no calendário e receba dicas personalizadas de economia." },
      { name: "twitter:description", content: "Registre seus gastos por categoria, visualize no calendário e receba dicas personalizadas de economia." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b9b19524-a1d8-4018-bbb3-e8a61811576d/id-preview-a3785434--6a117670-d4c9-4ae9-9a27-de73756f4fbc.lovable.app-1779134918778.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b9b19524-a1d8-4018-bbb3-e8a61811576d/id-preview-a3785434--6a117670-d4c9-4ae9-9a27-de73756f4fbc.lovable.app-1779134918778.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

const themeScript = `
  (function(){
    try {
      var t = localStorage.getItem('nixwallet:theme');
      if (t === 'dark') document.documentElement.classList.add('dark');
      var p = localStorage.getItem('nixwallet:personalization');
      if (p) {
        var pj = JSON.parse(p);
        var accents = {
          teal:    { p:'oklch(0.5 0.12 195)',  g:'oklch(0.7 0.14 190)'  },
          violet:  { p:'oklch(0.55 0.2 290)',  g:'oklch(0.72 0.18 295)' },
          rose:    { p:'oklch(0.6 0.21 5)',    g:'oklch(0.75 0.18 10)'  },
          emerald: { p:'oklch(0.58 0.16 155)', g:'oklch(0.74 0.16 150)' },
          amber:   { p:'oklch(0.7 0.17 65)',   g:'oklch(0.82 0.15 70)'  },
          blue:    { p:'oklch(0.55 0.18 255)', g:'oklch(0.72 0.16 250)' }
        };
        var a = accents[pj.accent];
        if (a) {
          document.documentElement.style.setProperty('--primary', a.p);
          document.documentElement.style.setProperty('--primary-glow', a.g);
          document.documentElement.style.setProperty('--ring', a.p);
          document.documentElement.style.setProperty('--gradient-hero','linear-gradient(135deg,'+a.p+' 0%,'+a.g+' 100%)');
        }
        var sizes = { sm:14, md:16, lg:18, xl:20 };
        var s = sizes[pj.fontSize];
        if (s) document.documentElement.style.fontSize = s + 'px';
      }
    } catch(e) {}
  })();
`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  useTheme();
  usePersonalization();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-dvh bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Pular para o conteúdo
        </a>
        <AppHeader />
        <div id="main-content" className="pb-20 lg:pb-0">
          <Outlet />
        </div>
        <MobileBottomNav />
        <Toaster richColors position="top-right" />
      </div>
    </QueryClientProvider>
  );
}
