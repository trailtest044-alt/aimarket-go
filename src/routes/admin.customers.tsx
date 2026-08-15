import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MoreHorizontal, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { createReseller, getAdminCustomerList, getCurrentAdmin } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";

export const Route = createFileRoute("/admin/customers")({ component: CustomerListPage });

function CustomerListPage() {
  const adminReady = useAdminAuthReady();
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const [adding, setAdding] = useState("");
  const isOwner = getCurrentAdmin()?.role === "owner";
  const usersQuery = useQuery({ queryKey: ["admin-customer-list", query], queryFn: () => getAdminCustomerList(query), enabled: adminReady });
  const users = useMemo(() => usersQuery.data || [], [usersQuery.data]);

  async function makeReseller(user: { email: string; name: string }) {
    setAdding(user.email);
    try { await createReseller({ email: user.email, name: user.name }); toast.success("Reseller profile added. It is active because this Gmail is already signed in."); await usersQuery.refetch(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not add reseller"); }
    finally { setAdding(""); setOpenMenu(""); }
  }

  return <AdminShell title="User List"><section className="mx-auto max-w-6xl space-y-5">
    <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-cyan-50 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><Users className="h-3.5 w-3.5" /> Google account directory</div><h2 className="mt-3 font-display text-2xl font-black">Signed-up user profiles</h2><p className="mt-1 text-sm text-muted-foreground">Every Google sign-in creates a saved profile. Use the 3-dot action to promote a profile to reseller.</p></div><Link to="/admin/resellers" className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"><ShieldCheck className="h-4 w-4" /> Manage resellers</Link></div>
      <label className="mt-5 flex max-w-xl items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm"><Search className="h-5 w-5 text-primary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Gmail or name..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
    </div>
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3">Last sign-in</th><th className="px-5 py-3">Access</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-border/70"><td className="px-5 py-4"><Link to="/admin/customers/$customerKey" params={{ customerKey: user.id }} className="flex items-center gap-3 hover:text-primary"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 font-black text-primary">{(user.name || user.email).slice(0, 1).toUpperCase()}</div><div><div className="font-bold">{user.name || "Google user"}</div><div className="text-xs text-muted-foreground">{user.email}</div></div></Link></td><td className="px-5 py-4 text-xs text-muted-foreground">{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : "—"}</td><td className="px-5 py-4 text-xs text-muted-foreground">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}</td><td className="px-5 py-4">{user.reseller ? <Link to="/admin/resellers/$id" params={{ id: user.reseller.id }} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Reseller · {user.reseller.status}</Link> : <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">Customer</span>}</td><td className="relative px-5 py-4 text-right"><button onClick={() => setOpenMenu(openMenu === user.id ? "" : user.id)} className="rounded-lg p-2 hover:bg-secondary"><MoreHorizontal className="h-5 w-5" /></button>{openMenu === user.id && <div className="absolute right-5 top-12 z-20 w-48 rounded-xl border border-border bg-white p-1.5 text-left shadow-xl"><Link to="/admin/customers/$customerKey" params={{ customerKey: user.id }} className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary">Open profile</Link>{isOwner && !user.reseller && <button onClick={() => makeReseller(user)} disabled={adding === user.email} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"><UserPlus className="h-4 w-4" />{adding === user.email ? "Adding..." : "Make reseller"}</button>}{user.reseller && <Link to="/admin/resellers/$id" params={{ id: user.reseller.id }} className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary">Reseller controls</Link>}</div>}</td></tr>)}{!usersQuery.isLoading && users.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">No signed-up user found.</td></tr>}</tbody></table></div></div>
  </section></AdminShell>;
}
