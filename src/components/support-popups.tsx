import { MessageCircle, Globe2 } from "lucide-react";
import { SUPPORT } from "@/lib/brand";

export const BD_WORLD_SUPPORT = SUPPORT.bdWorld.href;
export const PK_SUPPORT = SUPPORT.pakistan.href;

function SupportCard({ href, title, subtitle, side }: { href: string; title: string; subtitle: string; side: "bd" | "pk" }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`support-card ${side === "bd" ? "support-card-bd" : "support-card-pk"}`}>
      <span className="support-icon"><MessageCircle className="h-5 w-5" /></span>
      <span>
        <b>{title}</b>
        <small>{subtitle}</small>
      </span>
    </a>
  );
}

export function SupportPopups() {
  return (
    <>
      <a href={BD_WORLD_SUPPORT} target="_blank" rel="noreferrer" className="support-float support-float-left" aria-label="Bangladesh and worldwide WhatsApp support">
        <span className="support-icon"><MessageCircle className="h-4 w-4" /></span>
        <span className="hidden sm:block"><b>{SUPPORT.bdWorld.label}</b><small>{SUPPORT.bdWorld.sub}</small></span>
      </a>
      <a href={PK_SUPPORT} target="_blank" rel="noreferrer" className="support-float support-float-right" aria-label="Pakistan WhatsApp support">
        <span className="support-icon"><MessageCircle className="h-4 w-4" /></span>
        <span className="hidden sm:block"><b>{SUPPORT.pakistan.label}</b><small>{SUPPORT.pakistan.sub}</small></span>
      </a>
    </>
  );
}

export function SupportHelpSection({ title = "Need help with payment?" }: { title?: string }) {
  return (
    <div className="support-help-section">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Globe2 className="h-4 w-4 text-accent" /> {title}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SupportCard href={BD_WORLD_SUPPORT} title={SUPPORT.bdWorld.label} subtitle={SUPPORT.bdWorld.sub} side="bd" />
        <SupportCard href={PK_SUPPORT} title={SUPPORT.pakistan.label} subtitle={SUPPORT.pakistan.sub} side="pk" />
      </div>
    </div>
  );
}
