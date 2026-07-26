import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/mock-data";
import { ShoppingBag, Eye } from "lucide-react";
import { ProductLogo } from "@/components/product-logo";
import { formatMoney } from "@/lib/api";

export function ProductCard({ p }: { p: Product }) {
  const inStock = p.stock > 0;
  const price = formatMoney(p.price, p.currency);
  const original = p.originalPrice ? formatMoney(p.originalPrice, p.currency) : "";

  return (
    <div className="card-x group flex flex-col p-5">
      {/* Top row: logo + badge */}
      <div className="flex items-start justify-between">
        <div className="relative">
          <ProductLogo
            logoUrl={p.logoUrl}
            icon={p.icon}
            name={p.name}
            className="relative h-14 w-14 rounded-2xl border border-border bg-white/6 text-3xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3"
            emojiClassName="text-3xl"
          />
        </div>
        {p.badge && (
          <span className="rounded-full bg-gradient-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-foreground shadow-gold">
            {p.badge}
          </span>
        )}
      </div>

      {/* Name + category */}
      <h3 className="mt-4 text-base font-bold text-foreground">{p.name}</h3>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">{p.category}</p>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{p.shortDescription}</p>

      {/* Price + stock */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold text-gold-gradient sm:text-2xl">{price}</span>
            {original && <span className="text-sm text-muted-foreground/70 line-through">{original}</span>}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            {inStock ? (
              <>
                <span className="live-dot" />
                <span className="font-semibold text-success">{p.stock} in stock</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                <span className="font-semibold text-destructive">Out of stock</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          to="/products/$id"
          params={{ id: p.id }}
          className="btn-ghost inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground"
        >
          <Eye className="h-4 w-4" /> Details
        </Link>
        {inStock ? (
          <Link
            to="/checkout/$productId"
            params={{ productId: p.id }}
            className="btn-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold"
          >
            <ShoppingBag className="h-4 w-4" /> Buy now
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-border bg-white/3 px-3 py-2.5 text-sm font-semibold text-muted-foreground/60"
          >
            Out of stock
          </button>
        )}
      </div>
    </div>
  );
}
