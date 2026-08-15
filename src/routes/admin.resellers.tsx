import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CircleDollarSign,
  Handshake,
  Mail,
  PackageCheck,
  Plus,
  Search,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { createReseller, formatMoney, getResellerOverview } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";

export const Route = createFileRoute("/admin/resellers")({
  component: ResellerRoute,
});

function ResellerRoute() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  // The profile route is nested below this file route. Render it by itself so
  // its dashboard replaces the list rather than leaving the list on screen.
  if (pathname !== "/admin/resellers") return <Outlet />;

  return <ResellerListPage />;
}

function ResellerListPage() {
  const adminReady = useAdminAuthReady();
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("0");
  const [saving, setSaving] = useState(false);
  const overviewQuery = useQuery({
    queryKey: ["reseller-overview"],
    queryFn: getResellerOverview,
    enabled: adminReady,
  });
  const resellers = useMemo(
    () =>
      (overviewQuery.data?.resellers || []).filter((reseller) =>
        [reseller.name, reseller.email, reseller.status]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [overviewQuery.data?.resellers, query],
  );
  const summary = overviewQuery.data?.summary;

  async function addReseller(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createReseller({ email, name, creditLimitBDT: Number(limit || 0) });
      toast.success(
        "Reseller invitation saved. It activates after Google sign-in.",
      );
      setEmail("");
      setName("");
      setLimit("0");
      await overviewQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add reseller",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Reseller dashboard">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.2),transparent_38%),linear-gradient(125deg,rgba(2,132,199,.13),rgba(255,255,255,.96),rgba(16,185,129,.08))] p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                <Handshake className="h-3.5 w-3.5" /> RESELLER FINANCE & ACCESS
              </div>
              <h1 className="mt-3 font-display text-3xl font-black tracking-tight">
                Control every reseller from one view
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                See credit exposure before it becomes risky, then open a
                reseller profile to assign products, custom prices, record
                receipts and review every due order.
              </p>
            </div>
            <form
              onSubmit={addReseller}
              className="grid w-full gap-2 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm lg:w-[39rem] lg:grid-cols-[1.35fr_1fr_.65fr_auto]"
            >
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Reseller Gmail"
                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name (optional)"
                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              />
              <input
                min="0"
                type="number"
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                title="BDT credit limit"
                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              />
              <button
                disabled={saving}
                className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> {saving ? "Adding" : "Add"}
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            icon={UsersRound}
            label="All resellers"
            value={String(summary?.total || 0)}
            tone="blue"
          />
          <Metric
            icon={Handshake}
            label="Active partners"
            value={String(summary?.active || 0)}
            tone="emerald"
          />
          <Metric
            icon={CircleDollarSign}
            label="Total BDT due"
            value={formatMoney(summary?.totalDueBDT || 0, "BDT")}
            tone="amber"
          />
          <Metric
            icon={AlertTriangle}
            label="Credit risk (80%+)"
            value={String(summary?.creditAtRisk || 0)}
            tone="rose"
          />
          <Metric
            icon={Mail}
            label="Waiting for login"
            value={String(summary?.invited || 0)}
            tone="slate"
          />
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="font-display text-xl font-black">
                Reseller accounts
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open any profile to edit limit, product visibility, reseller
                price and receipt history.
              </p>
            </div>
            <label className="flex min-w-64 items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Gmail or name..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-secondary/45 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Reseller</th>
                  <th className="px-5 py-3">Credit position</th>
                  <th className="px-5 py-3">Products</th>
                  <th className="px-5 py-3">Open invoices</th>
                  <th className="px-5 py-3">Last activity</th>
                  <th className="px-5 py-3 text-right">Control</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map((reseller) => {
                  const due = Number(reseller.balances?.BDT || 0);
                  const used =
                    reseller.creditLimitBDT > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (Math.max(0, due) / reseller.creditLimitBDT) * 100,
                          ),
                        )
                      : 0;
                  return (
                    <tr
                      key={reseller.id}
                      className="border-t border-border/70 transition hover:bg-primary/[.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 font-black text-primary">
                            {(reseller.name || reseller.email)
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold">{reseller.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {reseller.email}
                            </div>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${reseller.status === "active" ? "bg-emerald-100 text-emerald-700" : reseller.status === "suspended" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {reseller.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold">
                          {due > 0 ? formatMoney(due, "BDT") : "Clear"}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                            <div
                              className={`h-full rounded-full ${used >= 80 ? "bg-rose-500" : "bg-primary"}`}
                              style={{ width: `${used}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {reseller.creditLimitBDT
                              ? `${used}% of ${formatMoney(reseller.creditLimitBDT, "BDT")}`
                              : "No limit"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1.5 font-bold">
                          <PackageCheck className="h-4 w-4 text-primary" />{" "}
                          {reseller.visibleProductCount || 0} assigned
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Custom price per product
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold">
                          {reseller.openInvoiceCount || 0}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Unpaid / partial
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {reseller.lastEntryAt
                          ? new Date(reseller.lastEntryAt).toLocaleDateString()
                          : "No activity"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <a
                          href={`/admin/resellers/${encodeURIComponent(reseller.id)}`}
                          className="btn-primary inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold"
                        >
                          Manage profile{" "}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {!overviewQuery.isLoading && !resellers.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      No reseller matched this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string;
  tone: "blue" | "emerald" | "amber" | "rose" | "slate";
}) {
  const styles = {
    blue: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div
        className={`grid h-9 w-9 place-items-center rounded-xl ${styles[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}
