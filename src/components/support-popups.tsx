import { MessageCircle, Globe2 } from "lucide-react";
import { SUPPORT } from "@/lib/brand";

export const BD_WORLD_SUPPORT = SUPPORT.bdWorld.href;

function SupportCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="support-card support-card-bd">
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
      <a href={BD_WORLD_SUPPORT} target="_blank" rel="noreferrer" className="support-float support-float-left" aria-label="Plandaw WhatsApp support">
        <span className="support-icon"><MessageCircle className="h-4 w-4" /></span>
        <span className="hidden sm:block"><b>{SUPPORT.bdWorld.label}</b><small>{SUPPORT.bdWorld.sub}</small></span>
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
      <div className="mt-3 grid gap-3">
        <SupportCard href={BD_WORLD_SUPPORT} title={SUPPORT.bdWorld.label} subtitle={SUPPORT.bdWorld.sub} />
      </div>
    </div>
  );
}
