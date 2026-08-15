import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Pencil, Plus, Save, Search, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { ProductLogo } from "@/components/product-logo";
import { createProduct, deleteProduct, formatMoney, getAdminProducts, getResellers, reorderProducts, updateProduct } from "@/lib/api";
import type { AdminReseller, NewProductResellerAssignment } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";
import { PRODUCT_LOGO_PRESETS } from "@/lib/product-logo";
import type { DeliveryMode, ManualInputMode, Product } from "@/lib/mock-data";

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
  isFree: false,
  worldwideCurrency: "USDT",
  purchaseCostBDT: 0,
  purchaseCostPKR: 0,
  purchaseCostUSDT: 0,
  accountCostBDT: 0,
  accountCostPKR: 0,
  accountCostUSDT: 0,
  paymentGatewayFeeBDT: 0,
  paymentGatewayFeePKR: 0,
  paymentGatewayFeeUSDT: 0,
  otherExpenseBDT: 0,
  otherExpensePKR: 0,
  otherExpenseUSDT: 0,
  icon: "*",
  shortDescription: "",
  description: "",
  features: [],
  deliveryMode: "credentials",
  deliveryMethod: "Account login details will be delivered on the order status page after admin approval.",
  terms: "",
  stock: 0,
  isActive: true,
  sortOrder: 0,
};

const deliveryOptions: Array<{ value: DeliveryMode; label: string }> = [
  { value: "credentials", label: "Email + password" },
  { value: "activation_code", label: "Activation code" },
  { value: "login_code", label: "Login with Get Code" },
  { value: "manual", label: "Manual delivery" },
];

