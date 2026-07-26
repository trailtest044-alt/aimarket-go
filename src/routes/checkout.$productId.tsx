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
  validatePromoCode,
} from "@/lib/api";
import { WALLETS, METHOD_CHANNELS, METHOD_META, PROMO_TEXT, CHECKOUT_TEXT, type WalletKey } from "@/lib/site-config";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductLogo } from "@/components/product-logo";
import { SupportPopups, SupportHelpSection } from "@/components/support-popups";
import { ServerLoader } from "@/components/server-loader";
import type { AppliedPromo, PaymentSettings, PriceRegion } from "@/lib/mock-data";
import {
  BadgePercent, Check, Copy, Loader2, ArrowLeft, PackageX, ShieldCheck, Sparkles, Ticket, X,
} from "lucide-react";

export const Route = createFileRoute("/checkout/$productId")({ component: CheckoutPage, notFoundComponent: NotFoundProduct });
type Method = "bangladesh" | "pakistan" | "binance";

/* Map each channel to the account number stored in admin Payment Settings */
function channelNumber(channel: WalletKey, payment?: PaymentSettings): string {
  if (!payment) return "";
  switch (channel) {
    case "bKash": return payment.bangladesh.bkash;
    case "Nagad": return payment.bangladesh.nagad;
    case "Easypaisa": return payment.pakistan.easypaisa;
    case "JazzCash": return payment.pakistan.jazzcash;
    case "Bank Transfer": return payment.pakistan.bank;
    case "Binance Pay": return payment.binance.payId;
    default: return payment.binance.wallet; // USDT TRC20 / BEP20
  }
}
function methodInstructions(method: Method, payment?: PaymentSettings): string {
  if (!payment) return "";
  return payment[method].instructions || "";
}

