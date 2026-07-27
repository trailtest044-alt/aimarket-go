import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Wallet, Boxes, Clock, CheckCircle2, Truck, XCircle, LogOut, Users, Search, BadgePercent, FileText } from "lucide-react";
import { adminLogout, isAdminAuthed, getCurrentAdmin, getDashboard } from "@/lib/api";
import { useEffect, type ReactNode, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-logo";
import { BRAND } from "@/lib/brand";

type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; exact?: boolean; ownerOnly?: boolean; };
const items: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/payment-settings", label: "Payment Settings", icon: Wallet },
  { to: "/admin/promo-codes", label: "Promo Codes", icon: BadgePercent },
  { to: "/admin/stock", label: "Account Stock", icon: Boxes },
  { to: "/admin/mail-txt", label: "Mail TXT", icon: FileText },
  { to: "/admin/orders/pending", label: "Pending Orders", icon: Clock },
  { to: "/admin/orders/approved", label: "Approved Orders", icon: CheckCircle2 },
  { to: "/admin/orders/delivered", label: "Delivered Orders", icon: Truck },
  { to: "/admin/orders/rejected", label: "Rejected Orders", icon: XCircle },
  { to: "/admin/track-orders", label: "Track Orders", icon: Search },
  { to: "/admin/users", label: "Admin Users", icon: Users, ownerOnly: true },
];

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = getCurrentAdmin();
  const navItems = items.filter((it) => !it.ownerOnly || current?.role === "owner");
  const { data: dashboardAlert } = useQuery({
    queryKey: ["admin-pending-alert"],
    queryFn: getDashboard,
    enabled: isAdminAuthed(),
    refetchInterval: 15000,
  });
  const pendingCount = dashboardAlert?.stats?.pendingOrders ?? 0;

  useEffect(() => { if (!isAdminAuthed()) navigate({ to: "/admin/login" }); }, [navigate]);
  useEffect(() => {
    const nextTitle = pendingCount > 0 ? `(${pendingCount}) ${title} • ${BRAND.name} Admin` : `${title} • ${BRAND.name} Admin`;
    if (typeof document !== "undefined") document.title = nextTitle;
    return () => { if (typeof document !== "undefined") document.title = `${BRAND.name} — Premium AI Products & Accounts`; };
  }, [pendingCount, title]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1500px] gap-6 p-4 sm:p-6">
        {/* Sidebar */}
        <aside className="glass sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-3xl p-4 lg:flex">
          <Link to="/" className="mb-5 flex items-center gap-2.5 px-2">
            <BrandMark className="h-9 w-9" />
            <div>
              <div className="font-display text-sm font-bold">{BRAND.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">Admin</div>
            </div>
          </Link>
          {current && (
            <div className="mb-4 rounded-2xl border border-border bg-white/4 p-3 text-xs">
              <div className="font-bold text-foreground">{current.nickname || current.name}</div>
              <div className="mt-0.5 uppercase tracking-wider text-muted-foreground">{current.role}</div>
            </div>
          )}
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {navItems.map((it) => {
              const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
              const isPendingNav = it.to === "/admin/orders/pending" && pendingCount > 0;
              return (
                <Link
                  key={it.to}
                  to={it.to as never}
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all ${
                    active
                      ? "bg-gradient-primary font-semibold text-primary-foreground shadow-glow"
                      : isPendingNav
                        ? "border border-warning/40 bg-warning/12 font-semibold text-warning hover:bg-warning/20"
                        : "text-muted-foreground hover:bg-white/6 hover:text-foreground"
                  }`}
                >
                  <it.icon className={`h-4 w-4 ${isPendingNav && !active ? "animate-glow-pulse" : ""}`} />
                  <span className="min-w-0 flex-1">{it.label}</span>
                  {isPendingNav && (
                    <span className="ml-auto inline-flex min-w-6 animate-glow-pulse items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground shadow-lg shadow-destructive/40">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => { adminLogout(); toast.success("Logged out"); navigate({ to: "/admin/login" }); }}
            className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
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
