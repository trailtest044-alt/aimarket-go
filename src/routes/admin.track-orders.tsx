import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw, Search, ClipboardList, Inbox, AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { searchAdminOrders, trackOrdersByCode, formatMoney } from "@/lib/api";
import type { Order } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/track-orders")({ component: AdminTrackOrders });

function normalize(value: unknown) {
  return String(value || "").toLowerCase().trim();
}

function mergeOrders(adminOrders: Order[], publicOrders: Order[]) {
  const map = new Map<string, Order>();
  [...publicOrders, ...adminOrders].forEach((order) => map.set(order.id, order));
  return Array.from(map.values());
}

function AdminTrackOrders() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Order["status"] | "all">("all");
  const [searched, setSearched] = useState(false);
  const query = q.trim();

  const adminSearch = useQuery({
    queryKey: ["admin-advanced-order-search", query, status],
    queryFn: () => searchAdminOrders(query, status),
    enabled: false,
    retry: 1,
  });

  const publicCodeSearch = useQuery({
    queryKey: ["admin-public-track-fallback", query],
    queryFn: async () => {
      if (!query || query.length < 3) return [];
      const tracked = await trackOrdersByCode(query);
      return tracked.map((item) => item.order);
    },
    enabled: false,
    retry: 1,
  });

  const orders = useMemo(() => mergeOrders(adminSearch.data || [], publicCodeSearch.data || []), [adminSearch.data, publicCodeSearch.data]);
  const isLoading = adminSearch.isFetching || publicCodeSearch.isFetching;
  const hasError = !!adminSearch.error;

  async function run() {
    setSearched(true);
    await Promise.allSettled([adminSearch.refetch(), publicCodeSearch.refetch()]);
  }

  function statusClass(value: Order["status"]) {
    if (value === "delivered") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
    if (value === "approved") return "bg-sky-100 text-sky-700 ring-sky-200";
    if (value === "rejected") return "bg-rose-100 text-rose-700 ring-rose-200";
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }

  return (
    <AdminShell title="Track Orders">
      <div className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ClipboardList className="h-4 w-4 text-primary" /> Advanced order search
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Admin search supports customer name, Gmail/email, phone/WhatsApp, transaction ID, order ID/reference, product, status, payment method, and admin nickname.
            </p>
          </div>
          <button
            onClick={run}
            className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-xs font-semibold hover:bg-secondary/80"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_auto]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            placeholder="Search name, email, phone, transaction ID, order ID, product, admin..."
            className="rounded-2xl bg-input/70 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-primary"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Order["status"] | "all")}
            className="rounded-2xl bg-input/70 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-primary"
          >
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="delivered">Delivered</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={run}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-white/50 px-4 py-3 text-xs text-muted-foreground ring-1 ring-border/70">
          Admin results: <span className="font-semibold text-foreground">{adminSearch.data?.length || 0}</span>
          {" "}• Code fallback: <span className="font-semibold text-foreground">{publicCodeSearch.data?.length || 0}</span>
          {" "}• Showing: <span className="font-semibold text-foreground">{orders.length}</span>
          {hasError && (
            <span className="ml-2 inline-flex items-center gap-1 text-rose-700">
              <AlertCircle className="h-3.5 w-3.5" /> Admin API search failed. Backend patch/redeploy needed.
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 glass rounded-3xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Payment</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Searching orders...</td></tr>
            ) : !searched ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  Search by name, email, phone, transaction ID, order ID, product, or admin nickname.
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-3 h-8 w-8 opacity-60" />
                  No matching orders found.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold">{o.id}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
                    <div className="mt-1 text-[11px]">Tx: <span className="font-mono">{o.transactionId || "—"}</span></div>
                    {o.customerOrderRef && <div className="text-[11px]">Ref: <span className="font-mono">{o.customerOrderRef}</span></div>}
                  </td>
                  <td>
                    <div className="font-semibold">{o.customerName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.customerEmail || "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.contact || "—"}</div>
                  </td>
                  <td>{o.productName}</td>
                  <td>
                    <div className="capitalize">{o.paymentMethod}</div>
                    <div className="text-xs text-muted-foreground">{o.paymentChannel || "—"}</div>
                  </td>
                  <td className="font-semibold">{formatMoney(o.amount, o.currency)}</td>
                  <td>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${statusClass(o.status)}`}>{o.status}</span>
                  </td>
                  <td>
                    <div className="text-xs">{o.approvedByNickname && `Approved by ${o.approvedByNickname}`}</div>
                    <div className="text-xs">{o.deliveredByNickname && `Delivered by ${o.deliveredByNickname}`}</div>
                    <div className="text-xs">{o.rejectedByNickname && `Rejected by ${o.rejectedByNickname}`}</div>
                    {!o.approvedByNickname && !o.deliveredByNickname && !o.rejectedByNickname && <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
