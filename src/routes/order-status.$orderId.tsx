import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getOrderById, getOrderDelivery, type DeliveryPayload } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Clock, CheckCircle2, Truck, XCircle, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import type { Order } from "@/lib/mock-data";

export const Route = createFileRoute("/order-status/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.orderId} — AIMarket` },
      { name: "description", content: "Track your order status and delivery." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderStatusPage,
});

function OrderStatusPage() {
  const { orderId } = Route.useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderById(orderId),
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to products
        </Link>

        <div className="mt-6 glass rounded-3xl p-8">
          {isLoading ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-3 text-sm">Loading order…</p>
            </div>
          ) : !order ? (
            <div className="text-center py-10">
              <h1 className="text-2xl font-bold">Order not found</h1>
              <p className="mt-2 text-muted-foreground">
                We couldn't find an order with ID <span className="font-mono">{orderId}</span>.
              </p>
              <Link to="/products" className="mt-6 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                Browse Products
              </Link>
            </div>
          ) : (
            <OrderDetailsWithDelivery order={order} />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}


function OrderDetailsWithDelivery({ order }: { order: Order }) {
  const { data: delivery } = useQuery({
    queryKey: ["delivery", order.id],
    queryFn: () => getOrderDelivery(order.id),
    enabled: order.status === "delivered",
    refetchInterval: false,
  });

  return <OrderDetails order={order} delivery={delivery ?? null} />;
}

function OrderDetails({ order, delivery }: { order: Order; delivery?: DeliveryPayload | null }) {
  const meta = statusMeta(order.status);
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <div className={`grid h-20 w-20 place-items-center rounded-full ${meta.iconBg}`}>
          <meta.Icon className={`h-10 w-10 ${meta.iconColor}`} />
        </div>
        <h1 className="mt-5 text-3xl font-bold">{meta.title}</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{meta.message}</p>
        <div className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ${meta.badge}`}>
          <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-background/40 p-5 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Details</h2>
        <div className="mt-3 space-y-2">
          <Row label="Order ID" value={order.id} mono />
          <Row label="Product" value={order.productName} />
          <Row label="Amount" value={`$${order.amount.toFixed(2)}`} />
          <Row label="Payment" value={`${order.paymentChannel} (${order.paymentMethod})`} />
          <Row label="Transaction ID" value={order.transactionId} mono />
          {order.customerOrderRef && <Row label="Your Reference" value={order.customerOrderRef} mono />}
          <Row label="Placed" value={new Date(order.createdAt).toLocaleString()} />
        </div>
      </div>

      {order.status === "delivered" && (
        <div className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-success">
            <ShieldCheck className="h-4 w-4" /> Secure Delivery
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Your delivery is protected by your private order token. Keep this page private.
          </p>
          <div className="mt-3 rounded-xl border border-dashed border-border bg-background/60 p-4 text-xs text-muted-foreground">
            {delivery ? (
              <>
                {delivery.email && <div>Email: <span className="font-mono text-foreground">{delivery.email}</span></div>}
                {delivery.password && <div className="mt-1">Password: <span className="font-mono text-foreground">{delivery.password}</span></div>}
                {(delivery.instruction || delivery.instructions) && (
                  <div className="mt-1 whitespace-pre-wrap">Instructions: <span className="text-foreground">{delivery.instruction || delivery.instructions}</span></div>
                )}
                {delivery.extra && <pre className="mt-2 whitespace-pre-wrap break-all text-foreground">{JSON.stringify(delivery.extra, null, 2)}</pre>}
              </>
            ) : (
              <div>Delivery is approved. Refresh this page in a moment if the details do not appear.</div>
            )}
          </div>
        </div>
      )}

      {order.status === "rejected" && (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Order rejected. Please contact support on WhatsApp or Telegram for assistance.
        </div>
      )}
    </>
  );
}

function statusMeta(status: Order["status"]) {
  switch (status) {
    case "pending":
      return {
        Icon: Clock,
        title: "Order Pending",
        label: "Pending",
        message: "Waiting for admin approval. We'll update this page automatically.",
        iconBg: "bg-warning/15",
        iconColor: "text-warning",
        badge: "bg-warning/10 text-warning",
      };
    case "approved":
      return {
        Icon: CheckCircle2,
        title: "Order Approved",
        label: "Approved",
        message: "Approved, delivery is being prepared. Please check back shortly.",
        iconBg: "bg-primary/15",
        iconColor: "text-primary",
        badge: "bg-primary/10 text-primary",
      };
    case "delivered":
      return {
        Icon: Truck,
        title: "Order Delivered",
        label: "Delivered",
        message: "Your delivery is ready below.",
        iconBg: "bg-success/15",
        iconColor: "text-success",
        badge: "bg-success/10 text-success",
      };
    case "rejected":
      return {
        Icon: XCircle,
        title: "Order Rejected",
        label: "Rejected",
        message: "Your order was rejected. Contact support for help.",
        iconBg: "bg-destructive/15",
        iconColor: "text-destructive",
        badge: "bg-destructive/10 text-destructive",
      };
  }
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono font-semibold break-all text-right" : "font-semibold text-right"}>{value}</span>
    </div>
  );
}
