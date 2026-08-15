import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { toast } from "sonner";
import {
  getProductById,
  getProducts,
  getPaymentSettings,
  createOrderBatch,
  getVisitorRegion,
  formatMoney,
  priceForRegion,
  allowedPaymentMethods,
  priceRegionForPaymentMethod,
  validatePromoCode,
  getCurrentCustomer,
  getResellerProfile,
  startGoogleLogin,
  type CustomerSession,
} from "@/lib/api";
import { WALLETS, METHOD_CHANNELS, METHOD_META, PROMO_TEXT, CHECKOUT_TEXT, type WalletKey } from "@/lib/site-config";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductLogo } from "@/components/product-logo";
import { SupportPopups, SupportHelpSection } from "@/components/support-popups";
import { ServerLoader } from "@/components/server-loader";
import {
  manualActivationAccountName,
  manualActivationGuideImage,
  manualActivationGuideTitle,
} from "@/lib/manual-activation";
import type { AppliedPromo, ManualInputMode, PaymentSettings, PriceRegion, Product } from "@/lib/mock-data";
import {
  BadgePercent, Check, Copy, Loader2, ArrowLeft, PackageX, ShieldCheck, Sparkles, Ticket, X, Plus, Minus, Trash2,
  LogIn, Eye, EyeOff, KeyRound, Mail, PlayCircle,
} from "lucide-react";

