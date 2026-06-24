import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Sparkles, Loader2, Lock } from "lucide-react";
import { adminLogin } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Admin Login — AIMarket" }, { name: "robots", content: "noindex" }],
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
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-6 flex flex-col items-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Admin Sign-in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage products, stock and orders.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6">
          <label className="block">
            <span className="text-xs text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-xl bg-input/50 px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-primary"
              required
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl bg-input/50 px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-primary"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
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
