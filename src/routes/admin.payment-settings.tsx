import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { getPaymentSettings, updatePaymentSettings } from "@/lib/api";
import type { PaymentSettings } from "@/lib/mock-data";
import { Save } from "lucide-react";

export const Route = createFileRoute("/admin/payment-settings")({
  head: () => ({ meta: [{ title: "Admin Payment Settings" }, { name: "robots", content: "noindex" }] }),
  component: PaymentSettingsPage,
});

function PaymentSettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["payment"], queryFn: getPaymentSettings });
  const [form, setForm] = useState<PaymentSettings | null>(null);

  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);

  if (!form) return <AdminShell title="Payment Settings"><div className="h-64 animate-pulse rounded-2xl bg-secondary/30" /></AdminShell>;

  async function save() {
    if (!form) return;
    await updatePaymentSettings(form);
    qc.invalidateQueries({ queryKey: ["payment"] });
    toast.success("Settings saved");
  }

  return (
    <AdminShell title="Payment Settings">
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="🇧🇩 Bangladesh">
          <F label="bKash" value={form.bangladesh.bkash} onChange={(v) => setForm({ ...form, bangladesh: { ...form.bangladesh, bkash: v } })} />
          <F label="Nagad" value={form.bangladesh.nagad} onChange={(v) => setForm({ ...form, bangladesh: { ...form.bangladesh, nagad: v } })} />
          <TA label="Instructions" value={form.bangladesh.instructions} onChange={(v) => setForm({ ...form, bangladesh: { ...form.bangladesh, instructions: v } })} />
        </Section>
        <Section title="🇵🇰 Pakistan">
          <F label="Easypaisa" value={form.pakistan.easypaisa} onChange={(v) => setForm({ ...form, pakistan: { ...form.pakistan, easypaisa: v } })} />
          <F label="JazzCash" value={form.pakistan.jazzcash} onChange={(v) => setForm({ ...form, pakistan: { ...form.pakistan, jazzcash: v } })} />
          <F label="Bank" value={form.pakistan.bank} onChange={(v) => setForm({ ...form, pakistan: { ...form.pakistan, bank: v } })} />
          <TA label="Instructions" value={form.pakistan.instructions} onChange={(v) => setForm({ ...form, pakistan: { ...form.pakistan, instructions: v } })} />
        </Section>
        <Section title="🟡 Binance / Crypto">
          <F label="Binance Pay ID" value={form.binance.payId} onChange={(v) => setForm({ ...form, binance: { ...form.binance, payId: v } })} />
          <F label="Wallet Address" value={form.binance.wallet} onChange={(v) => setForm({ ...form, binance: { ...form.binance, wallet: v } })} />
          <TA label="Instructions" value={form.binance.instructions} onChange={(v) => setForm({ ...form, binance: { ...form.binance, instructions: v } })} />
        </Section>
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
          <Save className="h-4 w-4" /> Save All Settings
        </button>
      </div>
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}
function F({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-input/50 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-primary" />
    </label>
  );
}
function TA({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <textarea value={value} rows={3} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-input/50 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-primary" />
    </label>
  );
}
