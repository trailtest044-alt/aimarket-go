import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { OrdersTable } from "@/components/orders-table";

export const Route = createFileRoute("/admin/orders/approved")({
  head: () => ({ meta: [{ title: "Approved Orders" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminShell title="Approved Orders">
      <OrdersTable status="approved" />
    </AdminShell>
  ),
});
