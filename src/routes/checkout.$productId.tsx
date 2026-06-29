import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { getProductById, getPaymentSettings, createOrder, getVisitorRegion, formatMoney, priceForRegion, allowedPaymentMethods, priceRegionForPaymentMethod } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductLogo } from "@/components/product-logo";
import { SupportPopups, SupportHelpSection } from "@/components/support-popups";
import { ServerLoader } from "@/components/server-loader";
import { Check, Copy, CreditCard, Loader2, ArrowLeft, PackageX } from "lucide-react";
import type { PriceRegion } from "@/lib/mock-data";

export const Route = createFileRoute("/checkout/$productId")({ component: CheckoutPage, notFoundComponent: NotFoundProduct });
type Method = "bangladesh" | "pakistan" | "binance";

function NotFoundProduct() { return <div className="min-h-screen"><SiteHeader /><div className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Product not found</h1><p className="mt-2 text-muted-foreground">The product you're trying to buy doesn't exist.</p><Link to="/products" className="mt-6 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back to Products</Link></div></div>; }

function CheckoutPage() {
  const navigate = useNavigate(); const { productId } = Route.useParams();
  const { data: product, isLoading } = useQuery({ queryKey: ["product", productId], queryFn: () => getProductById(productId) });
  const { data: payment } = useQuery({ queryKey: ["payment"], queryFn: getPaymentSettings });
  const [visitorRegion, setVisitorRegion] = useState<PriceRegion>("world");
  const [method, setMethod] = useState<Method>("binance");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [contact, setContact] = useState("");
  const [channel, setChannel] = useState(""); const [txid, setTxid] = useState(""); const [orderRef, setOrderRef] = useState(""); const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getVisitorRegion({ force: true }).then((r) => {
      const region = r.region || "world";
      setVisitorRegion(region);
      const methods = allowedPaymentMethods(region);
      setMethod(methods[0]);
      setChannel("");
    });
  }, []);

  const availableMethods = useMemo(() => allowedPaymentMethods(visitorRegion), [visitorRegion]);
  const selectedPriceRegion = priceRegionForPaymentMethod(method);
  const price = product ? priceForRegion(product, selectedPriceRegion) : { amount: 0, currency: "USDT" as const };
  const inStock = !!product && product.stock > 0;
  const canSubmit = inStock && name.trim() && email.trim() && method && channel && txid.trim();

  useEffect(() => { setChannel(""); }, [method]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); if (!product) return;
    if (!inStock) return toast.error("This product is out of stock.");
    if (!canSubmit) return toast.error("Please complete all required fields.");
    setSubmitting(true);
    try {
      const order = await createOrder({ productId: product.id, productName: product.name, customerName: name, customerEmail: email, contact, amount: price.amount, currency: price.currency, priceRegion: selectedPriceRegion, paymentMethod: method, paymentChannel: channel, transactionId: txid, customerOrderRef: orderRef || undefined });
      toast.success("Order submitted successfully!");
      navigate({ to: "/order-pending", search: { orderId: order.id, productName: product.name, amount: order.amount, currency: order.currency, method, channel, transactionId: txid, customerOrderRef: orderRef || undefined } });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not submit order. Try again."); } finally { setSubmitting(false); }
  }

  if (isLoading) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><ServerLoader title="Please wait, server loading..." message="Preparing checkout, region pricing, and payment gateways." /></main></div>;
  if (!product) throw notFound();
  if (!inStock) return <div className="min-h-screen"><SiteHeader /><SupportPopups /><main className="mx-auto max-w-2xl px-4 py-16 text-center"><div className="glass rounded-3xl p-8"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/15 text-destructive"><PackageX className="h-8 w-8" /></div><h1 className="mt-5 text-2xl font-bold">Out of stock</h1><p className="mt-2 text-muted-foreground">{product.name} is currently unavailable.</p><Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"><ArrowLeft className="h-4 w-4" /> Back to Products</Link></div></main><SiteFooter /></div>;

  return <div className="min-h-screen"><SiteHeader /><SupportPopups /><main className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><Link to="/products/$id" params={{ id: product.id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to product</Link><h1 className="mt-4 text-3xl font-bold">Checkout</h1><p className="mt-1 text-muted-foreground">Choose the available payment gateway and submit the payment reference you received after sending money.</p>
    <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-6">
        <RegionCard region={visitorRegion} />
        <Section title="Your Information"><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" value={name} onChange={setName} placeholder="Your name" /><Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" /><Field className="sm:col-span-2" label="WhatsApp / Telegram (optional)" value={contact} onChange={setContact} placeholder="+8801XXXXXXXXX or @username" /></div></Section>
        <Section title="Payment Method"><div className="rounded-2xl border border-primary/25 bg-primary/5 p-5"><div className="text-sm font-semibold">Available payment gateways</div><p className="mt-1 text-xs text-muted-foreground">Bangladesh customers can use Bangladesh gateway only. Pakistan and worldwide customers can choose Pakistan payment or Binance.</p><MethodTabs methods={availableMethods} value={method} onChange={setMethod} />{payment && <div className="mt-5">{method === "bangladesh" && <PayBangladesh {...payment.bangladesh} amount={price.amount} currency={price.currency} channel={channel} setChannel={setChannel} />}{method === "pakistan" && <PayPakistan {...payment.pakistan} amount={price.amount} currency={price.currency} channel={channel} setChannel={setChannel} />}{method === "binance" && <PayBinance {...payment.binance} amount={price.amount} currency={price.currency} channel={channel} setChannel={setChannel} />}<div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label={method === "binance" ? "Transaction Hash / Reference" : "Transaction ID"} value={txid} onChange={setTxid} placeholder="Paste reference" /><Field label="Your Order ID (optional)" value={orderRef} onChange={setOrderRef} placeholder="optional" /></div><p className="mt-3 text-xs text-muted-foreground">Save this Transaction ID or Order ID. You can use it later on Track Your Orders.</p></div>}</div></Section>
        <SupportHelpSection title="Need help before submitting?" />
        <button type="submit" disabled={!canSubmit || submitting} className="buy-now-btn inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{submitting ? "Submitting order..." : "Submit Order"}</button>
      </div>
      <aside><div className="sticky top-24 glass rounded-3xl p-6"><h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order Summary</h2><div className="mt-4 flex items-center gap-3"><ProductLogo logoUrl={product.logoUrl} icon={product.icon} name={product.name} className="h-14 w-14 rounded-xl bg-secondary text-2xl" emojiClassName="text-2xl" /><div><div className="font-semibold">{product.name}</div><div className="text-xs text-muted-foreground">{product.category}</div></div></div><div className="mt-5 space-y-2 text-sm"><Row label="Subtotal" value={formatMoney(price.amount, price.currency)} /><Row label="Service fee" value={formatMoney(0, price.currency)} /><div className="my-2 border-t border-border" /><Row label="Total" value={formatMoney(price.amount, price.currency)} bold /></div><div className="mt-5 rounded-xl bg-success/10 p-3 text-xs text-success"><Check className="mr-1 inline h-3.5 w-3.5" /> Account/instruction delivered after admin approval.</div></div></aside>
    </form></main><SiteFooter /></div>;
}
function RegionCard({ region }: { region: PriceRegion }) { const data = region === "bd" ? ["🇧🇩", "Bangladesh Payment", "BDT price active. bKash/Nagad gateway is available."] : region === "pk" ? ["🇵🇰", "Pakistan / Binance Payment", "PKR payment and Binance gateway are available."] : ["🌍", "Worldwide Payment", "Pakistan payment and Binance gateway are available."]; return <div className="glass rounded-3xl p-5"><div className="flex items-center gap-3"><div className="text-3xl">{data[0]}</div><div><div className="font-semibold">{data[1]}</div><div className="text-sm text-muted-foreground">{data[2]}</div></div></div></div>; }
function MethodTabs({ methods, value, onChange }: { methods: Method[]; value: Method; onChange: (m: Method) => void }) { const label: Record<Method,string> = { bangladesh: "🇧🇩 Bangladesh", pakistan: "🇵🇰 Pakistan", binance: "🟡 Binance" }; return <div className="mt-4 grid gap-2 sm:grid-cols-2">{methods.map((m) => <button key={m} type="button" onClick={() => onChange(m)} className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${value === m ? "border-primary bg-white shadow-glow" : "border-border bg-white/60 hover:border-primary/50"}`}><span className="font-semibold">{label[m]}</span><span className="mt-1 block text-xs text-muted-foreground">{m === "bangladesh" ? "bKash / Nagad" : m === "pakistan" ? "Easypaisa / JazzCash / Bank" : "USDT / Binance Pay"}</span></button>)}</div>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <div className="glass rounded-3xl p-6"><h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2><div className="mt-4">{children}</div></div>; }
function Field({ label, value, onChange, placeholder, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string; }) { return <label className={`block ${className}`}><span className="text-xs text-muted-foreground">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl bg-input/70 px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-primary" /></label>; }
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) { return <div className={`flex items-center justify-between ${bold ? "text-base font-bold" : "text-muted-foreground"}`}><span>{label}</span><span className={bold ? "text-gradient" : "text-foreground"}>{value}</span></div>; }
function CopyChip({ value }: { value: string }) { return <button type="button" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /> Copy</button>; }
function ChannelPicker({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) { return <div className="mt-3 flex flex-wrap gap-2">{options.map((o) => <button type="button" key={o} onClick={() => onChange(o)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${value === o ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{o}</button>)}</div>; }
function NumberLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm"><span className="text-muted-foreground">{label}</span><span className="flex items-center gap-2"><span className="font-mono font-semibold">{value || "Not set"}</span>{value && <CopyChip value={value} />}</span></div>; }
function PayBangladesh(p: { bkash: string; nagad: string; instructions: string; amount: number; currency: string; channel: string; setChannel: (v: string) => void }) { return <div><div className="mb-1 text-sm font-semibold">🇧🇩 Bangladesh Payment</div><p className="text-xs text-muted-foreground">{p.instructions}</p><div className="mt-3 space-y-2"><NumberLine label="bKash (Send Money)" value={p.bkash} /><NumberLine label="Nagad (Send Money)" value={p.nagad} /><NumberLine label="Amount" value={formatMoney(p.amount, p.currency as never)} /></div><div className="mt-3 text-xs text-muted-foreground">Select channel you used:</div><ChannelPicker options={["bKash", "Nagad"]} value={p.channel} onChange={p.setChannel} /></div>; }
function PayPakistan(p: { easypaisa: string; jazzcash: string; bank: string; instructions: string; amount: number; currency: string; channel: string; setChannel: (v: string) => void }) { return <div><div className="mb-1 text-sm font-semibold">🇵🇰 Pakistan Payment</div><p className="text-xs text-muted-foreground">{p.instructions}</p><div className="mt-3 space-y-2"><NumberLine label="Easypaisa" value={p.easypaisa} /><NumberLine label="JazzCash" value={p.jazzcash} /><NumberLine label="Bank" value={p.bank} /><NumberLine label="Amount" value={formatMoney(p.amount, p.currency as never)} /></div><ChannelPicker options={["Easypaisa", "JazzCash", "Bank Transfer"]} value={p.channel} onChange={p.setChannel} /></div>; }
function PayBinance(p: { payId: string; wallet: string; instructions: string; amount: number; currency: string; channel: string; setChannel: (v: string) => void }) { return <div><div className="mb-1 text-sm font-semibold">🟡 Binance / Worldwide</div><p className="text-xs text-muted-foreground">{p.instructions}</p><div className="mt-3 space-y-2"><NumberLine label="Binance Pay ID" value={p.payId} /><NumberLine label="USDT Wallet" value={p.wallet} /><NumberLine label="Amount" value={formatMoney(p.amount, p.currency as never)} /></div><ChannelPicker options={["Binance Pay", "USDT TRC20", "USDT BEP20"]} value={p.channel} onChange={p.setChannel} /></div>; }
