import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Mail, Phone, Search, UserRound } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { searchCustomers } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";

export const Route = createFileRoute("/admin/customers/search")({ component: CustomerSearchPage });

function CustomerSearchPage() {
  const adminReady = useAdminAuthReady();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data: customers = [], isFetching } = useQuery({
    queryKey: ["customer-directory", submitted],
    queryFn: () => searchCustomers(submitted),
    enabled: adminReady && submitted.length >= 2,
  });

  return (
    <AdminShell title="Customer Search">
      <section className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-cyan-50 p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><UserRound className="h-3.5 w-3.5" /> Support-ready customer directory</div>
          <h2 className="mt-3 font-display text-2xl font-black">Find any customer in seconds</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Search by Gmail, customer name, WhatsApp, order ID, transaction ID, or reference number.</p>
          <form onSubmit={(event) => { event.preventDefault(); setSubmitted(query.trim()); }} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
              <Search className="h-5 w-5 text-primary" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="name@gmail.com, customer name, order ID..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <button type="submit" disabled={query.trim().length < 2} className="btn-primary rounded-2xl px-6 py-3 text-sm font-bold disabled:opacity-50">Search customer</button>
          </form>
        </div>

        {submitted && (
          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Results for “{submitted}”</h3><span className="text-sm text-muted-foreground">{isFetching ? "Searching…" : `${customers.length} found`}</span></div>
            <div className="grid gap-3">
              {customers.map((customer) => (
                <Link key={customer.key} to="/admin/customers/$customerKey" params={{ customerKey: customer.key }} className="group flex items-center gap-4 rounded-2xl border border-border p-4 transition hover:border-primary/35 hover:bg-primary/5">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 font-black text-primary">{(customer.name || customer.email || "C").slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><div className="truncate font-bold">{customer.name || "Customer"}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{customer.email}</span>{customer.whatsapp && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.whatsapp}</span>}</div></div>
                  <div className="text-right"><div className="font-bold text-primary">{customer.orderCount}</div><div className="text-[11px] text-muted-foreground">orders</div></div><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              ))}
              {!isFetching && customers.length === 0 && <div className="rounded-2xl bg-secondary/35 p-8 text-center text-sm text-muted-foreground">No customer found. Try Gmail, name, WhatsApp, order ID, or transaction ID.</div>}
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
