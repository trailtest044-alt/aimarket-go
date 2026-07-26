import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Search, ClipboardList, Loader2, Copy, CheckCircle2, Clock, Truck, XCircle, Eye, EyeOff, ShieldCheck, Image as ImageIcon, PlayCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { SupportPopups, SupportHelpSection } from "@/components/support-popups";
import { trackOrdersByCode, formatMoney, type TrackOrderResult, type DeliveryPayload } from "@/lib/api";
import type { Order } from "@/lib/mock-data";

export const Route = createFileRoute("/track-orders")({ component: TrackOrdersPage });

function TrackOrdersPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TrackOrderResult[] | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.trim().length < 3) return toast.error("Paste your Transaction ID or Order ID first.");
    setLoading(true);
    try {
      const orders = await trackOrdersByCode(code.trim());
      setResults(orders);
      if (!orders.length) toast.error("No order found with this code.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not track order.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <SupportPopups />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="stagger grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <section className="glass rounded-3xl p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-bold text-accent">
              <ClipboardList className="h-3.5 w-3.5" /> Track Your Orders
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold">Find your order anytime</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Paste the same Transaction ID or Order ID / reference code that you
              submitted during checkout.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Transaction ID / Order ID</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your Transaction ID or Order ID"
                  className="input-x mt-2 w-full px-4 py-3 font-mono text-sm"
                />
              </label>
              <button disabled={loading} className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Track order
              </button>
            </form>
            <div className="mt-6">
              <SupportHelpSection title="Need help finding your code?" />
            </div>
          </section>
          <InstructionCard />
        </div>

        <div className="mt-8 space-y-5">
          {results?.length === 0 && (
            <div className="glass animate-pop rounded-3xl p-8 text-center text-muted-foreground">
              No order found with this Transaction ID or Order ID. Please check the code and try again.
            </div>
          )}
          {results?.map((r) => <TrackedOrder key={r.order.id} result={r} />)}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function InstructionCard() {
  return (
    <section className="glass rounded-3xl p-7">
      <h2 className="font-display text-lg font-bold">Which code should I enter?</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Use the code you pasted during checkout after sending money. It can be
        either Transaction ID or Your Order ID.
      </p>
      <div className="mt-5 rounded-3xl border border-primary/20 bg-white/4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <GuideInput label="Transaction ID" value="Paste reference" active />
          <GuideInput label="Your Order ID (optional)" value="optional" />
        </div>
        <div className="mt-4 rounded-2xl border border-accent/25 bg-accent/8 p-4 text-sm leading-6 text-foreground/85">
          <b className="text-accent">The code you input here during checkout</b> is the same
          code you can use later to track your order and get delivery details.
        </div>
      </div>
    </section>
  );
}

function GuideInput({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className={active ? "rounded-2xl border-2 border-primary/70 bg-primary/8 p-3" : "rounded-2xl border border-border bg-white/4 p-3"}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 rounded-xl border border-border bg-white/5 px-3 py-2 font-mono text-sm text-muted-foreground">{value}</div>
    </div>
  );
}

function TrackedOrder({ result }: { result: TrackOrderResult }) {
  const { order, delivery } = result;
  const meta = statusMeta(order.status);
  return (
    <div className="glass animate-rise rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Order</div>
          <h2 className="mt-1 font-display text-xl font-bold">{order.productName}</h2>
          <div className="mt-1 font-mono text-xs text-muted-foreground">{order.id}</div>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold ${meta.badge}`}>
          <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Row label="Amount" value={formatMoney(order.amount, order.currency)} />
        <Row label="Payment" value={order.paymentMethod} />
        <Row label="Transaction ID" value={order.transactionId} mono />
        {order.customerOrderRef && <Row label="Your Order ID" value={order.customerOrderRef} mono />}
        <Row label="Placed" value={new Date(order.createdAt).toLocaleString()} />
      </div>
      {order.status === "pending" && (
        <div className="mt-5 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-sm text-warning">
          Waiting for admin approval. Track again using the same Transaction ID or Order ID.
        </div>
      )}
      {(order.status === "approved" || order.status === "delivered") && <DeliveryCard delivery={delivery} />}
      {order.status === "rejected" && (
        <div className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
          Order rejected. Please contact support.
        </div>
      )}
    </div>
  );
}

function DeliveryCard({ delivery }: { delivery?: DeliveryPayload | null }) {
  const [show, setShow] = useState(false);
  const password = delivery?.password || "";
  const instruction = delivery?.instruction || delivery?.instructions || "";
  const hasMedia = Boolean(instruction || delivery?.videoUrl || delivery?.imageUrl);
  return (
    <div className="mt-6 rounded-3xl border border-success/30 bg-success/6 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-success">
        <ShieldCheck className="h-4 w-4" /> Delivery details & instructions
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        This is the same delivery area you get after admin approval. Keep the login details private.
      </p>
      {delivery ? (
        <div className="mt-5 space-y-4">
          <Info label="Login Email" value={delivery.email || ""} />
          <div className="rounded-2xl border border-border bg-white/5 p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Password</div>
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
          {hasMedia && (
            <div className="rounded-3xl border border-primary/15 bg-white/4 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4 text-accent" /> Product instruction area
              </div>
              {instruction && (
                <div className="rounded-2xl border border-border bg-white/5 p-4">
                  <div className="text-xs font-bold uppercase text-muted-foreground">Instructions</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{instruction}</p>
                </div>
              )}
              {delivery.videoUrl && <MediaVideo url={delivery.videoUrl} />}
              {delivery.imageUrl && <MediaImage url={delivery.imageUrl} />}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-white/4 p-4 text-sm text-muted-foreground">
          Delivery is approved but details are loading. Try again in a moment or contact support.
        </div>
      )}
    </div>
  );
}

function MediaVideo({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)?.[1];
  const src = yt ? `https://www.youtube.com/embed/${yt}` : url;
  return (
    <div className="mt-4 rounded-2xl border border-border bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
        <PlayCircle className="h-4 w-4 text-accent" /> Video guide
      </div>
      {yt ? <iframe src={src} className="aspect-video w-full rounded-xl" allowFullScreen title="Delivery video" /> : <video src={src} controls className="max-h-[520px] w-full rounded-xl" />}
    </div>
  );
}

function MediaImage({ url }: { url: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
        <ImageIcon className="h-4 w-4 text-accent" /> Image guide
      </div>
      <img src={url} alt="Delivery guide" className="max-h-[520px] w-full rounded-xl object-contain" />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/5 p-4">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
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
      onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}
      className="btn-ghost inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
    >
      <Copy className="h-3 w-3" /> Copy
    </button>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/4 px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "break-all text-right font-mono font-semibold" : "text-right font-semibold"}>{value}</span>
    </div>
  );
}

function statusMeta(status: Order["status"]) {
  switch (status) {
    case "pending":
      return { Icon: Clock, label: "Pending", badge: "border-warning/30 bg-warning/10 text-warning" };
    case "approved":
      return { Icon: CheckCircle2, label: "Approved", badge: "border-primary/30 bg-primary/10 text-primary" };
    case "delivered":
      return { Icon: Truck, label: "Delivered", badge: "border-success/30 bg-success/10 text-success" };
    case "rejected":
      return { Icon: XCircle, label: "Rejected", badge: "border-destructive/30 bg-destructive/10 text-destructive" };
    default:
      return { Icon: Clock, label: "Pending", badge: "border-warning/30 bg-warning/10 text-warning" };
  }
}
