import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminCustomerList } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";

export const Route = createFileRoute("/admin/customers")({ component: CustomerListPage });

function CustomerListPage() {
  const ready = useAdminAuthReady();
  const [query, setQuery] = useState("");
  const result = useQuery({ queryKey: ["admin-customer-list", query], queryFn: () => getAdminCustomerList(query), enabled: ready });
  const users = useMemo(() => result.data || [], [result.data]);
  return <AdminShell title="User List"><section className="mx-auto max-w-6xl space-y-5">
    <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-cyan-50 p-6 shadow-sm"><div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><Users className="h-3.5 w-3.5" /> Google account directory</div><h2 className="mt-3 font-display text-2xl font-black">Signed-up user profiles</h2><p className="mt-1 text-sm text-muted-foreground">Every Google sign-in creates a customer profile and links matching orders.</p><label className="mt-5 flex max-w-xl items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm"><Search className="h-5 w-5 text-primary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email or name..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div>
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-secondary/40 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">User</th><th>Joined</th><th>Last sign-in</th><th className="text-right">Profile</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-border/70"><td className="px-5 py-4"><div className="font-bold">{user.name || "Google user"}</div><div className="text-xs text-muted-foreground">{user.email}</div></td><td className="text-xs text-muted-foreground">{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : "—"}</td><td className="text-xs text-muted-foreground">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}</td><td className="px-5 text-right"><Link to="/admin/customers/$customerKey" params={{ customerKey: user.id }} className="rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-secondary">Open profile</Link></td></tr>)}{!result.isLoading && !users.length && <tr><td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">No user found.</td></tr>}</tbody></table></div></div>
  </section></AdminShell>;
}
