import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Ban, CircleAlert, Loader2, LockKeyhole, Search, ShieldCheck, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { cancelOrder, formatMoney, getOrderCancellationPreview } from "@/lib/api";

export const Route = createFileRoute("/admin/orders/cancel")({
  head: () => ({ meta: [{ title: "Cancel Order" }, { name: "robots", content: "noindex" }] }),
  component: CancelOrderPage,
});

function CancelOrderPage() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ amount: number; currency: "BDT" | "PKR" | "USDT" | "USD"; remainingDue: number | null } | null>(null);
  const preview = useQuery({
    queryKey: ["order-cancellation-preview", orderId],
    queryFn: () => getOrderCancellationPreview(orderId),
    enabled: Boolean(orderId),
    retry: false,
  });

  function search(event: FormEvent) {
    event.preventDefault();
    const value = input.trim().toUpperCase();
    if (value.length < 6) return toast.error("Enter the complete order number.");
    setReason("");
    setConfirmed(false);
    setResult(null);
    setOrderId(value);
  }

  async function confirmCancellation() {
    if (!preview.data?.eligible || !orderId) return;
    if (reason.trim().length < 2) return toast.error("Write a short cancellation reason.");
    if (!confirmed) return toast.error("Confirm that you understand delivery access will be removed.");
    setBusy(true);
    try {
      const response = await cancelOrder(orderId, reason.trim());
      setResult({ amount: response.dueAdjustment.amount, currency: response.dueAdjustment.currency, remainingDue: response.dueAdjustment.remainingDue });
      await Promise.all([
        preview.refetch(),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-pending-alert"] }),
        queryClient.invalidateQueries({ queryKey: ["reseller"] }),
      ]);
      toast.success(response.alreadyCancelled ? "Order was already cancelled." : "Order cancelled and delivery access removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel this order.");
    } finally {
      setBusy(false);
    }
  }

  const order = preview.data?.order;
  const adjustment = preview.data?.resellerAdjustment;

  return (
    <AdminShell title="Cancel Order">
      <section className="overflow-hidden rounded-3xl border border-destructive/20 bg-card shadow-sm">
        <div className="grid gap-6 bg-gradient-to-br from-destructive/[.08] via-card to-card p-5 lg:grid-cols-[1.05fr_.95fr] lg:p-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-destructive"><Ban className="h-4 w-4" /> Owner cancellation control</div>
            <h1 className="mt-4 text-2xl font-black">Revoke an approved delivery safely</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Search by the exact order number. Cancellation removes customer and reseller access to delivery details, keeps an audit record, and reverses the reseller charge once.</p>
            <form onSubmit={search} className="mt-5 flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="ORD-..." autoComplete="off" className="input w-full pl-11 font-mono uppercase" />
              </label>
              <button type="submit" disabled={preview.isFetching} className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-60">{preview.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find order</button>
            </form>
          </div>
          <div className="rounded-2xl border border-border bg-background/75 p-5">
            <div className="flex items-center gap-2 font-black"><ShieldCheck className="h-5 w-5 text-primary" /> Safety rules</div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>• Only approved or delivered orders can be cancelled here.</li>
              <li>• Credentials and Get Code access stop immediately.</li>
              <li>• Delivered stock is revoked, never returned for accidental resale.</li>
              <li>• Repeated clicks cannot reverse reseller due twice.</li>
            </ul>
          </div>
        </div>
      </section>

      {preview.isError && <div className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/8 p-5 text-sm text-destructive"><b>Order cannot be opened.</b><div className="mt-1">{preview.error instanceof Error ? preview.error.message : "Check the order number and try again."}</div></div>}

      {order && (
        <section className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-sm lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-muted-foreground">{order.id}</div>
              <h2 className="mt-1 text-xl font-black">{order.productName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{order.customerName || "Customer"} · {order.customerEmail}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${order.status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>{order.status}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Order amount" value={formatMoney(order.amount, order.currency)} />
            <Info label="Payment" value={order.paymentMethod === "reseller_due" ? "Reseller due" : order.paymentChannel} />
            <Info label="Ordered at" value={new Date(order.createdAt).toLocaleString()} />
            <Info label="Delivery access" value={order.status === "cancelled" ? "Revoked" : order.assignedDelivery ? "Active" : "Not assigned"} />
          </div>

          {adjustment && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><div className="flex items-center gap-2 font-black"><WalletCards className="h-5 w-5" /> Reseller due adjustment</div><div className="mt-3 grid gap-3 sm:grid-cols-3"><Info label="Current due" value={formatMoney(adjustment.currentDue, adjustment.currency)} /><Info label="Order reversal" value={`− ${formatMoney(adjustment.reversalAmount, adjustment.currency)}`} /><Info label="Due after cancel" value={formatMoney(adjustment.dueAfterCancellation, adjustment.currency)} /></div></div>}
          {result && <div className="mt-5 rounded-2xl border border-success/25 bg-success/8 p-4 text-sm font-semibold text-success">Cancellation completed.{result.amount > 0 ? ` Reseller charge ${formatMoney(result.amount, result.currency)} was reversed.` : ""}{result.remainingDue != null ? ` New due: ${formatMoney(result.remainingDue, result.currency)}.` : ""}</div>}

          {preview.data?.eligible ? <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/[.04] p-5"><label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">Cancellation reason</label><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this approved order being cancelled?" className="input mt-2 min-h-24 w-full resize-y" maxLength={500} /><label className="mt-4 flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-destructive" /><span>I understand that account details and Get Code access will be removed immediately.</span></label><button onClick={confirmCancellation} disabled={busy || !confirmed || reason.trim().length < 2} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-3 text-sm font-black text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-45">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />} Cancel order &amp; revoke delivery</button></div> : <div className="mt-6 rounded-2xl border border-border bg-secondary/35 p-5 text-sm text-muted-foreground"><div className="flex items-center gap-2 font-black text-destructive"><CircleAlert className="h-5 w-5" /> This order is already cancelled</div><p className="mt-2">{order.cancelReason || "Delivery access has been revoked."}</p>{order.cancelledAt && <p className="mt-1 text-xs">Cancelled {new Date(order.cancelledAt).toLocaleString()} {order.cancelledByNickname ? `by ${order.cancelledByNickname}` : ""}</p>}</div>}
        </section>
      )}
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/80 bg-background/80 p-3"><div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 break-all text-sm font-black">{value || "—"}</div></div>;
}
