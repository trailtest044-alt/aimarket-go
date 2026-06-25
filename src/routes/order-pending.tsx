import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { SupportPopups, SupportHelpSection } from "@/components/support-popups";
import { CheckCircle2, Home, ShoppingBag, Compass, Clock3, ReceiptText, CreditCard, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/api";

const search = z.object({ orderId: z.string().optional(), productName: z.string().optional(), amount: z.number().optional(), currency: z.string().optional(), method: z.enum(["bangladesh", "pakistan", "binance"]).optional(), channel: z.string().optional(), transactionId: z.string().optional(), customerOrderRef: z.string().optional() });
export const Route = createFileRoute("/order-pending")({ validateSearch: search, component: OrderPendingPage });

function OrderPendingPage() {
  const { orderId, productName, amount, currency, method, channel, transactionId, customerOrderRef } = Route.useSearch();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <SupportPopups />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="glass overflow-hidden rounded-[2rem] soft-card-animate">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" />
            <div className="absolute right-6 top-6 hidden rounded-full bg-warning/10 px-4 py-2 text-xs font-bold text-warning sm:inline-flex">
              Pending Approval
            </div>

            <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-bold text-success ring-1 ring-success/20">
                  <CheckCircle2 className="h-4 w-4" /> Order Received
                </div>
                <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Order submitted</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Your payment information is now in review. Delivery details will unlock here as soon as an admin confirms your payment.
                </p>

                <div className="mt-7 rounded-3xl border border-warning/25 bg-white/70 p-4 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="review-status-loader" aria-hidden="true"><span /></div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Admin review in progress</div>
                      <div className="text-xs text-muted-foreground">Please keep your Transaction ID / Order ID safe.</div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ReviewStep done label="Order Received" />
                    <ReviewStep done label="Payment Submitted" />
                    <ReviewStep active label="Awaiting Approval" />
                  </div>
                </div>
              </div>

              <div className="w-full rounded-3xl border border-primary/15 bg-white/70 p-5 shadow-sm lg:w-72">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <ReceiptText className="h-4 w-4 text-primary" /> Next step
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Use <b>Track Your Orders</b> anytime with the same Transaction ID or Order ID you submitted during checkout.
                </p>
                <div className="mt-4 rounded-2xl bg-primary/10 p-3 text-xs font-semibold text-primary">
                  Delivery will appear on the tracking page after approval.
                </div>
              </div>
            </div>

            {(orderId || productName || method) && (
              <div className="mt-8 rounded-3xl border border-border bg-white/65 p-5 text-sm">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <CreditCard className="h-4 w-4 text-primary" /> Order Summary
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {orderId && <Row label="Order ID" value={orderId} mono />}
                  {productName && <Row label="Product" value={productName} />}
                  {typeof amount === "number" && <Row label="Amount" value={formatMoney(amount, currency as never)} />}
                  {method && <Row label="Payment" value={method === "bangladesh" ? "Bangladesh" : method === "pakistan" ? "Pakistan" : "Binance / Worldwide"} />}
                  {channel && <Row label="Channel" value={channel} />}
                  {transactionId && <Row label="Transaction ID" value={transactionId} mono />}
                  {customerOrderRef && <Row label="Your Order ID" value={customerOrderRef} mono />}
                </div>
              </div>
            )}

            <div className="mt-6">
              <SupportHelpSection title="Need help while waiting?" />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              {orderId && <Link to="/order-status/$orderId" params={{ orderId }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow"><ShieldCheck className="h-4 w-4" /> View Secure Order Page</Link>}
              <Link to="/track-orders" className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-foreground hover:bg-secondary/70"><Compass className="h-4 w-4" /> Track Your Orders</Link>
              <Link to="/products" className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-foreground hover:bg-secondary/70"><ShoppingBag className="h-4 w-4" /> Browse Products</Link>
              <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-foreground hover:bg-secondary/70"><Home className="h-4 w-4" /> Home</Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ReviewStep({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${done ? "border-success/25 bg-success/10 text-success" : active ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-white/60 text-muted-foreground"}`}>
      <div className="flex items-center gap-2 text-xs font-bold">
        {done ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className={active ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />}
        {label}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/65 px-4 py-3"><span className="text-muted-foreground">{label}</span><span className={mono ? "break-all text-right font-mono font-semibold" : "text-right font-semibold"}>{value}</span></div>;
}
