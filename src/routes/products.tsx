import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { getProducts, getCategories } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { Search, PackageOpen } from "lucide-react";

const search = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "All Products — AIMarket" },
      { name: "description", content: "Browse all premium AI products and accounts available on AIMarket." },
      { property: "og:title", content: "All Products — AIMarket" },
      { property: "og:description", content: "Browse premium AI subscriptions." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const sp = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(sp.q ?? "");
  const selected = sp.category ?? "all";

  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const filtered = useMemo(() => {
    const list = products ?? [];
    return list.filter((p) => {
      const matchCat = selected === "all" || p.category === selected;
      const matchQ = q.trim() === "" || p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [products, selected, q]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold sm:text-4xl">All products</h1>
          <p className="mt-2 text-muted-foreground">Verified premium AI tools, delivered fast.</p>
        </div>

        {/* Filters */}
        <div className="mt-8 glass rounded-2xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                navigate({ search: (prev: any) => ({ ...prev, q: e.target.value || undefined }) });
              }}
              placeholder="Search products..."
              className="w-full rounded-xl bg-input/50 py-2.5 pl-10 pr-3 text-sm outline-none ring-1 ring-border focus:ring-primary"
            />
          </div>

          <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto pb-1">
            {(categories ?? []).map((c) => {
              const active = c.id === selected;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate({ search: (prev: any) => ({ ...prev, category: c.id === "all" ? undefined : c.id }) })}
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
        <div className="mt-8">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-secondary/40" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl py-16 text-center">
              <PackageOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No products found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
