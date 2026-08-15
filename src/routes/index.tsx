import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCategories, getCurrentCustomer, getHomepagePromos, getProducts, type HomepagePromo } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { ProductLogo } from "@/components/product-logo";
import { Reveal } from "@/components/reveal";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { BRAND, SUPPORT } from "@/lib/brand";
import type { Product } from "@/lib/mock-data";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Headphones,
  MousePointerClick,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Premium AI Products & Accounts` },
      { name: "description", content: BRAND.description },
      { property: "og:title", content: `${BRAND.name} — Premium AI Products` },
      { property: "og:description", content: BRAND.tagline },
    ],
    links: [{ rel: "canonical", href: "https://plandaw.com/" }],
  }),
  component: HomePage,
});

function AnimatedAiDeck({ products }: { products: Product[] }) {
  const mainProduct = products[0];
  const [orbitPhase, setOrbitPhase] = useState(0);
  const orbitProducts = useMemo(() => {
    const hashKey = (value: string) => {
      let hash = 0;
      for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
      }
      return hash;
    };

    return [...products.slice(1)]
      .sort((a, b) => hashKey(a.id || a.name) - hashKey(b.id || b.name))
      .slice(0, 10);
  }, [products]);
  const orbitTotal = Math.max(orbitProducts.length, 1);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let frame = 0;
    let start = 0;
    const animate = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;
      setOrbitPhase((elapsed / 1000) * 20);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const getOrbitSlot = (index: number) => {
    const crowded = orbitTotal >= 9;
    const angle = -92 + index * (360 / orbitTotal) + orbitPhase;
    const radians = (angle * Math.PI) / 180;
    const frontDepth = (Math.sin(radians) + 1) / 2;
    const radiusX = crowded ? 238 : 208;
    const radiusY = crowded ? 112 : 102;
    const depth = 0.76 + frontDepth * 0.34;
    const sizePattern = crowded ? [46, 42, 44, 40, 43] : [58, 52, 55, 50, 53];

    return {
      angle,
      x: Math.cos(radians) * radiusX,
      y: Math.sin(radians) * radiusY,
      size: sizePattern[index % sizePattern.length],
      depth,
      opacity: 0.58 + frontDepth * 0.4,
      bobX: Math.cos(radians + Math.PI / 2) * 7,
      bobY: Math.sin(radians + Math.PI / 2) * 4,
      z: Math.round(5 + frontDepth * 10),
    };
  };

  return (
    <div className="ai-orbit-showcase" aria-label="Animated AI product logos">
      <div className="ai-orbit-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      {mainProduct ? (
        <Link to="/products/$id" params={{ id: mainProduct.id }} className="ai-orbit-center group" aria-label={`View ${mainProduct.name}`}>
          <ProductLogo
            logoUrl={mainProduct.logoUrl}
            icon={mainProduct.icon}
            name={mainProduct.name}
            className="h-28 w-28 rounded-[2rem] bg-white/70 text-6xl shadow-2xl transition-transform duration-500 group-hover:scale-105"
            emojiClassName="text-6xl"
          />
        </Link>
      ) : (
        <div className="ai-orbit-center">
          <Sparkles className="h-16 w-16 text-primary" />
        </div>
      )}

      {orbitProducts.map((product, index) => {
        const slot = getOrbitSlot(index);
        return (
          <Link
            key={product.id}
            to="/products/$id"
            params={{ id: product.id }}
            className="ai-orbit-item"
            style={{
              "--orbit-angle": `${slot.angle}deg`,
              "--orbit-delay": `-${index * 0.42}s`,
              "--orbit-size": `${slot.size}px`,
              "--orbit-x": `${slot.x.toFixed(1)}px`,
              "--orbit-y": `${slot.y.toFixed(1)}px`,
              "--orbit-depth-scale": `${slot.depth.toFixed(3)}`,
              "--orbit-opacity": `${slot.opacity.toFixed(3)}`,
              "--orbit-bob-x": `${slot.bobX.toFixed(1)}px`,
              "--orbit-bob-y": `${slot.bobY.toFixed(1)}px`,
              "--orbit-z": `${slot.z}`,
              zIndex: slot.z,
            } as CSSProperties}
            aria-label={`View ${product.name}`}
          >
            <ProductLogo
              logoUrl={product.logoUrl}
              icon={product.icon}
              name={product.name}
              className="h-full w-full rounded-2xl bg-white/80 text-3xl"
              emojiClassName="text-3xl"
            />
          </Link>
        );
      })}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="product-grid-responsive stagger" aria-label="Loading products">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="product-skeleton-card" style={{ "--delay": `${index * 70}ms` } as CSSProperties}>
          <div className="product-skeleton-top">
            <span className="skeleton-logo" />
            <span className="skeleton-pill" />
          </div>
          <span className="skeleton-line skeleton-line-title" />
          <span className="skeleton-line skeleton-line-short" />
          <span className="skeleton-price" />
          <div className="product-skeleton-actions">
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}

function PromoBanner({ promos, products }: { promos: HomepagePromo[]; products: Product[] }) {
  if (!promos.length) return null;

  return (
    <div className="border-b border-amber-300/45 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50">
      <div className="page-shell-wide mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-2.5 text-center text-xs font-semibold text-amber-950 sm:text-sm">
        {promos.map((promo) => {
          const applicableNames = promo.productIds?.length
            ? products
                .filter((product) => promo.productIds.includes(product.backendId || product.id))
                .map((product) => product.name)
                .join(", ") || "selected products"
            : "all products";
          const saving = promo.discountType === "percent" ? `${promo.percentOff || 0}% OFF` : `৳${promo.fixedBDT || 0} OFF`;
          return (
            <Link key={promo.code} to="/products" className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-white/85 px-3 py-1.5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Use <strong className="rounded bg-amber-100 px-1.5 py-0.5 tracking-wide">{promo.code}</strong> for {saving} on {applicableNames}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [promoAudienceKey, setPromoAudienceKey] = useState("guest");
  const [promoAudienceReady, setPromoAudienceReady] = useState(false);
  useEffect(() => {
    const syncPromoAudience = () => {
      setPromoAudienceKey(getCurrentCustomer()?.email || "guest");
      setPromoAudienceReady(true);
    };
    syncPromoAudience();
    window.addEventListener("customer-auth-changed", syncPromoAudience);
    return () => window.removeEventListener("customer-auth-changed", syncPromoAudience);
  }, []);
  const { data: products, isLoading, isError: productsFailed, isFetching: productsRefreshing, refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(750 * 2 ** attempt, 4_000),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: homepagePromos } = useQuery({
    queryKey: ["homepage-promos", promoAudienceKey],
    queryFn: getHomepagePromos,
    enabled: promoAudienceReady,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const categoryFilters = useMemo(() => {
    const realCategories = (categories ?? []).filter((category) => category.id !== "all").slice(0, 7);
    return [{ id: "all", name: "All", icon: "✦" }, ...realCategories];
  }, [categories]);

  const visible = useMemo(() => {
    return [...(products ?? [])]
      .filter((product) => selectedCategory === "all" || product.category === selectedCategory)
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || (a.sortOrder || 999999) - (b.sortOrder || 999999) || a.name.localeCompare(b.name));
  }, [products, selectedCategory]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <PromoBanner promos={homepagePromos ?? []} products={products ?? []} />

      <section className="relative overflow-hidden">
        <div className="page-shell-wide relative mx-auto pb-8 pt-9 sm:pt-12">
          <div className="hero-copy relative z-10 max-w-3xl text-center sm:text-left">
            <div className="brand-hero-lockup">
              <p className="brand-hero-kicker">ACTIVATE YOUR SUBSCRIPTION PLAN</p>
            </div>

            <h1 className="hero-clean-title mx-auto mt-4 max-w-3xl sm:mx-0">
              Authentic AI Subscriptions
              <br className="hidden sm:block" />
              {" "}
              <span>at Prices You&apos;ll Love.</span>
            </h1>
            <p className="hero-clean-copy mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:mx-0 sm:text-base">
              Verified personal plans for AI, design and productivity tools—delivered quickly after payment with real human support whenever you need it.
            </p>

            <div className="hero-actions mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/products" className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
                <Sparkles className="h-4 w-4" /> Explore AI Tools
              </Link>
              <Link to="/track-orders" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
                Track Order <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="absolute right-8 top-12 hidden w-[500px] max-w-[40vw] animate-rise lg:block xl:right-16 [animation-delay:0.16s]">
            <AnimatedAiDeck products={products ?? []} />
          </div>

          <div className="mx-auto mt-8 hidden w-full max-w-[500px] animate-rise md:block lg:hidden [animation-delay:0.16s]">
            <AnimatedAiDeck products={products ?? []} />
          </div>

          <div id="products" className="product-showcase mt-10 rounded-[1.65rem] border border-primary/15 bg-gradient-to-br from-white via-secondary/25 to-primary/5 p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Popular AI Subscriptions</h2>
                <p className="mt-1 text-sm text-muted-foreground">Verified plans for creators, professionals and teams.</p>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {categoryFilters.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    data-active={selectedCategory === category.id}
                    className="chip whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold"
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <ProductGridSkeleton />
            ) : productsFailed && visible.length === 0 ? (
              <div className="glass animate-pop rounded-2xl py-14 text-center">
                <h3 className="text-lg font-semibold">Products could not load</h3>
                <p className="mt-1 text-sm text-muted-foreground">Your connection may have changed. Retry without leaving this page.</p>
                <button type="button" onClick={() => refetchProducts()} disabled={productsRefreshing} className="btn-primary mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
                  {productsRefreshing ? "Loading products..." : "Try again"}
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="glass animate-pop rounded-2xl py-16 text-center">
                <h3 className="text-lg font-semibold">No products found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
              </div>
            ) : (
              <div className="product-grid-responsive stagger">
                {visible.map((p, index) => (
                  <Reveal key={p.id} className="h-full" delay={Math.min(index, 7) * 35}>
                    <ProductCard p={p} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>

          <Reveal className="mt-5 flex flex-wrap justify-center gap-3" delay={120}>
            {[
              { icon: BadgeCheck, label: "Verified Products" },
              { icon: Zap, label: "Fast Processing" },
              { icon: Headphones, label: "Real Human Support" },
            ].map((benefit) => (
              <span key={benefit.label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-xs font-bold text-foreground shadow-sm">
                <benefit.icon className="h-4 w-4 text-primary" />
                {benefit.label}
              </span>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="page-shell-wide mx-auto mt-16">
        <Reveal>
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Three clear steps.</h2>
        </Reveal>

        <div className="relative mt-7 grid gap-4 rounded-[1.5rem] border border-primary/10 bg-secondary/25 p-4 sm:grid-cols-3 sm:p-5">
          <div className="pointer-events-none absolute left-[17%] right-[17%] top-1/2 hidden border-t border-dashed border-primary/30 sm:block" aria-hidden="true" />
          {[
            { icon: MousePointerClick, step: "01", title: "Choose a Product", desc: "Browse verified AI subscriptions and select the plan you need." },
            { icon: Wallet, step: "02", title: "Complete Payment", desc: "Use the available payment method for your region." },
            { icon: PackageCheck, step: "03", title: "Receive Access", desc: "After verification, delivery details and instructions appear securely on your order page." },
          ].map((s, i) => (
            <Reveal key={s.step} delay={i * 110}>
              <div className="relative card-x h-full bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-display text-xl font-bold text-primary">{s.step}</span>
                </div>
                <h3 className="mt-4 text-base font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="page-shell-wide mx-auto mt-16">
        <Reveal>
          <span className="eyebrow">Why choose Plandaw?</span>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Support that stays human.</h2>
        </Reveal>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Verified Before Delivery", desc: "Products are checked before delivery." },
            { icon: ClipboardList, title: "Clear Delivery Instructions", desc: "Access steps stay simple on your order page." },
            { icon: PackageCheck, title: "Secure Order Tracking", desc: "Track approval and delivery without messaging first." },
            { icon: Headphones, title: "Real Human Support", desc: "Get help from a real person when needed." },
            { icon: Wallet, title: "Multiple Payment Options", desc: "Regional payment options are shown when available." },
            { icon: BadgeCheck, title: "Replacement Support Where Applicable", desc: "Replacement rules are shown from the product details." },
          ].map((t, i) => (
            <Reveal key={t.title} delay={i * 70}>
              <div className="glass h-full rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/10 bg-primary/8">
                  <t.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="mt-3 text-sm font-bold">{t.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {(categories ?? []).filter((c) => c.id !== "all").length > 0 && (
        <section className="page-shell-wide mx-auto mt-16">
          <Reveal>
            <span className="eyebrow">Categories</span>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Shop by category</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">Find exactly what you need.</p>
          </Reveal>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(categories ?? []).filter((c) => c.id !== "all").map((c, i) => (
              <Reveal key={c.id} delay={i * 60}>
                <Link to="/products" search={{ category: c.id }} className="card-x group block h-full p-5 text-left">
                  <div className="text-3xl transition-transform duration-300 group-hover:scale-110">{c.icon}</div>
                  <div className="mt-3 text-sm font-bold">{c.name}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-accent">
                    Explore <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="page-shell-wide mx-auto mt-16">
        <Reveal>
          <span className="eyebrow">FAQ</span>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Quick answers before you buy.</h2>
        </Reveal>
        <div className="mt-7 grid gap-3 lg:grid-cols-2">
          {[
            ["How does delivery work?", "After payment verification, delivery details appear securely on your order page."],
            ["Are subscriptions personal or shared?", "Product type and access rules are shown in the product details when available."],
            ["What happens after payment?", "Submit your payment reference, then wait for admin approval and delivery."],
            ["Where can I track my order?", "Use Track Orders from the menu with your order information."],
            ["Is replacement available?", "Replacement support depends on the product and is shown when real terms exist."],
            ["Which payment methods are supported?", "Available payment methods are shown during checkout based on your region."],
          ].map(([question, answer]) => (
            <details key={question} className="group rounded-2xl border border-border bg-card p-4 shadow-sm">
              <summary className="cursor-pointer list-none text-sm font-bold text-foreground">{question}</summary>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="page-shell-wide mx-auto mt-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-r from-primary/10 via-secondary/35 to-blue-100/50 p-7 text-center shadow-sm sm:p-10">
            <div className="relative flex flex-col items-center justify-between gap-6 lg:flex-row lg:text-left">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Ready to Upgrade Your Workflow?</h2>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Choose a verified AI subscription and get started with fast processing and real human support.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/products" className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
                  Browse AI Tools <ArrowRight className="h-4 w-4" />
                </Link>
                <a href={SUPPORT.bdWorld.href} target="_blank" rel="noreferrer" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
                  Talk to Support <Headphones className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
