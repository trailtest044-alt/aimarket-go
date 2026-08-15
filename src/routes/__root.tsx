import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BRAND } from "../lib/brand";
import { BrandMark } from "../components/brand-logo";
import { CursorGlow } from "../components/cursor-glow";
import { trackAnonymousVisit } from "../lib/api";

const siteStructuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: BRAND.name,
  url: "https://plandaw.com/",
  description: BRAND.description,
  image: "https://plandaw.com/plandaw-brand-mark.png",
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center animate-rise">
        <BrandMark className="mx-auto h-14 w-14 animate-float-y" />
        <h1 className="mt-6 font-display text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-7">
          <Link
            to="/"
            className="btn-primary inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center animate-rise">
        <BrandMark className="mx-auto h-12 w-12" />
        <h1 className="mt-6 text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. You can try refreshing or head back home.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold"
          >
            Try again
          </button>
          <a href="/" className="btn-ghost rounded-xl px-6 py-3 text-sm font-medium">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#15162b" },
      { name: "application-name", content: BRAND.name },
      { title: `${BRAND.name} — Premium AI Products & Accounts` },
      { name: "description", content: BRAND.description },
      { name: "author", content: BRAND.name },
      { property: "og:title", content: `${BRAND.name} — Premium AI Products` },
      { property: "og:description", content: BRAND.tagline },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: BRAND.name },
      { property: "og:image", content: "https://plandaw.com/plandaw-brand-mark.png" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "640x640", href: "/plandaw-brand-mark.png?v=20260730" },
      { rel: "apple-touch-icon", href: "/plandaw-brand-mark.png?v=20260730" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=IBM+Plex+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteStructuredData }} />
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <QueryClientProvider client={queryClient}>
      <VisitorTracker pathname={pathname} />
      <Outlet />
      <CursorGlow />
      <Toaster theme="light" position="top-right" richColors />
    </QueryClientProvider>
  );
}

function VisitorTracker({ pathname }: { pathname: string }) {
  useEffect(() => { void trackAnonymousVisit(pathname); }, [pathname]);
  return null;
}
