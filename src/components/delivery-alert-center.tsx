import { Bell, CheckCircle2, ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCustomerOrders } from "@/lib/api";
import type { Order } from "@/lib/mock-data";

const SEEN_KEY = "aimarket_pk_seen_deliveries";
const POLL_MS = 15_000;

function readSeen() {
  if (typeof window === "undefined") return new Set<string>();
  try { return new Set<string>(JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]")); }
  catch { return new Set<string>(); }
}
function writeSeen(ids: Set<string>) { window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-250))); }

function playDeliveryChime() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass(); const now = context.currentTime;
  [659.25, 783.99, 987.77].forEach((frequency, index) => {
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + index * 0.13);
    gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.13 + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.13 + 0.28);
    oscillator.connect(gain).connect(context.destination); oscillator.start(now + index * 0.13); oscillator.stop(now + index * 0.13 + 0.3);
  });
  window.setTimeout(() => void context.close(), 900);
}

function setAlertFavicon(active: boolean) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]'); if (!link) return;
  if (!link.dataset.originalHref) link.dataset.originalHref = link.href;
  if (!active) { link.href = link.dataset.originalHref; return; }
  const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
  const context = canvas.getContext("2d"); if (!context) return;
  context.fillStyle = "#16a34a"; context.beginPath(); context.arc(32, 32, 30, 0, Math.PI * 2); context.fill();
  context.font = "38px sans-serif"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText("🔔", 32, 34);
  link.href = canvas.toDataURL("image/png");
}

export function DeliveryAlertCenter() {
  const [delivered, setDelivered] = useState<Order | null>(null);
  const unlocked = useRef(false); const originalTitle = useRef("");
  useEffect(() => {
    originalTitle.current = document.title.replace(/^\ud83d\udd14\s*/, "");
    const unlock = () => { unlocked.current = true; };
    window.addEventListener("pointerdown", unlock, { once: true }); window.addEventListener("keydown", unlock, { once: true });
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const orders = await getCustomerOrders(); const seen = readSeen(); const recentCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const fresh = orders.filter((order) => order.status === "delivered" && !seen.has(order.id) && new Date(order.createdAt).getTime() >= recentCutoff).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (!cancelled && fresh) { setDelivered(fresh); document.title = `\ud83d\udd14 Delivered: ${fresh.productName}`; setAlertFavicon(true); if (unlocked.current) playDeliveryChime(); }
      } catch { /* Signed-out visitors do not need delivery polling. */ }
    };
    void check(); const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  if (!delivered) return null;
  const dismiss = () => { const seen = readSeen(); seen.add(delivered.id); writeSeen(seen); setDelivered(null); document.title = originalTitle.current || document.title.replace(/^\ud83d\udd14\s*/, ""); setAlertFavicon(false); };
  return <div className="fixed right-4 top-20 z-[100] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-emerald-300 bg-white shadow-[0_24px_80px_rgba(22,163,74,.28)] animate-rise" role="alert" aria-live="assertive"><div className="flex items-start gap-3 bg-gradient-to-r from-emerald-600 to-green-500 p-4 text-white"><span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20"><Bell className="h-5 w-5 fill-current" /><span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-ping rounded-full bg-lime-200" /></span><div className="min-w-0 flex-1"><p className="font-bold">Your order has been delivered!</p><p className="mt-0.5 truncate text-sm text-white/90">{delivered.productName}</p></div><button type="button" onClick={dismiss} className="rounded-full p-1 hover:bg-white/15" aria-label="Dismiss delivery alert"><X className="h-4 w-4" /></button></div><div className="flex items-center justify-between gap-3 p-3.5"><span className="flex items-center gap-2 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Delivery details are ready</span><a href={`/order-status/${encodeURIComponent(delivered.id)}`} onClick={dismiss} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">View delivery <ExternalLink className="h-3.5 w-3.5" /></a></div></div>;
}
