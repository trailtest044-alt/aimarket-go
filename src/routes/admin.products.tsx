import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Save, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { ProductLogo } from "@/components/product-logo";
import { getProducts, createProduct, updateProduct, deleteProduct, reorderProducts, formatMoney } from "@/lib/api";
import type { Product } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/products")({ component: AdminProductsPage });

const empty: Product = {
  id: "",
  name: "",
  category: "AI Assistants",
  price: 0,
  currency: "USDT",
  priceBDT: 0,
  pricePKR: 0,
  priceUSDT: 0,
  worldwideCurrency: "USDT",
  icon: "✨",
  shortDescription: "",
  description: "",
  features: [],
  deliveryMethod: "Account login details will be delivered on the order status page after admin approval.",
  terms: "",
  stock: 0,
  sortOrder: 0,
};

function sortProducts(list: Product[]) {
  return [...list].sort((a, b) => (a.sortOrder || 999999) - (b.sortOrder || 999999) || a.name.localeCompare(b.name));
}

function reindex(list: Product[]) {
  return list.map((p, i) => ({ ...p, sortOrder: i + 1 }));
}

function AdminProductsPage() {
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [editing, setEditing] = useState<Product | null>(null);
  const [ordered, setOrdered] = useState<Product[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    setOrdered(reindex(sortProducts(products)));
  }, [products]);

  const dirty = useMemo(() => {
    if (ordered.length !== products.length) return false;
    const original = reindex(sortProducts(products));
    return ordered.some((p, i) => p.id !== original[i]?.id || (p.sortOrder || 0) !== i + 1);
  }, [ordered, products]);

  async function saveOrder(next = ordered) {
    try {
      setSavingOrder(true);
      const clean = reindex(next);
      setOrdered(clean);
      const saved = await reorderProducts(clean.map((p) => ({ id: p.id, backendId: p.backendId, sortOrder: p.sortOrder || 0 })));
      setOrdered(reindex(sortProducts(saved)));
      await qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product display order saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save product order");
      setOrdered(reindex(sortProducts(products)));
    } finally {
      setSavingOrder(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    void saveOrder(next);
  }

  function setPosition(productId: string, positionValue: string) {
    const wanted = Math.max(1, Math.min(ordered.length, Number(positionValue) || 1));
    const currentIndex = ordered.findIndex((p) => p.id === productId);
    if (currentIndex < 0) return;
    const next = [...ordered];
    const [item] = next.splice(currentIndex, 1);
    next.splice(wanted - 1, 0, item);
    setOrdered(reindex(next));
  }

  return (
    <AdminShell title="Products">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <b>Display Order:</b> set a product number, then press <b>Save Order</b>. Smaller number shows first on the website.
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => saveOrder(reindex(ordered))}
            disabled={savingOrder || ordered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm hover:bg-secondary disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {savingOrder ? "Saving..." : "Save Order"}
          </button>
          <button
            onClick={() => saveOrder(reindex(ordered))}
            disabled={savingOrder || ordered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm hover:bg-secondary disabled:opacity-60"
          >
            Normalize 1-{ordered.length}
          </button>
          <button
            onClick={() => setEditing({ ...empty, id: `prod-${Date.now()}`, sortOrder: ordered.length + 1 })}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-secondary/30" />
      ) : ordered.length === 0 ? (
        <div className="glass rounded-3xl py-16 text-center text-sm text-muted-foreground">No products. Add your first product manually.</div>
      ) : (
        <div className="glass rounded-3xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 w-44">Display Order</th>
                <th>Product</th>
                <th>Category</th>
                <th>Prices</th>
                <th>Stock</th>
                <th>By</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((p, index) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">#{index + 1}</span>
                      <input
                        type="number"
                        min={1}
                        max={ordered.length}
                        value={index + 1}
                        onChange={(e) => setPosition(p.id, e.target.value)}
                        onBlur={() => saveOrder(ordered)}
                        className="w-16 rounded-lg border border-border bg-input/70 px-2 py-1 text-center text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <div className="flex flex-col">
                        <button disabled={savingOrder || index === 0} onClick={() => move(index, -1)} className="rounded p-1 hover:bg-secondary disabled:opacity-30" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button disabled={savingOrder || index === ordered.length - 1} onClick={() => move(index, 1)} className="rounded p-1 hover:bg-secondary disabled:opacity-30" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductLogo logoUrl={p.logoUrl} icon={p.icon} name={p.name} className="h-10 w-10 rounded-lg bg-secondary text-xl" emojiClassName="text-xl" />
                      <div className="min-w-[220px]">
                        <div className="font-semibold">{p.name}</div>
                        <div className="line-clamp-1 text-xs text-muted-foreground">{p.shortDescription}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td className="text-xs">
                    <div>{formatMoney(p.priceBDT, "BDT")}</div>
                    <div>{formatMoney(p.pricePKR, "PKR")}</div>
                    <div>{formatMoney(p.priceUSDT, p.worldwideCurrency)}</div>
                  </td>
                  <td>{p.stock}</td>
                  <td className="text-xs text-muted-foreground">{p.addedBy && <div>Added by {p.addedBy}</div>}{p.updatedBy && <div>Updated by {p.updatedBy}</div>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => setEditing(p)} className="rounded-lg p-2 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={async () => { await deleteProduct(p.id); qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product deleted"); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dirty && <div className="border-t border-border px-4 py-3 text-xs text-amber-700">Order changed. Press Save Order if it was not saved automatically.</div>}
        </div>
      )}

      {editing && <EditModal product={editing} existing={products.some((p) => p.id === editing.id)} onClose={() => setEditing(null)} onSave={async (p) => { const existing = products.some((x) => x.id === p.id); if (existing) await updateProduct(p); else await createProduct({ ...p, sortOrder: ordered.length + 1 }); qc.invalidateQueries({ queryKey: ["products"] }); toast.success(existing ? "Product updated" : "Product created"); setEditing(null); }} />}
    </AdminShell>
  );
}

