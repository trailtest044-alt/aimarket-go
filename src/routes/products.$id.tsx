import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProductById, formatMoney } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductLogo } from "@/components/product-logo";
import { Check, Clock, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/products/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Product — AIMarket` },
      { name: "description", content: `Details and pricing for product ${params.id}.` },
    ],
  }),
  component: ProductDetailsPage,
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">The product you're looking for doesn't exist.</p>
        <Link to="/products" className="mt-6 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Back to Products
        </Link>
      </div>
    </div>
  ),
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

function ProductDetailsPage() {
  const { id } = Route.useParams();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-5xl p-6">
          <div className="h-96 animate-pulse rounded-2xl bg-secondary/40" />
        </div>
      </div>
    );
  }

  if (!product) {
    throw notFound();
  }

  const inStock = product.stock > 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to products
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="glass rounded-3xl p-8 text-center">
            <ProductLogo
              logoUrl={product.logoUrl}
              icon={product.icon}
              name={product.name}
              className="mx-auto h-40 w-40 rounded-3xl bg-gradient-primary text-7xl shadow-glow"
              emojiClassName="text-7xl"
            />

            {product.badge && (
              <div className="mt-6 inline-flex rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {product.badge}
              </div>
            )}
            <h1 className="mt-4 text-2xl font-bold">{product.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{product.category}</p>
          </div>

          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold text-gradient">{formatMoney(product.price, product.currency)}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">{formatMoney(product.originalPrice, product.currency)}</span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`} />
              <span className={inStock ? "text-success" : "text-destructive"}>
                {inStock ? `${product.stock} in stock — Available now` : "Out of stock"}
              </span>
            </div>

            <p className="mt-6 text-muted-foreground">{product.description}</p>

            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">What's included</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" /> Delivery
                </div>
                <div className="mt-1 text-sm">{product.deliveryMethod}</div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent" /> Terms
                </div>
                <div className="mt-1 text-sm">{product.terms}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/products"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary/70"
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
            {!inStock && (
              <p className="mt-3 text-center text-xs text-destructive">
                This product is currently out of stock. Please check back soon.
              </p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
