import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { OrdersTable } from "@/components/orders-table";

export const Route = createFileRoute("/admin/orders/pending")({
  head: () => ({ meta: [{ title: "Pending Orders" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminShell title="Pending Orders">
      <OrdersTable status="pending" />
    </AdminShell>
  ),
});
