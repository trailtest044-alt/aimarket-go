import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Package,
  Plus,
  MousePointerClick,
  RefreshCw,
  Search,
  ShoppingBag,
  Target,
  Truck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { formatMoney, getDashboard, type DashboardPeriodMode } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";
import type { AttentionItem, CurrencyCode, DashboardChartRow, MoneyBag, ProductPerformanceRow, TopCustomerRow } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

const currencies: CurrencyCode[] = ["PKR", "BDT", "USDT"];
const DASHBOARD_LIVE_REFRESH_MS = 5_000;

function dhakaDateInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function AdminDashboard() {
  const adminReady = useAdminAuthReady();
  const now = new Date();
  const today = dhakaDateInputValue(now);
  const weekStart = dhakaDateInputValue(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  const [mode, setMode] = useState<DashboardPeriodMode>("weekly");
  const [start, setStart] = useState(weekStart);
  const [end, setEnd] = useState(today);
  const [currency, setCurrency] = useState<CurrencyCode>("PKR");

  const query = useMemo(() => ({ mode, start, end, compare: true }), [mode, start, end]);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["dashboard", query],
    queryFn: () => getDashboard(query),
    enabled: adminReady,
    staleTime: 0,
    refetchInterval: DASHBOARD_LIVE_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const chart = useMemo(() => (data?.chart || []).map((row) => ({
    ...row,
    revenueValue: valueFor(row.revenue, currency),
    profitValue: valueFor(row.profit, currency),
  })), [data?.chart, currency]);

  return (
    <AdminShell title="Dashboard">
      <div className="space-y-5">
        <div className="rounded-[1.15rem] border border-[#e6e2f1] bg-white/85 p-4 shadow-[0_18px_55px_rgba(80,64,140,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overview of your store performance</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Real-time AI Market analytics</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-border bg-secondary/40 p-1">
                {(["weekly", "monthly", "lifetime", "custom"] as DashboardPeriodMode[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setMode(item)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${mode === item ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {mode !== "lifetime" && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold">
                  <Calendar className="h-4 w-4 text-primary" />
                  <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-transparent outline-none" />
                  <span className="text-muted-foreground">to</span>
                  <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-transparent outline-none" />
                </div>
              )}
              <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold outline-none">
                {currencies.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
              <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold shadow-sm hover:bg-secondary">
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
              </button>
              <button onClick={() => exportDashboardCsv(data, currency)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold shadow-sm hover:bg-secondary">
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            Dashboard load failed. <button onClick={() => refetch()} className="ml-2 font-bold underline">Retry</button>
          </div>
        ) : isLoading || !data ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Total Revenue" icon={Wallet} money={data.stats.revenue} change={data.stats.revenueChangePct} spark={data.kpis?.[0]?.sparkline} emphasis />
              <MetricCard title="Net Profit" icon={Target} money={data.stats.profit} change={data.stats.profitChangePct} spark={data.kpis?.[1]?.sparkline} tone="success" emphasis />
              <MetricCard title="Total Orders" icon={ShoppingBag} value={data.stats.totalOrders ?? 0} change={data.stats.orderChangePct} spark={chart.map((row) => row.orders)} />
              <MetricCard title="Signed-up Users" icon={Users} value={data.stats.signedUpUsers ?? data.stats.totalCustomers ?? 0} tone="cyan" />
              <MetricCard title="Unique Visitors" icon={Eye} value={data.stats.uniqueVisitors ?? 0} tone="primary" />
              <MetricCard title="Total Visits" icon={MousePointerClick} value={data.stats.totalVisits ?? 0} tone="cyan" />
              <MetricCard title="Visitors Today" icon={Eye} value={data.stats.visitsToday ?? 0} tone="success" />
              <MetricCard title="Average Order Value" icon={ArrowUpRight} money={data.stats.averageOrderValue} />
              <MetricCard title="Pending Orders" icon={Clock} value={data.stats.pendingOrders} tone="warning" link="/admin/orders/pending" alert={data.stats.pendingOrders > 0} />
              <MetricCard title="Delivered Orders" icon={Truck} value={data.stats.deliveredOrders} tone="success" link="/admin/orders/delivered" />
              <MetricCard title="Rejected Amount" icon={XCircle} money={data.stats.rejectedAmount} tone="danger" link="/admin/orders/rejected" />
            </div>

            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,.85fr)_minmax(260px,.85fr)]">
              <Panel className="min-h-[360px]" title="Revenue & Profit Overview" subtitle={`${currency} only — currencies are never mixed`}>
                {chart.length ? (
                  <ResponsiveContainer width="100%" height={286}>
                    <AreaChart data={chart} margin={{ left: 0, right: 16, top: 16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#6d5dfc" stopOpacity={0.24} />
                          <stop offset="95%" stopColor="#6d5dfc" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="profitFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#12b886" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#12b886" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#eeeaf6" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#787483" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#787483" }} />
                      <ChartTooltip content={<MoneyTooltip currency={currency} />} />
                      <Bar dataKey="orders" fill="#d7d9ff" radius={[7, 7, 0, 0]} barSize={18} />
                      <Area type="monotone" dataKey="revenueValue" stroke="#6d5dfc" strokeWidth={3} fill="url(#revenueFill)" name="Revenue" />
                      <Line type="monotone" dataKey="profitValue" stroke="#12b886" strokeWidth={3} dot={false} name="Profit" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="No chart data yet" text="Approved or delivered orders will appear here." />}
              </Panel>

              <Panel title="Order Status Overview" subtitle={`${data.stats.totalOrders ?? 0} orders in selected period`}>
                <div className="grid gap-4 sm:grid-cols-[180px_1fr] xl:grid-cols-1 2xl:grid-cols-[180px_1fr]">
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={data.orderStatus || []} innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="count">
                        {(data.orderStatus || []).map((row) => <Cell key={row.status} fill={row.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {(data.orderStatus || []).map((row) => (
                      <Link key={row.status} to={(row.to || "/admin") as never} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm hover:bg-secondary">
                        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} /> {row.label}</span>
                        <b>{row.count}</b>
                      </Link>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="Attention Needed" subtitle="Actionable alerts from live data">
                <div className="space-y-3">
                  {(data.attention || []).length ? data.attention!.map((item) => <AttentionRow key={item.type} item={item} />) : <EmptyState title="All clear" text="No urgent admin action right now." />}
                </div>
              </Panel>
            </div>

            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(260px,.85fr)]">
              <Panel title="Product Performance" subtitle="Sales, stock and margin by product">
                <ProductPerformanceTable rows={data.productPerformance || []} />
              </Panel>
              <Panel title="Top Customers" subtitle="Real buyer insights from orders">
                <CustomerTable rows={data.topCustomers || []} />
              </Panel>
              <Panel title="Recent Activity" subtitle="Latest admin/store timeline">
                <div className="space-y-3">
                  {data.recentActivity?.length ? data.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={activity._id || index} className="flex gap-3 rounded-xl border border-border bg-secondary/25 p-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-semibold">{activity.message}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{activity.actorNickname || "System"} · {formatDate(activity.createdAt)}</div>
                      </div>
                    </div>
                  )) : <EmptyState title="No activity yet" text="Admin changes and orders will show here." />}
                </div>
              </Panel>
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(320px,2fr)]">
              <MiniInsight title="New Customers" value={data.stats.newCustomers ?? 0} icon={Users} tone="success" />
              <MiniInsight title="Returning Customers" value={data.stats.returningCustomers ?? 0} icon={RefreshCw} tone="success" />
              <MiniInsight title="Repeat Purchase Rate" value={`${data.stats.repeatPurchaseRate ?? 0}%`} icon={Target} tone="primary" />
              <MiniInsight title="Low / Out Stock" value={`${data.stats.lowStockProducts ?? 0} / ${data.stats.outOfStockProducts ?? 0}`} icon={Boxes} tone="warning" />
              <QuickActions />
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function valueFor(bag?: MoneyBag, currency: CurrencyCode = "BDT") {
  return Number(bag?.[currency] || 0);
}

function primaryCurrency(bag?: MoneyBag): CurrencyCode {
  return currencies.find((code) => Number(bag?.[code] || 0) > 0) || "BDT";
}

function formatBagPrimary(bag?: MoneyBag) {
  const code = primaryCurrency(bag);
  return formatMoney(valueFor(bag, code), code);
}

function formatBagMini(bag?: MoneyBag) {
  const filled = currencies.filter((code) => Number(bag?.[code] || 0) > 0);
  return filled.slice(0, 3).map((code) => formatMoney(valueFor(bag, code), code)).join(" · ") || "No sales yet";
}

function formatDate(date?: string) {
  if (!date) return "";
  return new Date(date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function MetricCard({ title, icon: Icon, value, money, change, spark, tone = "primary", emphasis = false, alert = false, link }: {
  title: string;
  icon: typeof Wallet;
  value?: number | string;
  money?: MoneyBag;
  change?: number;
  spark?: number[];
  tone?: "primary" | "success" | "warning" | "danger" | "cyan";
  emphasis?: boolean;
  alert?: boolean;
  link?: string;
}) {
  const toneMap = {
    primary: "from-[#6d5dfc]/15 text-[#5f4bea]",
    success: "from-emerald-500/15 text-emerald-600",
    warning: "from-amber-500/18 text-amber-600",
    danger: "from-red-500/15 text-red-600",
    cyan: "from-cyan-500/15 text-cyan-600",
  };
  const body = (
    <div className={`group relative min-h-[142px] overflow-hidden rounded-[1.1rem] border border-[#e8e4f0] bg-white/90 p-4 shadow-[0_16px_45px_rgba(70,60,120,0.07)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_65px_rgba(70,60,120,0.12)] ${emphasis ? "ring-1 ring-primary/10" : ""} ${alert ? "ring-1 ring-amber-300" : ""}`}>
      <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${toneMap[tone]} to-transparent`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
          <div className="mt-3 text-[1.65rem] font-black leading-none tracking-tight">{money ? formatBagPrimary(money) : value}</div>
          {money && <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{formatBagMini(money)}</div>}
          {typeof change === "number" && (
            <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${change >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} {Math.abs(change)}% vs previous
            </div>
          )}
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${toneMap[tone]} to-white shadow-sm`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {!!spark?.length && <MiniSpark values={spark} tone={tone} />}
    </div>
  );
  return link ? <Link to={link as never}>{body}</Link> : body;
}

function MiniSpark({ values, tone }: { values: number[]; tone: string }) {
  const width = 170;
  const height = 38;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * width},${height - (value / max) * (height - 8) - 4}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="relative mt-4 h-10 w-full opacity-90">
      <polyline fill="none" stroke={tone === "success" ? "#10b981" : tone === "warning" ? "#f59e0b" : "#6d5dfc"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[1.15rem] border border-[#e8e4f0] bg-white/90 p-4 shadow-[0_18px_55px_rgba(70,60,120,0.07)] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black tracking-tight">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function MoneyTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as DashboardChartRow & { revenueValue: number; profitValue: number };
  return (
    <div className="rounded-xl border border-border bg-white p-3 text-xs shadow-xl">
      <div className="font-bold">{label}</div>
      <div className="mt-2 text-primary">Revenue: {formatMoney(row.revenueValue, currency)}</div>
      <div className="text-emerald-600">Profit: {formatMoney(row.profitValue, currency)}</div>
      <div className="text-muted-foreground">Orders: {row.orders}</div>
    </div>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const color = item.priority === "danger" ? "border-red-200 bg-red-50 text-red-700" : item.priority === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-blue-200 bg-blue-50 text-blue-700";
  return (
    <Link to={(item.to || "/admin") as never} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm transition hover:scale-[1.01] ${color}`}>
      <span className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4" />
        <span>
          <b className="block">{item.title}</b>
          <span className="text-xs opacity-80">{item.description}</span>
        </span>
      </span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function ProductPerformanceTable({ rows }: { rows: ProductPerformanceRow[] }) {
  if (!rows.length) return <EmptyState title="No products yet" text="Add products to see performance analytics." />;
  return (
    <div className="max-h-[340px] min-w-0 overflow-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="sticky top-0 bg-white text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="py-3">Product</th>
            <th>Sold</th>
            <th>Revenue</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Margin</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row) => (
            <tr key={row.productId} className="border-t border-border">
              <td className="py-3">
                <div className="font-bold">{row.productName}</div>
                <div className="text-xs text-muted-foreground">{row.category}</div>
              </td>
              <td className="font-bold">{row.unitsSold}</td>
              <td>{formatBagPrimary(row.revenue)}</td>
              <td>{formatBagPrimary(row.purchaseCost)}</td>
              <td className={primaryValue(row.netProfit) >= 0 ? "font-bold text-emerald-600" : "font-bold text-red-600"}>{formatBagPrimary(row.netProfit)}</td>
              <td>{row.profitMargin}%</td>
              <td><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.remainingStock <= 0 ? "bg-red-50 text-red-600" : row.remainingStock <= 2 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{row.remainingStock}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerTable({ rows }: { rows: TopCustomerRow[] }) {
  if (!rows.length) return <EmptyState title="No customer data yet" text="Customer insights will appear after orders." />;
  return (
    <div className="max-h-[340px] min-w-0 overflow-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="sticky top-0 bg-white text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <tr><th className="py-3">Customer</th><th>Orders</th><th>Spent</th><th>Profit</th><th>Last</th></tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="py-3"><div className="font-bold">{row.name}</div><div className="text-xs text-muted-foreground">{row.email}</div></td>
              <td>{row.totalOrders}</td>
              <td>{formatBagPrimary(row.totalSpent)}</td>
              <td className="font-bold text-emerald-600">{formatBagPrimary(row.totalProfit)}</td>
              <td className="text-xs text-muted-foreground">{formatDate(row.lastOrderAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function primaryValue(bag?: MoneyBag) {
  return valueFor(bag, primaryCurrency(bag));
}

function MiniInsight({ title, value, icon: Icon, tone }: { title: string; value: string | number; icon: typeof Users; tone: "success" | "warning" | "primary" }) {
  const colors = tone === "success" ? "bg-emerald-50 text-emerald-600" : tone === "warning" ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary";
  return (
    <div className="rounded-[1.05rem] border border-[#e8e4f0] bg-white/90 p-4 shadow-[0_14px_35px_rgba(70,60,120,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-muted-foreground">{title}</p>
          <div className="mt-2 text-2xl font-black">{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-2xl ${colors}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { to: "/admin/products", label: "Add Product", icon: Plus },
    { to: "/admin/stock", label: "Add Stock", icon: Boxes },
    { to: "/admin/promo-codes", label: "Create Promo", icon: Target },
    { to: "/admin/orders/pending", label: "Orders", icon: Clock },
    { to: "/admin/track-orders", label: "Track", icon: Search },
  ];
  return (
    <div className="rounded-[1.05rem] bg-gradient-to-br from-[#5d4bdb] to-[#8067f6] p-4 text-white shadow-[0_22px_60px_rgba(93,75,219,0.26)]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {actions.map((action) => (
          <Link key={action.label} to={action.to as never} className="grid place-items-center gap-2 rounded-2xl bg-white/12 px-3 py-3 text-center text-xs font-bold transition hover:bg-white/20">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#5d4bdb]"><action.icon className="h-5 w-5" /></span>
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-border bg-secondary/20 p-5 text-center"><div><div className="font-bold">{title}</div><div className="mt-1 text-sm text-muted-foreground">{text}</div></div></div>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-[1.1rem] bg-secondary/40" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_.85fr_.85fr]">
        <div className="h-96 animate-pulse rounded-[1.1rem] bg-secondary/40" />
        <div className="h-96 animate-pulse rounded-[1.1rem] bg-secondary/40" />
        <div className="h-96 animate-pulse rounded-[1.1rem] bg-secondary/40" />
      </div>
    </div>
  );
}

function exportDashboardCsv(data: any, currency: CurrencyCode) {
  if (!data) return;
  const rows: Array<Array<string | number>> = [
    ["Metric", "Value"],
    ["Total revenue", valueFor(data.stats?.revenue, currency)],
    ["Net profit", valueFor(data.stats?.profit, currency)],
    ["Total orders", data.stats?.totalOrders || 0],
    ["Total customers", data.stats?.totalCustomers || 0],
    [],
    ["Chart date", "Revenue", "Profit", "Orders"],
    ...(data.chart || []).map((row: DashboardChartRow) => [row.label, valueFor(row.revenue, currency), valueFor(row.profit, currency), row.orders]),
  ];
  const csv = rows.map((row) => row.map((cell: string | number) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aimarket-dashboard-${currency}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
