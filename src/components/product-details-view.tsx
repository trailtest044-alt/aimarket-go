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
        <h1 className="font-display text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">The product you're looking for doesn't exist or is not available right now.</p>
        <Link to="/products" className="btn-primary mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-semibold">
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
      <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[0.95fr_1.35fr]">
        {/* Left: hero card */}
        <div className="animate-rise">
          <div className="glass relative overflow-hidden rounded-3xl p-8 text-center lg:sticky lg:top-24">
            <div className="relative">
              <div className="relative mx-auto w-fit">
                <ProductLogo
                  logoUrl={product.logoUrl}
                  icon={product.icon}
                  name={product.name}
                  className="relative mx-auto h-36 w-36 rounded-[2rem] border border-border bg-white/6 text-7xl animate-float-y"
                  emojiClassName="text-7xl"
                />
              </div>

              {product.badge && (
                <div className="mt-6 inline-flex rounded-full bg-gradient-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold">
                  {product.badge}
                </div>
              )}
              <h1 className="mt-4 font-display text-2xl font-bold">{product.name}</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{product.category}</p>

              <div className="mt-6 rounded-2xl border border-border bg-white/4 p-5 text-left">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Price</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-display text-3xl font-bold text-gold-gradient sm:text-4xl">{formatMoney(product.price, product.currency)}</span>
                  {product.originalPrice ? (
                    <span className="text-base text-muted-foreground/70 line-through">{formatMoney(product.originalPrice, product.currency)}</span>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  {inStock ? (
                    <>
                      <span className="live-dot" />
                      <span className="font-semibold text-success">{product.stock} in stock — Available now</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="font-semibold text-destructive">Out of stock</span>
                    </>
                  )}
                </div>
              </div>

              {inStock ? (
                <Link
                  to="/checkout/$productId"
                  params={{ productId: product.id }}
                  className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold"
                >
                  Buy now <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: info */}
        <div className="stagger space-y-5">
          <section className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <FileText className="h-4 w-4 text-accent" /> Full description
            </div>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-foreground/85">{description}</p>
          </section>

          <section className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" /> What's included
            </div>
            {featureList.length ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {featureList.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 rounded-2xl border border-border bg-white/4 p-3.5 text-sm text-foreground/85 transition-colors hover:border-success/40">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15">
                      <Check className="h-3 w-3 text-success" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-white/4 p-4 text-sm text-muted-foreground">Feature list will be updated soon.</div>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="glass rounded-3xl p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <Clock className="h-4 w-4 text-accent" /> Delivery method
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground/80">{delivery}</p>
            </section>
            <section className="glass rounded-3xl p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-gold" /> Terms / warranty
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground/80">{terms}</p>
            </section>
          </div>

          <section className="rounded-3xl border border-success/25 bg-success/8 p-5 text-sm">
            <div className="flex items-start gap-2.5">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <div className="font-bold text-success">Secure manual approval</div>
                <p className="mt-1 text-success/85">After payment confirmation, your account/instruction will unlock on the order status and track order pages.</p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/products"
              className="btn-ghost inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to products
            </Link>
            {inStock ? (
              <Link
                to="/checkout/$productId"
                params={{ productId: product.id }}
                className="btn-primary inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold"
              >
                Buy now <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border bg-white/3 px-6 py-3.5 text-sm font-semibold text-muted-foreground/60"
              >
                Out of stock
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
