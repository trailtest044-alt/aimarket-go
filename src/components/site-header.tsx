import { Link } from "@tanstack/react-router";
import { Menu, X, ShoppingBag, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { BRAND, SUPPORT } from "@/lib/brand";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    { to: "/track-orders", label: "Track Orders" },
    { to: "/admin/login", label: "Admin" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full">
      <div
        className={`border-b transition-all duration-300 ${
          scrolled
            ? "glass-strong border-border/80"
            : "border-transparent bg-background/40 backdrop-blur-md"
        }`}
      >
        <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 ${scrolled ? "h-14" : "h-[4.25rem]"}`}>
          <Link to="/" className="group" aria-label={`${BRAND.name} home`}>
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                activeProps={{ className: "rounded-lg px-3 py-2 text-sm font-semibold text-foreground bg-white/8" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/"
              hash="products"
              className="btn-primary ml-2 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <ShoppingBag className="h-4 w-4" /> Shop now
            </Link>
          </nav>

          <button
            className="btn-ghost rounded-lg p-2 text-foreground md:hidden"
            onClick={() => setOpen((s) => !s)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="animate-rise border-t border-border/70 px-4 py-4 md:hidden">
            <div className="stagger flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/6 hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                to="/"
                hash="products"
                onClick={() => setOpen(false)}
                className="btn-primary mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
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
    <footer className="relative mt-24 border-t border-border/70">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <BrandLogo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              {BRAND.tagline} Verified premium AI subscriptions and digital
              products — hand-checked, delivered fast, backed by real support.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["bKash", "Nagad", "Easypaisa", "JazzCash", "Binance"].map((p) => (
                <span key={p} className="rounded-full border border-border bg-white/4 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Quick links</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/products" className="transition-colors hover:text-foreground">All products</Link></li>
              <li><Link to="/track-orders" className="transition-colors hover:text-foreground">Track your orders</Link></li>
              <li><Link to="/admin/login" className="transition-colors hover:text-foreground">Admin</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Support</h4>
            <p className="mt-4 text-sm text-muted-foreground">Questions before or after payment? Message us anytime.</p>
            <a
              href={SUPPORT.bdWorld.href}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp support
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <BrandMark className="h-5 w-5" />
            <span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          </div>
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground/70">Secure manual approval · No password sharing</span>
        </div>
      </div>
    </footer>
  );
}
