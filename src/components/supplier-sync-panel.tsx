import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupplierSync, retrySupplierSync } from '@/lib/api';
import { toast } from 'sonner';
export function SupplierSyncPanel() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['supplier-sync'], queryFn: getSupplierSync, refetchInterval: 30000 });
  const retry = useMutation({ mutationFn: retrySupplierSync, onSuccess: result => {
    if (result.error) toast.error(result.error);
    else if (result.busy) toast.info('Sync is already running');
    else if (result.configured === false) toast.error('Configure the Plandaw API key on the backend first');
    else toast.success('Sync completed');
    void client.invalidateQueries({ queryKey: ['supplier-sync'] });
  }, onError: (e: Error) => toast.error(e.message) });
  const state = query.data?.state;
  return <section className="mb-4 rounded-xl border bg-card p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Plandaw connection & sync</h2><button className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" disabled={retry.isPending || !query.data?.configured} onClick={() => retry.mutate()}>{retry.isPending ? 'Syncing…' : 'Retry now'}</button></div><p className="mt-2 text-sm text-muted-foreground">{query.isError ? 'Could not load sync status.' : query.isLoading ? 'Loading…' : !query.data?.configured ? 'Set PLANDAW_PARTNER_API_KEY in the backend to connect.' : state?.lastError || 'Automatic product import and order reservation retry enabled.'}</p>{state && <p className="mt-2 text-xs">Last successful sync: {state.lastSuccessAt ? new Date(state.lastSuccessAt).toLocaleString() : 'Not yet'} · Imported: {state.imported || 0} · Consecutive failures: {state.failures || 0}{state.nextAttemptAt ? ' · Next attempt: ' + new Date(state.nextAttemptAt).toLocaleString() : ''}</p>}</section>;
}
