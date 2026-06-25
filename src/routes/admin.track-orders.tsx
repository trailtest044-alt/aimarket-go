import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw, Search, ClipboardList, Inbox } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getOrders, trackOrdersByCode, formatMoney } from "@/lib/api";
import type { Order } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/track-orders")({ component: AdminTrackOrders });

function searchableText(o: Order) {
  return [
    o.id,
    o.transactionId,
    o.customerOrderRef || "",
    o.customerName,
    o.customerEmail,
    o.contact,
    o.productName,
    o.productId,
    o.paymentMethod,
    o.paymentChannel,
    o.currency || "",
    o.priceRegion || "",
    o.status,
    o.approvedByNickname || "",
    o.deliveredByNickname || "",
    o.rejectedByNickname || "",
    o.reviewedByNickname || "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function AdminTrackOrders() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Order["status"] | "all">("all");
  const [searched, setSearched] = useState(false);

  const searchCode = q.trim();

  // Load the admin order list for broad admin searches.
  // Some older backend deployments may return an empty admin list, so when a code is typed
  // we also call the public Track Orders API, because that is already proven to work for customers.
  const { data: allOrders = [], isLoading: isAdminLoading, refetch, isFetching } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
    retry: 1,
  });

  const { data: publicMatches = [], isLoading: isPublicLoading, refetch: refetchPublic } = useQuery({
    queryKey: ["admin-track-public-code", searchCode],
    queryFn: async () => {
      if (!searchCode || searchCode.length < 3) return [];
      const tracked = await trackOrdersByCode(searchCode);
      return tracked.map((item) => item.order);
    },
    enabled: !!searchCode && searchCode.length >= 3,
    retry: 1,
  });

  const isLoading = isAdminLoading || isPublicLoading;

  const results = useMemo(() => {
    const needle = searchCode.toLowerCase();
    const merged = new Map<string, Order>();
    [...publicMatches, ...allOrders].forEach((order) => merged.set(order.id, order));

    return Array.from(merged.values()).filter((o) => {
      const statusOk = status === "all" || o.status === status;
      if (!statusOk) return false;
      if (!needle) return true;
      // Public track endpoint returns exact transaction/order matches, so keep those.
      const exactPublicHit = publicMatches.some((x) => x.id === o.id);
      return exactPublicHit || searchableText(o).includes(needle);
    });
  }, [allOrders, publicMatches, searchCode, status]);

  function run() {
    setSearched(true);
    refetch();
    refetchPublic();
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
              Search by transaction ID, order ID/reference, customer name, Gmail/email, phone/WhatsApp, product, status, or admin nickname.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-xs font-semibold hover:bg-secondary/80"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_auto]">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value.trim()) setSearched(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            placeholder="Name, email, phone, Transaction ID, Order ID, product..."
            className="rounded-2xl bg-input/70 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-primary"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as Order["status"] | "all");
              setSearched(true);
            }}
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
          Loaded admin orders: <span className="font-semibold text-foreground">{allOrders.length}</span>
          {searched && (
            <>
              {" "}• Public code matches: <span className="font-semibold text-foreground">{publicMatches.length}</span>
              {" "}• Matching results: <span className="font-semibold text-foreground">{results.length}</span>
            </>
          )}
          {allOrders.length === 0 && !isLoading && (
            <span className="ml-2 text-amber-700">Admin list is empty. Code search still checks the customer Track Orders API.</span>
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
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading orders...</td></tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-3 h-8 w-8 opacity-60" />
                  {allOrders.length === 0 ? "No orders loaded from admin API." : "No matching orders found."}
                </td>
              </tr>
            ) : (
              results.map((o) => (
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
                  <td><span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize">{o.status}</span></td>
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
