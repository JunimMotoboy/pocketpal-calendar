import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";

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
    var t = localStorage.getItem('nixwallet:theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
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
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-dvh bg-background">
        <AppHeader />
        <Outlet />
        <Toaster richColors position="top-right" />
      </div>
    </QueryClientProvider>
  );
}
