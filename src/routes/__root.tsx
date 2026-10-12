import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "../lib/cart";
import { Toaster } from "../components/ui/sonner";
import { AuraChatWidget } from "../components/aura-chat-widget";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
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

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    if (error instanceof Error) {
      reportLovableError(error, { boundary: "tanstack_root_error_component" });
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Esta página não carregou</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro temporário. Você pode tentar atualizar ou voltar para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

const SITE_URL = "https://hs-digital-marck.lovable.app";
const LOGO_PREVIEW_URL = "https://hs-digital-marck.lovable.app/__l5e/assets-v1/39fcaa1a-9680-41a5-9293-4e05e8dc7c2b/hs-digital-logo.png";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HS Digital · Marketplace Oficial" },
      {
        name: "description",
        content: "Marketplace HS Digital: compre eletrônicos, ferramentas, utilidades e novidades com frete garantido para todo o Brasil.",
      },
      { name: "author", content: "HS Digital" },

      // OpenGraph (WhatsApp, Facebook, Telegram, LinkedIn)
      { property: "og:site_name", content: "HS Digital Marketplace" },
      { property: "og:title", content: "HS Digital · Marketplace Oficial" },
      {
        property: "og:description",
        content: "Encontre os melhores produtos com ofertas exclusivas, cupons diários e entrega em todo o Brasil.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: LOGO_PREVIEW_URL },
      { property: "og:image:secure_url", content: LOGO_PREVIEW_URL },
      { property: "og:image:type", content: "image/png" },

      // Twitter Cards
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HS Digital · Marketplace Oficial" },
      {
        name: "twitter:description",
        content: "Ofertas e novidades com frete garantido para todo o Brasil.",
      },
      { name: "twitter:image", content: LOGO_PREVIEW_URL },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script 
          async 
          src="https://googlesyndication.com"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Outlet />
        <Toaster position="top-center" richColors />
        <AuraChatWidget />
      </CartProvider>
    </QueryClientProvider>
  );
}
