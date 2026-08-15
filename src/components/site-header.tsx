import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  LogIn,
  Menu,
  MessageCircle,
  PackageOpen,
  Search,
  ShoppingBag,
  UserCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { BRAND, SUPPORT } from "@/lib/brand";
import { resolveProductLogoUrl } from "@/lib/product-logo";
import {
  formatMoney,
  getCurrentCustomer,
  getProducts,
  getResellerProfile,
  getVisitorRegion,
  refreshCurrentCustomer,

  startGoogleLogin,
  type CustomerSession,
} from "@/lib/api";
import type { Product } from "@/lib/mock-data";

const SEARCH_HISTORY_KEY = "aimarket_search_history";

function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 4)
      : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(query: string) {
  if (typeof window === "undefined") return;
  const cleaned = query.trim();
  if (!cleaned) return;
  const next = [
    cleaned,
    ...getSearchHistory().filter((item) => item.toLowerCase() !== cleaned.toLowerCase()),
  ].slice(0, 4);
  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
}

function productSearchText(product: Product) {
  return [
    product.name,
    product.category,
    product.shortDescription,
    product.description,
    product.deliveryMode,
    product.features?.join(" "),
  ].join(" ").toLowerCase();
}

export function SiteHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [history, setHistory] = useState<string[]>(() => getSearchHistory());
  // Keep the server render and the browser's first hydration render identical.
  // Reading localStorage in the state initializer made signed-in customers
  // hydrate a different header than the one emitted by SSR.
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const searchQuery = debouncedSearch.trim().toLowerCase();

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > 10);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const sync = () => setCustomer(getCurrentCustomer());
    sync();
    void refreshCurrentCustomer();
    window.addEventListener("customer-auth-changed", sync);
    return () => window.removeEventListener("customer-auth-changed", sync);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(headerSearch);
      setActiveSearchIndex(0);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [headerSearch]);

  const { data: headerProducts = [], isFetching: searchingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    enabled: headerSearch.trim().length >= 2,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: resellerProfile } = useQuery({
    queryKey: ["reseller-profile", customer?.email],
    queryFn: getResellerProfile,
    enabled: !!customer,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const accountLabel = resellerProfile ? "Reseller" : "Account";

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return headerProducts
      .filter((product) => productSearchText(product).includes(searchQuery))
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || (a.sortOrder || 999999) - (b.sortOrder || 999999) || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [headerProducts, searchQuery]);

  const nav = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    { to: "/track-orders", label: "Track Orders" },
    { to: "/account", label: "Account" },
  ] as const;

  const submitHeaderSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = headerSearch.trim();
    saveSearchHistory(query);
    setHistory(getSearchHistory());
    void navigate({ to: "/products", search: query ? { q: query } : {} });
  };

  const openProduct = (product: Product) => {
    const query = headerSearch.trim();
    saveSearchHistory(query || product.name);
    setHistory(getSearchHistory());
    setSearchOpen(false);
    void navigate({ to: "/products/$id", params: { id: product.id } });
  };

  const applyHistorySearch = (query: string) => {
    setHeaderSearch(query);
    saveSearchHistory(query);
    setHistory(getSearchHistory());
    setSearchOpen(false);
    void navigate({ to: "/products", search: { q: query } });
  };

  const renderSearchDropdown = () => {
    if (!searchOpen) return null;
    const showHistory = headerSearch.trim().length < 2 && history.length > 0;
    const showEmpty = searchQuery.length >= 2 && !searchingProducts && searchResults.length === 0;

    return (
      <div className="header-search-panel">
        {showHistory && (
          <div className="space-y-1.5">
            <p className="px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Recent search</p>
            {history.map((item) => (
              <button key={item} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyHistorySearch(item)} className="header-search-row">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{item}</span>
              </button>
            ))}
          </div>
        )}

        {searchingProducts && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="header-search-skeleton" />
            ))}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-1.5">
            {searchResults.map((product, index) => (
              <button
                key={product.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveSearchIndex(index)}
                onClick={() => openProduct(product)}
                className="header-search-result"
                data-active={index === activeSearchIndex}
              >
                <span className="header-search-logo">
                  {resolveProductLogoUrl(product.name, product.logoUrl) ? (
                    <img src={resolveProductLogoUrl(product.name, product.logoUrl)} alt="" />
                  ) : (
                    <span>{product.icon || "*"}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">{product.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{product.category}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-bold text-foreground">{product.isFree ? "Free" : formatMoney(product.price, product.currency)}</span>
                  <span className={product.stock > 0 ? "text-[11px] font-semibold text-success" : "text-[11px] font-semibold text-destructive"}>
                    {product.stock > 0 ? "Available" : "Out of Stock"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {showEmpty && (
          <div className="px-3 py-5 text-center">
            <PackageOpen className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">No products found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try another AI tool name.</p>
          </div>
        )}

        {headerSearch.trim().length >= 2 && (
          <button type="submit" className="header-search-view-all">
            View all matching results <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className={`border-b transition-all duration-300 ${scrolled ? "glass-strong border-border/80" : "border-transparent bg-background/40 backdrop-blur-md"}`}>
        <div className={`page-shell-wide mx-auto flex items-center justify-between gap-4 transition-all duration-300 ${scrolled ? "h-14" : "h-[4.25rem]"}`}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link to="/" className="group shrink-0" aria-label={`${BRAND.name} home`}>
              <BrandLogo animate />
            </Link>

            <form onSubmit={submitHeaderSearch} className="header-search group relative hidden min-w-0 max-w-[26rem] flex-1 items-center md:flex">
              <Search className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-foreground" />
              <input
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onFocus={() => {
                  setHistory(getSearchHistory());
                  setSearchOpen(true);
                }}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveSearchIndex((index) => Math.min(index + 1, Math.max(searchResults.length - 1, 0)));
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveSearchIndex((index) => Math.max(index - 1, 0));
                  }
                  if (event.key === "Enter" && searchResults[activeSearchIndex] && headerSearch.trim().length >= 2) {
                    event.preventDefault();
                    openProduct(searchResults[activeSearchIndex]);
                  }
                  if (event.key === "Escape") setSearchOpen(false);
                }}
                placeholder="Search AI tools, subscriptions..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/75"
              />
              {headerSearch && (
                <button type="button" onClick={() => setHeaderSearch("")} className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Clear search">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {renderSearchDropdown()}
            </form>
          </div>

          <nav className="hidden shrink-0 items-center gap-1 min-[1280px]:flex">
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
            <Link to="/" hash="products" className="btn-primary ml-1 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
              <ShoppingBag className="h-4 w-4" /> Shop now
            </Link>
            {customer ? (
              <Link to="/account" className="btn-ghost ml-1 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold">
                {customer.picture ? <img src={customer.picture} alt="" className="h-5 w-5 rounded-full" /> : <UserCircle className="h-4 w-4" />}
                {accountLabel}
              </Link>
            ) : (
              <Link to="/account" className="btn-ghost ml-1 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold">
                <LogIn className="h-4 w-4" /> Login
              </Link>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 min-[1280px]:hidden">
            <div className="hidden sm:block">
            </div>
            {customer ? (
              <Link to="/account" className="btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold">
                {customer.picture ? <img src={customer.picture} alt="" className="h-5 w-5 rounded-full" /> : <UserCircle className="h-4 w-4" />}
                <span className="hidden sm:inline">{accountLabel}</span>
              </Link>
            ) : (
              <Link to="/account" className="btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}
            <button className="btn-ghost rounded-lg p-2 text-foreground md:hidden" onClick={() => setOpen((s) => !s)} aria-label="Toggle menu" aria-expanded={open}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="hidden border-t border-border/60 min-[768px]:max-[1280px]:block">
          <nav className="page-shell-wide mx-auto flex min-h-11 items-center justify-center gap-1 py-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                activeProps={{ className: "rounded-lg bg-white/8 px-3 py-2 text-sm font-semibold text-foreground" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <Link to="/" hash="products" className="btn-primary ml-2 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
              <ShoppingBag className="h-4 w-4" /> Shop now
            </Link>
          </nav>
        </div>

        {open && (
          <div className="animate-rise border-t border-border/70 px-4 py-4 md:hidden">
            <div className="stagger flex flex-col gap-1">
              <form onSubmit={submitHeaderSearch} className="header-search relative mb-2 flex items-center">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  onFocus={() => {
                    setHistory(getSearchHistory());
                    setSearchOpen(true);
                  }}
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
                  placeholder="Search AI tools..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/75"
                />
                {renderSearchDropdown()}
              </form>
              {nav.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/6 hover:text-foreground">
                  {n.label}
                </Link>
              ))}
              <Link to="/" hash="products" onClick={() => setOpen(false)} className="btn-primary mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
                <ShoppingBag className="h-4 w-4" /> Shop now
              </Link>
              {customer ? (
                <Link to="/account" onClick={() => setOpen(false)} className="btn-ghost mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
                  <UserCircle className="h-4 w-4" /> {resellerProfile ? "Reseller account" : "My account"}
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    startGoogleLogin("/account");
                  }}
                  className="btn-ghost mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                >
                  <LogIn className="h-4 w-4" /> Continue with Google
                </button>              )}
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
              {BRAND.tagline} Verified premium AI subscriptions and digital products — hand-checked, delivered fast, backed by real support.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["bKash", "Nagad", "Binance Pay", "USDT"].map((p) => (
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
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Support</h4>
            <p className="mt-4 text-sm text-muted-foreground">Questions before or after payment? Message us anytime.</p>
            <a href={SUPPORT.bdWorld.href} target="_blank" rel="noreferrer" className="btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
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