function EditModal({ product, existing, onClose, onSave }: { product: Product; existing: boolean; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState<Product>(product);
  const [featuresText, setFeaturesText] = useState(product.features.join("\n"));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur" onClick={onClose}><div className="w-full max-w-3xl rounded-3xl glass-strong p-6" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{existing ? "Edit" : "Add"} Product</h2><button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><X className="h-4 w-4" /></button></div><div className="mt-4 grid max-h-[72vh] gap-3 overflow-y-auto sm:grid-cols-2"><Input label="Name" value={p.name} onChange={(v) => setP({ ...p, name: v })} /><Input label="Category" value={p.category} onChange={(v) => setP({ ...p, category: v })} /><Input label="Display Order" type="number" value={String(p.sortOrder || "")} onChange={(v) => setP({ ...p, sortOrder: parseFloat(v) || 0 })} /><Input label="Product Logo / Image URL" value={p.logoUrl ?? ""} onChange={(v) => setP({ ...p, logoUrl: v || undefined })} /><Input label="Icon emoji fallback" value={p.icon} onChange={(v) => setP({ ...p, icon: v })} /><Input label="Badge" value={p.badge ?? ""} onChange={(v) => setP({ ...p, badge: v || undefined })} /><Input label="BDT Price" type="number" value={String(p.priceBDT)} onChange={(v) => setP({ ...p, priceBDT: parseFloat(v) || 0 })} /><Input label="PKR Price" type="number" value={String(p.pricePKR)} onChange={(v) => setP({ ...p, pricePKR: parseFloat(v) || 0 })} /><Input label="Worldwide Price" type="number" value={String(p.priceUSDT)} onChange={(v) => setP({ ...p, priceUSDT: parseFloat(v) || 0 })} /><label className="block"><span className="text-xs text-muted-foreground">Worldwide Currency</span><select value={p.worldwideCurrency} onChange={(e) => setP({ ...p, worldwideCurrency: e.target.value as never })} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm outline-none ring-1 ring-border"><option value="USDT">USDT</option><option value="USD">USD</option></select></label><Input label="Original BDT Price" type="number" value={String(p.originalPriceBDT ?? "")} onChange={(v) => setP({ ...p, originalPriceBDT: v ? parseFloat(v) : undefined })} /><Input label="Original PKR Price" type="number" value={String(p.originalPricePKR ?? "")} onChange={(v) => setP({ ...p, originalPricePKR: v ? parseFloat(v) : undefined })} /><Input label="Original Worldwide Price" type="number" value={String(p.originalPriceUSDT ?? "")} onChange={(v) => setP({ ...p, originalPriceUSDT: v ? parseFloat(v) : undefined })} /><Input label="Delivery method" value={p.deliveryMethod} onChange={(v) => setP({ ...p, deliveryMethod: v })} /><Input className="sm:col-span-2" label="Short description" value={p.shortDescription} onChange={(v) => setP({ ...p, shortDescription: v })} /><Textarea className="sm:col-span-2" label="Description" value={p.description} onChange={(v) => setP({ ...p, description: v })} /><Textarea className="sm:col-span-2" label="Features (one per line)" value={featuresText} onChange={(v) => { setFeaturesText(v); setP({ ...p, features: v.split("\n").map(s => s.trim()).filter(Boolean) }); }} /><Textarea className="sm:col-span-2" label="Terms / Warranty / Notes" value={p.terms} onChange={(v) => setP({ ...p, terms: v })} /></div><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button><button onClick={() => onSave({ ...p, price: p.priceUSDT, currency: p.worldwideCurrency })} className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">Save</button></div></div></div>;
}
function Input({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) { return <label className={`block ${className}`}><span className="text-xs text-muted-foreground">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-primary" /></label>; }
function Textarea({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) { return <label className={`block ${className}`}><span className="text-xs text-muted-foreground">{label}</span><textarea value={value} rows={3} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-primary" /></label>; }
