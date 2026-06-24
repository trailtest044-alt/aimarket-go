import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/mock-data";
import { ShoppingBag } from "lucide-react";
import { ProductLogo } from "@/components/product-logo";

export function ProductCard({ p }: { p: Product }) {
  const inStock = p.stock > 0;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl glass p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-accent/0 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <ProductLogo
          logoUrl={p.logoUrl}
          icon={p.icon}
          name={p.name}
          className="h-14 w-14 rounded-2xl bg-secondary text-3xl"
          emojiClassName="text-3xl"
        />

        {p.badge && (
          <span className="rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
            {p.badge}
          </span>
        )}
      </div>

      <h3 className="mt-4 text-base font-semibold">{p.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{p.category}</p>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.shortDescription}</p>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gradient">${p.price}</span>
            {p.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">${p.originalPrice}</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`} />
            <span className={inStock ? "text-success" : "text-destructive"}>
              {inStock ? `${p.stock} in stock` : "Out of stock"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          to="/products/$id"
          params={{ id: p.id }}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          View Details
        </Link>
        {inStock ? (
          <Link
            to="/checkout/$productId"
            params={{ productId: p.id }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            <ShoppingBag className="h-4 w-4" /> Buy Now
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-secondary/40 px-3 py-2.5 text-sm font-semibold text-muted-foreground"
          >
            Out of stock
          </button>
        )}
      </div>
    </div>
  );
}
