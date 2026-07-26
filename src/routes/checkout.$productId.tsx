import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  getProductById,
  getPaymentSettings,
  createOrder,
  getVisitorRegion,
  formatMoney,
  priceForRegion,
  allowedPaymentMethods,
  priceRegionForPaymentMethod,
} from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductLogo } from "@/components/product-logo";
import { SupportPopups, SupportHelpSection } from "@/components/support-popups";
import { ServerLoader } from "@/components/server-loader";
import { Check, Copy, CreditCard, Loader2, ArrowLeft, PackageX, ShieldCheck } from "lucide-react";
import type { PriceRegion } from "@/lib/mock-data";

export const Route = createFileRoute("/checkout/$productId")({ component: CheckoutPage, notFoundComponent: NotFoundProduct });
type Method = "bangladesh" | "pakistan" | "binance";

function NotFoundProduct() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">The product you're trying to buy doesn't exist.</p>
        <Link to="/products" className="btn-primary mt-6 inline-block rounded-xl px-6 py-3 text-sm font-semibold">Back to Products</Link>
      </div>
    </div>
  );
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { productId } = Route.useParams();
  const { data: product, isLoading } = useQuery({ queryKey: ["product", productId], queryFn: () => getProductById(productId) });
  const { data: payment } = useQuery({ queryKey: ["payment"], queryFn: getPaymentSettings });
  const [visitorRegion, setVisitorRegion] = useState<PriceRegion>("world");
  const [method, setMethod] = useState<Method>("binance");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [channel, setChannel] = useState("");
  const [txid, setTxid] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getVisitorRegion().then((r) => {
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
    e.preventDefault();
    if (!product) return;
    if (!inStock) return toast.error("This product is out of stock.");
    if (!canSubmit) return toast.error("Please complete all required fields.");
    setSubmitting(true);
    try {
      const order = await createOrder({
        productId: product.id,
        productName: product.name,
        customerName: name,
        customerEmail: email,
        contact,
        amount: price.amount,
        currency: price.currency,
        priceRegion: selectedPriceRegion,
        paymentMethod: method,
        paymentChannel: channel,
        transactionId: txid,
        customerOrderRef: orderRef || undefined,
      });
      toast.success("Order submitted successfully!");
      navigate({
        to: "/order-pending",
        search: {
          orderId: order.id,
          productName: product.name,
          amount: order.amount,
          currency: order.currency,
          method,
          channel,
          transactionId: txid,
          customerOrderRef: orderRef || undefined,
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit order. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-4xl p-6">
          <ServerLoader title="Please wait, server loading..." message="Preparing secure checkout." />
        </div>
      </div>
    );
  }
  if (!product) throw notFound();
  if (!inStock) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <SupportPopups />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="glass animate-pop rounded-3xl p-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/15 text-destructive">
              <PackageX className="h-8 w-8" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold">Out of stock</h1>
            <p className="mt-2 text-muted-foreground">{product.name} is currently unavailable.</p>
            <Link to="/products" className="btn-primary mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
              <ArrowLeft className="h-4 w-4" /> Back to Products
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <SupportPopups />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/products/$id" params={{ id: product.id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to product
        </Link>
        <div className="animate-rise">
          <h1 className="mt-4 font-display text-3xl font-bold">Checkout</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Send the money first with your preferred gateway, then paste the payment
            reference here. Delivery unlocks after admin approval.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="stagger space-y-6">
            <RegionCard region={visitorRegion} />

            <Section step="01" title="Your information">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" value={name} onChange={setName} placeholder="Your name" />
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <Field className="sm:col-span-2" label="WhatsApp / Telegram (optional)" value={contact} onChange={setContact} placeholder="+8801XXXXXXXXX or @username" />
              </div>
            </Section>

            <Section step="02" title="Payment">
              <div className="rounded-2xl border border-primary/25 bg-primary/6 p-5">
                <div className="text-sm font-bold">Available payment gateways</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Bangladesh customers can use the Bangladesh gateway only. Pakistan and
                  worldwide customers can choose Pakistan payment or Binance.
                </p>
                <MethodTabs methods={availableMethods} value={method} onChange={setMethod} />
                {payment && (
                  <div className="mt-5">
                    {method === "bangladesh" && <PayBangladesh {...payment.bangladesh} amount={price.amount} currency={price.currency} channel={channel} setChannel={setChannel} />}
                    {method === "pakistan" && <PayPakistan {...payment.pakistan} amount={price.amount} currency={price.currency} channel={channel} setChannel={setChannel} />}
                    {method === "binance" && <PayBinance {...payment.binance} amount={price.amount} currency={price.currency} channel={channel} setChannel={setChannel} />}
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field label={method === "binance" ? "Transaction Hash / Reference" : "Transaction ID"} value={txid} onChange={setTxid} placeholder="Paste reference" />
                      <Field label="Your Order ID (optional)" value={orderRef} onChange={setOrderRef} placeholder="optional" />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Save this Transaction ID or Order ID — you can use it any time on <b className="text-foreground">Track Your Orders</b>.
                    </p>
                  </div>
                )}
              </div>
            </Section>

            <SupportHelpSection title="Need help before submitting?" />

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {submitting ? "Submitting order..." : "Submit order"}
            </button>
          </div>

          <aside>
            <div className="glass sticky top-24 animate-rise rounded-3xl p-6 [animation-delay:0.2s]">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Order summary</h2>
              <div className="mt-4 flex items-center gap-3">
                <ProductLogo logoUrl={product.logoUrl} icon={product.icon} name={product.name} className="h-14 w-14 rounded-xl border border-border bg-white/5 text-2xl" emojiClassName="text-2xl" />
                <div>
                  <div className="font-bold">{product.name}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{product.category}</div>
                </div>
              </div>
              <div className="mt-5 space-y-2.5 text-sm">
                <Row label="Subtotal" value={formatMoney(price.amount, price.currency)} />
                <Row label="Service fee" value={formatMoney(0, price.currency)} />
                <div className="my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <Row label="Total" value={formatMoney(price.amount, price.currency)} bold />
              </div>
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-success/25 bg-success/8 p-3.5 text-xs leading-5 text-success">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Account / instruction is delivered on your order page after admin approval.</span>
              </div>
            </div>
          </aside>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function RegionCard({ region }: { region: PriceRegion }) {
  const data =
    region === "bd"
      ? ["🇧🇩", "Bangladesh payment", "BDT price active. bKash / Nagad gateway is available."]
      : region === "pk"
        ? ["🇵🇰", "Pakistan / Binance payment", "PKR payment and Binance gateway are available."]
        : ["🌍", "Worldwide payment", "Pakistan payment and Binance gateway are available."];
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-white/5 text-2xl">{data[0]}</div>
        <div>
          <div className="font-bold">{data[1]}</div>
          <div className="text-sm text-muted-foreground">{data[2]}</div>
        </div>
      </div>
    </div>
  );
}

function MethodTabs({ methods, value, onChange }: { methods: Method[]; value: Method; onChange: (m: Method) => void }) {
  const label: Record<Method, string> = { bangladesh: "🇧🇩 Bangladesh", pakistan: "🇵🇰 Pakistan", binance: "🟡 Binance" };
  const sub: Record<Method, string> = { bangladesh: "bKash / Nagad", pakistan: "Easypaisa / JazzCash / Bank", binance: "USDT / Binance Pay" };
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {methods.map((m) => {
        const active = value === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`relative rounded-2xl border px-4 py-3.5 text-left text-sm transition-all duration-300 ${
              active
                ? "border-primary/70 bg-primary/12 shadow-glow"
                : "border-border bg-white/4 hover:border-primary/40 hover:bg-white/6"
            }`}
          >
            <span className="font-bold">{label[m]}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{sub[m]}</span>
            {active && (
              <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-gradient-primary animate-pop">
                <Check className="h-3 w-3 text-primary-foreground" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Section({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary font-display text-xs font-bold text-primary-foreground shadow-glow">{step}</span>
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-foreground">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string; }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-x mt-1.5 w-full px-3.5 py-2.5 text-sm" />
    </label>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "font-display text-gold-gradient" : "text-foreground"}>{value}</span>
    </div>
  );
}

function CopyChip({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}
      className="btn-ghost inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
    >
      <Copy className="h-3 w-3" /> Copy
    </button>
  );
}

function ChannelPicker({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} data-active={value === o} className="chip rounded-full px-3.5 py-1.5 text-xs font-semibold">
          {o}
        </button>
      ))}
    </div>
  );
}

function NumberLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="copy-row text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono font-semibold tracking-wide">{value || "Not set"}</span>
        {value && <CopyChip value={value} />}
      </span>
    </div>
  );
}

