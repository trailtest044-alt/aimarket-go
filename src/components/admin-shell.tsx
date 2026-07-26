import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Wallet, Boxes, Clock, CheckCircle2, Truck, XCircle, LogOut, Sparkles, Users, Search } from "lucide-react";
import { adminLogout, isAdminAuthed, getCurrentAdmin, getDashboard } from "@/lib/api";
import { useEffect, type ReactNode, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; exact?: boolean; ownerOnly?: boolean; };
const items: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/payment-settings", label: "Payment Settings", icon: Wallet },
  { to: "/admin/stock", label: "Account Stock", icon: Boxes },
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
    const nextTitle = pendingCount > 0 ? `(${pendingCount}) ${title} • AIMarket Admin` : `${title} • AIMarket Admin`;
    if (typeof document !== "undefined") document.title = nextTitle;
    return () => { if (typeof document !== "undefined") document.title = "AIMarket — Premium AI Products & Accounts"; };
  }, [pendingCount, title]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1500px] gap-6 p-4 sm:p-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-3xl glass p-4 lg:flex">
          <Link to="/" className="mb-5 flex items-center gap-2 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
            <div><div className="text-sm font-bold">AIMarket</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</div></div>
          </Link>
          {current && <div className="mb-4 rounded-2xl bg-white/60 p-3 text-xs"><div className="font-semibold text-slate-900">{current.nickname || current.name}</div><div className="text-muted-foreground">{current.role}</div></div>}
          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((it) => {
              const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
              const isPendingNav = it.to === "/admin/orders/pending" && pendingCount > 0;
              return <Link key={it.to} to={it.to as never} className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${active ? "bg-gradient-primary text-primary-foreground shadow-glow" : isPendingNav ? "bg-amber-100/90 text-amber-950 ring-1 ring-amber-300 hover:bg-amber-200" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><it.icon className={`h-4 w-4 ${isPendingNav ? "animate-pulse text-amber-600" : ""}`} /><span className="min-w-0 flex-1">{it.label}</span>{isPendingNav && <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-lg shadow-red-500/30 animate-pulse">{pendingCount}</span>}</Link>;
            })}
          </nav>
          <button onClick={() => { adminLogout(); toast.success("Logged out"); navigate({ to: "/admin/login" }); }} className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"><LogOut className="h-4 w-4" /> Logout</button>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold tracking-tight">{title}</h1><div className="flex items-center gap-2 lg:hidden"><Link to="/admin" className="rounded-lg glass px-3 py-1.5 text-xs">Dashboard</Link><button onClick={() => { adminLogout(); navigate({ to: "/admin/login" }); }} className="rounded-lg glass px-3 py-1.5 text-xs">Logout</button></div></div>
          <div className="mb-4 -mx-1 flex gap-1 overflow-x-auto pb-2 lg:hidden">{navItems.map((it) => { const active = it.exact ? pathname === it.to : pathname.startsWith(it.to); const isPendingNav = it.to === "/admin/orders/pending" && pendingCount > 0; return <Link key={it.to} to={it.to as never} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${active ? "bg-gradient-primary text-primary-foreground" : isPendingNav ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300" : "glass text-muted-foreground"}`}>{it.label}{isPendingNav && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white animate-pulse">{pendingCount}</span>}</Link>; })}</div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "primary", alert = false }: { label: string; value: string | number; icon: ComponentType<{ className?: string }>; accent?: "primary" | "accent" | "success" | "warning" | "destructive"; alert?: boolean; }) {
  const accentMap: Record<string, string> = { primary: "from-primary/25 to-primary/0 text-primary", accent: "from-accent/25 to-accent/0 text-accent", success: "from-success/25 to-success/0 text-success", warning: "from-warning/25 to-warning/0 text-warning", destructive: "from-destructive/25 to-destructive/0 text-destructive" };
  return <div className={`glass rounded-3xl p-5 soft-card-animate ${alert ? "relative overflow-hidden border-amber-300/80 bg-amber-50/80 ring-2 ring-amber-300/70 shadow-xl shadow-amber-200/60" : ""}`}>{alert && <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-red-500 shadow-lg shadow-red-500/40 animate-ping" />}<div className="flex items-start justify-between"><div><div className={`text-xs uppercase tracking-wider ${alert ? "font-bold text-amber-700" : "text-muted-foreground"}`}>{label}</div><div className={`mt-2 text-3xl font-bold ${alert ? "text-red-600" : "text-slate-900"}`}>{value}</div>{alert && <div className="mt-1 text-xs font-semibold text-amber-700">Needs approval now</div>}</div><div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${accentMap[accent]} ${alert ? "animate-pulse" : ""}`}><Icon className="h-5 w-5" /></div></div></div>;
}
