import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { submitManualActivation } from "@/lib/api";
import type { ManualInputMode } from "@/lib/mock-data";
import { ProductLogo } from "@/components/product-logo";
import {
  manualActivationAccountName,
  manualActivationGuideImage,
} from "@/lib/manual-activation";

type ManualActivationCardProps = {
  orderId: string;
  productName?: string;
  productLogoUrl?: string;
  productIcon?: string;
  submitted?: boolean;
  activated?: boolean;
  inputMode?: ManualInputMode;
  compact?: boolean;
  onSubmitted?: () => void;
};

export function ManualActivationCard({
  orderId,
  productName = "your product",
  productLogoUrl,
  productIcon = "✦",
  submitted = false,
  activated = false,
  inputMode = "ideogram_credentials",
  compact = false,
  onSubmitted,
}: ManualActivationCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(submitted);
  const hasSubmitted = localSubmitted || submitted;
  const accountName = manualActivationAccountName(productName);
  const isIdeogram = inputMode === "ideogram_credentials";
  const needsPassword = inputMode !== "email_only";
  const guideImageUrl = manualActivationGuideImage(productName);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail.includes("@") || (needsPassword && !password.trim())) {
      toast.error(needsPassword ? "Please enter the required email and password." : "Please enter the required email address.");
      return;
    }
    setBusy(true);
    try {
      await submitManualActivation(orderId, cleanEmail, needsPassword ? password : "");
      setPassword("");
      setLocalSubmitted(true);
      toast.success("Login details sent. Admin will activate your subscription.");
      onSubmitted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit login details.");
    } finally {
      setBusy(false);
    }
  }

  if (activated) {
    return (
      <section className="mt-5 rounded-3xl border border-success/30 bg-success/8 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-success/15 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-success">Subscription activated</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Admin has completed the activation. Delivery details will unlock on this order shortly.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`mt-6 overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[.08] via-white to-cyan-50 shadow-sm ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <ProductLogo
            logoUrl={productLogoUrl}
            icon={productIcon}
            name={productName}
            className="h-14 w-14 shrink-0 rounded-2xl border border-border bg-white p-2 shadow-sm"
            emojiClassName="text-2xl"
          />
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Manual activation required
            </div>
            <h3 className="mt-2 text-xl font-black">Activate {productName} on your account</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {inputMode === "email_only" ? "Submit the email address where this subscription should be activated." : isIdeogram ? "Submit your Ideogram login email and Ideogram login password." : "Submit the requested email address and its password."}
              {isIdeogram && <span className="mt-1 block text-foreground/70">Do not enter your email inbox password.</span>}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-bold text-warning">
          Action needed
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Step done label="Order received" helper="Payment submitted" />
        <Step active={!hasSubmitted} done={hasSubmitted} label="Send login" helper="Customer action" />
        <Step active={hasSubmitted} label="Admin activates" helper="Then delivery unlocks" />
      </div>

      {isIdeogram && guideImageUrl && (
        <div className="mt-5">
          <figure className="overflow-hidden rounded-2xl border border-border bg-card p-3">
            <figcaption className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Where to enter your {accountName} login
            </figcaption>
            <div className="grid place-items-center rounded-xl bg-secondary/40 p-3">
              <img src={guideImageUrl} alt={`${accountName} email sign-in and forgot password guide`} className="max-h-[30rem] w-auto rounded-xl object-contain" loading="lazy" />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Use the Email and Password fields shown above. If needed, select “Forgot password?” to create or reset your {accountName} login password.
            </p>
          </figure>
        </div>
      )}

      {hasSubmitted ? (
        <div className="mt-5 rounded-2xl border border-warning/25 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 animate-glow-pulse text-warning" />
            <div>
              <h4 className="text-sm font-black text-warning">Login details submitted</h4>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Our admin team is activating the subscription now. Please do not change password or recovery settings until delivery is complete.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {isIdeogram ? "Ideogram login email" : "Email address"}
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                name="manual-activation-email"
                autoComplete="off"
                data-lpignore="true"
                className="input-x mt-1.5 w-full px-3.5 py-2.5 text-sm"
                placeholder="example@gmail.com"
              />
            </label>
            {needsPassword && <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" /> {isIdeogram ? "Ideogram login password" : "Email password"}
              </span>
              <div className="relative mt-1.5">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  name="manual-activation-password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  className="input-x w-full px-3.5 py-2.5 pr-11 text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>}
          </div>
          <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
            {inputMode === "email_only" ? "No password is requested for this product." : isIdeogram ? `Enter the password used to sign in to ${accountName}—not the password for your email inbox. We only use these encrypted details to activate this order.` : "The email and password are encrypted and used only to activate this order."}
          </div>
          <button
            disabled={busy}
            className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Submit details for activation
          </button>
        </form>
      )}
    </section>
  );
}

function Step({ label, helper, done, active }: { label: string; helper: string; done?: boolean; active?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${done ? "border-success/30 bg-success/10" : active ? "border-warning/30 bg-warning/10" : "border-border bg-white/60"}`}>
      <div className="flex items-center gap-2 text-xs font-black text-foreground">
        {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : active ? <Clock3 className="h-4 w-4 text-warning" /> : <span className="h-4 w-4 rounded-full border border-muted-foreground" />}
        {label}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
    </div>
  );
}
