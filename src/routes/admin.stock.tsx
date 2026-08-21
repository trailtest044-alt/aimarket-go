import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { createStock, deleteStock, getAdminProducts, getStock } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";
import type { DeliveryMode, Product, StockItem } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/stock")({
  validateSearch: (search: Record<string, unknown>) => ({ productId: typeof search.productId === "string" ? search.productId : "" }),
  component: StockPage
});

const deliveryOptions: Array<{ value: DeliveryMode; label: string; hint: string }> = [
  { value: "credentials", label: "Email + password", hint: "email | password" },
  { value: "activation_code", label: "Activation code", hint: "activation_code" },
  { value: "login_code", label: "Login with Get Code", hint: "one delivery email per line" },
  { value: "manual", label: "Manual delivery", hint: "instruction only" },
];

function StockPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const adminReady = useAdminAuthReady();
  const { data: stock = [] } = useQuery({ queryKey: ["stock"], queryFn: getStock, enabled: adminReady, staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: "always" });
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: getAdminProducts, enabled: adminReady, staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: "always" });
  const [open, setOpen] = useState(Boolean(search.productId));
  const productName = (id: string) => products.find((p) => p.id === id || p.backendId === id)?.name ?? id;

  return (
    <AdminShell title="Delivery Stock">
      <div className="mb-4 flex justify-end">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> Add Delivery Stock
        </button>
      </div>

      {stock.length === 0 ? (
        <div className="glass rounded-3xl py-16 text-center text-sm text-muted-foreground">No stock yet.</div>
      ) : (
        <div className="glass overflow-x-auto rounded-3xl">
          <table className="admin-stock-table w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Delivery item</th>
                <th className="px-4 py-3">Instructions / Media</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{productName(s.productId)}</td>
                  <td className="px-4 py-3"><span className="inline-flex whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">{deliveryLabel(s.deliveryMode)}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <div>{s.deliveryMode === "activation_code" ? s.activationCode || "Saved code" : s.email}</div>
                    {s.deliveryMode === "credentials" && <div className="text-muted-foreground">{s.password}</div>}
                    {s.deliveryMode === "login_code" && <div className="text-muted-foreground">Get Code access: {s.getCodeAccessDays || 25} days from stock-added time</div>}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">
                    <div className="truncate">{s.instructions}</div>
                    {s.videoUrl && <div>Video added</div>}
                    {s.imageUrl && <div>Image added</div>}
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-bold uppercase ${s.status === "available" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{s.status}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground"><span className="whitespace-nowrap">{s.addedBy && `Added by ${s.addedBy}`}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={async () => { await deleteStock(s.id); qc.setQueryData<StockItem[]>(["stock"], (current = []) => current.filter((item) => item.id !== s.id)); await qc.invalidateQueries({ queryKey: ["stock"] }); await qc.invalidateQueries({ queryKey: ["admin-products"] }); await qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Removed"); }} className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10" title="Delete stock item">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <AddModal
          products={products}
          initialProductId={search.productId}
          onClose={() => setOpen(false)}
          onSave={async (items) => {
            const saved = await Promise.all(items.map((item) => createStock({ ...item, status: "available" })));
            qc.setQueryData<StockItem[]>(["stock"], (current = []) => [...saved, ...current]);
            await qc.invalidateQueries({ queryKey: ["stock"] });
            await qc.invalidateQueries({ queryKey: ["admin-products"] });
            await qc.invalidateQueries({ queryKey: ["products"] });
            toast.success(`${items.length} stock item${items.length === 1 ? "" : "s"} added`);
            setOpen(false);
          }}
        />
      )}
    </AdminShell>
  );
}

