import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogIn, LogOut, PackageCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  fetchCustomerLatestLoginCode,
  formatMoney,
  getCurrentCustomer,
  getCustomerOrderDelivery,
  getCustomerOrders,
  logoutCustomer,
  startGoogleLogin,
  type CustomerSession,
  type DeliveryPayload,
} from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CustomerDeliveryCard } from "@/components/customer-delivery-card";
import { ServerLoader } from "@/components/server-loader";
import type { Order } from "@/lib/mock-data";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const [customer, setCustomer] = useState<CustomerSession | null>(() => getCurrentCustomer());
  const [openOrder, setOpenOrder] = useState<string>("");
  const [deliveries, setDeliveries] = useState<Record<string, DeliveryPayload | null>>({});

  useEffect(() => {
    const sync = () => setCustomer(getCurrentCustomer());
    window.addEventListener("customer-auth-changed", sync);
    return () => window.removeEventListener("customer-auth-changed", sync);
  }, []);

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", customer?.email],
    queryFn: getCustomerOrders,
    enabled: !!customer,
  });

  async function openDelivery(order: Order) {
    if (openOrder === order.id) {
      setOpenOrder("");
      return;
    }
    setOpenOrder(order.id);
    if (deliveries[order.id] !== undefined || !["approved", "delivered"].includes(order.status)) return;
    try {
      const delivery = await getCustomerOrderDelivery(order.id);
      setDeliveries((current) => ({ ...current, [order.id]: delivery }));
    } catch {
      toast.error("Could not load delivery.");
    }
  }

  if (!customer) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <div className="glass rounded-3xl p-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <span className="eyebrow mt-6 inline-block">Customer account</span>
            <h1 className="display-luxe mt-2 text-3xl font-bold">Login with Google to safe purchase</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Your purchase history and delivery details will stay inside your verified Google account.
            </p>
            <button onClick={() => startGoogleLogin("/account")} className="btn-primary mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
              <LogIn className="h-4 w-4" /> Continue with Google
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {customer.picture ? <img src={customer.picture} alt="" className="h-12 w-12 rounded-full border border-border" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">{customer.email.charAt(0).toUpperCase()}</div>}
              <div>
                <span className="eyebrow">My account</span>
                <h1 className="display-luxe text-2xl font-bold">{customer.name || "Customer"}</h1>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logoutCustomer();
                toast.success("Logged out");
              }}
              className="btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="eyebrow">Purchase history</span>
              <h2 className="display-luxe mt-1 text-2xl font-bold">Your orders</h2>
            </div>
            <button onClick={() => ordersQuery.refetch()} className="btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {ordersQuery.isLoading ? (
            <div className="mt-6"><ServerLoader title="Loading purchases..." message="Finding your orders securely." /></div>
          ) : !ordersQuery.data?.length ? (
            <div className="glass mt-6 rounded-3xl p-8 text-center">
              <PackageCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No purchases yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Buy a product while logged in and it will appear here.</p>
              <Link to="/products" className="btn-primary mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold">Browse products</Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {ordersQuery.data.map((order) => (
                <div key={order.id} className="glass rounded-3xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{order.id}</div>
                      <h3 className="mt-1 text-lg font-bold">{order.productName}</h3>
                      <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString()} • {formatMoney(order.amount, order.currency)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass(order.status)}`}>{order.status}</span>
                      {["approved", "delivered"].includes(order.status) ? (
                        <button onClick={() => openDelivery(order)} className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
                          {openOrder === order.id ? "Hide delivery" : "View delivery"}
                        </button>
                      ) : (
                        <Link to="/track-orders" className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold">Track</Link>
                      )}
                    </div>
                  </div>
                  {openOrder === order.id && (
                    <CustomerDeliveryCard
                      orderId={order.id}
                      delivery={deliveries[order.id]}
                      fetchLoginCode={fetchCustomerLatestLoginCode}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function statusClass(status: Order["status"]) {
  if (status === "approved" || status === "delivered") return "bg-success/15 text-success";
  if (status === "rejected") return "bg-destructive/15 text-destructive";
  return "bg-warning/15 text-warning";
}
