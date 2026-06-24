import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { OrdersTable } from "@/components/orders-table";

export const Route = createFileRoute("/admin/orders/rejected")({
  head: () => ({ meta: [{ title: "Rejected Orders" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminShell title="Rejected Orders">
      <OrdersTable status="rejected" />
    </AdminShell>
  ),
});
