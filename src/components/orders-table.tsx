import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getOrders, updateOrderStatus, formatMoney, getAdminManualActivation, completeAdminManualActivation, addOrderDeliveryDetails, type ManualActivationState } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";
import type { Order } from "@/lib/mock-data";
import { toast } from "sonner";
import { Check, X, Truck, Inbox, Eye, EyeOff, ShieldCheck, Loader2, LockKeyhole, PlusCircle } from "lucide-react";
import { ProductLogo } from "@/components/product-logo";

export function OrdersTable({ status }: { status?: Order["status"] }) {
  const qc = useQueryClient();
  const adminReady = useAdminAuthReady();
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["orders"], queryFn: getOrders, enabled: adminReady });
  const list = status ? orders.filter((o) => o.status === status) : orders;
  const [manual, setManual] = useState<{ order: Order; state: ManualActivationState } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [details, setDetails] = useState({ type: "credentials" as "credentials" | "activation_code" | "login_code" | "manual", email: "", password: "", activationCode: "", instruction: "", getCodeAccessDays: 25 });

  async function setStatus(id: string, s: Order["status"]) {
    const updated = await updateOrderStatus(id, s);
    qc.invalidateQueries({ queryKey: ["orders"] });
    toast.success(`Order ${updated?.status ?? s}`);
  }

  async function openManual(order: Order) {
    setManualBusy(true);
    try { setManual({ order, state: await getAdminManualActivation(order.id) }); setShowPassword(false); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not open login details."); }
    finally { setManualBusy(false); }
  }

  async function confirmActivation() {
    if (!manual) return;
    setManualBusy(true);
    try {
      const next = await completeAdminManualActivation(manual.order.id);
      setManual({ ...manual, state: next });
      await qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Subscription activation confirmed. Approve and deliver are unlocked.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not confirm activation."); }
    finally { setManualBusy(false); }
  }

  function openDetails(order: Order) {
    const type = ["credentials", "activation_code", "login_code", "manual"].includes(order.deliveryMode || "") ? order.deliveryMode as typeof details.type : "credentials";
    setDetailsOrder(order);
    setDetails({ type, email: "", password: "", activationCode: "", instruction: "", getCodeAccessDays: 25 });
  }

  async function saveDetails() {
    if (!detailsOrder) return;
    if (details.type === "credentials" && (!details.email.trim() || !details.password.trim())) return toast.error("Enter delivery email and password.");
    if (details.type === "activation_code" && !details.activationCode.trim()) return toast.error("Enter the activation key.");
    if (details.type === "login_code" && !details.email.trim()) return toast.error("Enter the delivery email.");
    if (details.type === "manual" && !details.instruction.trim()) return toast.error("Enter the delivery instruction.");
    setDetailsBusy(true);
    try {
      await addOrderDeliveryDetails(detailsOrder.id, { ...details, adminNote: `Added for ${detailsOrder.id}` });
      await qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Delivery details added. Approve and deliver are unlocked.");
      setDetailsOrder(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add delivery details."); }
    finally { setDetailsBusy(false); }
  }

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary/30" />;

  if (list.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-base font-semibold">{status ? `No ${status} orders` : "No orders found"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Orders will show up here once available.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Payment</th>
            <th>Tx ID</th>
            <th>Amount</th>
            <th className="text-right pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.id} className="border-t border-border align-top">
              <td className="px-4 py-3 font-mono text-xs">
                {o.id}
                <div className="text-[10px] text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
                {o.customerOrderRef && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Ref: <span className="text-foreground">{o.customerOrderRef}</span>
                  </div>
                )}
              </td>
              <td>
                <div className="font-medium">{o.customerName}</div>
                <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
                <div className="text-xs text-muted-foreground">{o.contact}</div>
              </td>
              <td>
                <div className="flex min-w-40 items-center gap-2">
                  <ProductLogo logoUrl={o.productLogoUrl} icon={o.productIcon || "✨"} name={o.productName} className="h-8 w-8 shrink-0 rounded-lg border border-border bg-white/5" emojiClassName="text-base" />
                  <div><div className="font-medium">{o.productName}</div>{o.batchId && <div className="font-mono text-[10px] text-muted-foreground">{o.batchId}</div>}</div>
                </div>
              </td>
              <td>
                <div className="text-xs font-medium capitalize">{o.paymentMethod}</div>
                <div className="text-xs text-muted-foreground">{o.paymentChannel}</div>
              </td>
              <td className="font-mono text-xs">{o.transactionId}</td>
              <td className="font-semibold">{formatMoney(o.amount, o.currency)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-1">
                  {o.status === "pending" && (
                    <>
                      {o.isBackorder && <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-bold ${o.deliveryDetailsAdded ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning"}`}>{o.deliveryDetailsAdded ? "Details ready" : "Backorder"}</span>}
                      {o.isBackorder && !o.deliveryDetailsAdded && <button onClick={() => openDetails(o)} className="inline-flex items-center gap-1 rounded-lg border border-primary/25 bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15"><PlusCircle className="h-3 w-3" /> Add details</button>}
                      {o.manualActivationRequired && <button onClick={() => openManual(o)} disabled={manualBusy} className="inline-flex items-center gap-1 rounded-lg border border-primary/25 bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary disabled:opacity-60"><LockKeyhole className="h-3 w-3" /> {o.manualActivationSubmitted ? "View login details" : "Waiting for login details"}</button>}
                      <button disabled={Boolean((o.manualActivationRequired && !o.manualActivationActivated) || (o.isBackorder && !o.deliveryDetailsAdded))} onClick={() => setStatus(o.id, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/25 disabled:cursor-not-allowed disabled:opacity-40" title={o.isBackorder && !o.deliveryDetailsAdded ? "Add delivery details first" : o.manualActivationRequired && !o.manualActivationActivated ? "Confirm Subscription activated first" : undefined}>
                        <Check className="h-3 w-3" /> Approve Order
                      </button>
                      <button disabled={Boolean((o.manualActivationRequired && !o.manualActivationActivated) || (o.isBackorder && !o.deliveryDetailsAdded))} onClick={() => setStatus(o.id, "delivered")} className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-40" title={o.isBackorder && !o.deliveryDetailsAdded ? "Add delivery details first" : o.manualActivationRequired && !o.manualActivationActivated ? "Confirm Subscription activated first" : undefined}>
                        <Truck className="h-3 w-3" /> Approve &amp; Deliver
                      </button>
                      <button onClick={() => setStatus(o.id, "rejected")} className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/25">
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </>
                  )}
                  {o.status === "approved" && (
                    <>
                      <span className="text-xs text-muted-foreground">Delivery unlocked {o.approvedByNickname ? `by ${o.approvedByNickname}` : ""}</span>
                      <button onClick={() => setStatus(o.id, "delivered")} className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-glow"><Truck className="h-3 w-3" /> Mark Delivered</button>
                    </>
                  )}
                  {o.status === "rejected" && (
                    <button onClick={() => setStatus(o.id, "pending")} className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold hover:bg-secondary/80">
                      Restore
                    </button>
                  )}
                  {o.status === "delivered" && <span className="text-xs text-muted-foreground">Completed {o.deliveredByNickname ? `by ${o.deliveredByNickname}` : ""}</span>}
                  {o.status === "cancelled" && <span className="text-xs text-muted-foreground">Cancelled {o.cancelledByNickname ? `by ${o.cancelledByNickname}` : ""}</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {manual && <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"><div className="glass-strong w-full max-w-lg rounded-3xl p-6"><div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><LockKeyhole className="h-4 w-4" /> Manual activation</div><h3 className="mt-2 text-lg font-black">{manual.order.productName}</h3><p className="mt-1 font-mono text-xs text-muted-foreground">{manual.order.id}</p></div><button onClick={() => setManual(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></div>{!manual.state.submitted ? <div className="mt-5 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-sm text-warning">Customer has not submitted their login details yet. Approval stays locked.</div> : <div className="mt-5 space-y-4"><Info label="Login email" value={manual.state.details?.email || ""} /><div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Login password</div><div className="mt-2 flex items-center justify-between gap-3"><span className="break-all font-mono text-base font-bold">{showPassword ? manual.state.details?.password || "" : "•".repeat(Math.max(10, manual.state.details?.password?.length || 10))}</span><button onClick={() => setShowPassword(!showPassword)} className="btn-ghost rounded-lg p-2">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>{manual.state.activated ? <div className="rounded-2xl border border-success/25 bg-success/10 p-4 text-sm text-success"><b>Subscription activated.</b> You can now approve and deliver this order.</div> : <button disabled={manualBusy} onClick={confirmActivation} className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60">{manualBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Subscription activated</button>}</div>}</div></div>}
      {detailsOrder && <DeliveryDetailsModal order={detailsOrder} values={details} busy={detailsBusy} onChange={setDetails} onClose={() => setDetailsOrder(null)} onSave={saveDetails} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-2 break-all font-mono font-bold">{value || "Not provided"}</div></div>; }

function DeliveryDetailsModal({ order, values, busy, onChange, onClose, onSave }: { order: Order; values: { type: "credentials" | "activation_code" | "login_code" | "manual"; email: string; password: string; activationCode: string; instruction: string; getCodeAccessDays: number }; busy: boolean; onChange: (next: typeof values) => void; onClose: () => void; onSave: () => void }) {
  const set = (patch: Partial<typeof values>) => onChange({ ...values, ...patch });
  return <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"><div className="glass-strong w-full max-w-lg rounded-3xl p-6"><div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><PlusCircle className="h-4 w-4" /> Backorder delivery details</div><h3 className="mt-2 text-lg font-black">{order.productName}</h3><p className="mt-1 text-sm text-muted-foreground">Save exact delivery data first. Approval and delivery stay locked until it is saved.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></div><div className="mt-5 grid grid-cols-2 gap-2">{([['credentials','Email + password'],['activation_code','Activation key'],['login_code','Login-code email'],['manual','Manual instruction']] as const).map(([type,label]) => <button key={type} onClick={() => set({ type })} className={`rounded-xl border px-3 py-2 text-xs font-bold ${values.type === type ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'}`}>{label}</button>)}</div><div className="mt-4 space-y-3">{values.type === 'credentials' && <><input value={values.email} onChange={e => set({ email:e.target.value })} placeholder="Delivery account email" className="input w-full" /><input value={values.password} onChange={e => set({ password:e.target.value })} placeholder="Delivery account password" className="input w-full" /></>}{values.type === 'activation_code' && <input value={values.activationCode} onChange={e => set({ activationCode:e.target.value })} placeholder="Activation key" className="input w-full" />}{values.type === 'login_code' && <><input value={values.email} onChange={e => set({ email:e.target.value })} placeholder="Email that will receive the login code" className="input w-full" /><label className="block"><span className="text-xs font-bold text-foreground">Customer &amp; reseller Get Code access (days)</span><input type="number" min={1} max={3650} value={values.getCodeAccessDays} onChange={e => set({ getCodeAccessDays: Math.min(3650, Math.max(1, Math.floor(Number(e.target.value) || 25))) })} className="input mt-1 w-full" required /><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">Count starts when these backorder details are added. After the period ends, button and API access stop.</span></label></>}{values.type === 'manual' && <textarea value={values.instruction} onChange={e => set({ instruction:e.target.value })} placeholder="Manual delivery instruction" className="input min-h-28 w-full" />}</div><button disabled={busy} onClick={onSave} className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Save delivery details</button></div></div>;
}