function NotFoundProduct() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="display-luxe text-2xl font-bold">Product not found</h1>
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
  const [channel, setChannel] = useState<WalletKey | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [txid, setTxid] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Promo state
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoShake, setPromoShake] = useState(false);

  useEffect(() => {
    getVisitorRegion().then((r) => {
      const region = r.region || "world";
      setVisitorRegion(region);
      setMethod(allowedPaymentMethods(region)[0]);
      setChannel("");
    });
  }, []);

  const availableMethods = useMemo(() => allowedPaymentMethods(visitorRegion), [visitorRegion]);
  const selectedPriceRegion = priceRegionForPaymentMethod(method);
  const price = product ? priceForRegion(product, selectedPriceRegion) : { amount: 0, currency: "USDT" as const };
  const discount = promo ? Math.min(promo.discount, price.amount) : 0;
  const total = Math.max(0, Math.round((price.amount - discount) * 100) / 100);
  const inStock = !!product && product.stock > 0;

  const infoDone = !!(name.trim() && email.trim());
  const payDone = !!(channel && txid.trim());
  const canSubmit = inStock && infoDone && payDone;

  // Changing gateway resets the channel + re-validates promo against the new currency
  useEffect(() => {
    setChannel("");
    if (promo && product) {
      validatePromoCode(promo.code, product.id, priceRegionForPaymentMethod(method))
        .then(setPromo)
        .catch(() => { setPromo(null); toast.info("Promo removed — not valid for this payment region."); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);

  async function applyPromo() {
    if (!product || !promoInput.trim() || promoBusy) return;
    setPromoBusy(true);
    try {
      const applied = await validatePromoCode(promoInput, product.id, selectedPriceRegion);
      setPromo(applied);
      setPromoInput("");
      toast.success(`${PROMO_TEXT.appliedPrefix} · ${applied.code}`);
    } catch (err) {
      setPromoShake(true);
      setTimeout(() => setPromoShake(false), 450);
      toast.error(err instanceof Error ? err.message : PROMO_TEXT.invalidFallback);
    } finally {
      setPromoBusy(false);
    }
  }

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
        amount: total,
        currency: price.currency,
        priceRegion: selectedPriceRegion,
        paymentMethod: method,
        paymentChannel: channel,
        transactionId: txid,
        customerOrderRef: orderRef || undefined,
        promoCode: promo?.code || "",
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
            <h1 className="display-luxe mt-5 text-2xl font-bold">Out of stock</h1>
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

  const wallet = channel ? WALLETS[channel] : null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <SupportPopups />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/products/$id" params={{ id: product.id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to product
        </Link>

        <div className="animate-rise mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Checkout</span>
            <h1 className="display-luxe mt-2 text-3xl font-bold sm:text-4xl">
              {CHECKOUT_TEXT.title.split(" ")[0]} <em className="text-holo">{CHECKOUT_TEXT.title.split(" ").slice(1).join(" ")}</em>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{CHECKOUT_TEXT.subtitle}</p>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground/80">{CHECKOUT_TEXT.subtitleBn}</p>
          </div>
          <ProgressRail infoDone={infoDone} payDone={payDone} />
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="stagger space-y-6">
            {/* ---- STEP 1: customer info ---- */}
            <Section step="1" title={CHECKOUT_TEXT.infoTitle} done={infoDone}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" value={name} onChange={setName} placeholder="Your name" />
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <Field className="sm:col-span-2" label="WhatsApp / Telegram (optional)" value={contact} onChange={setContact} placeholder="+8801XXXXXXXXX or @username" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{CHECKOUT_TEXT.infoHint}</p>
            </Section>

            {/* ---- STEP 2: gateway + wallet ---- */}
            <Section step="2" title={CHECKOUT_TEXT.payTitle} done={payDone}>
              <p className="text-xs text-muted-foreground">{CHECKOUT_TEXT.payHint}</p>

              {/* Gateway tabs */}
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {availableMethods.map((m) => {
                  const meta = METHOD_META[m];
                  const active = method === m;
                  return (
                    <button key={m} type="button" onClick={() => setMethod(m)} data-active={active} className="wallet-cta px-4 py-3.5 text-left text-sm" style={{ ["--wallet" as string]: "var(--primary)", ["--wallet-2" as string]: "var(--accent)" }}>
                      <span className="font-bold">{meta.flag} {meta.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{meta.sub}</span>
                      {active && (
                        <span className="absolute right-3 top-3 grid h-5 w-5 animate-pop place-items-center rounded-full bg-gradient-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Channel cards — each carries its wallet's brand colors */}
              <div className="mt-4">
                <div className="text-xs font-semibold text-muted-foreground">Select your wallet · আপনার ওয়ালেট বেছে নিন</div>
                <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                  {METHOD_CHANNELS[method].map((ch) => {
                    const w = WALLETS[ch];
                    return (
                      <button key={ch} type="button" onClick={() => setChannel(ch)} data-active={channel === ch} className="wallet-cta flex items-center gap-3 px-3.5 py-3 text-left" style={{ ["--wallet" as string]: w.color, ["--wallet-2" as string]: w.color2, ["--wallet-ink" as string]: w.ink }}>
                        <span className="wallet-chip h-9 w-9 rounded-xl text-xs">{w.monogram}</span>
                        <span>
                          <span className="block text-sm font-bold">{w.label}</span>
                          <span className="block text-[11px] text-muted-foreground">{w.badge}</span>
                        </span>
                        {channel === ch && <Check className="ml-auto h-4 w-4 animate-pop" style={{ color: w.color }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---- Wallet-branded payment panel ---- */}
              {wallet && (
                <div key={channel} className="wallet-panel mt-5 p-5 sm:p-6" style={{ ["--wallet" as string]: wallet.color, ["--wallet-2" as string]: wallet.color2, ["--wallet-ink" as string]: wallet.ink }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="wallet-chip text-sm">{wallet.monogram}</div>
                      <div>
                        <div className="text-base font-bold">{wallet.label} Checkout</div>
                        <div className="text-xs text-muted-foreground">{wallet.numberLabel}</div>
                      </div>
                    </div>
                    <span className="wallet-badge">{wallet.badge}</span>
                  </div>

                  {/* Big copyable number */}
                  <CopyNumber value={channelNumber(channel as WalletKey, payment)} accent={wallet.color} />

                  {/* Amount to send */}
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Send exactly</span>
                    <span className="font-mono text-lg font-bold" style={{ color: wallet.color2 }}>{formatMoney(total, price.currency)}</span>
                  </div>

                  {/* Step-by-step guide */}
                  <div className="mt-5">
                    <div className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: wallet.color }} /> How to pay · কিভাবে পে করবেন
                    </div>
                    <div className="space-y-2">
                      {wallet.steps.map((st, i) => (
                        <div key={i} className="step-card">
                          <span className="step-dot">{i + 1}</span>
                          <span className="text-sm leading-5">
                            {st}
                            {wallet.stepsBn[i] && <span className="mt-0.5 block text-xs text-muted-foreground">{wallet.stepsBn[i]}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {methodInstructions(method, payment) && (
                    <p className="mt-4 rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-xs leading-5 text-muted-foreground">
                      {methodInstructions(method, payment)}
                    </p>
                  )}

                  {/* Proof fields */}
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label={wallet.proofLabel} value={txid} onChange={setTxid} placeholder={wallet.proofHint} />
                    <Field label="Your Order ID (optional)" value={orderRef} onChange={setOrderRef} placeholder="optional reference" />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{CHECKOUT_TEXT.trackNote}</p>
                </div>
              )}
            </Section>

            <SupportHelpSection title="Need help before submitting?" />

            <button type="submit" disabled={!canSubmit || submitting} className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {submitting ? CHECKOUT_TEXT.submitBusy : CHECKOUT_TEXT.submitIdle}
            </button>
            {!canSubmit && (
              <p className="text-center text-xs text-muted-foreground">
                {!infoDone ? "১ম স্টেপে নাম ও ইমেইল দিন" : !channel ? "একটি ওয়ালেট সিলেক্ট করুন" : "Transaction ID দিলে বাটন চালু হবে"}
              </p>
            )}
          </div>

          {/* ---- Order ticket ---- */}
          <aside>
            <div className="ticket holo-border--animated sticky top-24 animate-rise p-6 [animation-delay:0.2s]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <Ticket className="h-3.5 w-3.5" /> {CHECKOUT_TEXT.summaryTitle}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <ProductLogo logoUrl={product.logoUrl} icon={product.icon} name={product.name} className="h-14 w-14 rounded-xl border border-border bg-white/5 text-2xl" emojiClassName="text-2xl" />
                <div>
                  <div className="font-bold">{product.name}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{product.category}</div>
                </div>
              </div>

              {/* Promo box */}
              <div className={`mt-5 ${promoShake ? "promo-shake" : ""}`}>
                {promo ? (
                  <div className="promo-applied flex items-center justify-between gap-2 px-3.5 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-semibold text-success">
                      <BadgePercent className="h-4 w-4" /> {promo.code}
                      {promo.discountType === "percent" && <span className="text-xs font-normal">(-{promo.percentOff}%)</span>}
                    </span>
                    <button type="button" onClick={() => setPromo(null)} className="btn-ghost inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" /> {PROMO_TEXT.removeButton}
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">{PROMO_TEXT.title} · {PROMO_TEXT.titleBn}</label>
                    <div className="mt-1.5 flex gap-2">
                      <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }} placeholder={PROMO_TEXT.placeholder} className="input-x w-full px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider" />
                      <button type="button" onClick={applyPromo} disabled={!promoInput.trim() || promoBusy} className="btn-primary shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-60">
                        {promoBusy ? PROMO_TEXT.applying : PROMO_TEXT.applyButton}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2.5 text-sm">
                <Row label="Subtotal" value={formatMoney(price.amount, price.currency)} />
                {discount > 0 && (
                  <div className="flex items-center justify-between text-success">
                    <span>{PROMO_TEXT.savingsLabel} ({promo?.code})</span>
                    <span className="font-semibold">− {formatMoney(discount, price.currency)}</span>
                  </div>
                )}
                <Row label="Service fee" value={formatMoney(0, price.currency)} />
                <div className="ticket-divider" />
                <Row label="Total" value={formatMoney(total, price.currency)} bold />
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-xl border border-success/25 bg-success/8 p-3.5 text-xs leading-5 text-success">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{CHECKOUT_TEXT.guaranteeNote}</span>
              </div>
            </div>
          </aside>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProgressRail({ infoDone, payDone }: { infoDone: boolean; payDone: boolean }) {
  const states: Array<"done" | "active" | "todo"> = [
    infoDone ? "done" : "active",
    payDone ? "done" : infoDone ? "active" : "todo",
    "todo",
  ];
  return (
    <div className="progress-rail w-full max-w-xs animate-rise [animation-delay:0.1s]">
      {CHECKOUT_TEXT.steps.map((label, i) => (
        <div key={label} className="contents">
          {i > 0 && <span className="progress-line" data-state={states[i - 1] === "done" ? "done" : undefined} />}
          <div className="flex flex-col items-center gap-1">
            <span className="progress-node" data-state={states[i] === "todo" ? undefined : states[i]}>
              {states[i] === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ step, title, done, children }: { step: string; title: string; done?: boolean; children: ReactNode }) {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <span className={`display-luxe grid h-8 w-8 place-items-center rounded-lg text-xs font-bold transition-all ${done ? "bg-success/18 text-success" : "bg-gradient-primary text-primary-foreground shadow-glow"}`}>
          {done ? <Check className="h-4 w-4" /> : step}
        </span>
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-foreground">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
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
      <span className={bold ? "display-luxe text-gold-gradient text-lg" : "text-foreground"}>{value}</span>
    </div>
  );
}

function CopyNumber({ value, accent }: { value: string; accent: string }) {
  const [flashed, setFlashed] = useState(false);
  function copy() {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setFlashed(true);
    setTimeout(() => setFlashed(false), 650);
    toast.success("Number copied — অ্যাপে পেস্ট করুন");
  }
  return (
    <button type="button" onClick={copy} className={`mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-left transition-transform active:scale-[0.99] ${flashed ? "copy-flash" : ""}`}>
      <span className="wallet-number">{value || "Not set — admin will add"}</span>
      <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold" style={{ background: `${accent}22`, color: accent }}>
        {flashed ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {flashed ? "Copied" : "Tap to copy"}
      </span>
    </button>
  );
}
