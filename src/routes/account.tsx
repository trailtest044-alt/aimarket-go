import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AtSign,
  Copy,
  KeyRound,
  LogOut,

  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchCustomerLatestLoginCode,
  formatMoney,
  getCurrentCustomer,
  getCustomerOrderDelivery,
  getCustomerOrders,
  getResellerOrdersByDeliveryEmail,
  getResellerProfile,
  getResellerStatement,
  getResellerPaymentRequests,
  getPaymentSettings,
  submitResellerPaymentRequest,
  logoutCustomer,

  startGoogleLogin,

  type CustomerSession,
  type DeliveryPayload,
} from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CustomerDeliveryCard } from "@/components/customer-delivery-card";
import { ManualActivationCard } from "@/components/manual-activation-card";
import { ServerLoader } from "@/components/server-loader";
import { DateHistoryNavigator, filterByDhakaDate, todayDhakaKey } from "@/components/date-history-navigator";
import type { Order } from "@/lib/mock-data";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: `My Account — ${BRAND.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [customerReady, setCustomerReady] = useState(false);
  const [openOrder, setOpenOrder] = useState<string>("");
  const [deliveries, setDeliveries] = useState<
    Record<string, DeliveryPayload | null>
  >({});
  const [payDueOpen, setPayDueOpen] = useState(false);
  const [deliveryEmailSearch, setDeliveryEmailSearch] = useState("");
  const [submittedDeliveryEmail, setSubmittedDeliveryEmail] = useState("");
  const [payment, setPayment] = useState({
    amount: "",
    channel: "bkash" as "bkash" | "nagad",
    transactionId: "",
    note: "",
  });
  const [resellerHistoryDate, setResellerHistoryDate] = useState(todayDhakaKey);
  const [customerOrderDate, setCustomerOrderDate] = useState(todayDhakaKey);

  useEffect(() => {
    const sync = () => {
      setCustomer(getCurrentCustomer());
      setCustomerReady(true);
    };
    sync();
    window.addEventListener("customer-auth-changed", sync);
    return () => window.removeEventListener("customer-auth-changed", sync);
  }, []);

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", customer?.email],
    queryFn: getCustomerOrders,
    enabled: !!customer,
  });
  const resellerQuery = useQuery({
    queryKey: ["reseller-profile", customer?.email],
    queryFn: getResellerProfile,
    enabled: !!customer,
    retry: false,
  });
  const statementQuery = useQuery({
    queryKey: ["reseller-statement", customer?.email],
    queryFn: () => getResellerStatement(),
    enabled: !!resellerQuery.data,
    retry: false,
  });
  const paymentRequestsQuery = useQuery({
    queryKey: ["reseller-payment-requests", customer?.email],
    queryFn: getResellerPaymentRequests,
    enabled: !!resellerQuery.data,
    retry: false,
  });
  const paymentSettingsQuery = useQuery({
    queryKey: ["payment"],
    queryFn: getPaymentSettings,
    enabled: !!resellerQuery.data,
    retry: false,
  });
  const resellerOrderSearchQuery = useQuery({
    queryKey: [
      "reseller-order-email-search",
      customer?.email,
      submittedDeliveryEmail,
    ],
    queryFn: () => getResellerOrdersByDeliveryEmail(submittedDeliveryEmail),
    enabled: !!resellerQuery.data && submittedDeliveryEmail.length >= 3,
    retry: false,
  });

  function searchResellerOrders(event: React.FormEvent) {
    event.preventDefault();
    const query = deliveryEmailSearch.trim().toLowerCase();
    if (query.length < 3)
      return toast.error(
        "Enter at least 3 characters from the delivery email.",
      );
    if (query === submittedDeliveryEmail)
      void resellerOrderSearchQuery.refetch();
    else setSubmittedDeliveryEmail(query);
  }

  async function submitDuePayment() {
    const amount = Number(payment.amount);
    if (!amount || !payment.transactionId.trim())
      return toast.error("Enter the paid amount and transaction ID.");
    try {
      await submitResellerPaymentRequest({
        amount,
        channel: payment.channel,
        transactionId: payment.transactionId.trim(),
        note: payment.note.trim(),
      });
      await paymentRequestsQuery.refetch();
      setPayDueOpen(false);
      setPayment({ amount: "", channel: "bkash", transactionId: "", note: "" });
      toast.success("Payment saved for owner approval.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit payment.",
      );
    }
  }

  const selectedPaymentNumber =
    payment.channel === "bkash"
      ? paymentSettingsQuery.data?.bangladesh.bkash || ""
      : paymentSettingsQuery.data?.bangladesh.nagad || "";

  const resellerStatementEntries = statementQuery.data?.entries || [];
  const dailyResellerStatement = useMemo(
    () => filterByDhakaDate(resellerStatementEntries, resellerHistoryDate, (entry) => entry.createdAt),
    [resellerStatementEntries, resellerHistoryDate],
  );
  const customerOrders = ordersQuery.data || [];
  const customerDateMode = customerOrders.length >= 10;
  const visibleCustomerOrders = useMemo(
    () => customerDateMode ? filterByDhakaDate(customerOrders, customerOrderDate, (order) => order.createdAt) : customerOrders,
    [customerOrders, customerDateMode, customerOrderDate],
  );

  async function copyPaymentNumber() {
    if (!selectedPaymentNumber)
      return toast.error(
        `${payment.channel === "bkash" ? "bKash" : "Nagad"} payment number is not configured.`,
      );
    await navigator.clipboard.writeText(selectedPaymentNumber);
    toast.success("Payment number copied.");
  }

  async function openDelivery(order: Order) {
    if (openOrder === order.id) {
      setOpenOrder("");
      return;
    }
    setOpenOrder(order.id);
    if (
      deliveries[order.id] !== undefined ||
      !["approved", "delivered"].includes(order.status)
    )
      return;
    try {
      const delivery = await getCustomerOrderDelivery(order.id);
      setDeliveries((current) => ({ ...current, [order.id]: delivery }));
    } catch {
      toast.error("Could not load delivery.");
    }
  }

  if (!customerReady) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <ServerLoader
            title="Opening your account..."
            message="Restoring your secure customer session."
          />
        </main>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="glass overflow-hidden rounded-[2rem] border border-border/80 shadow-2xl shadow-black/5">
            <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
              <section className="relative overflow-hidden bg-primary p-7 text-primary-foreground sm:p-10">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="relative">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <span className="mt-8 inline-block text-xs font-bold uppercase tracking-[0.22em] text-white/65">
                    Secure customer account
                  </span>
                  <h1 className="display-luxe mt-3 text-3xl font-black leading-tight sm:text-4xl">
                    One account for every AI Market order.
                  </h1>
                  <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
                    View purchases, delivery details, reseller statements and
                    login-code access from one verified profile.
                  </p>
                  <div className="mt-8 space-y-3 text-sm text-white/80">
                    <p className="flex items-center gap-3">
                      <PackageCheck className="h-4 w-4" /> Orders link
                      automatically by verified email
                    </p>
                    <p className="flex items-center gap-3">
                      <KeyRound className="h-4 w-4" /> One-time codes expire
                      after 10 minutes
                    </p>
                    <p className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4" /> No password is stored
                      or requested
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-background/80 p-7 sm:p-10">
                <span className="eyebrow">Welcome to AI Market</span>
                <h2 className="display-luxe mt-2 text-3xl font-black">
                  Sign in to your account
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Continue securely with your Google account. Orders placed with the same Google email are linked automatically.
                </p>
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => startGoogleLogin("/account")}
                    className="btn-primary flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-bold"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white font-black text-[#4285f4]">G</span>
                      Continue with Google
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-7 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
                  AI Market never asks for or stores your Google password.
                </p>
              </section>
            </div>
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
              {customer.picture ? (
                <img
                  src={customer.picture}
                  alt=""
                  className="h-12 w-12 rounded-full border border-border"
                />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
                  {customer.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <span className="eyebrow">My account</span>
                <h1 className="display-luxe text-2xl font-bold">
                  {customer.name || "Customer"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {customer.email}
                </p>
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

        {resellerQuery.data && (
          <section className="mt-8 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[.08] via-card to-cyan-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-lg font-black">
                  <WalletCards className="h-5 w-5 text-primary" /> Reseller
                  account
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Credit orders, payments and discounts are listed here for your
                  records.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {resellerQuery.data.status}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <BalanceCard
                label="Current due"
                value={
                  Object.entries(resellerQuery.data.balances || {})
                    .filter(([, amount]) => Number(amount) > 0)
                    .map(([currency, amount]) =>
                      formatMoney(Number(amount), currency as any),
                    )
                    .join(" · ") || "Clear"
                }
              />
              <BalanceCard
                label="BDT credit limit"
                value={
                  resellerQuery.data.creditLimitBDT
                    ? formatMoney(resellerQuery.data.creditLimitBDT, "BDT")
                    : "No limit"
                }
              />
              <BalanceCard
                label="Statement rows"
                value={String(statementQuery.data?.entries.length || 0)}
              />
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-white/70">
              <DateHistoryNavigator className="m-3" value={resellerHistoryDate} onChange={setResellerHistoryDate} visibleCount={dailyResellerStatement.length} totalCount={resellerStatementEntries.length} />
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyResellerStatement.map((entry) => (
                      <tr
                        key={entry._id || entry.id}
                        className="border-b border-border/60"
                      >
                        <td className="px-4 py-3">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize font-medium">
                            {entry.kind.replace("_", " ")}
                          </span>
                          {entry.orderId && (
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {entry.orderId}
                            </span>
                          )}
                          {entry.receiptNo && (
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {entry.receiptNo}
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold ${entry.amount > 0 ? "text-amber-700" : "text-emerald-700"}`}
                        >
                          {entry.amount > 0 ? "+ " : "− "}
                          {formatMoney(Math.abs(entry.amount), entry.currency)}
                        </td>
                      </tr>
                    ))}
                  {!statementQuery.isLoading &&
                    !dailyResellerStatement.length && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          {resellerStatementEntries.length ? "No credit activity on this date." : "No credit activity yet."}
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {resellerQuery.data &&
          Number(resellerQuery.data.balances?.BDT || 0) > 0 && (
            <section className="mt-5 rounded-3xl border border-primary/25 bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">Pay reseller due</h2>
                  <p className="text-sm text-muted-foreground">
                    Submit your bKash or Nagad payment for owner approval.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPayment((current) => ({
                      ...current,
                      amount: String(
                        Math.max(
                          0,
                          Number(resellerQuery.data?.balances?.BDT || 0),
                        ),
                      ),
                    }));
                    setPayDueOpen(!payDueOpen);
                  }}
                  className="btn-primary rounded-xl px-4 py-2 text-sm font-bold"
                >
                  Pay due
                </button>
              </div>

              {payDueOpen && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    className="input bg-muted font-black"
                    readOnly
                    aria-label="Exact current due"
                    value={`Exact due: ${formatMoney(Number(resellerQuery.data?.balances?.BDT || 0), "BDT")}`}
                  />
                  <select
                    className="input"
                    value={payment.channel}
                    onChange={(event) =>
                      setPayment({
                        ...payment,
                        channel: event.target.value as "bkash" | "nagad",
                      })
                    }
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                  </select>

                  <div className="sm:col-span-2 rounded-2xl border border-primary/20 bg-primary/[.06] p-4">
                    <div className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">
                      Send Money to{" "}
                      {payment.channel === "bkash" ? "bKash" : "Nagad"}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="font-mono text-xl font-black tracking-wide text-foreground">
                        {paymentSettingsQuery.isLoading
                          ? "Loading payment number..."
                          : selectedPaymentNumber ||
                            "Payment number not configured"}
                      </div>
                      <button
                        type="button"
                        onClick={copyPaymentNumber}
                        disabled={!selectedPaymentNumber}
                        className="btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Copy className="h-4 w-4" /> Copy number
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Send the exact due amount, then enter the transaction ID
                      below.
                    </p>
                  </div>

                  <input
                    className="input sm:col-span-2"
                    placeholder={`${payment.channel === "bkash" ? "bKash" : "Nagad"} transaction ID`}
                    value={payment.transactionId}
                    onChange={(event) =>
                      setPayment({
                        ...payment,
                        transactionId: event.target.value,
                      })
                    }
                  />
                  <input
                    className="input sm:col-span-2"
                    placeholder="Note (optional)"
                    value={payment.note}
                    onChange={(event) =>
                      setPayment({ ...payment, note: event.target.value })
                    }
                  />
                  <button
                    onClick={submitDuePayment}
                    className="btn-primary sm:col-span-2 rounded-xl px-5 py-3 text-sm font-bold"
                  >
                    Paid — submit for approval
                  </button>
                </div>
              )}

              {(paymentRequestsQuery.data || []).some(
                (request) => request.status === "pending",
              ) && (
                <div className="mt-4 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
                  Payment pending owner approval.
                </div>
              )}
            </section>
          )}

        {resellerQuery.data && (
          <section className="mt-5 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-gradient-to-r from-primary/[.08] to-transparent p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <AtSign className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black">
                    Find an order by delivery email
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Search the email delivered with an account. Matching
                    reseller orders appear newest first.
                  </p>
                </div>
              </div>
              <form
                onSubmit={searchResellerOrders}
                className="mt-4 flex flex-col gap-2 sm:flex-row"
              >
                <label className="relative flex-1">
                  <span className="sr-only">Delivery email</span>
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    inputMode="email"
                    autoComplete="off"
                    className="input w-full pl-11"
                    placeholder="Search delivery email..."
                    value={deliveryEmailSearch}
                    onChange={(event) =>
                      setDeliveryEmailSearch(event.target.value)
                    }
                  />
                </label>
                <button
                  type="submit"
                  className="btn-primary rounded-xl px-6 py-3 text-sm font-bold"
                >
                  Search orders
                </button>
              </form>
            </div>
            {submittedDeliveryEmail && (
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Results for{" "}
                    <b className="text-foreground">{submittedDeliveryEmail}</b>
                  </span>
                  {resellerOrderSearchQuery.data && (
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                      {resellerOrderSearchQuery.data.length} matched
                    </span>
                  )}
                </div>
                {resellerOrderSearchQuery.isLoading ? (
                  <ServerLoader
                    title="Searching orders..."
                    message="Checking your delivered account emails securely."
                  />
                ) : resellerOrderSearchQuery.isError ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
                    Could not search orders right now. Please try again.
                  </div>
                ) : !resellerOrderSearchQuery.data?.length ? (
                  <div className="rounded-2xl border border-dashed border-border p-7 text-center">
                    <PackageCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                    <h3 className="mt-3 font-bold">No matching order</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Check the delivery email spelling and search again.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resellerOrderSearchQuery.data.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-border bg-background p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {order.id}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${statusClass(order.status)}`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <h3 className="mt-2 font-bold">
                              {order.productName}
                            </h3>
                            <div className="mt-1 break-all text-sm font-semibold text-primary">
                              {order.deliveryEmail ||
                                "No delivery email assigned yet"}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString()} •{" "}
                              {formatMoney(order.amount, order.currency)}
                            </p>
                          </div>
                          {["approved", "delivered"].includes(order.status) && (
                            <button
                              onClick={() => openDelivery(order)}
                              className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold"
                            >
                              {openOrder === order.id
                                ? "Hide details"
                                : "View order"}
                            </button>
                          )}
                        </div>
                        {openOrder === order.id && (
                          <CustomerDeliveryCard
                            orderId={order.id}
                            delivery={deliveries[order.id]}
                            productName={order.productName}
                            productLogoUrl={order.productLogoUrl}
                            productIcon={order.productIcon}
                            fetchLoginCode={fetchCustomerLatestLoginCode}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="eyebrow">Purchase history</span>
              <h2 className="display-luxe mt-1 text-2xl font-bold">
                Your orders
              </h2>
            </div>
            <button
              onClick={() => ordersQuery.refetch()}
              className="btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
          {customerDateMode && <DateHistoryNavigator className="mt-5" value={customerOrderDate} onChange={setCustomerOrderDate} visibleCount={visibleCustomerOrders.length} totalCount={customerOrders.length} />}

          {ordersQuery.isLoading ? (
            <div className="mt-6">
              <ServerLoader
                title="Loading purchases..."
                message="Finding your orders securely."
              />
            </div>
          ) : !ordersQuery.data?.length ? (
            <div className="glass mt-6 rounded-3xl p-8 text-center">
              <PackageCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No purchases yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Buy a product while logged in and it will appear here.
              </p>
              <Link
                to="/products"
                className="btn-primary mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {visibleCustomerOrders.map((order) => (
                <div key={order.id} className="glass rounded-3xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {order.id}
                      </div>
                      <h3 className="mt-1 text-lg font-bold">
                        {order.productName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()} •{" "}
                        {formatMoney(order.amount, order.currency)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                      {["approved", "delivered"].includes(order.status) ? (
                        <button
                          onClick={() => openDelivery(order)}
                          className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
                        >
                          {openOrder === order.id
                            ? "Hide delivery"
                            : "View delivery"}
                        </button>
                      ) : (
                        <Link
                          to="/track-orders"
                          className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold"
                        >
                          Track
                        </Link>
                      )}
                    </div>
                  </div>
                  {openOrder === order.id && (
                    <CustomerDeliveryCard
                      orderId={order.id}
                      delivery={deliveries[order.id]}
                      productName={order.productName}
                      productLogoUrl={order.productLogoUrl}
                      productIcon={order.productIcon}
                      fetchLoginCode={fetchCustomerLatestLoginCode}
                    />
                  )}
                  {!["approved", "delivered", "rejected", "cancelled"].includes(
                    order.status,
                  ) &&
                    order.manualActivationRequired && (
                      <ManualActivationCard
                        compact
                        orderId={order.id}
                        productName={order.productName}
                        productLogoUrl={order.productLogoUrl}
                        productIcon={order.productIcon}
                        inputMode={order.manualInputMode}
                        submitted={Boolean(order.manualActivationSubmitted)}
                        activated={Boolean(order.manualActivationActivated)}
                        onSubmitted={() => {
                          void ordersQuery.refetch();
                        }}
                      />
                    )}
                </div>
              ))}
              {customerDateMode && !visibleCustomerOrders.length && <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">No orders on this date. Use the date controls to view another day.</div>}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function BalanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/80 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function statusClass(status: Order["status"]) {
  if (status === "approved" || status === "delivered")
    return "bg-success/15 text-success";
  if (status === "rejected" || status === "cancelled")
    return "bg-destructive/15 text-destructive";
  return "bg-warning/15 text-warning";
}
