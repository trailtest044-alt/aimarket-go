import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src="/plandaw-brand-mark.png"
      alt=""
      className={`brand-mark object-contain ${className}`}
      aria-hidden="true"
    />
  );
}

export function BrandWordmark({ compact = false, animate = false }: { compact?: boolean; animate?: boolean }) {
  const [shouldReveal, setShouldReveal] = useState(false);

  useEffect(() => {
    if (!animate) return;
    const revealTimer = window.setTimeout(() => setShouldReveal(true), 90);
    return () => window.clearTimeout(revealTimer);
  }, [animate]);

  return (
    <span
      className={`brand-wordmark inline-flex items-center font-display font-bold leading-none tracking-tight ${shouldReveal ? "brand-wordmark--reveal" : ""} ${compact ? "text-base" : "text-lg"}`}
    >
      <span className="text-gradient">{BRAND.nameAccent}</span>
      <span className="text-foreground">{BRAND.nameRest}</span>
    </span>
  );
}

export function BrandLogo({ compact = false, animate = false }: { compact?: boolean; animate?: boolean }) {
  return (
    <span className="brand-logo inline-flex items-center gap-1.5 leading-none">
      <BrandMark className={compact ? "h-8 w-8" : "h-9 w-9"} />
      <BrandWordmark compact={compact} animate={animate} />
    </span>
  );
}

