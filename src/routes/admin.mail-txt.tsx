import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { deleteMailTxtFile, getMailTxtFiles, uploadMailTxtFile } from "@/lib/api";

export const Route = createFileRoute("/admin/mail-txt")({ component: MailTxtPage });

function MailTxtPage() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const { data: files = [], isLoading } = useQuery({ queryKey: ["mail-txt-files"], queryFn: getMailTxtFiles });
  const [busy, setBusy] = useState(false);

  async function upload(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const text = await file.text();
      const saved = await uploadMailTxtFile({ name: file.name, text });
      await qc.invalidateQueries({ queryKey: ["mail-txt-files"] });
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
                          await qc.invalidateQueries({ queryKey: ["mail-txt-files"] });
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