function AddModal({ products, initialProductId, onClose, onSave }: { products: Product[]; initialProductId?: string; onClose: () => void; onSave: (items: Array<Omit<StockItem, "id" | "createdAt" | "status">>) => void }) {
  const [productId, setProductId] = useState(initialProductId || products[0]?.id || "");
  useEffect(() => {
    if (initialProductId && products.some((product) => product.id === initialProductId || product.backendId === initialProductId)) setProductId(initialProductId);
    else if (!productId && products[0]?.id) setProductId(products[0].id);
  }, [initialProductId, productId, products]);
  const selectedProduct = products.find((p) => p.id === productId || p.backendId === productId);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(selectedProduct?.deliveryMode || "credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [instructions, setInstructions] = useState("");
  const [getCodeAccessDays, setGetCodeAccessDays] = useState(25);
  const [bulkText, setBulkText] = useState("");

  const hint = useMemo(() => deliveryOptions.find((option) => option.value === deliveryMode)?.hint || "", [deliveryMode]);

  function baseItem(): Omit<StockItem, "id" | "createdAt" | "status"> {
    return { productId, deliveryMode, email, password, activationCode, instructions: deliveryMode === "manual" ? instructions : "", videoUrl: "", imageUrl: "", getCodeAccessDays: deliveryMode === "login_code" ? Math.min(3650, Math.max(1, Math.floor(getCodeAccessDays || 25))) : 25, addedBy: "" };
  }

  function parseBulk() {
    const rows = bulkText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return rows.map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      if (deliveryMode === "login_code") {
        return { ...baseItem(), email: parts[0] || "", password: "" };
      }
      if (deliveryMode === "activation_code") {
        return { ...baseItem(), activationCode: parts[0] || "" };
      }
      if (deliveryMode === "credentials") {
        return { ...baseItem(), email: parts[0] || "", password: parts[1] || "" };
      }
      return { ...baseItem(), instructions: line };
    });
  }

  function submit() {
    if (!productId) return toast.error("Product required");
    const items = bulkText.trim() ? parseBulk() : [baseItem()];
    const invalid = items.find((item) => {
      if (item.deliveryMode === "credentials") return !item.email || !item.password;
      if (item.deliveryMode === "activation_code") return !item.activationCode;
      if (item.deliveryMode === "login_code") return !item.email;
      return !item.instructions;
    });
    if (invalid) return toast.error(`Missing required fields for ${deliveryLabel(deliveryMode)}`);
    onSave(items);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="glass-strong w-full max-w-3xl rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Delivery Stock</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 grid max-h-[72vh] gap-3 overflow-y-auto sm:grid-cols-2">
          <Select label="Product" value={productId} onChange={(v) => { setProductId(v); const product = products.find((p) => p.id === v || p.backendId === v); if (product?.deliveryMode) setDeliveryMode(product.deliveryMode); }} options={products.map((p) => ({ value: p.id, label: p.name }))} />
          <Select label="Delivery system" value={deliveryMode} onChange={(v) => setDeliveryMode(v as DeliveryMode)} options={deliveryOptions} />

          {deliveryMode === "credentials" && (
            <>
              <Field label="Login email" value={email} onChange={setEmail} />
              <Field label="Password" value={password} onChange={setPassword} />
            </>
          )}

          {deliveryMode === "activation_code" && (
            <Field className="sm:col-span-2" label="Activation code" value={activationCode} onChange={setActivationCode} />
          )}

          {deliveryMode === "login_code" && (
            <>
              <Field label="Delivery email" value={email} onChange={setEmail} />
              <label className="block">
                <span className="text-xs font-bold text-foreground">Customer Get Code access (days)</span>
                <input type="number" min={1} max={3650} value={getCodeAccessDays} onChange={(event) => setGetCodeAccessDays(Math.min(3650, Math.max(1, Math.floor(Number(event.target.value) || 25))))} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm ring-1 ring-border" required />
                <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">Count starts immediately when this stock is added. After the period ends, the customer Get Code button and API access stop.</span>
              </label>
              <div className="rounded-2xl border border-success/25 bg-success/8 p-4 text-xs leading-5 text-success">
                This sends the exact email address to the customer and shows their <b>Get code</b> button. That email must already exist in <b>Mail TXT</b>; no password is needed here.
              </div>
            </>
          )}

          {deliveryMode === "manual" && (
            <label className="block sm:col-span-2">
              <span className="text-xs text-muted-foreground">Manual delivery note</span>
              <textarea value={instructions} rows={3} onChange={(e) => setInstructions(e.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm ring-1 ring-border" />
            </label>
          )}
          {deliveryMode !== "manual" && <div className="sm:col-span-2 rounded-xl border border-success/20 bg-success/5 px-3 py-2 text-xs text-success">Product instruction, video and image are applied automatically. Set them once from Products → Edit.</div>}

          <label className="block sm:col-span-2">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><Upload className="h-3.5 w-3.5" /> Bulk TXT / paste ({hint})</span>
            <textarea value={bulkText} rows={5} onChange={(e) => setBulkText(e.target.value)} placeholder={hint} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 font-mono text-xs ring-1 ring-border" />
            <input type="file" accept=".txt,text/plain" className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 1024 * 1024) return toast.error("TXT file must be smaller than 1 MB");
              const reader = new FileReader();
              reader.onload = () => setBulkText(String(reader.result || ""));
              reader.onerror = () => toast.error("Could not read TXT file");
              reader.readAsText(file);
            }} />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button>
          <button onClick={submit} className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">Add</button>
        </div>
      </div>
    </div>
  );
}

function deliveryLabel(mode: DeliveryMode = "credentials") {
  return deliveryOptions.find((option) => option.value === mode)?.label || "Email + password";
}

function Field({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return <label className={`block ${className}`}><span className="text-xs text-muted-foreground">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm ring-1 ring-border" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm ring-1 ring-border">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
