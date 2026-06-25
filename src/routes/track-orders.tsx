import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Search, ClipboardList, Loader2, Copy, CheckCircle2, Clock, Truck, XCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen"><SiteHeader /><SupportPopups />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <section className="glass rounded-3xl p-7 soft-card-animate">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><ClipboardList className="h-3.5 w-3.5" /> Track Your Orders</div>
            <h1 className="mt-4 text-3xl font-bold">Find your order anytime</h1>
            <p className="mt-2 text-sm text-muted-foreground">Paste the same Transaction ID or Order ID/reference code that you submitted during checkout.</p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transaction ID / Order ID</span><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your Transaction ID or Order ID" className="mt-2 w-full rounded-2xl bg-input/70 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-primary" /></label>
              <button disabled={loading} className="buy-now-btn inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Track Order</button>
            </form>
            <SupportHelpSection title="Need help finding your code?" />
          </section>
          <InstructionCard />
        </div>
        <div className="mt-8 space-y-5">{results?.length === 0 && <div className="glass rounded-3xl p-8 text-center text-muted-foreground">No order found with this Transaction ID or Order ID. Please check the code and try again.</div>}{results?.map((r) => <TrackedOrder key={r.order.id} result={r} />)}</div>
      </main><SiteFooter /></div>
  );
}

function InstructionCard() {
  return <section className="glass rounded-3xl p-7 soft-card-animate"><h2 className="text-lg font-bold">Which code should I enter?</h2><p className="mt-2 text-sm text-muted-foreground">Use the code you pasted during checkout after sending money. It can be either Transaction ID or Your Order ID.</p><div className="mt-5 rounded-3xl border border-primary/20 bg-white/70 p-5"><div className="grid gap-4 sm:grid-cols-2"><GuideInput label="Transaction ID" value="Paste reference" active /><GuideInput label="Your Order ID (optional)" value="optional" /></div><div className="mt-4 rounded-2xl bg-primary/10 p-4 text-sm text-slate-700"><b>The code you input here during checkout</b> is the same code you can use later to track your order.</div></div></section>;
}
function GuideInput({ label, value, active }: { label: string; value: string; active?: boolean }) { return <div className={active ? "rounded-2xl border-2 border-primary bg-primary/5 p-3" : "rounded-2xl border border-border bg-white p-3"}><div className="text-xs text-muted-foreground">{label}</div><div className="mt-2 rounded-xl bg-input/70 px-3 py-2 text-sm text-muted-foreground">{value}</div></div>; }

function TrackedOrder({ result }: { result: TrackOrderResult }) { const { order, delivery } = result; const meta = statusMeta(order.status); return <div className="glass rounded-3xl p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Order</div><h2 className="mt-1 text-xl font-bold">{order.productName}</h2><div className="mt-1 font-mono text-xs text-muted-foreground">{order.id}</div></div><div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ${meta.badge}`}><meta.Icon className="h-3.5 w-3.5" /> {meta.label}</div></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><Row label="Amount" value={formatMoney(order.amount, order.currency)} /><Row label="Payment" value={order.paymentMethod} /><Row label="Transaction ID" value={order.transactionId} mono /><Row label="Placed" value={new Date(order.createdAt).toLocaleString()} /></div>{order.status === "pending" && <div className="mt-5 rounded-2xl bg-warning/10 p-4 text-sm text-warning">Waiting for admin approval. Please keep this page or track again using the same code.</div>}{(order.status === "approved" || order.status === "delivered") && <DeliveryCard delivery={delivery} />}{order.status === "rejected" && <div className="mt-5 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">Order rejected. Please contact support.</div>}</div>; }
function DeliveryCard({ delivery }: { delivery?: DeliveryPayload | null }) { const [show, setShow] = useState(false); const password = delivery?.password || ""; return <div className="mt-5 rounded-3xl border border-success/30 bg-success/5 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-success"><ShieldCheck className="h-4 w-4" /> Delivery Details</div>{delivery ? <div className="mt-4 space-y-4"><Info label="Login Email" value={delivery.email || ""} /><div className="rounded-2xl bg-white/70 p-4"><div className="text-xs font-semibold uppercase text-muted-foreground">Password</div><div className="mt-2 flex items-center justify-between gap-3"><span className="break-all font-mono text-lg font-bold text-slate-900">{show ? password : "•".repeat(Math.max(8, password.length || 8))}</span><div className="flex gap-2"><button type="button" onClick={() => setShow(!show)} className="rounded-lg bg-secondary px-2 py-1 text-xs">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>{password && <CopyButton value={password} />}</div></div></div>{(delivery.instruction || delivery.instructions) && <div className="rounded-2xl bg-white/70 p-4"><div className="text-xs font-semibold uppercase text-muted-foreground">Instructions</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{delivery.instruction || delivery.instructions}</p></div>}{delivery.videoUrl && <MediaVideo url={delivery.videoUrl} />}{delivery.imageUrl && <div className="rounded-2xl bg-white/70 p-4"><div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Image Guide</div><img src={delivery.imageUrl} alt="Delivery guide" className="max-h-[520px] w-full rounded-xl object-contain" /></div>}</div> : <div className="mt-4 rounded-xl border border-dashed border-border bg-white/60 p-4 text-sm text-muted-foreground">Delivery is approved but details are loading. Try again in a moment or contact support.</div>}</div>; }
function MediaVideo({ url }: { url: string }) { const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)?.[1]; const src = yt ? `https://www.youtube.com/embed/${yt}` : url; return <div className="rounded-2xl bg-white/70 p-4"><div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Video Guide</div>{yt ? <iframe src={src} className="aspect-video w-full rounded-xl" allowFullScreen title="Delivery video" /> : <video src={src} controls className="max-h-[520px] w-full rounded-xl" />}</div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/70 p-4"><div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div><div className="mt-2 flex items-center justify-between gap-3"><span className="break-all font-mono text-lg font-bold text-slate-900">{value || "Not provided"}</span>{value && <CopyButton value={value} />}</div></div>; }
function CopyButton({ value }: { value: string }) { return <button type="button" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs"><Copy className="h-3 w-3" /> Copy</button>; }
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-3"><span className="text-muted-foreground">{label}</span><span className={mono ? "break-all text-right font-mono font-semibold" : "text-right font-semibold"}>{value}</span></div>; }
function statusMeta(status: Order["status"]) { switch (status) { case "pending": return { Icon: Clock, label: "Pending", badge: "bg-warning/10 text-warning" }; case "approved": return { Icon: CheckCircle2, label: "Approved", badge: "bg-primary/10 text-primary" }; case "delivered": return { Icon: Truck, label: "Delivered", badge: "bg-success/10 text-success" }; case "rejected": return { Icon: XCircle, label: "Rejected", badge: "bg-destructive/10 text-destructive" }; } }