export const Route = createFileRoute("/checkout/$productId")({ component: CheckoutPage, notFoundComponent: NotFoundProduct });
type Method = "bangladesh" | "pakistan" | "binance" | "reseller_due" | "free";
type PaidMethod = Exclude<Method, "reseller_due" | "free">;

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
    default: return payment.binance.wallet;
  }
}
function methodInstructions(method: PaidMethod, payment?: PaymentSettings): string {
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
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
  const { data: payment } = useQuery({ queryKey: ["payment"], queryFn: getPaymentSettings });
  const { data: availableProducts = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts, staleTime: 60_000, refetchOnWindowFocus: false });

  const [visitorRegion, setVisitorRegion] = useState<PriceRegion>("world");
  const [regionReady, setRegionReady] = useState(false);
  const [method, setMethod] = useState<Method>("pakistan");
  const [channel, setChannel] = useState<WalletKey | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [txid, setTxid] = useState("");
  const [manualLoginEmail, setManualLoginEmail] = useState("");
  const [manualLoginPassword, setManualLoginPassword] = useState("");
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [manualActivationStep, setManualActivationStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [customerReady, setCustomerReady] = useState(false);
  const [items, setItems] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [additionalProductId, setAdditionalProductId] = useState("");
  const resellerQuery = useQuery({ queryKey: ["reseller-profile", customer?.email], queryFn: getResellerProfile, enabled: !!customer, retry: false });

  // Promo state
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoShake, setPromoShake] = useState(false);
  const [showRequired, setShowRequired] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const paymentStepRef = useRef<HTMLDivElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);
  const checkoutRequestIdRef = useRef(
    globalThis.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    let active = true;
    getVisitorRegion()
      .then((r) => {
        if (!active) return;
        const region = r.region || "world";
        setVisitorRegion(region);
        setMethod(allowedPaymentMethods(region)[0]);
        setChannel("");
      })
      .catch(() => {
        if (!active) return;
        setVisitorRegion("world");
        setMethod("pakistan");
        setChannel("");
      })
      .finally(() => {
        if (active) setRegionReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const syncCustomer = () => {
      setCustomer(getCurrentCustomer());
      setCustomerReady(true);
    };
    syncCustomer();
    window.addEventListener("customer-auth-changed", syncCustomer);
    return () => window.removeEventListener("customer-auth-changed", syncCustomer);
  }, []);

  useEffect(() => {
    if (!customer) return;
    setName((current) => current || customer.name || "");
    setEmail(customer.email || "");
  }, [customer]);

  useEffect(() => {
    if (!product) return;
    setItems((current) => current.length ? current : [{ product, quantity: 1 }]);
  }, [product]);

  const reseller = resellerQuery.data;
  const isReseller = !!reseller;
  const availableMethods = useMemo(() => allowedPaymentMethods(visitorRegion), [visitorRegion]);
  const checkoutItems = items.length ? items : (product ? [{ product, quantity: 1 }] : []);
  const paidPriceRegion = isReseller ? visitorRegion : priceRegionForPaymentMethod(method as PaidMethod);
  const freeCheckout = checkoutItems.length > 0 && checkoutItems.every((item) => {
    const regionalPrice = priceForRegion(item.product, paidPriceRegion);
    return item.product.isFree === true || Number(regionalPrice.amount || 0) <= 0;
  });
  const selectedPriceRegion = (isReseller || freeCheckout) ? visitorRegion : paidPriceRegion;
  const itemCount = checkoutItems.reduce((count, item) => count + item.quantity, 0);
  const price = product ? priceForRegion(product, selectedPriceRegion) : { amount: 0, currency: "USDT" as const };
  const subtotal = checkoutItems.reduce((sum, item) => sum + priceForRegion(item.product, selectedPriceRegion).amount * item.quantity, 0);
  const discount = itemCount === 1 && promo ? Math.min(promo.discount, subtotal) : 0;
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const inStock = checkoutItems.length > 0 && checkoutItems.every((item) => item.product.stock >= item.quantity);
  const manualProducts = checkoutItems.filter((item) => item.product.deliveryMode === "manual");
  const activationProducts = manualProducts.length ? manualProducts.map((item) => item.product) : checkoutItems.map((item) => item.product);
  const manualInputMode = activationInputMode(activationProducts);
  const manualNeedsPassword = manualInputMode !== "email_only";
  const manualDetailsDone = !manualActivationStep || (!!manualLoginEmail.trim() && (!manualNeedsPassword || !!manualLoginPassword.trim()));

  function changeQuantity(productId: string, delta: number) {
    setItems((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: Math.max(1, Math.min(20, item.quantity + delta)) } : item));
  }
  function removeItem(productId: string) {
    setItems((current) => current.length > 1 ? current.filter((item) => item.product.id !== productId) : current);
  }
  function addProductToOrder() {
    const added = availableProducts.find((candidate) => candidate.id === additionalProductId);
    if (!added) return;
    setItems((current) => {
      const existing = current.find((item) => item.product.id === added.id);
      return existing ? current.map((item) => item.product.id === added.id ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item) : [...current, { product: added, quantity: 1 }];
    });
    setPromo(null); setAdditionalProductId(""); setAddProductOpen(false);
  }

  const infoDone = !!(name.trim() && email.trim());
  const payDone = freeCheckout || isReseller || !!(channel && txid.trim());
  const canSubmit = inStock && infoDone && payDone && manualDetailsDone;

  function requireField(target: HTMLElement | null) {
    setShowRequired(true);
    window.requestAnimationFrame(() => {
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus();
    });
    toast.error("This information is required.");
  }

  // Changing gateway resets the channel + re-validates promo against the new currency
  useEffect(() => {
    setChannel("");
    if (promo && product) {
      validatePromoCode(promo.code, product.id, selectedPriceRegion)
        .then(setPromo)
        .catch(() => { setPromo(null); toast.info("Promo removed — not valid for this payment region."); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, isReseller]);

  useEffect(() => {
    if (!isReseller) return;
    setMethod("reseller_due");
    setChannel("");
    setTxid("");
  }, [isReseller]);

  async function applyPromo() {
    if (!product || !promoInput.trim() || promoBusy) return;
    if (itemCount > 1) return toast.info("Promo codes are available for a single account only.");
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
    if (!customer) {
      toast.info("Login with Google to safe purchase.");
      startGoogleLogin(`/checkout/${product.id}`);
      return;
    }
    if (!inStock) return toast.error("This product is out of stock.");
    if (!name.trim()) return requireField(nameInputRef.current);
    if (!email.trim()) return requireField(emailInputRef.current);
    if (!freeCheckout && !isReseller && !channel) return requireField(paymentStepRef.current);
    if (!freeCheckout && !isReseller && !txid.trim()) return requireField(proofInputRef.current);
    if (manualActivationStep && !manualLoginEmail.trim()) return toast.error("This information is required.");
    if (manualActivationStep && manualNeedsPassword && !manualLoginPassword.trim()) return toast.error("This information is required.");
    // Manual delivery gets a dedicated activation page before any order is
    // created. Normal products keep the one-click checkout flow.
    if (!manualActivationStep && manualProducts.length > 0) {
      setManualActivationStep(true);
      return;
    }
    // React state is not synchronous. This ref closes the tiny window where a
    // fast second click could start another request before the button rerenders.
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const batch = await createOrderBatch({
        items: checkoutItems.map((item) => ({ productId: item.product.id, backendId: item.product.backendId, productName: item.product.name, quantity: item.quantity, productLogoUrl: item.product.logoUrl, productIcon: item.product.icon })),
        customerName: name,
        customerEmail: email,
        contact,
        priceRegion: selectedPriceRegion,
        paymentMethod: freeCheckout ? "free" : (isReseller ? "reseller_due" : method),
        paymentChannel: freeCheckout ? "Free" : (isReseller ? "Reseller due" : channel),
        transactionId: (freeCheckout || isReseller) ? "" : txid,
        promoCode: itemCount > 1 ? "" : promo?.code || "",
        manualActivation: manualActivationStep ? { email: manualLoginEmail.trim(), password: manualNeedsPassword ? manualLoginPassword : "" } : undefined,
        clientRequestId: checkoutRequestIdRef.current,
      });
      toast.success("Order submitted successfully!");
      navigate({
        to: "/order-pending",
        search: {
          orderId: batch.orders[0]?.id,
          productName: checkoutItems.map((item) => `${item.product.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`).join(", "),
          amount: batch.totalAmount,
          currency: batch.currency,
          method: freeCheckout ? "free" : (isReseller ? "reseller_due" : method),
          channel: freeCheckout ? "Free" : (isReseller ? "Reseller due" : channel),
          transactionId: (freeCheckout || isReseller) ? "" : txid,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit order. Try again.";
      // Manual products deliberately refuse the first checkout submission. No
      // order exists yet; this opens the dedicated activation page instead.
      if (
        !manualActivationStep &&
        /manual activation|product login|account details before submitting/i.test(message)
      ) {
        setManualActivationStep(true);
        toast.info("Enter the product login details, then activate the subscription to submit this order.");
        return;
      }
      toast.error(message);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  if (isLoading || !customerReady || !regionReady) {
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
  if (manualActivationStep) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <SupportPopups />
        {submitting && <CheckoutProcessingOverlay />}
        <main className="mx-auto w-full max-w-[1720px] px-4 py-8 sm:px-6 sm:py-12 xl:px-8">
          <button type="button" onClick={() => setManualActivationStep(false)} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to checkout</button>
          <div className="glass rounded-3xl p-5 sm:p-8 xl:p-10">
            <span className="eyebrow">Final activation step</span>
            <h1 className="display-luxe mt-2 text-3xl font-black sm:text-4xl">Activate your subscription</h1>
            <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">Enter the login details for the account where you want the subscription. Your order will be created after this final step.</p>
            <div className="mt-6 rounded-2xl border border-border bg-white/60 p-4 text-sm"><span className="text-muted-foreground">Order waiting to submit:</span> <strong>{checkoutItems.map((item) => `${item.product.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`).join(", ")}</strong></div>
            <form onSubmit={handleSubmit} className="mt-6">
              <ManualActivationCheckout products={activationProducts} inputMode={manualInputMode} email={manualLoginEmail} password={manualLoginPassword} showPassword={showManualPassword} onEmailChange={setManualLoginEmail} onPasswordChange={setManualLoginPassword} onTogglePassword={() => setShowManualPassword((current) => !current)} />
              <button type="submit" disabled={!canSubmit || submitting} className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {submitting ? "Submitting order…" : "Activate subscription to this email & submit order"}
              </button>
            </form>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }
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

  if (!customer) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <SupportPopups />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Link to="/products/$id" params={{ id: product.id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to product
          </Link>
          <div className="glass animate-rise mt-6 rounded-3xl p-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <span className="eyebrow mt-6 inline-block">Safe checkout</span>
            <h1 className="display-luxe mt-2 text-3xl font-bold">Login with Google to safe purchase</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Product details are public, but buying requires Google login so your purchase history,
              delivery, and future support stay protected in your own account.
            </p>
            <button
              type="button"
              onClick={() => startGoogleLogin(`/checkout/${product.id}`)}
              className="btn-primary mt-7 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
            >
              <LogIn className="h-4 w-4" /> Continue with Google
            </button>
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
      {submitting && <CheckoutProcessingOverlay />}
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
          </div>
          <ProgressRail infoDone={infoDone} payDone={payDone} />
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="stagger space-y-6">
            {/* ---- STEP 1: customer info ---- */}
            <Section step="1" title={CHECKOUT_TEXT.infoTitle} done={infoDone}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" value={name} onChange={setName} placeholder="Your name" inputRef={nameInputRef} invalid={showRequired && !name.trim()} />
                <Field label="Google email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" readOnly inputRef={emailInputRef} invalid={showRequired && !email.trim()} />
                <Field className="sm:col-span-2" label="WhatsApp / Telegram (optional)" value={contact} onChange={setContact} placeholder="+8801XXXXXXXXX or @username" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{CHECKOUT_TEXT.infoHint}</p>
            </Section>

            {/* ---- STEP 2: gateway + wallet ---- */}
            <div ref={paymentStepRef}><Section step="2" title={CHECKOUT_TEXT.payTitle} done={payDone}>
              {freeCheckout ? (
                <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/80 p-5 text-emerald-950">
                  <div className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5" /> This product is free</div>
                  <p className="mt-2 text-sm leading-6 text-emerald-900/75">No payment gateway or transaction ID is required. Submit once and available stock will be delivered automatically.</p>
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-white/80 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total</div><div className="mt-1 text-2xl font-black">Free</div></div>
                </div>
              ) : isReseller ? (
                <div className="rounded-2xl border border-primary/25 bg-primary/[.07] p-5">
                  <div className="flex items-center gap-2 font-bold text-primary"><ShieldCheck className="h-5 w-5" /> Verified reseller credit order</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">No payment gateway is needed. This order will be submitted as due, then an admin will approve it before delivery.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/80 p-3"><div className="text-xs text-muted-foreground">This order due</div><div className="mt-1 text-lg font-black">{formatMoney(total, price.currency)}</div></div><div className="rounded-xl bg-white/80 p-3"><div className="text-xs text-muted-foreground">Current due</div><div className="mt-1 text-lg font-black">{formatMoney(Number(reseller.balances[price.currency] || 0), price.currency)}</div></div></div>
                  <p className="mt-3 text-xs text-muted-foreground">Your reseller statement and payment history are available in My Account.</p>
                </div>
              ) : <>
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
                <div className="text-xs font-semibold text-muted-foreground">Select your wallet</div>
                <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                  {METHOD_CHANNELS[method as PaidMethod].map((ch) => {
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
                      <Sparkles className="h-3.5 w-3.5" style={{ color: wallet.color }} /> How to pay
                    </div>
                    <div className="space-y-2">
                      {wallet.steps.map((st, i) => (
                        <div key={i} className="step-card">
                          <span className="step-dot">{i + 1}</span>
                          <span className="text-sm leading-5">
                            {st}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {methodInstructions(method as PaidMethod, payment) && (
                    <p className="mt-4 rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-xs leading-5 text-muted-foreground">
                      {methodInstructions(method as PaidMethod, payment)}
                    </p>
                  )}

                  {/* Proof fields */}
                  <div className="mt-5">
                    <Field label={wallet.proofLabel} value={txid} onChange={setTxid} placeholder={wallet.proofHint} inputRef={proofInputRef} invalid={showRequired && !txid.trim()} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{CHECKOUT_TEXT.trackNote}</p>
                </div>
              )}
              </>}
            </Section></div>

            <SupportHelpSection title="Need help before submitting?" />

            <button type="submit" disabled={submitting} className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {submitting ? CHECKOUT_TEXT.submitBusy : CHECKOUT_TEXT.submitIdle}
            </button>
          </div>

          {/* ---- Order ticket ---- */}
          <aside>
            <div className="ticket holo-border--animated sticky top-24 animate-rise p-6 [animation-delay:0.2s]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <Ticket className="h-3.5 w-3.5" /> {CHECKOUT_TEXT.summaryTitle}
              </div>
              <div className="mt-4 space-y-3">
                {checkoutItems.map((item) => {
                  const itemPrice = priceForRegion(item.product, selectedPriceRegion);
                  return <div key={item.product.id} className="rounded-2xl border border-border bg-white/[.035] p-3">
                    <div className="flex items-center gap-3">
                      <ProductLogo logoUrl={item.product.logoUrl} icon={item.product.icon} name={item.product.name} className="h-12 w-12 shrink-0 rounded-xl border border-border bg-white/5 text-xl" emojiClassName="text-xl" />
                      <div className="min-w-0 flex-1"><div className="truncate font-bold">{item.product.name}</div><div className="text-xs uppercase tracking-wider text-muted-foreground">{item.product.category}</div></div>
                      {checkoutItems.length > 1 && <button type="button" onClick={() => removeItem(item.product.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${item.product.name}`}><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-lg border border-border bg-background/60">
                        <button type="button" onClick={() => changeQuantity(item.product.id, -1)} disabled={item.quantity <= 1} className="p-2 disabled:opacity-35" aria-label={`Decrease ${item.product.name}`}><Minus className="h-3.5 w-3.5" /></button>
                        <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => changeQuantity(item.product.id, 1)} disabled={item.quantity >= Math.min(20, item.product.stock)} className="p-2 disabled:opacity-35" aria-label={`Increase ${item.product.name}`}><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="text-right text-sm font-bold">{formatMoney(itemPrice.amount * item.quantity, itemPrice.currency)}</div>
                    </div>
                  </div>;
                })}
              </div>
              <div className="mt-3">
                {addProductOpen ? <div className="rounded-xl border border-primary/25 bg-primary/[.06] p-3">
                  <label className="text-xs font-semibold text-muted-foreground">Add another AI / product</label>
                  <div className="mt-2 flex gap-2"><select value={additionalProductId} onChange={(e) => setAdditionalProductId(e.target.value)} className="input-x min-w-0 flex-1 px-3 py-2 text-sm"><option value="">Select product</option>{availableProducts.filter((candidate) => candidate.stock > 0 && priceForRegion(candidate, selectedPriceRegion).currency === price.currency).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} — {formatMoney(priceForRegion(candidate, selectedPriceRegion).amount, price.currency)}</option>)}</select><button type="button" onClick={addProductToOrder} disabled={!additionalProductId} className="btn-primary rounded-xl px-3 text-xs font-bold disabled:opacity-50">Add</button></div>
                </div> : <button type="button" onClick={() => setAddProductOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/40 px-3.5 py-2.5 text-xs font-bold text-primary hover:bg-primary/[.06]"><Plus className="h-4 w-4" /> Add another account / product</button>}
              </div>

              {/* Promo box */}
              {itemCount === 1 && <div className={`mt-5 ${promoShake ? "promo-shake" : ""}`}>
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
                    <label className="text-xs font-semibold text-muted-foreground">{PROMO_TEXT.title}</label>
                    <div className="mt-1.5 flex gap-2">
                      <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }} placeholder={PROMO_TEXT.placeholder} className="input-x w-full px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider" />
                      <button type="button" onClick={applyPromo} disabled={!promoInput.trim() || promoBusy} className="btn-primary shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-60">
                        {promoBusy ? PROMO_TEXT.applying : PROMO_TEXT.applyButton}
                      </button>
                    </div>
                  </div>
                )}
              </div>}

              {itemCount > 1 && <p className="mt-4 rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">Promo codes apply to one account only. This combined order uses the shown item prices.</p>}
              <div className="mt-5 space-y-2.5 text-sm">
                <Row label={`Subtotal · ${itemCount} account${itemCount === 1 ? "" : "s"}`} value={formatMoney(subtotal, price.currency)} />
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

function ManualActivationCheckout({
  products, inputMode, email, password, showPassword, onEmailChange, onPasswordChange, onTogglePassword,
}: {
  products: Product[]; inputMode: ManualInputMode; email: string; password: string; showPassword: boolean;
  onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onTogglePassword: () => void;
}) {
  const first = products[0];
  const title = products.map((item) => item.name).join(", ");
  const videoUrl = first?.passwordInstructionVideoUrl || "";
  const accountNames = Array.from(new Set(products.map((item) => manualActivationAccountName(item.name))));
  const accountName = accountNames.length === 1 ? accountNames[0] : "Product";
  const isIdeogram = inputMode === "ideogram_credentials";
  const needsPassword = inputMode !== "email_only";
  const emailLabel = isIdeogram ? "Ideogram login email" : "Email address";
  const passwordLabel = isIdeogram ? "Ideogram login password" : "Email password";
  const guideImageUrl = manualActivationGuideImage(first?.name || "", first?.deliveryImageUrl || "");
  const guideTitle = manualActivationGuideTitle(first?.name || "");
  const youtubeId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)?.[1];

  return (
    <div className="grid gap-5 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[.08] via-white to-cyan-50 p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(17rem,1fr)_minmax(25rem,1.35fr)_minmax(17rem,1fr)] lg:items-start xl:gap-6 xl:p-6">
      {needsPassword && videoUrl && <section className="order-4 overflow-hidden rounded-2xl border border-border bg-white/90 p-3 shadow-sm lg:order-1 lg:col-start-1 lg:row-span-3">
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm font-black text-foreground"><PlayCircle className="h-4 w-4 text-primary" /> {guideTitle}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Watch only if you need help resetting the {accountName} login password.</p>
        </div>
        {youtubeId ? <iframe src={`https://www.youtube.com/embed/${youtubeId}`} className="aspect-video w-full rounded-xl" allowFullScreen title={guideTitle} /> : <video src={videoUrl} controls className="aspect-video w-full rounded-xl" />}
      </section>}

      <div className="order-1 flex items-start gap-3 rounded-2xl border border-primary/20 bg-white/85 p-4 shadow-sm lg:order-2 lg:col-start-2">
        <ProductLogo logoUrl={first?.logoUrl} icon={first?.icon} name={title} className="h-12 w-12 shrink-0 rounded-xl border border-border bg-white p-2 shadow-sm" emojiClassName="text-xl" />
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Manual activation</div>
          <h3 className="mt-2 text-lg font-black leading-tight">Activate {title} on your account</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {inputMode === "email_only"
              ? "Enter the email address where you want this subscription activated. Your order will be created only after you submit it."
              : isIdeogram
                ? "Enter your Ideogram login email and Ideogram login password. Do not enter your email inbox password."
                : "Enter the requested email address and its password. The details are encrypted, and your order will be created only after you submit them."}
          </p>
        </div>
      </div>

      {isIdeogram && guideImageUrl && <div className="order-5 lg:order-4 lg:col-start-3 lg:row-span-4">
        <figure className="overflow-hidden rounded-2xl border border-border bg-white/90 p-3 shadow-sm">
          <figcaption className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Where to enter your {accountName} login</figcaption>
          <div className="grid place-items-center rounded-lg bg-secondary/40 p-3">
            <img src={guideImageUrl} alt={`${accountName} email sign-in and forgot password guide`} className="max-h-[22rem] w-auto rounded-lg object-contain" loading="eager" />
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Use the Email and Password fields shown above. If needed, select “Forgot password?” to create or reset your {accountName} login password.
          </p>
        </figure>
      </div>}

      <div className="order-2 grid gap-4 rounded-2xl border border-primary/30 bg-primary/[.06] p-3 sm:grid-cols-2 sm:p-4 lg:order-3 lg:col-start-2">
        <label className="block">
          <span className="flex items-center gap-1.5 text-xs font-black text-foreground"><Mail className="h-3.5 w-3.5 text-primary" /> {emailLabel}</span>
          <input value={email} onChange={(event) => onEmailChange(event.target.value)} type="email" name="checkout-manual-activation-email" autoComplete="off" data-lpignore="true" className="input-x mt-1.5 w-full border-primary/25 bg-white px-4 py-3 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder={isIdeogram ? "your-ideogram-login@email.com" : "example@gmail.com"} />
        </label>
        {needsPassword && <label className="block">
          <span className="flex items-center gap-1.5 text-xs font-black text-foreground"><KeyRound className="h-3.5 w-3.5 text-primary" /> {passwordLabel}</span>
          <div className="relative mt-1.5">
            <input value={password} onChange={(event) => onPasswordChange(event.target.value)} type={showPassword ? "text" : "password"} name="checkout-manual-activation-password" autoComplete="new-password" data-lpignore="true" className="input-x w-full border-primary/25 bg-white px-4 py-3 pr-11 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder={passwordLabel} />
            <button type="button" onClick={onTogglePassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </label>}
      </div>
      <p className="order-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground lg:order-5 lg:col-start-2">
        {inputMode === "email_only"
          ? "Only this email address is saved for activation. No password is requested."
          : isIdeogram
            ? "Enter the password used to sign in to Ideogram—not the password for your email inbox. These details are encrypted and used only to activate this order."
            : "The email and password are encrypted and used only to activate this order."}
      </p>
    </div>
  );
}

function CheckoutProcessingOverlay() {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/80 p-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="glass-strong w-full max-w-md rounded-3xl border border-primary/20 p-7 text-center shadow-2xl">
        <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
          <span className="absolute inset-0 animate-ping rounded-full border border-primary/30" />
          <Loader2 className="h-9 w-9 animate-spin" />
        </div>
        <h2 className="mt-5 text-xl font-black">Processing your order</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Please keep this page open. Your reseller order is being saved and the delivery page will open automatically.</p>
        <div className="mt-5 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-xs font-bold text-warning">Do not click Submit again or refresh this page.</div>
      </div>
    </div>
  );
}

function activationInputMode(products: Product[]): ManualInputMode {
  const modes = products.map((product) => product.manualInputMode || "ideogram_credentials");
  if (modes.length > 0 && modes.every((mode) => mode === "email_only")) return "email_only";
  if (modes.length > 0 && modes.every((mode) => mode === "ideogram_credentials")) return "ideogram_credentials";
  return "email_password";
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

function Field({ label, value, onChange, placeholder, type = "text", className = "", readOnly = false, inputRef, invalid = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string; readOnly?: boolean; inputRef?: RefObject<HTMLInputElement | null>; invalid?: boolean }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input ref={inputRef} type={type} value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} placeholder={placeholder} aria-invalid={invalid} className={`input-x mt-1.5 w-full px-3.5 py-2.5 text-sm read-only:bg-secondary read-only:text-muted-foreground ${invalid ? "!border-destructive !ring-2 !ring-destructive/45" : ""}`} />
      {invalid && <span className="mt-1 block text-xs font-semibold text-destructive">This information is required.</span>}
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
    toast.success("Payment detail copied.");
  }
  return (
    <button type="button" onClick={copy} className={`wallet-copy-box mt-4 flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition-transform active:scale-[0.99] ${flashed ? "copy-flash" : ""}`}>
      <span className="wallet-number">{value || "Not set — admin will add"}</span>
      <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold" style={{ background: `${accent}22`, color: accent }}>
        {flashed ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {flashed ? "Copied" : "Tap to copy"}
      </span>
    </button>
  );
}
