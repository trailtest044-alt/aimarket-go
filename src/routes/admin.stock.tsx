import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { createStock, deleteStock, getProducts, getStock } from "@/lib/api";
import type { DeliveryMode, Product, StockItem } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/stock")({ component: StockPage });

const deliveryOptions: Array<{ value: DeliveryMode; label: string; hint: string }> = [
  { value: "credentials", label: "Email + password", hint: "email | password | instruction" },
  { value: "activation_code", label: "Activation code", hint: "activation_code | instruction" },
  { value: "login_code", label: "Login with email code", hint: "email | password | refresh_token | client_id" },
  { value: "manual", label: "Manual delivery", hint: "instruction only" },
];

function StockPage() {
  const qc = useQueryClient();
  const { data: stock = [] } = useQuery({ queryKey: ["stock"], queryFn: getStock });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [open, setOpen] = useState(false);
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
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th>Type</th>
                <th>Delivery item</th>
                <th>Instructions / Media</th>
                <th>Status</th>
                <th>By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{productName(s.productId)}</td>
                  <td><span className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground">{deliveryLabel(s.deliveryMode)}</span></td>
                  <td className="font-mono text-xs">
                    <div>{s.deliveryMode === "activation_code" ? s.activationCode || "Saved code" : s.email}</div>
                    {s.deliveryMode === "credentials" && <div className="text-muted-foreground">{s.password}</div>}
                    {s.deliveryMode === "login_code" && <div className="text-muted-foreground">Inbox token saved</div>}
                  </td>
                  <td className="max-w-xs text-xs text-muted-foreground">
                    <div className="truncate">{s.instructions}</div>
                    {s.videoUrl && <div>Video added</div>}
                    {s.imageUrl && <div>Image added</div>}
                  </td>
                  <td><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${s.status === "available" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{s.status}</span></td>
                  <td className="text-xs text-muted-foreground">{s.addedBy && `Added by ${s.addedBy}`}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={async () => { await deleteStock(s.id); await qc.invalidateQueries({ queryKey: ["stock"] }); toast.success("Removed"); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
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
          onClose={() => setOpen(false)}
          onSave={async (items) => {
            await Promise.all(items.map((item) => createStock({ ...item, status: "available" })));
            await qc.invalidateQueries({ queryKey: ["stock"] });
            toast.success(`${items.length} stock item${items.length === 1 ? "" : "s"} added`);
            setOpen(false);
          }}
        />
      )}
    </AdminShell>
  );
}

function AddModal({ products, onClose, onSave }: { products: Product[]; onClose: () => void; onSave: (items: Array<Omit<StockItem, "id" | "createdAt" | "status">>) => void }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const selectedProduct = products.find((p) => p.id === productId || p.backendId === productId);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(selectedProduct?.deliveryMode || "credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [loginClientId, setLoginClientId] = useState("");
  const [loginRefreshToken, setLoginRefreshToken] = useState("");
  const [instructions, setInstructions] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [bulkText, setBulkText] = useState("");

  const hint = useMemo(() => deliveryOptions.find((option) => option.value === deliveryMode)?.hint || "", [deliveryMode]);

  function baseItem(): Omit<StockItem, "id" | "createdAt" | "status"> {
    return { productId, deliveryMode, email, password, activationCode, loginClientId, loginRefreshToken, instructions, videoUrl, imageUrl, addedBy: "" };
  }

  function parseBulk() {
    const rows = bulkText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return rows.map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      if (deliveryMode === "login_code") {
        return { ...baseItem(), email: parts[0] || "", password: parts[1] || "", loginRefreshToken: parts[2] || "", loginClientId: parts[3] || "", instructions: parts[4] || instructions };
      }
      if (deliveryMode === "activation_code") {
        return { ...baseItem(), activationCode: parts[0] || "", instructions: parts[1] || instructions };
      }
      if (deliveryMode === "credentials") {
        return { ...baseItem(), email: parts[0] || "", password: parts[1] || "", instructions: parts[2] || instructions };
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
      if (item.deliveryMode === "login_code") return !item.email || !item.loginRefreshToken || !item.loginClientId;
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
              <Field label="Password (optional)" value={password} onChange={setPassword} />
              <Field label="Microsoft client id" value={loginClientId} onChange={setLoginClientId} />
              <Field label="Refresh token" value={loginRefreshToken} onChange={setLoginRefreshToken} />
            </>
          )}

          <label className="block sm:col-span-2">
            <span className="text-xs text-muted-foreground">Instructions</span>
            <textarea value={instructions} rows={3} onChange={(e) => setInstructions(e.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm ring-1 ring-border" />
          </label>
          <Field label="Video URL" value={videoUrl} onChange={setVideoUrl} />
          <Field label="Image URL" value={imageUrl} onChange={setImageUrl} />

          <label className="block sm:col-span-2">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><Upload className="h-3.5 w-3.5" /> Bulk TXT paste ({hint})</span>
            <textarea value={bulkText} rows={5} onChange={(e) => setBulkText(e.target.value)} placeholder={hint} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 font-mono text-xs ring-1 ring-border" />
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
