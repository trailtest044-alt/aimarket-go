import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, Copy, ShieldCheck, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bangladesh checkout surface.
 *
 * Brand colours are taken from bKash and Nagad's published palettes so the
 * cards read as familiar to a Bangladeshi customer. The logos themselves are
 * trademarks — drop your licensed asset files into /public and pass them via
 * `logoSrc`. Without one, the card falls back to a wordmark treatment, which
 * is safe to ship but noticeably less convincing, so supply the real files.
 */

export type BdChannel = "bkash" | "nagad";

const BRAND = {
  bkash: {
    name: "bKash",
    /* bKash magenta */
    base: "#E2136E",
    deep: "#B00E56",
    tint: "#FCE7F0",
    ussd: "*247#",
    steps: [
      "Open the bKash app, or dial *247#",
      "Choose Send Money",
      "Enter the merchant number below",
      "Enter the exact amount",
      "Confirm with your bKash PIN",
      "Copy the TrxID from the confirmation SMS",
    ],
  },
  nagad: {
    name: "Nagad",
    /* Nagad orange, with its red gradient partner */
    base: "#F6921E",
    deep: "#ED1C24",
    tint: "#FEF1E3",
    ussd: "*167#",
    steps: [
      "Open the Nagad app, or dial *167#",
      "Choose Send Money",
      "Enter the merchant number below",
      "Enter the exact amount",
      "Confirm with your Nagad PIN",
      "Copy the TrxID from the confirmation SMS",
    ],
  },
} as const;

function copy(value: string, label: string) {
  if (!value) return;
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

/* ------------------------------------------------------------------ */
/* Channel chooser                                                      */
/* ------------------------------------------------------------------ */

export function BdChannelPicker({
  value,
  onChange,
  logos,
}: {
  value: BdChannel | "";
  onChange: (channel: BdChannel) => void;
  logos?: Partial<Record<BdChannel, string>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(Object.keys(BRAND) as BdChannel[]).map((key) => {
        const brand = BRAND[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={selected}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 p-4 text-left",
              "transition-[transform,box-shadow,border-color] duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "motion-safe:hover:-translate-y-0.5",
              selected ? "shadow-lg" : "border-border bg-card/60 hover:border-current/40",
            )}
            style={
              selected
                ? {
                    borderColor: brand.base,
                    backgroundColor: brand.tint,
                    boxShadow: `0 10px 30px -12px ${brand.base}80`,
                  }
                : undefined
            }
          >
            <div className="flex items-center justify-between gap-3">
              <BrandMark channel={key} logoSrc={logos?.[key]} size="sm" />
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  selected ? "border-transparent text-white" : "border-border",
                )}
                style={selected ? { backgroundColor: brand.base } : undefined}
              >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </div>
            <p className={cn("mt-3 text-xs", selected ? "text-slate-700" : "text-muted-foreground")}>
              Send Money from your {brand.name} account
            </p>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Payment panel                                                        */
/* ------------------------------------------------------------------ */

export function BdPaymentPanel({
  channel,
  merchantNumber,
  amountLabel,
  instructions,
  logoSrc,
}: {
  channel: BdChannel;
  merchantNumber: string;
  amountLabel: string;
  instructions?: string;
  logoSrc?: string;
}) {
  const brand = BRAND[channel];

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ borderColor: `${brand.base}40` }}
    >
      {/* Brand band */}
      <div
        className="relative px-5 py-4"
        style={{ background: `linear-gradient(115deg, ${brand.base} 0%, ${brand.deep} 100%)` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 88% -20%, rgba(255,255,255,.55), transparent 55%)",
          }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <BrandMark channel={channel} logoSrc={logoSrc} size="md" onDark />
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">
              Send exactly
            </div>
            <div className="font-display text-2xl font-bold leading-tight text-white tabular-nums">
              {amountLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-card p-5">
        {/* The number is the one thing that must not be mistyped, so it gets
            the most visual weight on the card. */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: `${brand.base}33`, backgroundColor: brand.tint }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Smartphone className="h-3.5 w-3.5" />
            {brand.name} merchant number
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-xl font-bold tracking-wide text-slate-900 tabular-nums">
              {merchantNumber || "Not configured"}
            </span>
            {merchantNumber && (
              <button
                type="button"
                onClick={() => copy(merchantNumber, `${brand.name} number`)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white",
                  "transition-transform duration-150 motion-safe:active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                )}
                style={{ backgroundColor: brand.base }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            )}
          </div>
        </div>

        <Steps steps={brand.steps} accent={brand.base} ussd={brand.ussd} />

        {instructions && (
          <p className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            {instructions}
          </p>
        )}

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0" style={{ color: brand.base }} />
          <span>
            Your order unlocks once an admin confirms the payment. Keep the TrxID — it is how you
            find this order again.
          </span>
        </div>
      </div>
    </div>
  );
}

function Steps({ steps, accent, ussd }: { steps: readonly string[]; accent: string; ussd: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        How to pay
        <span className="font-mono text-[11px] normal-case tracking-normal" style={{ color: accent }}>
          {ussd}
        </span>
      </button>
      {open && (
        <ol className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm text-slate-700">
              <span
                className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white tabular-nums"
                style={{ backgroundColor: accent }}
              >
                {i + 1}
              </span>
              <span className="leading-5">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Logo slot                                                            */
/* ------------------------------------------------------------------ */

function BrandMark({
  channel,
  logoSrc,
  size = "md",
  onDark = false,
}: {
  channel: BdChannel;
  logoSrc?: string;
  size?: "sm" | "md";
  onDark?: boolean;
}) {
  const brand = BRAND[channel];
  const h = size === "sm" ? "h-6" : "h-8";

  if (logoSrc) {
    return <img src={logoSrc} alt={`${brand.name} logo`} className={cn(h, "w-auto object-contain")} />;
  }

  // Wordmark fallback. Replace by passing logoSrc.
  return (
    <span
      className={cn(
        "font-display font-bold tracking-tight",
        size === "sm" ? "text-lg" : "text-xl",
        onDark ? "text-white" : "",
      )}
      style={onDark ? undefined : { color: brand.base }}
    >
      {brand.name}
    </span>
  );
}

export function bdChannelLabel(channel: BdChannel) {
  return BRAND[channel].name;
}
