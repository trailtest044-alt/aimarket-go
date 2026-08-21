import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, Shield, ShieldOff, WalletCards } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { changeOwnPassword, clearAdminDue, createAdminUser, formatMoney, getAdminUsers, getCurrentAdmin, resetAdminPassword, setAdminStatus } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";

export const Route = createFileRoute("/admin/users")({ component: AdminUsersPage });

function AdminUsersPage() {
  const current = getCurrentAdmin();
  const ready = useAdminAuthReady();
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: getAdminUsers, enabled: ready });
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [ownPass, setOwnPass] = useState("");
  const [clearing, setClearing] = useState("");

  if (current?.role !== "owner") return <AdminShell title="Admin Users"><div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">Owner access required.</div></AdminShell>;

  async function refresh() { await qc.invalidateQueries({ queryKey: ["admin-users"] }); await qc.invalidateQueries({ queryKey: ["dashboard"] }); }

  return <AdminShell title="Admin Users">
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-6">
        <div className="glass rounded-3xl p-5"><h2 className="font-semibold">Add New Admin</h2><p className="mt-1 text-xs text-muted-foreground">Admins can approve and deliver orders. Their buying-price due is tracked automatically.</p><div className="mt-4 space-y-3"><F label="Admin Email" value={email} onChange={setEmail} /><F label="Admin Nickname" value={nickname} onChange={setNickname} /><F label="Password" value={password} onChange={setPassword} type="password" /><button onClick={async () => { if (!email || !nickname || password.length < 10) return toast.error("Email, nickname and a 10+ character password are required."); await createAdminUser({ email, nickname, password, role: "admin" }); setEmail(""); setNickname(""); setPassword(""); await refresh(); toast.success("Admin added"); }} className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"><Plus className="h-4 w-4" /> Add Admin</button></div></div>
        <div className="glass rounded-3xl p-5"><h2 className="font-semibold">Change Own Password</h2><div className="mt-4 space-y-3"><F label="New Password" value={ownPass} onChange={setOwnPass} type="password" /><button onClick={async () => { if (ownPass.length < 10) return toast.error("Password must be at least 10 characters."); await changeOwnPassword(ownPass); setOwnPass(""); toast.success("Password changed"); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold"><KeyRound className="h-4 w-4" /> Change Password</button></div></div>
      </div>
      <div className="glass overflow-x-auto rounded-3xl"><table className="w-full min-w-[900px] text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Admin</th><th>Total sales</th><th>Due</th><th>Profit</th><th>Orders</th><th>Status</th><th className="text-right">Actions</th></tr></thead><tbody>{users.map((u) => <tr key={u.id} className="border-t border-border"><td className="px-4 py-4"><div className="font-semibold">{u.nickname}</div><div className="text-xs text-muted-foreground">{u.email}</div><div className="mt-1 text-[10px] uppercase text-muted-foreground">{u.role}</div></td><td>{formatMoney(u.totalSalesPKR || 0, "PKR")}</td><td className="font-bold text-amber-700">{formatMoney(u.duePKR || 0, "PKR")}</td><td className="font-bold text-success">{formatMoney(u.profitPKR || 0, "PKR")}</td><td>{u.orderCount || 0}</td><td><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${u.isActive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{u.isActive ? "active" : "disabled"}</span></td><td className="px-4 text-right"><div className="inline-flex gap-2">{u.role !== "owner" && <button disabled={clearing === u.id || !(u.orderCount || 0)} onClick={async () => { if (!window.confirm(`Clear ${u.nickname}'s current PKR due and start a new cycle?`)) return; try { setClearing(u.id); const result = await clearAdminDue(u.id); await refresh(); toast.success(`Cleared ${formatMoney(result.duePKR, "PKR")} across ${result.orderCount} order(s).`); } finally { setClearing(""); } }} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-800 disabled:opacity-40"><WalletCards className="h-4 w-4" /> {clearing === u.id ? "Clearing..." : "Clear due"}</button>}<button onClick={async () => { const pass = window.prompt(`New password for ${u.nickname}`); if (!pass) return; if (pass.length < 10) return toast.error("Password must be 10+ characters."); await resetAdminPassword(u.id, pass); toast.success("Password reset"); }} className="rounded-lg p-2 hover:bg-secondary" title="Reset password"><KeyRound className="h-4 w-4" /></button>{u.email !== current.email && <button onClick={async () => { await setAdminStatus(u.id, !u.isActive); await refresh(); toast.success(u.isActive ? "Admin disabled" : "Admin enabled"); }} className="rounded-lg p-2 hover:bg-secondary" title={u.isActive ? "Disable admin" : "Enable admin"}>{u.isActive ? <ShieldOff className="h-4 w-4 text-destructive" /> : <Shield className="h-4 w-4 text-success" />}</button>}</div></td></tr>)}</tbody></table></div>
    </div>
  </AdminShell>;
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="text-xs text-muted-foreground">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg bg-input/70 px-3 py-2 text-sm ring-1 ring-border" /></label>;
}
