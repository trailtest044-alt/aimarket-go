import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProductById, formatMoney } from "@/lib/api";
import { ProductLogo } from "@/components/product-logo";
import { ServerLoader } from "@/components/server-loader";
import { Check, Clock, ShieldCheck, ArrowRight, ArrowLeft, FileText, BadgeCheck, Sparkles } from "lucide-react";

export function ProductDetailsView({ productId }: { productId: string }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId),
    enabled: Boolean(productId),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ServerLoader title="Please wait, server loading..." message="Opening product details and pricing." />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Product not found</h1>
        <p className="mt-2 text-muted-foreground">The product you're looking for doesn't exist or is not available right now.</p>
        <Link to="/products" className="mt-6 inline-flex rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
          Back to Products
        </Link>
      </main>
    );
  }

  const inStock = product.stock > 0;
  const featureList = (product.features || []).filter(Boolean);
  const description = product.description || product.shortDescription || "Details will be updated soon.";
  const terms = product.terms || "Warranty, rules, and product notes will be updated soon.";
  const delivery = product.deliveryMethod || "Delivery details will be shared after admin approval.";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[0.95fr_1.35fr]">
        <div className="glass rounded-3xl p-8 text-center shadow-soft">
          <ProductLogo
            logoUrl={product.logoUrl}
            icon={product.icon}
            name={product.name}
            className="mx-auto h-40 w-40 rounded-[2rem] bg-gradient-primary text-7xl shadow-glow"
            emojiClassName="text-7xl"
          />

          {product.badge && (
            <div className="mt-6 inline-flex rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {product.badge}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{product.category}</p>

          <div className="mt-6 rounded-2xl border border-white/70 bg-white/70 p-4 text-left">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-gradient">{formatMoney(product.price, product.currency)}</span>
              {product.originalPrice ? (
                <span className="text-base text-muted-foreground line-through">{formatMoney(product.originalPrice, product.currency)}</span>
              ) : null}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`} />
              <span className={inStock ? "text-success" : "text-destructive"}>
                {inStock ? `${product.stock} in stock — Available now` : "Out of stock"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <section className="glass rounded-3xl p-6 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-4 w-4 text-primary" /> Full Description
            </div>
            <p className="mt-3 whitespace-pre-line text-base leading-7 text-slate-700">{description}</p>
          </section>

          <section className="glass rounded-3xl p-6 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> What's included
            </div>
            {featureList.length ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {featureList.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 rounded-2xl bg-white/65 p-3 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-2xl bg-white/65 p-4 text-sm text-muted-foreground">Feature list will be updated soon.</div>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="glass rounded-3xl p-6 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" /> Delivery Method
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{delivery}</p>
            </section>
            <section className="glass rounded-3xl p-6 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" /> Terms / Warranty
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{terms}</p>
            </section>
          </div>

          <section className="rounded-3xl border border-success/25 bg-success/10 p-5 text-sm text-success">
            <div className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold">Secure manual approval</div>
                <p className="mt-1 text-success/90">After payment confirmation, your account/instruction will unlock on the order status and track order pages.</p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/products"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/75 px-6 py-3.5 text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-secondary/70"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Products
            </Link>
            {inStock ? (
              <Link
                to="/checkout/$productId"
                params={{ productId: product.id }}
                className="buy-now-btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01]"
              >
                Buy Now <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3.5 text-sm font-semibold text-muted-foreground opacity-60"
              >
                Out of Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
