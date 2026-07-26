import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { getProducts, getCategories } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { BRAND } from "@/lib/brand";
import { Search, PackageOpen } from "lucide-react";

const search = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: `All Products — ${BRAND.name}` },
      { name: "description", content: `Browse all premium AI products and accounts available on ${BRAND.name}.` },
      { property: "og:title", content: `All Products — ${BRAND.name}` },
      { property: "og:description", content: "Browse premium AI subscriptions." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/products") return <Outlet />;
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
        <div className="animate-rise">
          <span className="eyebrow">Catalog</span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">All products</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">Verified premium AI tools, delivered fast.</p>
        </div>

        {/* Filters */}
        <div className="glass mt-8 rounded-2xl p-4 animate-rise [animation-delay:0.1s]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                navigate({ search: (prev: any) => ({ ...prev, q: e.target.value || undefined }) });
              }}
              placeholder="Search products..."
              className="input-x w-full py-3 pl-11 pr-4 text-sm"
            />
          </div>

          <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto pb-1">
            {(categories ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => navigate({ search: (prev: any) => ({ ...prev, category: c.id === "all" ? undefined : c.id }) })}
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
        <div className="mt-8">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-72" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass animate-pop rounded-2xl py-16 text-center">
              <PackageOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No products found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
            </div>
          ) : (
            <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
