import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/mock-data";
import { Bell, Eye, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { ProductLogo } from "@/components/product-logo";
import { formatMoney } from "@/lib/api";

export function ProductCard({ p }: { p: Product }) {
  const inStock = p.stock > 0;
  const price = p.isFree ? "Free" : formatMoney(p.price, p.currency);
  const original = !p.isFree && p.originalPrice ? formatMoney(p.originalPrice, p.currency) : "";
  const delivery = p.deliveryMethod?.trim();
  const warranty = p.terms?.trim();

  return (
    <div
      className="product-card-pro card-x group flex h-full min-h-[356px] min-w-0 flex-col p-4"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        e.currentTarget.style.setProperty("--mx", `${px * 100}%`);
        e.currentTarget.style.setProperty("--my", `${py * 100}%`);
        e.currentTarget.style.setProperty("--ry", `${(px - 0.5) * 6}deg`);
        e.currentTarget.style.setProperty("--rx", `${(0.5 - py) * 6}deg`);
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.setProperty("--rx", "0deg");
        e.currentTarget.style.setProperty("--ry", "0deg");
      }}
    >
      {/* Keep the identity easy to scan without taking space away from the title. */}
      <div className="product-card-header flex items-start gap-3">
        <div className="relative shrink-0">
          <ProductLogo
            logoUrl={p.logoUrl}
            icon={p.icon}
            name={p.name}
            className="product-card-logo product-logo-premium relative h-20 w-20 rounded-2xl border border-primary/20 bg-white p-2 text-4xl transition-transform duration-300 group-hover:scale-[1.04] group-hover:-rotate-2 sm:h-24 sm:w-24"
            emojiClassName="text-4xl"
          />
        </div>
        <div className="product-card-copy min-w-0 flex-1 pt-1">
          <div className="product-card-title-row min-w-0">
            <h3 className="product-card-title break-words text-lg font-bold leading-6 text-foreground">{p.name}</h3>
            <p className="product-card-category mt-1 text-[11px] font-bold uppercase tracking-[0.13em] text-primary">{p.category}</p>
          </div>
        </div>
      </div>

      {/* Price + stock */}
      <div className="product-card-price-block mt-4 flex items-end justify-between border-t border-border/65 pt-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="product-card-price font-display text-2xl font-extrabold tracking-tight text-foreground">{price}</span>
            {original && <span className="product-card-original-price text-sm text-muted-foreground/70 line-through">{original}</span>}
          </div>
          <div className="product-card-stock-line mt-1.5 flex items-center gap-2 text-xs">
            {inStock ? (
              <>
                <span className="live-dot" />
                <span className="font-semibold text-success">{p.stock <= 3 ? `Only ${p.stock} Left` : "Available"}</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                <span className="font-semibold text-destructive">Out of Stock</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Badges live below the price so the product name always gets the full
          header width, including on narrow cards and zoomed desktop layouts. */}
      <div className="product-card-status-row mt-2 flex min-h-6 flex-wrap items-center justify-end gap-1.5">
        {p.badge && (
          <span className="product-card-badge rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
            {p.badge}
          </span>
        )}
        <span className={`product-status-pill ${inStock ? (p.stock <= 3 ? "is-limited" : "is-available") : "is-out"}`}>
          {inStock ? (p.stock <= 3 ? `${p.stock} left` : "Available") : "Out"}
        </span>
      </div>

      {(delivery || warranty) && (
        <div className="product-card-meta-grid mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground">
          {delivery && (
            <div className="product-card-meta-row flex min-w-0 items-center gap-2.5">
              <span className="product-delivery-icon grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10">
                <Truck className="h-4 w-4 text-primary" />
              </span>
              <span className="min-w-0 leading-4"><strong className="block text-foreground">Delivery</strong><span className="product-card-meta-detail block">Email after approval</span></span>
            </div>
          )}
          {warranty && (
            <div className="product-card-meta-row flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </span>
              <span className="min-w-0 leading-4"><strong className="block text-foreground">Warranty</strong><span className="product-card-meta-detail block">Account protection</span></span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="product-card-actions mt-auto grid grid-cols-2 gap-2 pt-4">
        <Link
          to="/products/$id"
          params={{ id: p.id }}
          className="product-card-action btn-ghost inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground"
        >
          <Eye className="h-4 w-4" />
          <span>Details</span>
        </Link>
        {inStock ? (
          <Link
            to="/checkout/$productId"
            params={{ productId: p.id }}
            className="product-card-action btn-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Buy now</span>
          </Link>
        ) : (
          <Link
            to="/products/$id"
            params={{ id: p.id }}
            className="product-card-action inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Bell className="h-4 w-4" />
            <span>Notify me</span>
          </Link>
        )}
      </div>
    </div>
  );
}
