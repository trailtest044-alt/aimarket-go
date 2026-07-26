import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { adminLogin } from "@/lib/api";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-logo";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: `Admin Login — ${BRAND.name}` }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const ok = await adminLogin(email, password);
    setLoading(false);
    if (ok) {
      toast.success("Welcome back");
      navigate({ to: "/admin" });
    } else {
      toast.error("Invalid credentials");
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute left-1/2 top-[-220px] -z-10 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-[conic-gradient(from_140deg,oklch(0.62_0.22_288/0.25),oklch(0.72_0.15_218/0.18),oklch(0.62_0.22_288/0.25))] blur-3xl animate-spin-slow" />

      <div className="w-full max-w-md animate-rise-lg">
        <div className="mb-6 flex flex-col items-center">
          <BrandMark className="h-16 w-16 animate-float-y" />
          <h1 className="mt-5 font-display text-2xl font-bold">Admin sign-in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage products, stock and orders.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-3xl p-6">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-x mt-1.5 w-full px-3.5 py-2.5 text-sm"
              required
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-x mt-1.5 w-full px-3.5 py-2.5 text-sm"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Sign in
          </button>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Secure backend authentication is enabled.
          </p>
        </form>
      </div>
    </div>
  );
}
