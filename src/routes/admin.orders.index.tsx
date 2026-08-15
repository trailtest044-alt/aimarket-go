import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { OrdersTable } from "@/components/orders-table";

export const Route = createFileRoute("/admin/orders/")({
  head: () => ({ meta: [{ title: "All Orders" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminShell title="All Orders">
      <OrdersTable />
    </AdminShell>
  ),
});
