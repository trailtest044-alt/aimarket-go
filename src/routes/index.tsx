import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getProducts, getCategories } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { ServerLoader } from "@/components/server-loader";
import { Reveal } from "@/components/reveal";
import { BRAND } from "@/lib/brand";
import {
  ShieldCheck,
  Zap,
  Headphones,
  ArrowRight,
  Search,
  BadgeCheck,
  MousePointerClick,
  Wallet,
  PackageCheck,
  Gem,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Premium AI Products & Accounts` },
      { name: "description", content: BRAND.description },
      { property: "og:title", content: `${BRAND.name} — Premium AI Products` },
      { property: "og:description", content: BRAND.tagline },
    ],
  }),
  component: HomePage,
});

const TICKER = [
  "Instant delivery",
  "Verified accounts",
  "bKash · Nagad · Binance",
  "Real WhatsApp support",
  "12,000+ orders delivered",
  "Original subscriptions only",
];

function HomePage() {
  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("all");

  const filtered = useMemo(() => {
    const list = products ?? [];
    return list.filter((p) => {
      const matchCat = selected === "all" || p.category === selected;
      const matchQ =
        q.trim() === "" ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.category.toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [products, selected, q]);

  const visible = filtered.slice(0, 9);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero + products — kept above the fold */}
      <section id="products" className="relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-12">
          <div className="animate-rise text-center sm:text-left">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-white/4 px-4 py-1.5 text-xs backdrop-blur">
              <span className="live-dot" />
              <span className="font-semibold text-foreground/90">Trusted by 12,000+ creators</span>
              <span className="text-muted-foreground">· delivery in under 1 hour</span>
            </div>

            <h1 className="display-luxe mx-auto mt-5 max-w-3xl text-4xl font-bold leading-[1.12] sm:mx-0 sm:text-5xl lg:text-6xl">
              Premium <em className="text-holo">AI tools</em>.
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">Real accounts, </span>
              <span className="text-gold-gradient">fair prices</span>.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:mx-0 sm:text-base">
              ChatGPT, Gemini, Midjourney and more — hand-verified before sale,
              delivered fast after payment. Pick a product and check out in minutes.
            </p>
          </div>

          {/* Search + categories */}
          <div className="glass mt-7 rounded-2xl p-4 animate-rise [animation-delay:0.12s]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search ChatGPT, Midjourney, Canva..."
                className="input-x w-full py-3 pl-11 pr-4 text-sm"
              />
            </div>
            <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto pb-1">
              {(categories ?? []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  data-active={c.id === selected}
                  className="chip whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold"
                >
                  <span className="mr-1">{c.icon}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-7">
            {isLoading ? (
              <ServerLoader title="Please wait, server loading..." message="Waking the server and preparing the product list." />
            ) : visible.length === 0 ? (
              <div className="glass animate-pop rounded-2xl py-16 text-center">
                <h3 className="text-lg font-semibold">No products found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
              </div>
            ) : (
              <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}

            <div className="mt-8 flex justify-center">
              <Link
                to="/products"
                className="btn-ghost group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
              >
                View all products
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust ticker */}
      <div className="marquee border-y border-border/60 bg-white/2 py-3.5">
        <div className="marquee-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Gem className="h-3.5 w-3.5 text-gold" /> {t}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <Reveal>
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Three steps. That's it.</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            No sign-up needed. Order, pay with your local method, and get your
            account details on the same page after approval.
          </p>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: MousePointerClick, step: "01", title: "Choose a product", desc: "Browse verified AI subscriptions and tap Buy now on the one you want." },
            { icon: Wallet, step: "02", title: "Pay your way", desc: "bKash & Nagad in Bangladesh, Easypaisa & JazzCash in Pakistan, Binance worldwide. Paste your Transaction ID." },
            { icon: PackageCheck, step: "03", title: "Get it delivered", desc: "Admin verifies your payment, then login details and instructions unlock automatically on your order page." },
          ].map((s, i) => (
            <Reveal key={s.step} delay={i * 110}>
              <div className="card-x h-full p-6">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary shadow-glow">
                    <s.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-display text-2xl font-bold text-white/10">{s.step}</span>
                </div>
                <h3 className="mt-4 text-base font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Trust grid */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, title: "Instant delivery", desc: "Most orders delivered in under 1 hour." },
            { icon: ShieldCheck, title: "Verified accounts", desc: "Every product is hand-checked before sale." },
            { icon: Headphones, title: "Real support", desc: "WhatsApp support for BD, PK & worldwide — always on." },
            { icon: BadgeCheck, title: "Premium only", desc: "Original subscriptions. No cracks, no hacks." },
          ].map((t, i) => (
            <Reveal key={t.title} delay={i * 90}>
              <div className="glass h-full rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-white/5">
                  <t.icon className="h-4 w-4 text-accent" />
                </div>
                <h3 className="mt-3 text-sm font-bold">{t.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <Reveal>
          <span className="eyebrow">Categories</span>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Shop by category</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">Find exactly what you need.</p>
        </Reveal>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(categories ?? []).slice(1).map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <Link
                to="/products"
                search={{ category: c.id }}
                className="card-x group block h-full p-5 text-left"
              >
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

      {/* CTA */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl glass-strong p-8 text-center sm:p-14">
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-2xl font-bold sm:text-4xl">
                Ready to power up your <span className="text-gradient">workflow</span>?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
                Join thousands using affordable premium AI accounts — with real
                humans on support if you ever need help.
              </p>
              <Link
                to="/products"
                className="btn-primary mt-7 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold"
              >
                Browse all products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
