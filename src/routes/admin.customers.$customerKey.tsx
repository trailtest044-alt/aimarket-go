import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  KeyRound,
  Mail,
  PackageCheck,
  Phone,
  ShieldAlert,
  Truck,
  UserRound,
  XCircle,
  Ban,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getCustomerProfile, revealCustomerDelivery } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";
import { DateHistoryNavigator, filterByDhakaDate, todayDhakaKey } from "@/components/date-history-navigator";

export const Route = createFileRoute("/admin/customers/$customerKey")({
  component: CustomerProfilePage,
});

const statusIcon: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  delivered: Truck,
  rejected: XCircle,
  cancelled: Ban,
};

function CustomerProfilePage() {
  const adminReady = useAdminAuthReady();
  const { customerKey } = Route.useParams();
  const [revealed, setRevealed] = useState<Record<string, any>>({});
  const [revealing, setRevealing] = useState("");
  const [orderDate, setOrderDate] = useState(todayDhakaKey);
  const [timelineDate, setTimelineDate] = useState(todayDhakaKey);
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-profile", customerKey],
    queryFn: () => getCustomerProfile(customerKey),
    enabled: adminReady,
  });
  const profileOrders = data?.orders || [];
  const profileHistory = data?.history || [];
  const orderDateMode = profileOrders.length >= 10;
  const timelineDateMode = profileHistory.length >= 10;
  const visibleOrders = useMemo(
    () => orderDateMode ? filterByDhakaDate(profileOrders, orderDate, (order) => order.createdAt) : profileOrders,
    [profileOrders, orderDate, orderDateMode],
  );
  const visibleHistory = useMemo(
    () => timelineDateMode ? filterByDhakaDate(profileHistory, timelineDate, (event) => event.at) : profileHistory,
    [profileHistory, timelineDate, timelineDateMode],
  );

  async function showDelivery(orderId: string) {
    setRevealing(orderId);
    try {
      const result = await revealCustomerDelivery(orderId);
      setRevealed((current) => ({ ...current, [orderId]: result.delivery }));
    } finally {
      setRevealing("");
    }
  }

  if (isLoading)
    return (
      <AdminShell title="Customer Profile">
        <div className="rounded-3xl bg-card p-10 text-center text-sm text-muted-foreground">
          Loading customer profile…
        </div>
      </AdminShell>
    );
  if (error || !data)
    return (
      <AdminShell title="Customer Profile">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 font-bold">Customer profile could not be found.</p>
          <Link
            to="/admin/customers/search"
            className="btn-primary mt-5 inline-flex rounded-xl px-4 py-2 text-sm"
          >
            Back to search
          </Link>
        </div>
      </AdminShell>
    );
  const { customer, summary, orders, history } = data;

  return (
    <AdminShell title="Customer Profile">
      <section className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-cyan-50 p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary text-2xl font-black text-primary-foreground">
              {(customer.name || customer.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black">
                  {customer.name || "Customer"}
                </h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  Google customer
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </span>
                {customer.whatsapp && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {customer.whatsapp}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["Total orders", summary.totalOrders],
            ["Pending", summary.pendingOrders],
            ["Approved", summary.approvedOrders],
            ["Delivered", summary.deliveredOrders],
            ["Rejected", summary.rejectedOrders],
            ["Cancelled", summary.cancelledOrders || 0],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 text-2xl font-black">{value}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.8fr)]">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="font-display text-lg font-black">
                Orders & delivery support
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Open delivery details only when customer support needs verified
                access information.
              </p>
            </div>
            {orderDateMode && <DateHistoryNavigator className="mb-4" value={orderDate} onChange={setOrderDate} visibleCount={visibleOrders.length} totalCount={orders.length} />}
            <div className="space-y-3">
              {visibleOrders.map((order) => {
                const Icon = statusIcon[order.status] || PackageCheck;
                const delivery = revealed[order.id];
                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-border p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{order.productName}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold capitalize">
                            <Icon className="h-3.5 w-3.5" />
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {order.id} •{" "}
                          {order.transactionId || "No transaction ID"} •{" "}
                          {new Date(order.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => showDelivery(order.id)}
                        disabled={revealing === order.id || order.status === "cancelled"}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50"
                      >
                        <Eye className="h-4 w-4" />
                        {revealing === order.id
                          ? "Opening…"
                          : delivery
                            ? "Refresh delivery"
                            : order.status === "cancelled"
                              ? "Access revoked"
                              : "View delivery details"}
                      </button>
                    </div>
                    {delivery && (
                      <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
                        <div className="mb-2 inline-flex items-center gap-1.5 font-bold text-warning">
                          <KeyRound className="h-4 w-4" />
                          Sensitive delivery details
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {delivery.email && (
                            <Detail
                              label="Account email"
                              value={delivery.email}
                            />
                          )}
                          {delivery.password && (
                            <Detail
                              label="Password"
                              value={delivery.password}
                            />
                          )}
                          {delivery.activationCode && (
                            <Detail
                              label="Activation code"
                              value={delivery.activationCode}
                            />
                          )}
                          {delivery.instruction && (
                            <Detail
                              label="Instruction"
                              value={delivery.instruction}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!visibleOrders.length && (
                <div className="rounded-2xl bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
                  {orders.length ? "No customer orders on this date." : "No orders found for this customer."}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-display font-black">Customer history</h3>
                <p className="text-xs text-muted-foreground">
                  Signup, login and order timeline
                </p>
              </div>
            </div>
            {timelineDateMode && <DateHistoryNavigator className="mb-4" value={timelineDate} onChange={setTimelineDate} visibleCount={visibleHistory.length} totalCount={history.length} />}
            <div className="space-y-4">
              {visibleHistory.map((event, index) => (
                <div
                  key={`${event.type}-${event.at}-${index}`}
                  className="relative border-l border-primary/25 pl-4"
                >
                  <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary" />
                  <div className="text-sm font-bold">{event.title}</div>
                  {event.detail && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {event.detail}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(event.at).toLocaleString()}
                  </div>
                </div>
              ))}
              {!visibleHistory.length && (
                <p className="text-sm text-muted-foreground">{history.length ? "No customer history on this date." : "No history yet."}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 break-all font-mono text-xs text-foreground">
        {value}
      </div>
    </div>
  );
}
