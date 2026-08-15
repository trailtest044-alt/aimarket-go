import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { refreshCurrentCustomer, saveCustomerSession } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ServerLoader } from "@/components/server-loader";

export const Route = createFileRoute("/auth/google/callback")({ component: GoogleCallbackPage });

function GoogleCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");
    const returnTo = params.get("returnTo") || "/account";

    if (error || !token) {
      toast.error("Google login failed. Please try again.");
      navigate({ to: "/" });
      return;
    }

    saveCustomerSession(token, {
      name: params.get("name") || "",
      email: params.get("email") || "",
      picture: params.get("picture") || "",
    });
    void refreshCurrentCustomer().then((customer) => {
      if (!customer) {
        toast.error("Could not verify your login session. Please try again.");
        navigate({ to: "/account" });
        return;
      }
      toast.success("Google login successful");
      window.location.replace(returnTo.startsWith("/") ? returnTo : "/account");
    });
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <ServerLoader title="Signing you in..." message="Connecting your secure purchase account." />
      </main>
      <SiteFooter />
    </div>
  );
}
