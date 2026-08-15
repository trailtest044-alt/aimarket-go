import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { OrdersTable } from "@/components/orders-table";
import { searchDeliveredProduct } from "@/lib/api";
import { CheckCircle2, Loader2, MailSearch, Search, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders/delivered")({
  head: () => ({ meta: [{ title: "Delivered Orders" }, { name: "robots", content: "noindex" }] }),
  component: DeliveredOrdersPage,
});

function DeliveredOrdersPage() {
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const check = useQuery({
    queryKey: ["delivered-product-check", email],
    queryFn: () => searchDeliveredProduct(email),
    enabled: !!email,
    retry: false,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) return toast.error("Enter a valid account email.");
    setEmail(value);
  }

  return (
    <AdminShell title="Delivered Orders">
      <section className="mb-5 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)] md:p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary"><MailSearch className="h-4 w-4" /> Stock safety check</div>
            <h2 className="mt-3 text-xl font-black">Check delivered product</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">Paste an account email before adding it to stock. We will check only completed deliveries and tell you whether that exact account was sold before.</p>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <MailSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste delivered account email" autoComplete="off" className="input w-full pl-10" />
              </label>
              <button type="submit" disabled={check.isFetching} className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-60">{check.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Check account</button>
            </form>
          </div>
          <div className={`rounded-2xl border p-5 ${!email ? "border-border bg-secondary/20" : check.isError ? "border-destructive/25 bg-destructive/5" : check.data?.sold ? "border-destructive/25 bg-destructive/5" : "border-success/25 bg-success/5"}`}>
            {!email ? <div className="flex h-full min-h-28 flex-col justify-center"><MailSearch className="h-7 w-7 text-muted-foreground" /><div className="mt-3 font-bold">Ready to check</div><p className="mt-1 text-sm text-muted-foreground">No delivery credentials are displayed until you search.</p></div> : check.isFetching ? <div className="flex h-full min-h-28 items-center justify-center gap-3 text-sm font-semibold"><Loader2 className="h-5 w-5 animate-spin" /> Checking delivered orders…</div> : check.isError ? <div className="flex h-full min-h-28 flex-col justify-center text-destructive"><XCircle className="h-7 w-7" /><div className="mt-3 font-bold">Could not check this account</div><p className="mt-1 text-sm">{check.error instanceof Error ? check.error.message : "Please try again."}</p></div> : check.data?.sold ? <div><div className="flex items-center gap-2 font-black text-destructive"><XCircle className="h-6 w-6" /> Already sold</div><p className="mt-1 break-all text-sm font-semibold">{check.data.email}</p><div className="mt-4 max-h-44 space-y-2 overflow-auto">{check.data.matches.map((match) => <div key={match.orderId} className="rounded-xl border border-destructive/15 bg-background/70 p-3 text-xs"><div className="font-bold text-foreground">{match.productTitle}</div><div className="mt-1 font-mono text-muted-foreground">{match.orderId}</div><div className="mt-1 text-muted-foreground">Delivered {new Date(match.deliveredAt).toLocaleString()} {match.resellerOrder ? "• Reseller" : "• Customer"}</div></div>)}</div></div> : <div className="flex h-full min-h-28 flex-col justify-center text-success"><CheckCircle2 className="h-7 w-7" /><div className="mt-3 font-black">No sold match found</div><p className="mt-1 break-all text-sm text-foreground">{check.data?.email}</p><p className="mt-1 text-sm text-muted-foreground">This email was not found in delivered orders.</p></div>}
          </div>
        </div>
      </section>
      <OrdersTable status="delivered" />
    </AdminShell>
  );
}
