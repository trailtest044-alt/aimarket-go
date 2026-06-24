import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrders, updateOrderStatus } from "@/lib/api";
import type { Order } from "@/lib/mock-data";
import { toast } from "sonner";
import { Check, X, Truck, Inbox } from "lucide-react";

export function OrdersTable({ status }: { status: Order["status"] }) {
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["orders"], queryFn: getOrders });
  const list = orders.filter((o) => o.status === status);

  async function setStatus(id: string, s: Order["status"]) {
    const updated = await updateOrderStatus(id, s);
    qc.invalidateQueries({ queryKey: ["orders"] });
    toast.success(`Order ${updated?.status ?? s}`);
  }

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary/30" />;

  if (list.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-base font-semibold">No {status} orders</h3>
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
              <td>{o.productName}</td>
              <td>
                <div className="text-xs font-medium capitalize">{o.paymentMethod}</div>
                <div className="text-xs text-muted-foreground">{o.paymentChannel}</div>
              </td>
              <td className="font-mono text-xs">{o.transactionId}</td>
              <td className="font-semibold">${o.amount.toFixed(2)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-1">
                  {status === "pending" && (
                    <>
                      <button onClick={() => setStatus(o.id, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/25">
                        <Check className="h-3 w-3" /> Approve Order
                      </button>
                      <button onClick={() => setStatus(o.id, "delivered")} className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-glow">
                        <Truck className="h-3 w-3" /> Approve &amp; Deliver
                      </button>
                      <button onClick={() => setStatus(o.id, "rejected")} className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/25">
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </>
                  )}
                  {status === "approved" && (
                    <span className="text-xs text-muted-foreground">Delivery unlocked for customer</span>
                  )}
                  {status === "rejected" && (
                    <button onClick={() => setStatus(o.id, "pending")} className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold hover:bg-secondary/80">
                      Restore
                    </button>
                  )}
                  {status === "delivered" && <span className="text-xs text-muted-foreground">Completed</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
