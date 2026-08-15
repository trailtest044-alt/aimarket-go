import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { getPromoCodes, createPromoCode, updatePromoCode, setPromoCodeStatus, deletePromoCode, getAdminProducts, type PromoInput } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";
import type { PromoCode } from "@/lib/mock-data";
import { BadgePercent, Pencil, Plus, Power, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/admin/promo-codes")({
  head: () => ({ meta: [{ title: "Admin Promo Codes" }, { name: "robots", content: "noindex" }] }),
  component: PromoCodesPage,
});

const emptyForm: PromoInput = {
  code: "", description: "", discountType: "percent", percentOff: 10,
  fixedBDT: 0, fixedPKR: 0, fixedUSDT: 0,
  maxUses: 0, minAmountBDT: 0, minAmountPKR: 0, minAmountUSDT: 0,
  productIds: [], startsAt: null, expiresAt: null, isActive: true, showOnHomepage: false, allowResellers: false,
};

function PromoCodesPage() {
  const qc = useQueryClient();
  const adminReady = useAdminAuthReady();
  const { data: promos = [], isLoading } = useQuery({ queryKey: ["promos"], queryFn: getPromoCodes, enabled: adminReady, staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: "always" });
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: getAdminProducts, enabled: adminReady, staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: "always" });
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoInput | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["promos"] });
  };
  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); };
  const openEdit = (p: PromoCode) => { setEditing(p); const { id, usedCount, createdByNickname, createdAt, ...rest } = p; setForm(rest); };

  async function saveForm() {
    if (!form) return;
    if (!form.code.trim()) return toast.error("Promo code name is required.");
    if (form.discountType === "percent" && (form.percentOff <= 0 || form.percentOff > 100)) return toast.error("Percent must be between 1 and 100.");
    setBusy(true);
    try {
      if (editing) { await updatePromoCode(editing.id, form); toast.success(`Updated ${form.code.toUpperCase()}`); }
      else { await createPromoCode(form); toast.success(`Created ${form.code.toUpperCase()}`); }
      setForm(null); setEditing(null); await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save promo code."); }
    finally { setBusy(false); }
  }

  async function toggle(p: PromoCode) {
    try { await setPromoCodeStatus(p.id, !p.isActive); toast.success(`${p.code} is now ${!p.isActive ? "active" : "off"}`); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  }
  async function remove(p: PromoCode) {
    if (!window.confirm(`Delete promo code ${p.code}? This cannot be undone.`)) return;
    try { await deletePromoCode(p.id); toast.success(`Deleted ${p.code}`); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  }

  return (
    <AdminShell title="Promo Codes">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Customers apply these codes at checkout for an instant discount.</p>
        <button onClick={openNew} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold">
          <Plus className="h-4 w-4" /> New promo code
        </button>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-secondary/30" />
      ) : promos.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <BadgePercent className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No promo codes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first code — e.g. WELCOME10 for 10% off.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {promos.map((p) => (
            <div key={p.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${p.isActive ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>
                <BadgePercent className="h-5 w-5" />
              </span>
              <div className="min-w-40">
                <div className="font-mono text-sm font-bold tracking-wider">{p.code}</div>
                <div className="text-xs text-muted-foreground">{p.description || "—"}</div>
              </div>
              <div className="text-sm font-semibold text-gold">
                {p.discountType === "percent" ? `${p.percentOff}% off` : `৳${p.fixedBDT} / ${p.fixedUSDT} USDT off`}
              </div>
              <div className="text-xs text-muted-foreground">
                Used {p.usedCount}{p.maxUses > 0 ? ` / ${p.maxUses}` : " · unlimited"}
                {p.expiresAt ? ` · expires ${new Date(p.expiresAt).toLocaleDateString()}` : ""}
                {p.productIds.length > 0 ? ` · ${p.productIds.length} product(s)` : " · all products"}
                {p.allowResellers === true ? " · customers + resellers" : " · customers only"}
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={() => toggle(p)} title={p.isActive ? "Turn off" : "Turn on"} className={`btn-ghost rounded-lg p-2 ${p.isActive ? "text-success" : "text-muted-foreground"}`}><Power className="h-4 w-4" /></button>
                <button onClick={() => openEdit(p)} title="Edit" className="btn-ghost rounded-lg p-2 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(p)} title="Delete" className="btn-ghost rounded-lg p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={() => setForm(null)}>
          <div className="glass-strong animate-pop w-full max-w-2xl rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="display-luxe text-lg font-bold">{editing ? `Edit ${editing.code}` : "New promo code"}</h2>
              <button onClick={() => setForm(null)} className="btn-ghost rounded-lg p-2"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <F label="Code (customers type this)" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="WELCOME10" mono />
              <F label="Internal note (optional)" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="New-customer offer" />

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">Discount type</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(["percent", "fixed"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, discountType: t })} data-active={form.discountType === t} className="wallet-cta px-3 py-2.5 text-sm font-semibold">
                      {t === "percent" ? "% Percent off" : "Fixed amount off"}
                    </button>
                  ))}
                </div>
              </label>

              {form.discountType === "percent" ? (
                <NumF label="Percent off (1–100)" value={form.percentOff} onChange={(v) => setForm({ ...form, percentOff: v })} />
              ) : (
                <>
                  <NumF label="BDT off (৳)" value={form.fixedBDT} onChange={(v) => setForm({ ...form, fixedBDT: v })} />
                  <NumF label="USDT off ($)" value={form.fixedUSDT} onChange={(v) => setForm({ ...form, fixedUSDT: v })} />
                </>
              )}
              <NumF label="Max uses (0 = unlimited)" value={form.maxUses} onChange={(v) => setForm({ ...form, maxUses: Math.round(v) })} />
              <NumF label="Min order BDT (0 = none)" value={form.minAmountBDT} onChange={(v) => setForm({ ...form, minAmountBDT: v })} />
              <NumF label="Min order USDT (0 = none)" value={form.minAmountUSDT} onChange={(v) => setForm({ ...form, minAmountUSDT: v })} />

              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Starts (optional)</span>
                <input type="datetime-local" value={form.startsAt ? form.startsAt.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="input-x mt-1.5 w-full px-3.5 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Expires (optional)</span>
                <input type="datetime-local" value={form.expiresAt ? form.expiresAt.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="input-x mt-1.5 w-full px-3.5 py-2.5 text-sm" />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">Limit to products (leave empty = works on all products)</span>
                <div className="mt-1.5 flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-white/3 p-2.5">
                  {products.length === 0 && <span className="text-xs text-muted-foreground">No products yet.</span>}
                  {products.map((pr) => {
                    const bid = pr.backendId || pr.id;
                    const on = form.productIds.includes(bid);
                    return (
                      <button key={pr.id} type="button" onClick={() => setForm({ ...form, productIds: on ? form.productIds.filter((x) => x !== bid) : [...form.productIds, bid] })} className={`chip rounded-full px-3 py-1.5 text-xs font-semibold ${on ? "!border-primary/70 !bg-primary/15 text-primary" : ""}`}>
                        {pr.icon} {pr.name}
                      </button>
                    );
                  })}
                </div>
              </label>

              <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm font-semibold">Active (customers can use it right now)</span>
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={Boolean(form.showOnHomepage)} onChange={(e) => setForm({ ...form, showOnHomepage: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm font-semibold">Show on homepage promo banner</span>
              </label>
              <label className="flex items-start gap-2 rounded-xl border border-border bg-secondary/20 p-3 sm:col-span-2">
                <input type="checkbox" checked={Boolean(form.allowResellers)} onChange={(e) => setForm({ ...form, allowResellers: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                <span>
                  <span className="block text-sm font-semibold">Allow reseller accounts to use this code</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">When off, resellers will not see this offer on the homepage and the server will reject the code even if they know it.</span>
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="btn-ghost rounded-xl px-4 py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={saveForm} disabled={busy} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60">
                {busy ? "Saving…" : editing ? "Save changes" : "Create code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function F({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`input-x mt-1.5 w-full px-3.5 py-2.5 text-sm ${mono ? "font-mono uppercase tracking-wider" : ""}`} />
    </label>
  );
}
function NumF({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="input-x mt-1.5 w-full px-3.5 py-2.5 text-sm" />
    </label>
  );
}
