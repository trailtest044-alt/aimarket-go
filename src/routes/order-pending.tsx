import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Clock, CheckCircle2, Home, ShoppingBag, Compass } from "lucide-react";

const search = z.object({
  orderId: z.string().optional(),
  productName: z.string().optional(),
  amount: z.number().optional(),
  method: z.enum(["bangladesh", "pakistan", "binance"]).optional(),
  channel: z.string().optional(),
  transactionId: z.string().optional(),
  customerOrderRef: z.string().optional(),
});

export const Route = createFileRoute("/order-pending")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Order Pending — AIMarket" },
      { name: "description", content: "Your order is awaiting admin approval." },
    ],
  }),
  component: OrderPendingPage,
});

function OrderPendingPage() {
  const { orderId, productName, amount, method, channel, transactionId, customerOrderRef } = Route.useSearch();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="glass rounded-3xl p-8 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-primary shadow-glow">
            <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-3xl font-bold">Order submitted successfully</h1>
          <p className="mt-2 text-muted-foreground">
            Waiting for admin approval. You'll receive your delivery once payment is confirmed.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-warning/10 px-4 py-1.5 text-xs font-semibold text-warning">
            <Clock className="h-3.5 w-3.5" /> Pending Approval
          </div>

          {(orderId || productName || method) && (
            <div className="mt-8 rounded-2xl border border-border bg-background/40 p-5 text-left text-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order Summary
              </h2>
              <div className="mt-3 space-y-2">
                {orderId && <Row label="Order ID" value={orderId} mono />}
                {productName && <Row label="Product" value={productName} />}
                {typeof amount === "number" && <Row label="Amount" value={`$${amount.toFixed(2)}`} />}
                {method && (
                  <Row
                    label="Payment Method"
                    value={method === "bangladesh" ? "🇧🇩 Bangladesh" : method === "pakistan" ? "🇵🇰 Pakistan" : "🟡 Binance / Crypto"}
                  />
                )}
                {channel && <Row label="Payment Channel" value={channel} />}
                {transactionId && <Row label="Transaction ID" value={transactionId} mono />}
                {customerOrderRef && <Row label="Your Reference" value={customerOrderRef} mono />}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {orderId && (
              <Link
                to="/order-status/$orderId"
                params={{ orderId }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                <Compass className="h-4 w-4" /> Track Order
              </Link>
            )}
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70"
            >
              <ShoppingBag className="h-4 w-4" /> Browse Products
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70"
            >
              <Home className="h-4 w-4" /> Back to Home
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono font-semibold" : "font-semibold"}>{value}</span>
    </div>
  );
}
