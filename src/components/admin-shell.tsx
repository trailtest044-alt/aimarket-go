import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Bell, Box, ClipboardList, LayoutDashboard, Loader2, Mail, Package, Wallet, Boxes, Clock, CheckCircle2, Truck, XCircle, LogOut, Users, Search, BadgePercent, FileText, PlusCircle, Sparkles, ShoppingBag, X, UserSearch, Handshake, Ban } from "lucide-react";
import { adminLogout, isAdminAuthed, getCurrentAdmin, getDashboard, getAdminProducts, searchAdminOrders, searchCustomers } from "@/lib/api";
import { useEffect, useState, type ReactNode, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-logo";
import { BRAND } from "@/lib/brand";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";
import type { Order, Product } from "@/lib/mock-data";

type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; exact?: boolean; ownerOnly?: boolean; };
type AdminSearchResult = { id: string; title: string; subtitle: string; to: string; query?: string; icon: ComponentType<{ className?: string }> };
const navGroups: Array<{ label: string; items: NavItem[] }> = [
  { label: "Overview", items: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  ] },
  { label: "Products", items: [
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/stock", label: "Account Stock", icon: Boxes },
    { to: "/admin/promo-codes", label: "Promo Codes", icon: BadgePercent },
  ] },
  { label: "Orders", items: [
    { to: "/admin/orders", label: "All Orders", icon: ShoppingBag },
    { to: "/admin/orders/pending", label: "Pending Orders", icon: Clock },
    { to: "/admin/orders/approved", label: "Approved Orders", icon: CheckCircle2 },
    { to: "/admin/orders/delivered", label: "Delivered Orders", icon: Truck },
    { to: "/admin/orders/rejected", label: "Rejected Orders", icon: XCircle },
    { to: "/admin/orders/cancel", label: "Cancel Order", icon: Ban, ownerOnly: true },
    { to: "/admin/track-orders", label: "Track Orders", icon: Search },
  ] },
  { label: "Customers", items: [
    { to: "/admin/customers", label: "User List", icon: Users },
    { to: "/admin/customers/search", label: "Customer Search", icon: UserSearch },
    { to: "/admin/resellers", label: "Resellers", icon: Handshake, ownerOnly: true },
  ] },
  { label: "Finance", items: [
    { to: "/admin/payment-settings", label: "Payment Settings", icon: Wallet },
  ] },
  { label: "Communication", items: [
    { to: "/admin/mail-txt", label: "Mail TXT", icon: FileText },
  ] },
  { label: "System", items: [
    { to: "/admin/users", label: "Admin Users", icon: Users, ownerOnly: true },
  ] },
];

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = getCurrentAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const groups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((it) => !it.ownerOnly || current?.role === "owner") }))
    .filter((group) => group.items.length > 0);
  const navItems = groups.flatMap((group) => group.items);
  const adminReady = useAdminAuthReady();
  const { data: dashboardAlert } = useQuery({
    queryKey: ["admin-pending-alert"],
    queryFn: () => getDashboard(),
    enabled: adminReady,
    staleTime: 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
  const pendingCount = dashboardAlert?.stats?.pendingOrders ?? 0;
  const { data: searchResults = [], isFetching: searchFetching } = useQuery({
    queryKey: ["admin-global-search", debouncedSearch],
    queryFn: () => runAdminSearch(debouncedSearch),
    enabled: adminReady && debouncedSearch.length >= 2,
    staleTime: 0,
    retry: 1,
  });
  const canSearch = searchTerm.trim().length >= 2;

  useEffect(() => { if (!isAdminAuthed()) navigate({ to: "/admin/login" }); }, [navigate]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);
  useEffect(() => {
    const nextTitle = pendingCount > 0 ? `(${pendingCount}) ${title} • ${BRAND.name} Admin` : `${title} • ${BRAND.name} Admin`;
    if (typeof document !== "undefined") document.title = nextTitle;
    return () => { if (typeof document !== "undefined") document.title = `${BRAND.name} — Premium AI Products & Accounts`; };
  }, [pendingCount, title]);

  function openSearchResult(result: AdminSearchResult) {
    if (typeof window !== "undefined" && result.query) {
      window.sessionStorage.setItem("aimarket_admin_search_query", result.query);
    }
    setSearchOpen(false);
    setSearchTerm("");
    navigate({ to: result.to as never });
  }

  function searchAll() {
    const query = searchTerm.trim();
    if (!query) return;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("aimarket_admin_search_query", query);
    }
    setSearchOpen(false);
    navigate({ to: "/admin/track-orders" });
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1500px] gap-4 p-3 sm:gap-5 sm:p-5 2xl:max-w-[1560px]">
        {/* Sidebar */}
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-60 shrink-0 flex-col rounded-[1.4rem] border border-[#e8e4f0] bg-white/92 p-4 shadow-[0_22px_70px_rgba(70,60,120,0.08)] backdrop-blur lg:flex xl:w-64">
          <Link to="/" className="mb-5 flex items-center gap-2.5 px-2">
            <BrandMark className="h-9 w-9" />
            <div>
              <div className="font-display text-sm font-bold">{BRAND.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Admin Panel</div>
            </div>
          </Link>
          {current && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/8 to-white p-3 text-xs">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary font-bold text-primary-foreground shadow-glow">{(current.nickname || current.name || "A").slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="font-bold text-foreground">{current.nickname || current.name}</div>
                <div className="mt-0.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">{current.role}</div>
              </div>
            </div>
          )}
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.label} className="mb-3">
                <div className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70">{group.label}</div>
                <div className="space-y-1">
                  {group.items.map((it) => <AdminNavLink key={it.to} item={it} pathname={pathname} pendingCount={pendingCount} />)}
                </div>
              </div>
            ))}
          </nav>
          <button
            onClick={() => { adminLogout(); toast.success("Logged out"); navigate({ to: "/admin/login" }); }}
            className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </aside>

        {/* Main */}
        <main className="w-0 min-w-0 flex-1">
          <div className="mb-6 rounded-[1.35rem] border border-[#e8e4f0] bg-white/88 px-4 py-3 shadow-[0_18px_55px_rgba(70,60,120,0.06)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-black tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">Welcome back{current?.nickname ? `, ${current.nickname}` : ""}. Manage AI Market faster.</p>
              </div>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <div className="relative hidden w-full min-w-[280px] max-w-[390px] xl:block">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/35 px-3 py-2 text-sm text-muted-foreground shadow-sm transition focus-within:border-primary/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSearchOpen(true);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") searchAll();
                        if (e.key === "Escape") setSearchOpen(false);
                      }}
                      placeholder="Search Gmail, name, order, transaction..."
                      className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    {searchFetching ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : searchTerm ? (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setSearchOpen(false);
                        }}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  {searchOpen && searchTerm.trim() && (
                    <div className="absolute right-0 top-12 z-50 w-[390px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#e8e4f0] bg-white shadow-[0_28px_80px_rgba(60,52,100,0.18)]">
                      {!canSearch ? (
                        <div className="p-4 text-sm text-muted-foreground">At least 2 letters/type koro.</div>
                      ) : searchFetching && searchResults.length === 0 ? (
                        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Searching live data...
                        </div>
                      ) : searchResults.length ? (
                        <div className="max-h-[420px] overflow-y-auto p-2">
                          {searchResults.map((result) => (
                            <button
                              key={result.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                openSearchResult(result);
                              }}
                              className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-secondary/70"
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                <result.icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-foreground">{result.title}</span>
                                <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground">No matching product/order/customer found.</div>
                      )}
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          searchAll();
                        }}
                        className="flex w-full items-center justify-between border-t border-border bg-secondary/25 px-4 py-3 text-sm font-bold hover:bg-secondary"
                      >
                        Search all orders for “{searchTerm.trim()}”
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <button className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary" title="Notifications">
                  <Bell className="h-4 w-4" />
                </button>
                <Link to="/admin/products" className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-glow">
                  <PlusCircle className="h-4 w-4" /> Quick Add
                </Link>
                <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold sm:flex">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {current?.nickname || "Admin"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <Link to="/admin" className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold">Dashboard</Link>
              <button onClick={() => { adminLogout(); navigate({ to: "/admin/login" }); }} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold">Logout</button>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="mb-4 -mx-1 flex gap-1.5 overflow-x-auto pb-2 lg:hidden">
            {navItems.map((it) => {
              const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
              const isPendingNav = it.to === "/admin/orders/pending" && pendingCount > 0;
              return (
                <Link
                  key={it.to}
                  to={it.to as never}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    active
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : isPendingNav
                        ? "border border-warning/40 bg-warning/12 text-warning"
                        : "btn-ghost text-muted-foreground"
                  }`}
                >
                  {it.label}
                  {isPendingNav && (
                    <span className="inline-flex min-w-5 animate-glow-pulse items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

async function runAdminSearch(query: string): Promise<AdminSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const [products, orders] = await Promise.all([
    getAdminProducts().catch(() => [] as Product[]),
    searchAdminOrders(query, "all").catch(() => [] as Order[]),
  ]);

  const productResults = products
    .filter((product) => [
      product.name,
      product.category,
      product.shortDescription,
      product.description,
      product.deliveryMode,
    ].some((value) => String(value || "").toLowerCase().includes(q)))
    .slice(0, 4)
    .map<AdminSearchResult>((product) => ({
      id: `product-${product.id}`,
      title: product.name,
      subtitle: `${product.category} • Stock ${product.stock ?? 0}`,
      to: "/admin/products",
      query: product.name,
      icon: Box,
    }));

  const orderResults = orders.slice(0, 4).map<AdminSearchResult>((order) => ({
    id: `order-${order.id}`,
    title: order.id,
    subtitle: `${order.customerName || order.customerEmail || "Customer"} • ${order.productName} • ${order.status}`,
    to: "/admin/track-orders",
    query: order.id,
    icon: ClipboardList,
  }));

  const liveCustomers = await searchCustomers(query).catch(() => []);
  const customerResults = liveCustomers.slice(0, 4).map<AdminSearchResult>((customer) => ({
    id: `customer-${customer.key}`,
    title: customer.name || customer.email,
    subtitle: [customer.email, customer.whatsapp, `${customer.orderCount} order${customer.orderCount === 1 ? "" : "s"}`].filter(Boolean).join(" • "),
    to: `/admin/customers/${encodeURIComponent(customer.key)}`,
    icon: Mail,
  }));

  const customers = new Map<string, AdminSearchResult>();
  orders.forEach((order) => {
    const key = (order.customerEmail || order.customerName || order.contact || "").toLowerCase();
    if (!key || customers.has(key)) return;
    customers.set(key, {
      id: `customer-${key}`,
      title: order.customerName || order.customerEmail || order.contact,
      subtitle: [order.customerEmail, order.contact].filter(Boolean).join(" • ") || "Customer order history",
      to: "/admin/track-orders",
      query: order.customerEmail || order.customerName || order.contact,
      icon: Mail,
    });
  });

  return [...customerResults, ...orderResults, ...productResults, ...Array.from(customers.values()).slice(0, 2)].slice(0, 10);
}

function AdminNavLink({ item, pathname, pendingCount }: { item: NavItem; pathname: string; pendingCount: number }) {
  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
  const isPendingNav = item.to === "/admin/orders/pending" && pendingCount > 0;
  return (
    <Link
      to={item.to as never}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all ${
        active
          ? "bg-[#15161b] font-semibold text-white shadow-[0_14px_34px_rgba(15,16,27,0.22)]"
          : isPendingNav
            ? "border border-warning/40 bg-warning/12 font-semibold text-warning hover:bg-warning/20"
            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
      }`}
    >
      <item.icon className={`h-4 w-4 ${isPendingNav && !active ? "animate-glow-pulse" : ""}`} />
      <span className="min-w-0 flex-1">{item.label}</span>
      {isPendingNav && (
        <span className="ml-auto inline-flex min-w-6 animate-glow-pulse items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground shadow-lg shadow-destructive/40">
          {pendingCount}
        </span>
      )}
    </Link>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "primary", alert = false }: { label: string; value: string | number; icon: ComponentType<{ className?: string }>; accent?: "primary" | "accent" | "success" | "warning" | "destructive"; alert?: boolean; }) {
  const accentMap: Record<string, string> = {
    primary: "from-primary/25 to-primary/0 text-primary",
    accent: "from-accent/25 to-accent/0 text-accent",
    success: "from-success/25 to-success/0 text-success",
    warning: "from-warning/25 to-warning/0 text-warning",
    destructive: "from-destructive/25 to-destructive/0 text-destructive",
  };
  return (
    <div className={`glass soft-card-animate rounded-3xl p-5 ${alert ? "relative overflow-hidden border-warning/50 ring-1 ring-warning/40" : ""}`}>
      {alert && <div className="absolute right-3 top-3 h-2.5 w-2.5 animate-ping rounded-full bg-destructive shadow-lg shadow-destructive/50" />}
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-xs uppercase tracking-wider ${alert ? "font-bold text-warning" : "text-muted-foreground"}`}>{label}</div>
          <div className={`mt-2 font-display text-3xl font-bold ${alert ? "text-warning" : "text-foreground"}`}>{value}</div>
          {alert && <div className="mt-1 text-xs font-semibold text-warning">Needs approval now</div>}
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${accentMap[accent]} ${alert ? "animate-glow-pulse" : ""}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
