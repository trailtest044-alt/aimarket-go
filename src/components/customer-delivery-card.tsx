import { useState } from "react";
import { CheckCircle2, Copy, Eye, EyeOff, FileText, Image as ImageIcon, KeyRound, Loader2, MailCheck, PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchLatestLoginCode, type DeliveryPayload, type LoginCodeResult } from "@/lib/api";

export function CustomerDeliveryCard({ orderId, delivery, fetchLoginCode = fetchLatestLoginCode }: { orderId: string; delivery?: DeliveryPayload | null; fetchLoginCode?: (orderId: string) => Promise<LoginCodeResult> }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginCode, setLoginCode] = useState<LoginCodeResult | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const mode = delivery?.deliveryMode || inferDeliveryMode(delivery);
  const instruction = delivery?.instruction || delivery?.instructions || "";
  const password = delivery?.password || "";

  async function getCode() {
    if (!orderId || codeBusy) return;
    setCodeBusy(true);
    try {
      const result = await fetchLoginCode(orderId);
      setLoginCode(result);
      toast.success("Latest login code loaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the latest email code.");
    } finally {
      setCodeBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-success/30 bg-success/6 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-success">
        <ShieldCheck className="h-4 w-4" /> Secure delivery
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Keep this information private. Do not share your order link.</p>

      {delivery ? (
        <div className="mt-5 space-y-4">
          {(mode === "credentials" || mode === "login_code") && <Info label="Login Email" value={delivery.email || ""} />}

          {mode === "credentials" && (
            <SecretBox
              label="Password"
              value={password}
              hidden={!showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
          )}

          {mode === "activation_code" && (
            <div className="rounded-2xl border border-success/30 bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <KeyRound className="h-4 w-4 text-success" /> Activation code
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="break-all font-mono text-xl font-bold text-foreground">{delivery.activationCode || "Not provided"}</span>
                {delivery.activationCode && <CopyButton value={delivery.activationCode} />}
              </div>
            </div>
          )}

          {mode === "login_code" && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <MailCheck className="h-4 w-4 text-success" /> Login code from email
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Click after sending the code to the delivered email inbox.</p>
                </div>
                <button type="button" onClick={getCode} disabled={codeBusy} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60">
                  {codeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : loginCode ? <RefreshCw className="h-4 w-4" /> : <MailCheck className="h-4 w-4" />}
                  {loginCode ? "Refresh code" : "Get code"}
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-border bg-background px-4 py-4">
                {loginCode ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-3xl font-bold tracking-widest text-foreground">{loginCode.code}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {loginCode.subject || "Latest email"}{loginCode.receivedAt ? ` - ${new Date(loginCode.receivedAt).toLocaleString()}` : ""}
                      </div>
                    </div>
                    <CopyButton value={loginCode.code} />
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Your latest login code will appear here.</div>
                )}
              </div>
            </div>
          )}

          {instruction && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4 text-success" /> Instructions
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{instruction}</p>
            </div>
          )}

          {delivery.videoUrl && <MediaVideo url={delivery.videoUrl} />}
          {delivery.imageUrl && <MediaImage url={delivery.imageUrl} />}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Delivery is approved. Refresh this page in a moment if details do not appear.
        </div>
      )}
    </div>
  );
}

function inferDeliveryMode(delivery?: DeliveryPayload | null): NonNullable<DeliveryPayload["deliveryMode"]> {
  if (delivery?.activationCode) return "activation_code";
  if (delivery?.canFetchLoginCode) return "login_code";
  if (delivery?.email || delivery?.password) return "credentials";
  return "manual";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="break-all font-mono text-lg font-bold text-foreground">{value || "Not provided"}</span>
        {value && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function SecretBox({ label, value, hidden, onToggle }: { label: string; value: string; hidden: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="break-all font-mono text-lg font-bold text-foreground">{hidden ? "*".repeat(Math.max(8, value.length || 8)) : value || "Not provided"}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onToggle} className="btn-ghost rounded-lg px-2.5 py-1.5 text-xs">
            {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          {value && <CopyButton value={value} />}
        </div>
      </div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}
      className="btn-ghost inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
    >
      <Copy className="h-3 w-3" /> Copy
    </button>
  );
}

function MediaVideo({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)?.[1];
  const src = yt ? `https://www.youtube.com/embed/${yt}` : url;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <PlayCircle className="h-4 w-4 text-success" /> Video guide
      </div>
      {yt ? <iframe src={src} className="aspect-video w-full rounded-xl" allowFullScreen title="Delivery video" /> : <video src={src} controls className="max-h-[520px] w-full rounded-xl" />}
    </div>
  );
}

function MediaImage({ url }: { url: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <ImageIcon className="h-4 w-4 text-success" /> Image guide
      </div>
      <img src={url} alt="Delivery guide" className="max-h-[520px] w-full rounded-xl object-contain" />
    </div>
  );
}
