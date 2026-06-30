import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getProducts, getCategories } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { Sparkles, ShieldCheck, Zap, Headphones, ArrowRight, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIMarket — Premium AI Products & Accounts" },
      { name: "description", content: "Shop premium AI subscriptions including ChatGPT Plus, Gemini Advanced, Midjourney, Ideogram, Recraft and more." },
      { property: "og:title", content: "AIMarket — Premium AI Products" },
      { property: "og:description", content: "Premium AI subscriptions at unbeatable prices." },
    ],
  }),
  component: HomePage,
});

function sortForDisplay<T extends { sortOrder?: number; name?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const ao = Number(a.sortOrder);
    const bo = Number(b.sortOrder);
    const av = ao > 0 ? ao : 999999;
    const bv = bo > 0 ? bo : 999999;
    return av - bv || String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function HomePage() {
  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("all");

  const filtered = useMemo(() => {
    const list = sortForDisplay(products ?? []);
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

      {/* Products first — above the fold */}
      <section id="products" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-blob" />
          <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Trusted by 12,000+ creators</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
              Premium <span className="text-gradient">AI Products</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Verified accounts, instant delivery, real support. Pick a product and check out in minutes.
            </p>
          </div>

          {/* Filters */}
          <div className="mt-5 glass rounded-2xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-xl bg-input/50 py-2.5 pl-10 pr-3 text-sm outline-none ring-1 ring-border focus:ring-primary"
              />
            </div>
            <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto pb-1">
              {(categories ?? []).map((c) => {
                const active = c.id === selected;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition ${
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="mr-1">{c.icon}</span>{c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-6">
            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-2xl bg-secondary/40" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="glass rounded-2xl py-16 text-center">
                <h3 className="text-lg font-semibold">No products found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-xl glass px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
              >
                View all products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, title: "Instant Delivery", desc: "Most orders delivered in under 1 hour." },
            { icon: ShieldCheck, title: "Verified Accounts", desc: "Every product is hand-checked before sale." },
            { icon: Headphones, title: "Real Support", desc: "WhatsApp & Telegram support, always on." },
            { icon: Sparkles, title: "Premium Only", desc: "Original subscriptions, no cracks or hacks." },
          ].map((t) => (
            <div key={t.title} className="glass rounded-2xl p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary">
                <t.icon className="h-4 w-4 text-primary-foreground" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{t.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Shop by category</h2>
        <p className="mt-1 text-sm text-muted-foreground">Find exactly what you need.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(categories ?? []).slice(1).map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ category: c.id }}
              className="group glass rounded-2xl p-5 text-left transition-transform hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="text-3xl">{c.icon}</div>
              <div className="mt-3 text-sm font-semibold">{c.name}</div>
              <div className="mt-1 text-xs text-muted-foreground group-hover:text-primary">
                Explore →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl glass-strong p-8 sm:p-12 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10" />
          <div className="relative">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to power up your workflow?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Join thousands using our affordable premium AI accounts.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Browse all products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
