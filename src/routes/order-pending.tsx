import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { SupportPopups, SupportHelpSection } from "@/components/support-popups";
import {
  CheckCircle2,
  Home,
  ShoppingBag,
  Compass,
  Clock,
  ShieldCheck,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Truck,
  PlayCircle,
  Image as ImageIcon,
} from "lucide-react";
import { formatMoney, trackOrdersByCode, type DeliveryPayload } from "@/lib/api";
import type { Order } from "@/lib/mock-data";
import { toast } from "sonner";

const search = z.object({
  orderId: z.string().optional(),
  productName: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  method: z.enum(["bangladesh", "pakistan", "binance"]).optional(),
  channel: z.string().optional(),
  transactionId: z.string().optional(),
  customerOrderRef: z.string().optional(),
});

export const Route = createFileRoute("/order-pending")({
  validateSearch: search,
  component: OrderPendingPage,
});

function OrderPendingPage() {
  const params = Route.useSearch();
  const pollCode = params.transactionId || params.customerOrderRef || params.orderId || "";

  const { data: liveResults, isFetching } = useQuery({
    queryKey: ["pending-order-live", pollCode],
    queryFn: () => trackOrdersByCode(pollCode),
    enabled: Boolean(pollCode),
    refetchInterval: (query) => {
      const first = query.state.data?.[0];
      if (first?.order?.status === "approved" || first?.order?.status === "delivered") return false;
      return 4000;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const live = liveResults?.find((item) => {
    const o = item.order;
    return (
      (params.orderId && o.id === params.orderId) ||
      (params.transactionId && o.transactionId === params.transactionId) ||
      (params.customerOrderRef && o.customerOrderRef === params.customerOrderRef)
    );
  }) || liveResults?.[0];

  const liveOrder = live?.order;
  const delivery = live?.delivery ?? null;
  const status = liveOrder?.status || "pending";
  const isDelivered = status === "approved" || status === "delivered";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <SupportPopups />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <section className={`glass relative overflow-hidden rounded-3xl p-7 sm:p-9 animate-rise-lg ${isDelivered ? "border-success/30" : "border-warning/25"}`}>
          <div className={`absolute inset-x-0 top-0 h-1 ${isDelivered ? "bg-gradient-to-r from-success/0 via-success to-success/0" : "bg-gradient-primary"}`} />

          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold ${isDelivered ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
                {isDelivered ? <Truck className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {isDelivered ? "Delivery ready" : "Order received"}
              </div>

              <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
                {isDelivered ? (
                  <>Your delivery is <span className="text-gradient">ready</span></>
                ) : (
                  <>Order <span className="text-gradient">submitted</span></>
                )}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {isDelivered
                  ? "Your payment has been approved. Your account and instruction details are shown below on this same page."
                  : "Your payment is now in review. This page checks your order automatically and delivery will unlock here the moment admin approval completes."}
              </p>

              {!isDelivered && (
                <div className="mt-7 rounded-3xl border border-warning/25 bg-white/4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Admin review in progress</h2>
                      <p className="mt-1 text-xs text-muted-foreground">No refresh needed — keep this page open, delivery unlocks automatically.</p>
                    </div>
                    {isFetching && <Loader2 className="h-5 w-5 animate-spin text-warning" />}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <StepCard done label="Order received" />
                    <StepCard done label="Payment submitted" />
                    <StepCard active label="Awaiting approval" />
                  </div>
                  <div className="step-line mt-4" data-active="true" />
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-white/4 p-5">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Next step</div>
              <p className="mt-3 text-sm leading-6 text-foreground/85">
                Use <b>Track Your Orders</b> anytime with the same Transaction ID or Order ID you submitted during checkout.
              </p>
              <div className="mt-4 rounded-2xl border border-accent/25 bg-accent/8 p-4 text-xs font-semibold leading-5 text-accent">
                {isDelivered ? "Delivery has appeared below after approval." : "Delivery will appear here automatically after approval."}
              </div>
            </div>
          </div>

          <OrderSummary params={params} liveOrder={liveOrder} />

          {isDelivered && <DeliveryCard delivery={delivery} />}

          <div className="mt-7">
            <SupportHelpSection title={isDelivered ? "Need help with delivery?" : "Need help while waiting?"} />
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/track-orders" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-foreground">
              <Compass className="h-4 w-4" /> Track Your Orders
            </Link>
            <Link to="/products" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-foreground">
              <ShoppingBag className="h-4 w-4" /> Browse Products
            </Link>
            <Link to="/" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-foreground">
              <Home className="h-4 w-4" /> Home
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function StepCard({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-xs font-bold transition-colors ${done ? "border-success/30 bg-success/10 text-success" : active ? "border-warning/35 bg-warning/10 text-warning" : "border-border bg-white/4 text-muted-foreground"}`}>
      <div className="flex items-center gap-2">
        {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Clock className="h-4 w-4 animate-glow-pulse" /> : <span className="h-4 w-4 rounded-full border border-current" />}
        {label}
      </div>
    </div>
  );
}

function OrderSummary({ params, liveOrder }: { params: z.infer<typeof search>; liveOrder?: Order }) {
  const productName = liveOrder?.productName || params.productName;
  const amount = typeof liveOrder?.amount === "number" ? liveOrder.amount : params.amount;
  const currency = liveOrder?.currency || params.currency;
  const method = liveOrder?.paymentMethod || params.method;
  const channel = liveOrder?.paymentChannel || params.channel;
  const transactionId = liveOrder?.transactionId || params.transactionId;
  const customerOrderRef = liveOrder?.customerOrderRef || params.customerOrderRef;
  const orderId = liveOrder?.id || params.orderId;

  return (
    <div className="mt-8 rounded-3xl border border-border bg-white/4 p-5 text-left text-sm">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Order summary</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {orderId && <InfoRow label="Order ID" value={orderId} mono />}
        {productName && <InfoRow label="Product" value={productName} />}
        {typeof amount === "number" && <InfoRow label="Amount" value={formatMoney(amount, currency as never)} gold />}
        {method && <InfoRow label="Payment" value={methodLabel(method)} />}
        {channel && <InfoRow label="Channel" value={channel} />}
        {transactionId && <InfoRow label="Transaction ID" value={transactionId} mono />}
        {customerOrderRef && <InfoRow label="Your Reference" value={customerOrderRef} mono />}
        {liveOrder?.status && <InfoRow label="Current Status" value={liveOrder.status} />}
      </div>
    </div>
  );
}

function DeliveryCard({ delivery }: { delivery?: DeliveryPayload | null }) {
  const [show, setShow] = useState(false);
  const password = delivery?.password || "";

  return (
    <div className="mt-8 animate-rise-lg rounded-3xl border border-success/30 bg-success/6 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-success">
        <ShieldCheck className="h-4 w-4" /> Delivery details
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Keep this information private. Do not share your login or order details with anyone.</p>

      {delivery ? (
        <div className="mt-5 space-y-4">
          <InfoBox label="Login Email" value={delivery.email || ""} />

          <div className="rounded-2xl border border-border bg-white/5 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="break-all font-mono text-lg font-bold text-foreground">{show ? password : "•".repeat(Math.max(8, password.length || 8))}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShow(!show)} className="btn-ghost rounded-lg px-2.5 py-1.5 text-xs">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {password && <CopyButton value={password} />}
              </div>
            </div>
          </div>

          {(delivery.instruction || delivery.instructions) && (
            <div className="rounded-2xl border border-border bg-white/5 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instructions</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{delivery.instruction || delivery.instructions}</p>
            </div>
          )}

          {delivery.videoUrl && <MediaVideo url={delivery.videoUrl} />}
          {delivery.imageUrl && (
            <div className="rounded-2xl border border-border bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ImageIcon className="h-4 w-4 text-accent" /> Image guide
              </div>
              <img src={delivery.imageUrl} alt="Delivery guide" className="max-h-[520px] w-full rounded-xl object-contain" />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-success/30 bg-white/4 p-4 text-sm text-muted-foreground">
          Order is approved. Delivery details are loading automatically — please wait a moment.
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/5 p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="break-all font-mono text-lg font-bold text-foreground">{value || "Not provided"}</span>
        {value && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success("Copied");
      }}
      className="btn-ghost inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
    >
      <Copy className="h-3 w-3" /> Copy
    </button>
  );
}

function MediaVideo({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)?.[1];
  const src = yt ? `https://www.youtube.com/embed/${yt}` : url;
  return (
    <div className="rounded-2xl border border-border bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <PlayCircle className="h-4 w-4 text-accent" /> Video guide
      </div>
      {yt ? <iframe src={src} className="aspect-video w-full rounded-xl" allowFullScreen title="Delivery video" /> : <video src={src} controls className="max-h-[520px] w-full rounded-xl" />}
    </div>
  );
}

function InfoRow({ label, value, mono, gold }: { label: string; value: string; mono?: boolean; gold?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-white/4 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 break-all font-bold ${mono ? "font-mono" : ""} ${gold ? "font-display text-gold-gradient" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function methodLabel(method: Order["paymentMethod"] | string) {
  if (method === "bangladesh") return "Bangladesh";
  if (method === "pakistan") return "Pakistan";
  if (method === "binance") return "Binance";
  return String(method);
}
