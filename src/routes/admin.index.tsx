import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Clock, CheckCircle2, Truck, Boxes } from "lucide-react";
import { AdminShell, StatCard } from "@/components/admin-shell";
import { getOrders, getProducts, getStock } from "@/lib/api";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: getOrders });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { data: stock = [] } = useQuery({ queryKey: ["stock"], queryFn: getStock });

  const pending = orders.filter((o) => o.status === "pending").length;
  const approved = orders.filter((o) => o.status === "approved").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const available = stock.filter((s) => s.status === "available").length;

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Products" value={products.length} icon={Package} accent="primary" />
        <StatCard label="Pending Orders" value={pending} icon={Clock} accent="warning" />
        <StatCard label="Approved Orders" value={approved} icon={CheckCircle2} accent="accent" />
        <StatCard label="Delivered" value={delivered} icon={Truck} accent="success" />
        <StatCard label="Available Stock" value={available} icon={Boxes} accent="primary" />
      </div>

      <div className="mt-8 glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Orders</h2>
        {orders.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No orders yet.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">Order</th><th>Product</th><th>Customer</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="py-3 font-mono text-xs">{o.id}</td>
                    <td>{o.productName}</td>
                    <td>{o.customerName}</td>
                    <td className="font-semibold">${o.amount.toFixed(2)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-accent/15 text-accent",
    delivered: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${map[status]}`}>{status}</span>;
}
