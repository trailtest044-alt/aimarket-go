import { Link } from "@tanstack/react-router";
import { Sparkles, Menu, X, ShoppingBag } from "lucide-react";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const nav = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    { to: "/admin/login", label: "Admin" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-110">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              AI<span className="text-gradient">Market</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "rounded-lg px-3 py-2 text-sm text-foreground bg-secondary" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/"
              hash="products"
              className="ml-2 inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
            >
              <ShoppingBag className="h-4 w-4" /> Shop now
            </Link>
          </nav>

          <button
            className="rounded-lg p-2 text-foreground md:hidden"
            onClick={() => setOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border/60 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                to="/"
                hash="products"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
              >
                <ShoppingBag className="h-4 w-4" /> Shop now
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">AIMarket</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Premium AI subscriptions and digital products at unbeatable prices.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Quick Links</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/products" className="hover:text-foreground">All Products</Link></li>
              <li><Link to="/" className="hover:text-foreground">Categories</Link></li>
              <li><Link to="/admin/login" className="hover:text-foreground">Admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Support</h4>
            <p className="mt-3 text-sm text-muted-foreground">
              Need help with your order? Contact us on WhatsApp or Telegram.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AIMarket. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
