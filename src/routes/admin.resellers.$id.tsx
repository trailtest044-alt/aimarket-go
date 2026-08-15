import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  PackageCheck,
  ReceiptText,
  Save,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { DateHistoryNavigator, filterByDhakaDate, todayDhakaKey } from "@/components/date-history-navigator";
import {
  formatMoney,
  getReseller,
  approveResellerPaymentRequest,
  rejectResellerPaymentRequest,
  recordResellerPayment,
  updateReseller,
  updateResellerProductAccess,
  type ResellerProductConfig,
} from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";
import type { CurrencyCode } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/resellers/$id")({
  component: ResellerDetailPage,
});

function ResellerDetailPage() {
  const { id } = Route.useParams();
  const adminReady = useAdminAuthReady();
  const detail = useQuery({
    queryKey: ["reseller", id],
    queryFn: () => getReseller(id),
    enabled: adminReady,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [payment, setPayment] = useState({
    amount: "",
    currency: "BDT" as CurrencyCode,
    discount: "0",
    paymentReference: "",
    note: "",
  });
  const [filters, setFilters] = useState({ statement: "", product: "" });
  const [historyDate, setHistoryDate] = useState(todayDhakaKey);

  const reseller = detail.data?.reseller;
  const invoices = detail.data?.invoices || [];
  const dailyInvoices = useMemo(
    () => filterByDhakaDate(invoices, historyDate, (invoice) => invoice.createdAt),
    [invoices, historyDate],
  );
  const openInvoices = invoices.filter(
    (invoice) => Number(invoice.remainingAmount || 0) > 0,
  );
  const statement = useMemo(
    () =>
      filterByDhakaDate(detail.data?.statement || [], historyDate, (entry) => entry.createdAt).filter(
        (entry) =>
          [entry.kind, entry.orderId || "", entry.note || "", entry.paymentReference || "", entry.receiptNo || ""]
            .join(" ")
            .toLowerCase()
            .includes(filters.statement.toLowerCase()),
      ),
    [detail.data?.statement, filters.statement, historyDate],
  );
  const products = useMemo(
    () =>
      (detail.data?.products || []).filter((item) =>
        item.product.title
          .toLowerCase()
          .includes(filters.product.toLowerCase()),
      ),
    [detail.data?.products, filters.product],
  );

  async function saveProfile(form: HTMLFormElement) {
    if (!reseller) return;
    const data = new FormData(form);
    setSavingProfile(true);
    try {
      await updateReseller(id, {
        name: String(data.get("name") || ""),
        status: String(data.get("status")) as
          "invited" | "active" | "suspended",
        creditLimitBDT: Number(data.get("limit") || 0),
        internalNote: String(data.get("note") || ""),
      });
      toast.success("Reseller profile saved");
      await detail.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save profile",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveProductAccess(
    config: ResellerProductConfig,
    form: HTMLFormElement,
  ) {
    const data = new FormData(form);
    const numberOrNull = (field: string) => {
      const raw = String(data.get(field) || "").trim();
      return raw ? Number(raw) : null;
    };
    try {
      await updateResellerProductAccess(id, config.product._id, {
        isVisible: data.get("visible") === "on",
        priceBDT: numberOrNull("bdt"),
        priceUSDT: numberOrNull("usdt"),
        priceUSD: numberOrNull("usd"),
        note: String(data.get("note") || ""),
      });
      toast.success(`${config.product.title} access saved`);
      await detail.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save product access",
      );
    }
  }

  async function savePayment(event: React.FormEvent) {
    event.preventDefault();
    if (!payment.amount || Number(payment.amount) <= 0)
      return toast.error("Enter a payment amount.");
    setPaymentSaving(true);
    try {
      const result = await recordResellerPayment(id, {
        amount: Number(payment.amount),
        currency: payment.currency,
        discount: Number(payment.discount || 0),
        paymentReference: payment.paymentReference,
        note: payment.note,
      });
      toast.success(`Payment recorded · receipt ${result.receiptNo}`);
      setPayment({
        amount: "",
        currency: payment.currency,
        discount: "0",
        paymentReference: "",
        note: "",
      });
      await detail.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not record payment",
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  async function reviewPaymentRequest(requestId: string, approve: boolean) {
    try {
      if (approve) await approveResellerPaymentRequest(requestId); else await rejectResellerPaymentRequest(requestId);
      toast.success(approve ? "Reseller payment approved and ledger settled." : "Reseller payment request rejected.");
      await detail.refetch();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not review payment request."); }
  }

  if (detail.isLoading)
    return (
      <AdminShell title="Reseller">
        <div className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-10 text-sm text-muted-foreground">
          Loading reseller account...
        </div>
      </AdminShell>
    );

  if (detail.isError || !reseller)
    return (
      <AdminShell title="Reseller">
        <div className="mx-auto max-w-6xl rounded-3xl border border-rose-200 bg-rose-50 p-10 text-sm text-rose-900">
          <div className="font-black">Could not open this reseller profile.</div>
          <div className="mt-2 text-rose-700">
            {detail.error instanceof Error
              ? detail.error.message
              : "The reseller record could not be loaded."}
          </div>
          <a
            href="/admin/resellers"
            className="mt-5 inline-flex rounded-xl bg-foreground px-4 py-2 font-bold text-background"
          >
            Back to reseller accounts
          </a>
        </div>
      </AdminShell>
    );

  return (
    <AdminShell title="Reseller details">
      <section className="mx-auto max-w-7xl space-y-6">
        <Link
          to="/admin/resellers"
          className="inline-flex items-center gap-2 text-sm font-bold text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> All resellers
        </Link>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickCard
            label="BDT outstanding"
            value={formatMoney(Number(detail.data?.balances?.BDT || 0), "BDT")}
            hint="Live ledger balance"
            tone="amber"
          />
          <QuickCard
            label="Credit available"
            value={
              reseller.creditLimitBDT
                ? formatMoney(
                    Math.max(
                      0,
                      reseller.creditLimitBDT -
                        Math.max(0, Number(detail.data?.balances?.BDT || 0)),
                    ),
                    "BDT",
                  )
                : "No limit"
            }
            hint={
              reseller.creditLimitBDT
                ? `Limit ${formatMoney(reseller.creditLimitBDT, "BDT")}`
                : "Unlimited credit policy"
            }
            tone="blue"
          />
          <QuickCard
            label="Assigned products"
            value={String(reseller.visibleProductCount || 0)}
            hint="Visible in reseller catalog"
            tone="emerald"
          />
          <QuickCard
            label="Open invoices"
            value={String(openInvoices.length)}
            hint="Due / partially paid orders"
            tone="rose"
          />
        </div>
        {(detail.data?.paymentRequests || []).some((request) => request.status === "pending") && <section className="rounded-3xl border border-warning/30 bg-warning/10 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-warning">Payment approval waiting</h2><p className="text-sm text-muted-foreground">The reseller submitted a due payment. Verify the transaction ID, then approve to clear invoices.</p></div><span className="animate-pulse rounded-full bg-warning/20 px-3 py-1 text-xs font-black text-warning">ACTION NEEDED</span></div><div className="mt-4 space-y-2">{detail.data?.paymentRequests.filter((request) => request.status === "pending").map((request) => <div key={request._id || request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"><div><div className="font-bold">{formatMoney(request.amount, request.currency)} via {request.channel}</div><div className="mt-1 font-mono text-xs text-muted-foreground">Transaction: {request.transactionId}</div></div><div className="flex gap-2"><button onClick={() => reviewPaymentRequest(request._id || request.id || "", true)} className="rounded-xl bg-success px-4 py-2 text-sm font-bold text-white">Approve payment</button><button onClick={() => reviewPaymentRequest(request._id || request.id || "", false)} className="rounded-xl border border-destructive/30 px-4 py-2 text-sm font-bold text-destructive">Reject</button></div></div>)}</div></section>}
        <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveProfile(event.currentTarget);
            }}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.15em] text-primary">
                  Reseller profile
                </div>
                <h2 className="mt-1 text-2xl font-black">{reseller.email}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Google sign-in links this profile automatically.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {reseller.status}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field
                label="Display name"
                name="name"
                defaultValue={reseller.name}
              />
              <label className="block text-xs font-bold text-muted-foreground">
                Status
                <select
                  name="status"
                  defaultValue={reseller.status}
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                >
                  <option value="invited">Invited</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              <Field
                label="BDT credit limit (0 = no limit)"
                name="limit"
                type="number"
                defaultValue={String(reseller.creditLimitBDT || 0)}
              />
              <Field
                label="Current due (read-only)"
                name="due"
                readOnly
                value={
                  Object.entries(detail.data?.balances || {})
                    .filter(([, amount]) => Number(amount) > 0)
                    .map(([currency, amount]) =>
                      formatMoney(Number(amount), currency as CurrencyCode),
                    )
                    .join(" · ") || "Clear"
                }
              />
            </div>
            <label className="mt-3 block text-xs font-bold text-muted-foreground">
              Internal admin note
              <textarea
                name="note"
                defaultValue={reseller.internalNote || ""}
                placeholder="Credit agreement, support note, etc."
                className="mt-1.5 min-h-24 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
              />
            </label>
            <button
              disabled={savingProfile}
              className="btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
            >
              <Save className="h-4 w-4" />{" "}
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
          <form
            onSubmit={savePayment}
            className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[.08] via-card to-cyan-50 p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-lg font-black">
              <CreditCard className="h-5 w-5 text-primary" /> Record payment /
              discount
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Adds an immutable receipt row and decreases the reseller’s due.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field
                label="Settlement amount (payment + discount)"
                type="number"
                value={payment.amount}
                onChange={(value) => setPayment({ ...payment, amount: value })}
              />
              <label className="block text-xs font-bold text-muted-foreground">
                Currency
                <select
                  value={payment.currency}
                  onChange={(event) =>
                    setPayment({
                      ...payment,
                      currency: event.target.value as CurrencyCode,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
                >
                  <option>BDT</option>
                  <option>USDT</option>
                  <option>USD</option>
                </select>
              </label>
              <Field
                label="Extra discount (optional)"
                type="number"
                value={payment.discount}
                onChange={(value) =>
                  setPayment({ ...payment, discount: value })
                }
              />
              <Field
                label="Payment reference"
                value={payment.paymentReference}
                onChange={(value) =>
                  setPayment({ ...payment, paymentReference: value })
                }
                placeholder="bKash trx / bank ref"
              />
            </div>
            <label className="mt-3 block text-xs font-bold text-muted-foreground">
              Note
              <textarea
                value={payment.note}
                onChange={(event) =>
                  setPayment({ ...payment, note: event.target.value })
                }
                className="mt-1.5 min-h-20 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
              />
            </label>
            <button
              disabled={paymentSaving}
              className="btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
            >
              <ReceiptText className="h-4 w-4" />{" "}
              {paymentSaving ? "Recording..." : "Record payment"}
            </button>
          </form>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-lg font-black">
                <ReceiptText className="h-5 w-5 text-primary" /> Due invoices &
                payment receipt status
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Every reseller order becomes an invoice. Payments and discounts
                are applied oldest-first, so the remaining due is clear.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {openInvoices.length} open
            </span>
          </div>
          <DateHistoryNavigator className="mt-4" value={historyDate} onChange={setHistoryDate} visibleCount={dailyInvoices.length} totalCount={invoices.length} />
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-secondary/35 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Order invoice</th>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Issued</th>
                  <th className="px-3 py-3 text-right">Original</th>
                  <th className="px-3 py-3 text-right">Paid / discount</th>
                  <th className="px-3 py-3 text-right">Due</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {dailyInvoices.map((invoice) => (
                  <tr
                    key={invoice._id || invoice.id}
                    className="border-b border-border/70"
                  >
                    <td className="px-3 py-3 font-mono text-xs">
                      {invoice.orderId}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {invoice.productTitle}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatMoney(invoice.originalAmount, invoice.currency)}
                    </td>
                    <td className="px-3 py-3 text-right text-emerald-700">
                      <div>Paid {formatMoney(invoice.paidAmount || 0, invoice.currency)}</div>
                      {(invoice.discountAmount || 0) > 0 && <div className="mt-1 text-xs font-medium text-sky-700">Discount {formatMoney(invoice.discountAmount || 0, invoice.currency)}</div>}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-amber-700">
                      {formatMoney(
                        invoice.remainingAmount || 0,
                        invoice.currency,
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${invoice.status === "paid" ? "bg-emerald-100 text-emerald-700" : invoice.status === "partial" ? "bg-sky-100 text-sky-700" : invoice.status === "void" ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {invoice.status === "void" ? "void (rejected)" : invoice.status}
                      </span>
                      {invoice.status === "void" && invoice.voidReason && (
                        <div className="mt-1 max-w-40 text-[10px] text-muted-foreground">
                          {invoice.voidReason}
                        </div>
                      )}
                      {invoice.lastReceiptNo && (
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {invoice.lastReceiptNo}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!dailyInvoices.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      {invoices.length ? "No invoices on this date." : "No reseller credit orders yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-lg font-black">
                <PackageCheck className="h-5 w-5 text-primary" /> Product access
                & custom prices
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Only products marked visible will appear to this reseller after
                Google login.
              </p>
            </div>
            <input
              value={filters.product}
              onChange={(event) =>
                setFilters({ ...filters, product: event.target.value })
              }
              placeholder="Find product..."
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-5 space-y-3">
            {products.map((config) => (
              <ProductAccessForm
                key={config.product._id}
                config={config}
                onSave={saveProductAccess}
              />
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-lg font-black">
              <WalletCards className="h-5 w-5 text-primary" /> Date-wise
              statement
            </div>
            <input
              value={filters.statement}
              onChange={(event) =>
                setFilters({ ...filters, statement: event.target.value })
              }
              placeholder="Search receipt, order or note..."
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <DateHistoryNavigator className="mt-4" value={historyDate} onChange={setHistoryDate} visibleCount={statement.length} totalCount={detail.data?.statement.length || 0} />
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Order / receipt</th>
                  <th className="pb-3 pr-4">Note</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {statement.map((entry) => (
                  <tr
                    key={entry._id || entry.id}
                    className="border-b border-border/70"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 capitalize">
                      {entry.kind.replace("_", " ")}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {entry.orderId || entry.receiptNo || "—"}
                      {entry.receiptNo && entry.orderId
                        ? ` · ${entry.receiptNo}`
                        : ""}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {entry.paymentReference || entry.note || "—"}
                    </td>
                    <td
                      className={`py-3 text-right font-bold ${entry.amount > 0 ? "text-amber-700" : "text-emerald-700"}`}
                    >
                      {entry.amount > 0 ? "+ " : "− "}
                      {formatMoney(Math.abs(entry.amount), entry.currency)}
                    </td>
                  </tr>
                ))}
                {!statement.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {(detail.data?.statement || []).length ? "No statement activity on this date." : "No statement entries yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function ProductAccessForm({
  config,
  onSave,
}: {
  config: ResellerProductConfig;
  onSave: (
    config: ResellerProductConfig,
    form: HTMLFormElement,
  ) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const access = config.access;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        await onSave(config, event.currentTarget);
        setSaving(false);
      }}
      className="rounded-2xl border border-border bg-secondary/[.25] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold">{config.product.title}</div>
          <div className="text-xs text-muted-foreground">
            Default: {formatMoney(config.product.priceBDT ?? 0, "BDT")} · {config.product.priceUSDT ?? 0} USDT
          </div>
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold">
          <input
            name="visible"
            type="checkbox"
            defaultChecked={access?.isVisible || false}
          />{" "}
          Show product
        </label>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <MiniField
          name="bdt"
          label="BDT price"
          defaultValue={access?.priceBDT}
        />
        <MiniField
          name="usdt"
          label="USDT price"
          defaultValue={access?.priceUSDT}
        />
        <MiniField
          name="usd"
          label="USD price"
          defaultValue={access?.priceUSD}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          name="note"
          defaultValue={access?.note || ""}
          placeholder="Internal product note (optional)"
          className="min-w-52 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm"
        />
        <button
          disabled={saving}
          className="btn-ghost rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save access"}
        </button>
      </div>
    </form>
  );
}

function QuickCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "amber" | "blue" | "emerald" | "rose";
}) {
  const colors = {
    amber: "border-amber-200 bg-amber-50",
    blue: "border-sky-200 bg-sky-50",
    emerald: "border-emerald-200 bg-emerald-50",
    rose: "border-rose-200 bg-rose-50",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[tone]}`}>
      <div className="text-xs font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block text-xs font-bold text-muted-foreground">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground read-only:bg-secondary"
      />
    </label>
  );
}
function MiniField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: number | null;
}) {
  return (
    <label className="text-xs font-bold text-muted-foreground">
      {label}
      <input
        name={name}
        type="number"
        step="0.01"
        defaultValue={defaultValue ?? ""}
        placeholder="Use default"
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}
