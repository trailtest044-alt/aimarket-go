import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { getProductById, getPaymentSettings, createOrder } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductLogo } from "@/components/product-logo";
import { Check, Copy, CreditCard, Loader2, ArrowLeft, PackageX } from "lucide-react";

export const Route = createFileRoute("/checkout/$productId")({
  head: ({ params }) => ({
    meta: [
      { title: `Checkout — AIMarket` },
      { name: "description", content: `Complete your order for ${params.productId}.` },
    ],
  }),
  component: CheckoutPage,
  notFoundComponent: NotFoundProduct,
  errorComponent: ({ error }) => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Link to="/products" className="mt-6 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Back to Products
        </Link>
      </div>
    </div>
  ),
});

type Method = "bangladesh" | "pakistan" | "binance";

function NotFoundProduct() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">The product you're trying to buy doesn't exist.</p>
        <Link to="/products" className="mt-6 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Back to Products
        </Link>
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
  });
  const { data: payment } = useQuery({ queryKey: ["payment"], queryFn: getPaymentSettings });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [method, setMethod] = useState<Method | "">("");
  const [channel, setChannel] = useState("");
  const [txid, setTxid] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inStock = !!product && product.stock > 0;
  const canSubmit = inStock && name && email && method && channel && txid;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product || !method) return;
    if (!inStock) {
      toast.error("This product is out of stock.");
      return;
    }
    if (!canSubmit) {
      toast.error("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const order = await createOrder({
        productId: product.id,
        productName: product.name,
        customerName: name,
        customerEmail: email,
        contact,
        amount: product.price,
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
          amount: product.price,
          method,
          channel,
          transactionId: txid,
          customerOrderRef: orderRef || undefined,
        },
      });
    } catch {
      toast.error("Could not submit order. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-4xl p-6">
          <div className="h-96 animate-pulse rounded-2xl bg-secondary/40" />
        </div>
      </div>
    );
  }

  if (!product) throw notFound();

  if (!inStock) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="glass rounded-3xl p-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/15 text-destructive">
              <PackageX className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">Out of stock</h1>
            <p className="mt-2 text-muted-foreground">
              {product.name} is currently unavailable. Please check back soon or browse other products.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/products/$id" params={{ id: product.id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to product
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Checkout</h1>
        <p className="mt-1 text-muted-foreground">Complete your order details and payment.</p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Section title="Your Information">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" value={name} onChange={setName} placeholder="John Doe" />
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <Field className="sm:col-span-2" label="WhatsApp / Telegram (optional)" value={contact} onChange={setContact} placeholder="+8801XXXXXXXXX or @username" />
              </div>
            </Section>

            <Section title="Payment Method">
              <div className="grid gap-3 sm:grid-cols-3">
                {(["bangladesh", "pakistan", "binance"] as const).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => { setMethod(m); setChannel(""); }}
                    className={`rounded-xl border p-4 text-left transition ${
                      method === m
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border bg-secondary/40 hover:border-primary/40"
                    }`}
                  >
                    <div className="text-2xl">{m === "bangladesh" ? "🇧🇩" : m === "pakistan" ? "🇵🇰" : "🟡"}</div>
                    <div className="mt-2 text-sm font-semibold capitalize">{m === "binance" ? "Binance / Crypto" : m}</div>
                    <div className="text-xs text-muted-foreground">
                      {m === "bangladesh" ? "bKash / Nagad" : m === "pakistan" ? "Easypaisa / JazzCash / Bank" : "Binance Pay / USDT"}
                    </div>
                  </button>
                ))}
              </div>

              {method && payment && (
                <div className="mt-5 rounded-2xl border border-border bg-background/40 p-5">
                  {method === "bangladesh" && (
                    <PayBangladesh {...payment.bangladesh} amount={product.price} channel={channel} setChannel={setChannel} />
                  )}
                  {method === "pakistan" && (
                    <PayPakistan {...payment.pakistan} amount={product.price} channel={channel} setChannel={setChannel} />
                  )}
                  {method === "binance" && (
                    <PayBinance {...payment.binance} amount={product.price} channel={channel} setChannel={setChannel} />
                  )}

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field
                      label={method === "binance" ? "Transaction Hash / Reference" : "Transaction ID"}
                      value={txid}
                      onChange={setTxid}
                      placeholder="Paste reference"
                    />
                    <Field label="Your Order ID (optional)" value={orderRef} onChange={setOrderRef} placeholder="optional" />
                  </div>
                </div>
              )}
            </Section>

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {submitting ? "Submitting..." : "Submit Order"}
            </button>
          </div>

          <aside>
            <div className="sticky top-24 glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order Summary</h2>
              <div className="mt-4 flex items-center gap-3">
                <ProductLogo
                  logoUrl={product.logoUrl}
                  icon={product.icon}
                  name={product.name}
                  className="h-14 w-14 rounded-xl bg-secondary text-2xl"
                  emojiClassName="text-2xl"
                />

                <div>
                  <div className="font-semibold">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{product.category}</div>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <Row label="Subtotal" value={`$${product.price.toFixed(2)}`} />
                <Row label="Service fee" value="$0.00" />
                <div className="my-2 border-t border-border" />
                <Row label="Total" value={`$${product.price.toFixed(2)}`} bold />
              </div>
              <div className="mt-5 rounded-xl bg-success/10 p-3 text-xs text-success">
                <Check className="mr-1 inline h-3.5 w-3.5" /> 100% money-back if account doesn't work.
              </div>
            </div>
          </aside>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", className = "",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl bg-input/50 px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-primary"
      />
    </label>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold" : "text-muted-foreground"}`}>
      <span>{label}</span><span className={bold ? "text-gradient" : "text-foreground"}>{value}</span>
    </div>
  );
}

