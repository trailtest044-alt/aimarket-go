import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { OrdersTable } from "@/components/orders-table";

export const Route = createFileRoute("/admin/orders/delivered")({
  head: () => ({ meta: [{ title: "Delivered Orders" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminShell title="Delivered Orders">
      <OrdersTable status="delivered" />
    </AdminShell>
  ),
});
