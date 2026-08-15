import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileText, KeyRound, Loader2, MailCheck, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { deleteMailTxtFile, fetchAdminLoginCode, getMailTxtFiles, type LoginCodeResult, uploadMailTxtFile } from "@/lib/api";
import { useAdminAuthReady } from "@/hooks/use-admin-auth-ready";

export const Route = createFileRoute("/admin/mail-txt")({ component: MailTxtPage });

function MailTxtPage() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const adminReady = useAdminAuthReady();
  const { data: files = [], isLoading } = useQuery({ queryKey: ["mail-txt-files"], queryFn: getMailTxtFiles, enabled: adminReady });
  const [busy, setBusy] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<(LoginCodeResult & { fileName?: string }) | null>(null);

  async function getCode() {
    if (!lookupEmail.trim() || lookupBusy) return toast.error("Enter an email address.");
    setLookupBusy(true);
    setLookupResult(null);
    try {
      const result = await fetchAdminLoginCode(lookupEmail);
      setLookupResult(result);
      toast.success("Latest login code loaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not get the latest code.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function upload(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const text = await file.text();
      const saved = await uploadMailTxtFile({ name: file.name, text });
      qc.setQueryData(["mail-txt-files"], (current: unknown) => [saved, ...((Array.isArray(current) ? current : []) as typeof files)]);
      await qc.invalidateQueries({ queryKey: ["mail-txt-files"] });
      await qc.refetchQueries({ queryKey: ["mail-txt-files"], type: "active" });
      toast.success(`${saved.accountCount} mail accounts saved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload TXT file");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <AdminShell title="Mail TXT">
      <section className="mb-6 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-cyan-50/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary"><MailCheck className="h-3.5 w-3.5" /> Admin code reader</div>
            <h2 className="mt-3 font-display text-xl font-black">Get login code by email</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">Paste any email saved in Mail TXT. This admin tool is always available and does not use the customer's order access period.</p>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
            <input type="email" value={lookupEmail} onChange={(event) => setLookupEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") getCode(); }} placeholder="account@example.com" className="input min-w-0 flex-1" />
            <button disabled={lookupBusy} onClick={getCode} className="btn-primary inline-flex min-w-36 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-60">{lookupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Get code</button>
          </div>
        </div>
        {lookupResult && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-success/25 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="text-[10px] font-black uppercase tracking-wider text-success">Latest code</div><div className="mt-1 font-mono text-3xl font-black tracking-[0.18em]">{lookupResult.code}</div><div className="mt-1 text-xs text-muted-foreground">{lookupResult.subject || "Latest email"}{lookupResult.receivedAt ? ` · ${new Date(lookupResult.receivedAt).toLocaleString()}` : ""}{lookupResult.fileName ? ` · ${lookupResult.fileName}` : ""}</div></div>
            <button onClick={async () => { await navigator.clipboard.writeText(lookupResult.code); toast.success("Code copied"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold"><Copy className="h-4 w-4" /> Copy</button>
          </div>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <section className="glass rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-foreground">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Upload mail TXT</h2>
              <p className="mt-1 text-sm text-muted-foreground">Used by login-code products to read the buyer's delivered inbox.</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required line format</div>
            <div className="mt-2 break-all font-mono text-xs text-foreground">email | password | refresh_token | client_id</div>
          </div>

          <input ref={fileInput} type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <button disabled={busy} onClick={() => fileInput.current?.click()} className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-60">
            <Upload className="h-4 w-4" /> {busy ? "Uploading..." : "Choose TXT file"}
          </button>
        </section>

        <section className="glass overflow-hidden rounded-3xl">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-lg font-bold">Saved TXT files</h2>
            <p className="mt-1 text-sm text-muted-foreground">Backend will match delivered email against these files when buyer clicks Get code.</p>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No TXT files uploaded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">File</th>
                  <th>Accounts</th>
                  <th>Date</th>
                  <th className="px-5 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-t border-border">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary"><FileText className="h-4 w-4" /></span>
                        <div>
                          <div className="font-semibold">{file.name}</div>
                          {file.uploadedBy && <div className="text-xs text-muted-foreground">Uploaded by {file.uploadedBy}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{file.accountCount}</td>
                    <td className="text-xs text-muted-foreground">{new Date(file.dateAdded).toLocaleString()}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={async () => {
                          await deleteMailTxtFile(file.id);
                          qc.setQueryData(["mail-txt-files"], (current: unknown) => ((Array.isArray(current) ? current : []) as typeof files).filter((item) => item.id !== file.id));
                          await qc.invalidateQueries({ queryKey: ["mail-txt-files"] });
                          await qc.refetchQueries({ queryKey: ["mail-txt-files"], type: "active" });
                          toast.success("TXT file removed");
                        }}
                        className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