function AdminProductsPage() {
  const qc = useQueryClient();
  const adminReady = useAdminAuthReady();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: getAdminProducts,
    enabled: adminReady,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: "always",
  });
  const [editing, setEditing] = useState<Product | null>(null);
  const [ordered, setOrdered] = useState<Product[]>([]);
  const [filter, setFilter] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => setOrdered(reindex(sortProducts(products))), [products]);
  useEffect(() => {
    const stored = window.sessionStorage.getItem("aimarket_admin_search_query");
    if (stored) {
      setFilter(stored);
      window.sessionStorage.removeItem("aimarket_admin_search_query");
    }
  }, []);

  const dirty = useMemo(() => {
    if (ordered.length !== products.length) return false;
    const original = reindex(sortProducts(products));
    return ordered.some((p, i) => p.id !== original[i]?.id || (p.sortOrder || 0) !== i + 1);
  }, [ordered, products]);
  const visibleOrdered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((p) => [
      p.name,
      p.category,
      p.shortDescription,
      p.description,
      p.deliveryMode,
      p.features?.join(" "),
    ].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [filter, ordered]);

  async function saveOrder(next = ordered) {
    try {
      setSavingOrder(true);
      const clean = reindex(next);
      setOrdered(clean);
      const saved = await reorderProducts(clean.map((p) => ({ id: p.id, backendId: p.backendId, sortOrder: p.sortOrder || 0 })));
      setOrdered(reindex(sortProducts(saved)));
      qc.setQueryData(["admin-products"], reindex(sortProducts(saved)));
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product display order saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save product order");
      setOrdered(reindex(sortProducts(products)));
    } finally {
      setSavingOrder(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (savingOrder || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    const clean = reindex(next);
    setOrdered(clean);
    await saveOrder(clean);
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

  async function saveProduct(p: Product, resellerAssignments: NewProductResellerAssignment[] = []) {
    const existing = products.some((x) => x.id === p.id);
    const saved = existing ? await updateProduct(p) : await createProduct({ ...p, sortOrder: ordered.length + 1 }, resellerAssignments);
    setOrdered((current) => {
      const next = existing
        ? current.map((item) => (item.id === p.id ? saved : item))
        : [{ ...saved, sortOrder: ordered.length + 1 }, ...current];
      return reindex(sortProducts(next));
    });
    qc.setQueryData<Product[]>(["admin-products"], (current = []) => {
      const next = existing
        ? current.map((item) => (item.id === p.id ? saved : item))
        : [{ ...saved, sortOrder: ordered.length + 1 }, ...current];
      return reindex(sortProducts(next));
    });
    await qc.invalidateQueries({ queryKey: ["admin-products"] });
    await qc.invalidateQueries({ queryKey: ["products"] });
    toast.success(existing ? "Product updated" : "Product created");
    setEditing(null);
  }

  async function toggleWebsiteVisibility(product: Product) {
    try {
      const nextVisible = product.isActive === false;
      const saved = await updateProduct({ ...product, isActive: nextVisible });
      setOrdered((current) => current.map((item) => item.id === product.id ? saved : item));
      qc.setQueryData<Product[]>(["admin-products"], (current = []) => current.map((item) => item.id === product.id ? saved : item));
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(nextVisible ? "Product published on website" : "Product hidden from website");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update website visibility");
    }
  }

  return (
    <AdminShell title="Products">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <b>Display Order:</b> arrow buttons save instantly. For number edits, set a position and press <b>Save Order</b>. Smaller number shows first.
        </div>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          <label className="flex min-w-[240px] max-w-sm flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search products..."
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
            {filter && (
              <button type="button" onClick={() => setFilter("")} className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Clear product search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <button onClick={() => saveOrder(reindex(ordered))} disabled={savingOrder || ordered.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm hover:bg-secondary disabled:opacity-60">
            <Save className="h-4 w-4" /> {savingOrder ? "Saving..." : "Save Order"}
          </button>
          <button onClick={() => saveOrder(reindex(ordered))} disabled={savingOrder || ordered.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm hover:bg-secondary disabled:opacity-60">
            Normalize 1-{ordered.length}
          </button>
          <button onClick={() => setEditing({ ...empty, id: `prod-${Date.now()}`, sortOrder: ordered.length + 1 })} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-secondary/30" />
      ) : ordered.length === 0 ? (
        <div className="glass rounded-3xl py-16 text-center text-sm text-muted-foreground">No products. Add your first product manually.</div>
      ) : (
        <div className="glass overflow-x-auto rounded-3xl">
          <table className="admin-products-table w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-44 px-4 py-3">Display Order</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Prices</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrdered.map((p) => {
                const index = ordered.findIndex((item) => item.id === p.id);
                return (
                <tr key={p.id} className={`border-t border-border ${p.isActive === false ? "bg-secondary/20 opacity-75" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">#{index + 1}</span>
                      <input type="number" min={1} max={ordered.length} value={index + 1} onChange={(e) => setPosition(p.id, e.target.value)} className="w-16 rounded-lg border border-border bg-input/70 px-2 py-1 text-center text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/40" />
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
                  <td className="px-4 py-3 whitespace-nowrap">{p.category}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <div>{formatMoney(p.priceBDT, "BDT")}</div>
                    <div>{formatMoney(p.pricePKR, "PKR")}</div>
                    <div>{formatMoney(p.priceUSDT, p.worldwideCurrency)}</div>
                  </td>
                  <td className="px-4 py-3"><span className="inline-flex whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">{deliveryLabel(p.deliveryMode)}</span></td>
                  <td className="px-4 py-3 text-center font-semibold">{p.stock}</td>
                  <td className="px-4 py-3 text-xs leading-5 text-muted-foreground">{p.addedBy && <div className="whitespace-nowrap">Added by {p.addedBy}</div>}{p.updatedBy && <div className="whitespace-nowrap">Updated by {p.updatedBy}</div>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleWebsiteVisibility(p)}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${p.isActive === false ? "border-border bg-secondary text-muted-foreground hover:text-foreground" : "border-success/25 bg-success/10 text-success hover:bg-success/15"}`}
                        title={p.isActive === false ? "Show this product on customer and reseller storefronts" : "Hide this product without deleting its data"}
                      >
                        {p.isActive === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {p.isActive === false ? "Hidden" : "Visible"}
                      </button>
                      <button onClick={() => setEditing(p)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary" title="Edit product"><Pencil className="h-4 w-4" /> Edit</button>
                      <button onClick={async () => { await deleteProduct(p.id); setOrdered((current) => reindex(current.filter((item) => item.id !== p.id))); qc.setQueryData<Product[]>(["admin-products"], (current = []) => reindex(current.filter((item) => item.id !== p.id))); await qc.invalidateQueries({ queryKey: ["admin-products"] }); await qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product deleted"); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10" title="Delete product"><Trash2 className="h-4 w-4" /> Delete</button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {visibleOrdered.length === 0 && (
            <div className="border-t border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No products matched “{filter.trim()}”.
            </div>
          )}
          {dirty && <div className="border-t border-border px-4 py-3 text-xs font-semibold text-warning">Order changed. Press Save Order to publish the new serial.</div>}
        </div>
      )}

      {editing && <EditModal product={editing} existing={products.some((p) => p.id === editing.id)} onClose={() => setEditing(null)} onSave={saveProduct} />}
    </AdminShell>
  );
}

function EditModal({ product, existing, onClose, onSave }: { product: Product; existing: boolean; onClose: () => void; onSave: (p: Product, resellerAssignments?: NewProductResellerAssignment[]) => Promise<void> }) {
  const [p, setP] = useState<Product>({ ...product, deliveryMode: product.deliveryMode || "credentials" });
  const [featuresText, setFeaturesText] = useState(product.features.join("\n"));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [resellerSearch, setResellerSearch] = useState("");
  const [selectedResellerIds, setSelectedResellerIds] = useState<string[]>([]);
  const [samePriceForAll, setSamePriceForAll] = useState(true);
  const [sharedResellerPriceBDT, setSharedResellerPriceBDT] = useState("");
  const [sharedResellerPricePKR, setSharedResellerPricePKR] = useState("");
  const [sharedResellerPriceUSDT, setSharedResellerPriceUSDT] = useState("");
  const [individualPrices, setIndividualPrices] = useState<Record<string, { bdt: string; pkr: string; usdt: string }>>({});
  const { data: resellers = [], isLoading: resellersLoading } = useQuery({
    queryKey: ["admin-resellers-for-product"],
    queryFn: () => getResellers(),
    enabled: !existing,
    staleTime: 30_000,
  });
  const eligibleResellers = useMemo(() => resellers.filter((reseller) => reseller.status !== "suspended"), [resellers]);
  const visibleResellers = useMemo(() => {
    const query = resellerSearch.trim().toLowerCase();
    return query ? eligibleResellers.filter((reseller) => `${reseller.name} ${reseller.email}`.toLowerCase().includes(query)) : eligibleResellers;
  }, [eligibleResellers, resellerSearch]);

  function toggleReseller(reseller: AdminReseller) {
    setSelectedResellerIds((current) => current.includes(reseller.id) ? current.filter((id) => id !== reseller.id) : [...current, reseller.id]);
  }

  function resellerAssignments(): NewProductResellerAssignment[] {
    return selectedResellerIds.map((resellerId) => {
      const own = individualPrices[resellerId] || { bdt: "", pkr: "", usdt: "" };
      const bdt = samePriceForAll ? sharedResellerPriceBDT : own.bdt;
      const pkr = samePriceForAll ? sharedResellerPricePKR : own.pkr;
      const usdt = samePriceForAll ? sharedResellerPriceUSDT : own.usdt;
      return {
        resellerId,
        priceBDT: bdt === "" ? null : Math.max(0, Number(bdt) || 0),
        pricePKR: pkr === "" ? null : Math.max(0, Number(pkr) || 0),
        priceUSDT: usdt === "" ? null : Math.max(0, Number(usdt) || 0),
      };
    });
  }

  async function handleSave() {
    if (saving) return;
    if (p.name.trim().length < 2) {
      setSaveError("Product name must contain at least 2 characters.");
      return;
    }
    if (!p.category.trim()) {
      setSaveError("Product category is required.");
      return;
    }
    try {
      setSaving(true);
      setSaveError("");
      await onSave({ ...p, name: p.name.trim(), category: p.category.trim(), price: p.priceUSDT, currency: p.worldwideCurrency }, existing ? [] : resellerAssignments());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save this product.";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="glass-strong w-full max-w-3xl rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{existing ? "Edit" : "Add"} Product</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid max-h-[72vh] gap-3 overflow-y-auto sm:grid-cols-2">
          <Input label="Name" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
          <Input label="Category" value={p.category} onChange={(v) => setP({ ...p, category: v })} />
          <Input label="Display Order" type="number" value={String(p.sortOrder || "")} onChange={(v) => setP({ ...p, sortOrder: parseFloat(v) || 0 })} />
          <div className="sm:col-span-2 rounded-2xl border border-border bg-secondary/20 p-3">
            <Input label="Product Logo / Image URL" value={p.logoUrl ?? ""} onChange={(v) => setP({ ...p, logoUrl: v || undefined })} />
            <div className="mt-3 text-xs font-semibold text-muted-foreground">Quick reusable logos</div>
            <div className="mt-2 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
              {PRODUCT_LOGO_PRESETS.map((preset) => (
                <button
                  key={preset.match}
                  type="button"
                  onClick={() => setP({ ...p, logoUrl: preset.src })}
                  className={`inline-flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition ${p.logoUrl === preset.src ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/40 hover:bg-secondary"}`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white p-1 shadow-sm"><img src={preset.src} alt="" className="h-full w-full object-contain" /></span>
                  <span className="truncate">{preset.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">All presets are stored locally for fast loading. One preset can be reused across every plan of the same product.</p>
              {p.logoUrl && <button type="button" onClick={() => setP({ ...p, logoUrl: undefined })} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary">Clear</button>}
            </div>
          </div>
          <Input label="Icon fallback" value={p.icon} onChange={(v) => setP({ ...p, icon: v })} />
          <Input label="Badge" value={p.badge ?? ""} onChange={(v) => setP({ ...p, badge: v || undefined })} />
          <Input label="BDT Price" type="number" value={String(p.priceBDT)} onChange={(v) => setP({ ...p, priceBDT: parseFloat(v) || 0 })} />
          <Input label="PKR Price" type="number" value={String(p.pricePKR)} onChange={(v) => setP({ ...p, pricePKR: parseFloat(v) || 0 })} />
          <Input label="USDT Price" type="number" value={String(p.priceUSDT)} onChange={(v) => setP({ ...p, priceUSDT: parseFloat(v) || 0 })} />
          <label className="sm:col-span-2 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-4 text-emerald-950">
            <span>
              <span className="block text-sm font-bold">Free product — no payment required</span>
              <span className="mt-1 block text-xs leading-5">Buyer submits once and available stock is delivered automatically. Manual-delivery and backorder items still wait for fulfilment.</span>
            </span>
            <input type="checkbox" checked={p.isFree === true} onChange={(event) => setP(event.target.checked ? { ...p, isFree: true, priceBDT: 0, pricePKR: 0, priceUSDT: 0, originalPriceBDT: 0, originalPricePKR: 0, originalPriceUSDT: 0 } : { ...p, isFree: false })} className="h-5 w-5 shrink-0 accent-emerald-600" />
          </label>
          <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm font-semibold text-muted-foreground">Worldwide currency: USDT</div>
          <Input label="Original BDT Price" type="number" value={String(p.originalPriceBDT ?? "")} onChange={(v) => setP({ ...p, originalPriceBDT: v ? parseFloat(v) : undefined })} />
          <Input label="Original PKR Price" type="number" value={String(p.originalPricePKR ?? "")} onChange={(v) => setP({ ...p, originalPricePKR: v ? parseFloat(v) : undefined })} />
          <Input label="Original USDT Price" type="number" value={String(p.originalPriceUSDT ?? "")} onChange={(v) => setP({ ...p, originalPriceUSDT: v ? parseFloat(v) : undefined })} />
          <label className="sm:col-span-2 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-card/70 p-4">
            <span>
              <span className="block text-sm font-bold">Show on website</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">Turn this off to keep the product, stock and history in admin while hiding it from customer and reseller storefronts.</span>
            </span>
            <input type="checkbox" checked={p.isActive !== false} onChange={(event) => setP({ ...p, isActive: event.target.checked })} className="h-5 w-5 shrink-0 accent-primary" />
          </label>
          {!existing && (
            <div className="sm:col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-primary" /> Reseller visibility & price</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Select the resellers who can see this new product. Unselected resellers will not receive access.</p>
                </div>
                <div className="rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-bold text-primary">{selectedResellerIds.length} selected</div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input value={resellerSearch} onChange={(event) => setResellerSearch(event.target.value)} placeholder="Search reseller name or Gmail..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
                <button type="button" onClick={() => setSelectedResellerIds(eligibleResellers.map((reseller) => reseller.id))} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-secondary">Select all</button>
                <button type="button" onClick={() => setSelectedResellerIds([])} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-secondary">Clear</button>
              </div>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                {resellersLoading ? <div className="rounded-xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">Loading resellers...</div> : visibleResellers.length === 0 ? <div className="rounded-xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">No eligible reseller found.</div> : visibleResellers.map((reseller) => {
                  const selected = selectedResellerIds.includes(reseller.id);
                  const own = individualPrices[reseller.id] || { bdt: "", pkr: "", usdt: "" };
                  return (
                    <div key={reseller.id} className={`rounded-xl border p-3 transition ${selected ? "border-primary/40 bg-card shadow-sm" : "border-border bg-card/60"}`}>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => toggleReseller(reseller)} className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`} aria-label={`${selected ? "Remove" : "Select"} ${reseller.email}`}>{selected && <Check className="h-3.5 w-3.5" />}</button>
                        <button type="button" onClick={() => toggleReseller(reseller)} className="min-w-0 flex-1 text-left"><div className="truncate text-sm font-bold">{reseller.name || reseller.email.split("@")[0]}</div><div className="truncate text-xs text-muted-foreground">{reseller.email}</div></button>
                        <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">{reseller.status}</span>
                      </div>
                      {selected && !samePriceForAll && <div className="mt-3 grid gap-2 sm:grid-cols-3"><Input label="Reseller BDT price" type="number" value={own.bdt} onChange={(value) => setIndividualPrices((current) => ({ ...current, [reseller.id]: { ...own, bdt: value } }))} /><Input label="Reseller PKR price" type="number" value={own.pkr} onChange={(value) => setIndividualPrices((current) => ({ ...current, [reseller.id]: { ...own, pkr: value } }))} /><Input label="Reseller USDT price" type="number" value={own.usdt} onChange={(value) => setIndividualPrices((current) => ({ ...current, [reseller.id]: { ...own, usdt: value } }))} /></div>}
                    </div>
                  );
                })}
              </div>
              {selectedResellerIds.length > 0 && <div className="mt-3 rounded-xl border border-border bg-card p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={samePriceForAll} onChange={(event) => setSamePriceForAll(event.target.checked)} className="h-4 w-4 accent-primary" /> Same price for all selected resellers</label>
                {samePriceForAll && <div className="mt-3 grid gap-3 sm:grid-cols-3"><Input label="Shared reseller BDT price" type="number" value={sharedResellerPriceBDT} onChange={setSharedResellerPriceBDT} /><Input label="Shared reseller PKR price" type="number" value={sharedResellerPricePKR} onChange={setSharedResellerPricePKR} /><Input label="Shared reseller USDT price" type="number" value={sharedResellerPriceUSDT} onChange={setSharedResellerPriceUSDT} /></div>}
                <p className="mt-2 text-xs text-muted-foreground">Leave a price blank to use the product's normal price for that currency.</p>
              </div>}
            </div>
          )}
          <div className="sm:col-span-2 rounded-2xl border border-border bg-card/70 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Profit inputs (optional)</div>
            <p className="mt-1 text-xs text-muted-foreground">Used only for real dashboard net profit. Leave blank if unknown.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Input label="Purchase cost BDT" type="number" value={String(p.purchaseCostBDT ?? "")} onChange={(v) => setP({ ...p, purchaseCostBDT: parseFloat(v) || 0 })} />
              <Input label="Purchase cost PKR" type="number" value={String(p.purchaseCostPKR ?? "")} onChange={(v) => setP({ ...p, purchaseCostPKR: parseFloat(v) || 0 })} />
              <Input label="Purchase cost USDT" type="number" value={String(p.purchaseCostUSDT ?? "")} onChange={(v) => setP({ ...p, purchaseCostUSDT: parseFloat(v) || 0 })} />
              <Input label="Account cost BDT" type="number" value={String(p.accountCostBDT ?? "")} onChange={(v) => setP({ ...p, accountCostBDT: parseFloat(v) || 0 })} />
              <Input label="Account cost PKR" type="number" value={String(p.accountCostPKR ?? "")} onChange={(v) => setP({ ...p, accountCostPKR: parseFloat(v) || 0 })} />
              <Input label="Account cost USDT" type="number" value={String(p.accountCostUSDT ?? "")} onChange={(v) => setP({ ...p, accountCostUSDT: parseFloat(v) || 0 })} />
              <Input label="Gateway fee BDT" type="number" value={String(p.paymentGatewayFeeBDT ?? "")} onChange={(v) => setP({ ...p, paymentGatewayFeeBDT: parseFloat(v) || 0 })} />
              <Input label="Gateway fee PKR" type="number" value={String(p.paymentGatewayFeePKR ?? "")} onChange={(v) => setP({ ...p, paymentGatewayFeePKR: parseFloat(v) || 0 })} />
              <Input label="Gateway fee USDT" type="number" value={String(p.paymentGatewayFeeUSDT ?? "")} onChange={(v) => setP({ ...p, paymentGatewayFeeUSDT: parseFloat(v) || 0 })} />
              <Input label="Other expense BDT" type="number" value={String(p.otherExpenseBDT ?? "")} onChange={(v) => setP({ ...p, otherExpenseBDT: parseFloat(v) || 0 })} />
              <Input label="Other expense PKR" type="number" value={String(p.otherExpensePKR ?? "")} onChange={(v) => setP({ ...p, otherExpensePKR: parseFloat(v) || 0 })} />
              <Input label="Other expense USDT" type="number" value={String(p.otherExpenseUSDT ?? "")} onChange={(v) => setP({ ...p, otherExpenseUSDT: parseFloat(v) || 0 })} />
            </div>
          </div>
          <Select label="Delivery system" value={p.deliveryMode || "credentials"} onChange={(v) => setP({ ...p, deliveryMode: v as DeliveryMode })} options={deliveryOptions} />
          <Input label="Delivery text shown to buyer" value={p.deliveryMethod} onChange={(v) => setP({ ...p, deliveryMethod: v })} />
          <div className="sm:col-span-2 rounded-2xl border border-amber-300/60 bg-amber-50/70 p-3">
            <Input label="Backorder display stock (0 = off)" type="number" value={String(p.backorderStock || "")} onChange={(v) => setP({ ...p, backorderStock: Math.max(0, Math.floor(Number(v) || 0)) })} />
            <p className="mt-2 text-xs leading-5 text-amber-900">Use this only for paid orders you are ready to fulfil later. When real stock is zero, these extra slots keep the product buyable but every order stays pending. Admin must add delivery details before approval or delivery is unlocked.</p>
          </div>
          <Textarea className="sm:col-span-2" label="Standard delivery instruction (saved once for this product)" value={p.deliveryInstruction || ""} onChange={(v) => setP({ ...p, deliveryInstruction: v })} />
          <Input label="Delivery/setup video URL (optional)" value={p.deliveryVideoUrl || ""} onChange={(v) => setP({ ...p, deliveryVideoUrl: v })} />
          <Input label="Instruction image URL (optional)" value={p.deliveryImageUrl || ""} onChange={(v) => setP({ ...p, deliveryImageUrl: v })} />
          {p.deliveryMode === "manual" && (
            <>
              <Select
                className="sm:col-span-2"
                label="Ask customer for"
                value={p.manualInputMode || "ideogram_credentials"}
                onChange={(value) => setP({ ...p, manualInputMode: value as ManualInputMode })}
                options={[
                  { value: "ideogram_credentials", label: "Ideogram login email + Ideogram password" },
                  { value: "email_password", label: "Email + email password" },
                  { value: "email_only", label: "Email only" },
                ]}
              />
              <Input
                className="sm:col-span-2"
                label="Password get/set instruction video URL"
                value={p.passwordInstructionVideoUrl || ""}
                onChange={(v) => setP({ ...p, passwordInstructionVideoUrl: v })}
              />
              <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                Save this once per manual-delivery product. It appears only at the top of the Final activation step before the order is created; it is not shown on delivery, order-status, email, or stock-add screens.
              </div>
            </>
          )}
          <Input className="sm:col-span-2" label="Short description" value={p.shortDescription} onChange={(v) => setP({ ...p, shortDescription: v })} />
          <Textarea className="sm:col-span-2" label="Description" value={p.description} onChange={(v) => setP({ ...p, description: v })} />
          <Textarea className="sm:col-span-2" label="Features (one per line)" value={featuresText} onChange={(v) => { setFeaturesText(v); setP({ ...p, features: v.split("\n").map((s) => s.trim()).filter(Boolean) }); }} />
          <Textarea className="sm:col-span-2" label="Terms / Warranty / Notes" value={p.terms} onChange={(v) => setP({ ...p, terms: v })} />
        </div>
        {saveError && <div role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{saveError}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-60">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="min-w-24 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:cursor-wait disabled:opacity-70">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function sortProducts(list: Product[]) {
  return [...list].sort((a, b) => (a.sortOrder || 999999) - (b.sortOrder || 999999) || a.name.localeCompare(b.name));
}

function reindex(list: Product[]) {
  return list.map((p, i) => ({ ...p, sortOrder: i + 1 }));
}

function deliveryLabel(mode: DeliveryMode = "credentials") {
  return deliveryOptions.find((option) => option.value === mode)?.label || "Email + password";
}

function Input({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return <label className={`block ${className}`}><span className="text-xs text-muted-foreground">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-primary" /></label>;
}

function Textarea({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return <label className={`block ${className}`}><span className="text-xs text-muted-foreground">{label}</span><textarea value={value} rows={3} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-primary" /></label>;
}

function Select({ label, value, onChange, options, className = "" }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-primary">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
