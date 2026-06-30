import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { ProductLogo } from "@/components/product-logo";
import { ServerLoader } from "@/components/server-loader";
import { createProduct, deleteProduct, formatMoney, getProducts, reorderProducts, updateProduct } from "@/lib/api";
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

function sortedProducts(products: Product[]) {
  return [...products].sort((a, b) => {
    const ao = Number(a.sortOrder || 0);
    const bo = Number(b.sortOrder || 0);
    if (ao > 0 && bo > 0 && ao !== bo) return ao - bo;
    if (ao > 0 && bo <= 0) return -1;
    if (ao <= 0 && bo > 0) return 1;
    return a.name.localeCompare(b.name);
  });
}

function normalizeOrder(products: Product[]) {
  return sortedProducts(products).map((product, index) => ({ ...product, sortOrder: index + 1 }));
}

function AdminProductsPage() {
  const qc = useQueryClient();
  const { data: products = [], isLoading, refetch } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    setLocalProducts(normalizeOrder(products));
  }, [products]);

  const orderedProducts = useMemo(() => normalizeOrder(localProducts), [localProducts]);

  const persistOrder = async (nextProducts: Product[], successMessage = "Display order saved") => {
    const normalized = normalizeOrder(nextProducts);
    const previous = localProducts;
    setLocalProducts(normalized);
    setSavingOrder(true);
    try {
      const saved = await reorderProducts(normalized.map((product, index) => ({ id: product.backendId || product.id, sortOrder: index + 1 })));
      const finalProducts = normalizeOrder(saved.length ? saved : normalized);
      setLocalProducts(finalProducts);
      qc.setQueryData(["products"], finalProducts);
      await qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(successMessage);
    } catch (err) {
      setLocalProducts(previous);
      toast.error(err instanceof Error ? err.message : "Could not save display order");
    } finally {
      setSavingOrder(false);
    }
  };

  const moveProduct = async (index: number, direction: "up" | "down") => {
    const current = normalizeOrder(localProducts);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    await persistOrder(next, "Product order updated");
  };

  const saveProduct = async (product: Product) => {
    const existing = products.some((x) => x.id === product.id || x.backendId === product.backendId);
    const nextOrder = Number(product.sortOrder || 0) || (existing ? orderedProducts.findIndex((x) => x.id === product.id) + 1 : orderedProducts.length + 1);
    const payload = { ...product, sortOrder: nextOrder, price: product.priceUSDT, currency: product.worldwideCurrency };
    if (existing) await updateProduct(payload);
    else await createProduct(payload);
    await qc.invalidateQueries({ queryKey: ["products"] });
    toast.success(existing ? "Product updated" : "Product created");
    setEditing(null);
  };

  return (
    <AdminShell title="Products">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-2xl bg-white/55 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
          Use <b>Display Order</b> or the arrows to decide which product appears first. Smaller number shows first.
        </div>
        <div className="flex gap-2">
          <button
            disabled={savingOrder || orderedProducts.length === 0}
            onClick={() => persistOrder(orderedProducts, "Display order normalized")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${savingOrder ? "animate-spin" : ""}`} /> Normalize order
          </button>
          <button
            onClick={() => setEditing({ ...empty, id: `prod-${Date.now()}`, sortOrder: orderedProducts.length + 1 })}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {isLoading ? (
        <ServerLoader compact title="Please wait, server loading..." message="Our little AI assistant is loading products and display order." />
      ) : orderedProducts.length === 0 ? (
        <div className="glass rounded-3xl py-16 text-center text-sm text-muted-foreground">No products. Add your first product manually.</div>
      ) : (
        <div className="glass overflow-x-auto rounded-3xl">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Product</th>
                <th>Category</th>
                <th>Prices</th>
                <th>Stock</th>
                <th>By</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orderedProducts.map((p, index) => (
                <tr key={p.backendId || p.id} className="border-t border-border transition-colors hover:bg-white/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">#{index + 1}</span>
                      <div className="flex flex-col">
                        <button disabled={index === 0 || savingOrder} onClick={() => moveProduct(index, "up")} className="rounded-md p-1 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button disabled={index === orderedProducts.length - 1 || savingOrder} onClick={() => moveProduct(index, "down")} className="rounded-md p-1 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductLogo logoUrl={p.logoUrl} icon={p.icon} name={p.name} className="h-9 w-9 rounded-lg bg-secondary text-xl" emojiClassName="text-xl" />
                      <div>
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
                  <td className="text-xs text-muted-foreground">
                    {p.addedBy && <div>Added by {p.addedBy}</div>}
                    {p.updatedBy && <div>Updated by {p.updatedBy}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => setEditing(p)} className="rounded-lg p-2 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                      <button
                        onClick={async () => {
                          await deleteProduct(p.id);
                          await qc.invalidateQueries({ queryKey: ["products"] });
                          await refetch();
                          toast.success("Product deleted");
                        }}
                        className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {savingOrder && <div className="border-t border-border px-4 py-3 text-xs font-semibold text-primary">Saving display order...</div>}
        </div>
      )}

      {editing && <EditModal product={editing} existing={products.some((p) => p.id === editing.id || p.backendId === editing.backendId)} onClose={() => setEditing(null)} onSave={saveProduct} />}
    </AdminShell>
  );
}

function EditModal({ product, existing, onClose, onSave }: { product: Product; existing: boolean; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState<Product>(product);
  const [featuresText, setFeaturesText] = useState((product.features || []).join("\n"));
  const patch = <K extends keyof Product>(key: K, value: Product[K]) => setP((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="glass max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl p-6 shadow-glow">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{existing ? "Edit Product" : "Add Product"}</h2>
            <p className="text-xs text-muted-foreground">Product details, regional prices, and display order.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Product Name" value={p.name} onChange={(v) => patch("name", v)} />
          <Input label="Category" value={p.category} onChange={(v) => patch("category", v)} />
          <Input label="Product Logo / Image URL" value={p.logoUrl || ""} onChange={(v) => patch("logoUrl", v)} />
          <Input label="Icon emoji fallback" value={p.icon} onChange={(v) => patch("icon", v)} />
          <Input label="Badge" value={p.badge || ""} onChange={(v) => patch("badge", v)} />
          <Input label="Display Order" type="number" value={String(p.sortOrder ?? 0)} onChange={(v) => patch("sortOrder", Number(v) || 0)} />
          <Input label="Bangladesh Price (BDT)" type="number" value={String(p.priceBDT || 0)} onChange={(v) => patch("priceBDT", Number(v) || 0)} />
          <Input label="Original BDT Price" type="number" value={String(p.originalPriceBDT || 0)} onChange={(v) => patch("originalPriceBDT", Number(v) || 0)} />
          <Input label="Pakistan Price (PKR)" type="number" value={String(p.pricePKR || 0)} onChange={(v) => patch("pricePKR", Number(v) || 0)} />
          <Input label="Original PKR Price" type="number" value={String(p.originalPricePKR || 0)} onChange={(v) => patch("originalPricePKR", Number(v) || 0)} />
          <Input label="Worldwide Price" type="number" value={String(p.priceUSDT || 0)} onChange={(v) => patch("priceUSDT", Number(v) || 0)} />
          <label className="block text-sm">
            <span className="text-muted-foreground">Worldwide Currency</span>
            <select value={p.worldwideCurrency} onChange={(e) => patch("worldwideCurrency", e.target.value as "USDT" | "USD")} className="mt-1 w-full rounded-xl bg-input/70 px-3 py-2.5 outline-none ring-1 ring-border focus:ring-primary">
              <option value="USDT">USDT</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <Input label="Original Worldwide Price" type="number" value={String(p.originalPriceUSDT || 0)} onChange={(v) => patch("originalPriceUSDT", Number(v) || 0)} />
          <Input label="Stock display override" type="number" value={String(p.stock || 0)} onChange={(v) => patch("stock", Number(v) || 0)} />
          <Input className="md:col-span-2" label="Delivery method" value={p.deliveryMethod} onChange={(v) => patch("deliveryMethod", v)} />
          <Textarea className="md:col-span-2" label="Short description" value={p.shortDescription} onChange={(v) => patch("shortDescription", v)} />
          <Textarea className="md:col-span-2" label="Full Description" value={p.description} onChange={(v) => patch("description", v)} rows={4} />
          <Textarea className="md:col-span-2" label="Features (one per line)" value={featuresText} onChange={setFeaturesText} rows={4} />
          <Textarea className="md:col-span-2" label="Terms / Warranty / Notes" value={p.terms} onChange={(v) => patch("terms", v)} rows={4} />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-border bg-white/60 px-5 py-2.5 text-sm font-semibold">Cancel</button>
          <button
            onClick={() => onSave({ ...p, features: featuresText.split("\n").map((x) => x.trim()).filter(Boolean) })}
            className="rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-input/70 px-3 py-2.5 outline-none ring-1 ring-border focus:ring-primary" />
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 3, className = "" }: { label: string; value: string; onChange: (v: string) => void; rows?: number; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-input/70 px-3 py-2.5 outline-none ring-1 ring-border focus:ring-primary" />
    </label>
  );
}