function PayBangladesh(p: { bkash: string; nagad: string; instructions: string; amount: number; currency: string; channel: string; setChannel: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-sm font-bold">🇧🇩 Bangladesh payment</div>
      <p className="text-xs leading-5 text-muted-foreground">{p.instructions}</p>
      <div className="mt-3 space-y-2">
        <NumberLine label="bKash (Send Money)" value={p.bkash} />
        <NumberLine label="Nagad (Send Money)" value={p.nagad} />
        <NumberLine label="Amount" value={formatMoney(p.amount, p.currency as never)} />
      </div>
      <div className="mt-3 text-xs font-semibold text-muted-foreground">Select the channel you used:</div>
      <ChannelPicker options={["bKash", "Nagad"]} value={p.channel} onChange={p.setChannel} />
    </div>
  );
}

function PayPakistan(p: { easypaisa: string; jazzcash: string; bank: string; instructions: string; amount: number; currency: string; channel: string; setChannel: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-sm font-bold">🇵🇰 Pakistan payment</div>
      <p className="text-xs leading-5 text-muted-foreground">{p.instructions}</p>
      <div className="mt-3 space-y-2">
        <NumberLine label="Easypaisa" value={p.easypaisa} />
        <NumberLine label="JazzCash" value={p.jazzcash} />
        <NumberLine label="Bank" value={p.bank} />
        <NumberLine label="Amount" value={formatMoney(p.amount, p.currency as never)} />
      </div>
      <div className="mt-3 text-xs font-semibold text-muted-foreground">Select the channel you used:</div>
      <ChannelPicker options={["Easypaisa", "JazzCash", "Bank Transfer"]} value={p.channel} onChange={p.setChannel} />
    </div>
  );
}

function PayBinance(p: { payId: string; wallet: string; instructions: string; amount: number; currency: string; channel: string; setChannel: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-sm font-bold">🟡 Binance / worldwide</div>
      <p className="text-xs leading-5 text-muted-foreground">{p.instructions}</p>
      <div className="mt-3 space-y-2">
        <NumberLine label="Binance Pay ID" value={p.payId} />
        <NumberLine label="USDT Wallet" value={p.wallet} />
        <NumberLine label="Amount" value={formatMoney(p.amount, p.currency as never)} />
      </div>
      <div className="mt-3 text-xs font-semibold text-muted-foreground">Select the channel you used:</div>
      <ChannelPicker options={["Binance Pay", "USDT TRC20", "USDT BEP20"]} value={p.channel} onChange={p.setChannel} />
    </div>
  );
}
