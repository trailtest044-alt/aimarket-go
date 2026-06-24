import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { getStock, getProducts, createStock, deleteStock } from "@/lib/api";

export const Route = createFileRoute("/admin/stock")({
  head: () => ({ meta: [{ title: "Account Stock" }, { name: "robots", content: "noindex" }] }),
  component: StockPage,
});

function StockPage() {
  const qc = useQueryClient();
  const { data: stock = [] } = useQuery({ queryKey: ["stock"], queryFn: getStock });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [open, setOpen] = useState(false);

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  return (
    <AdminShell title="Account Stock">
      <div className="mb-4 flex justify-end">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> Add Stock
        </button>
      </div>

      {stock.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center text-sm text-muted-foreground">No stock yet.</div>
      ) : (
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Product</th><th>Email</th><th>Password</th><th>Instructions</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{productName(s.productId)}</td>
                  <td className="font-mono text-xs">{s.email}</td>
                  <td className="font-mono text-xs">{s.password}</td>
                  <td className="max-w-xs truncate text-xs text-muted-foreground">{s.instructions}</td>
                  <td>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${s.status === "available" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => { await deleteStock(s.id); qc.invalidateQueries({ queryKey: ["stock"] }); toast.success("Removed"); }}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                    >
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
          products={products.map((p) => ({ id: p.id, name: p.name }))}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            await createStock({ ...data, status: "available" });
            qc.invalidateQueries({ queryKey: ["stock"] });
            toast.success("Stock added");
            setOpen(false);
          }}
        />
      )}
    </AdminShell>
  );
}

function AddModal({ products, onClose, onSave }: { products: { id: string; name: string }[]; onClose: () => void; onSave: (d: { productId: string; email: string; password: string; instructions: string }) => void }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [instructions, setInstructions] = useState("");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl glass-strong p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Stock Item</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Product</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="mt-1 w-full rounded-lg bg-input/50 px-3 py-2 text-sm ring-1 ring-border">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <F label="Email / Login" value={email} onChange={setEmail} />
          <F label="Password" value={password} onChange={setPassword} />
          <label className="block">
            <span className="text-xs text-muted-foreground">Instructions</span>
            <textarea value={instructions} rows={3} onChange={(e) => setInstructions(e.target.value)}
              className="mt-1 w-full rounded-lg bg-input/50 px-3 py-2 text-sm ring-1 ring-border" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!productId || !email) { toast.error("Product and email required"); return; }
              onSave({ productId, email, password, instructions });
            }}
            className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
function F({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-input/50 px-3 py-2 text-sm ring-1 ring-border" />
    </label>
  );
}