function CopyChip({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}
      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
    >
      <Copy className="h-3 w-3" /> Copy
    </button>
  );
}

function ChannelPicker({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            value === o ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function NumberLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono font-semibold">{value}</span>
        <CopyChip value={value} />
      </span>
    </div>
  );
}

function PayBangladesh(p: { bkash: string; nagad: string; instructions: string; amount: number; channel: string; setChannel: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">🇧🇩 Bangladesh Payment</div>
      <p className="text-xs text-muted-foreground">{p.instructions}</p>
      <div className="mt-3 space-y-2">
        <NumberLine label="bKash (Send Money)" value={p.bkash} />
        <NumberLine label="Nagad (Send Money)" value={p.nagad} />
        <NumberLine label="Amount" value={`$${p.amount.toFixed(2)}`} />
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Select channel you used:</div>
      <ChannelPicker options={["bKash", "Nagad"]} value={p.channel} onChange={p.setChannel} />
    </div>
  );
}
function PayPakistan(p: { easypaisa: string; jazzcash: string; bank: string; instructions: string; amount: number; channel: string; setChannel: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">🇵🇰 Pakistan Payment</div>
      <p className="text-xs text-muted-foreground">{p.instructions}</p>
      <div className="mt-3 space-y-2">
        <NumberLine label="Easypaisa" value={p.easypaisa} />
        <NumberLine label="JazzCash" value={p.jazzcash} />
        <NumberLine label="Bank" value={p.bank} />
        <NumberLine label="Amount" value={`$${p.amount.toFixed(2)}`} />
      </div>
      <ChannelPicker options={["Easypaisa", "JazzCash", "Bank Transfer"]} value={p.channel} onChange={p.setChannel} />
    </div>
  );
}
function PayBinance(p: { payId: string; wallet: string; instructions: string; amount: number; channel: string; setChannel: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">🟡 Binance / Crypto</div>
      <p className="text-xs text-muted-foreground">{p.instructions}</p>
      <div className="mt-3 space-y-2">
        <NumberLine label="Binance Pay ID" value={p.payId} />
        <NumberLine label="USDT Wallet (TRC20)" value={p.wallet} />
        <NumberLine label="Amount (USD)" value={`$${p.amount.toFixed(2)}`} />
      </div>
      <ChannelPicker options={["Binance Pay", "USDT TRC20", "USDT BEP20"]} value={p.channel} onChange={p.setChannel} />
    </div>
  );
}
