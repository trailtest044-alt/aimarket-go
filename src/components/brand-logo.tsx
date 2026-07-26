import { BRAND } from "@/lib/brand";

/**
 * The AIMarket "Prism" mark — an ascending A built from two light beams
 * (violet → azure) crowned with a gold spark. Money is gold everywhere
 * in this design system; the spark ties the logo to the price language.
 */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`brand-mark ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bm-tile" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#232447" />
          <stop offset="1" stopColor="#15162b" />
        </linearGradient>
        <linearGradient id="bm-beam-l" x1="12" y1="38" x2="24" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6d4dff" />
          <stop offset="1" stopColor="#9f7bff" />
        </linearGradient>
        <linearGradient id="bm-beam-r" x1="24" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5ad0ff" />
          <stop offset="1" stopColor="#2a9df4" />
        </linearGradient>
        <linearGradient id="bm-ring" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="0.55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#f5c56b" />
        </linearGradient>
      </defs>

      {/* Tile */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#bm-tile)" />
      <rect x="2.75" y="2.75" width="42.5" height="42.5" rx="12.4" stroke="url(#bm-ring)" strokeOpacity="0.9" strokeWidth="1.5" />

      {/* Ascending A — two beams */}
      <path d="M13.5 36 L23 12.5" stroke="url(#bm-beam-l)" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M25 12.5 L34.5 36" stroke="url(#bm-beam-r)" strokeWidth="4.6" strokeLinecap="round" />
      {/* Crossbar */}
      <path d="M18.6 28.5 H29.4" stroke="#eef0ff" strokeOpacity="0.9" strokeWidth="3.4" strokeLinecap="round" />

      {/* Gold spark at the apex */}
      <circle cx="24" cy="9.5" r="3.1" fill="#f5c56b" />
      <circle cx="24" cy="9.5" r="5.4" fill="#f5c56b" fillOpacity="0.22" />
    </svg>
  );
}

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`font-display font-bold tracking-tight ${compact ? "text-base" : "text-lg"}`}
    >
      <span className="text-gradient">{BRAND.nameAccent}</span>
      <span className="text-foreground">{BRAND.nameRest}</span>
    </span>
  );
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className={compact ? "h-8 w-8" : "h-9 w-9"} />
      <BrandWordmark compact={compact} />
    </span>
  );
}
