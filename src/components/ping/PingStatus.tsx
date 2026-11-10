import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyPingStatus, getCommunityPingHubStatus, getPingAdminSummary } from "@/lib/ping.functions";

export function PingConnectCard() {
  const fn = useServerFn(getMyPingStatus);
  const { data, isLoading, isError } = useQuery({ queryKey: ["ping", "me"], queryFn: () => fn() });
  const text = isLoading ? "Checking Ping connection…" : isError ? "Ping status could not be loaded."
    : data?.state === "linked" ? `Ping connected since ${new Date(data.linkedAt).toLocaleDateString()}.`
    : data?.state === "not_linked" ? "Ping linking opens once the Ping connection is verified."
    : "Ping connection not configured yet.";
  return (
    <section className="glass rounded-2xl p-5" aria-label="Ping connection">
      <p className="font-display font-semibold">Ping</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </section>
  );
}

export function PingHubStatus({ communityId }: { communityId: string }) {
  const fn = useServerFn(getCommunityPingHubStatus);
  const { data } = useQuery({ queryKey: ["ping", "hub", communityId], queryFn: () => fn({ data: { id: communityId } }) });
  if (!data) return null;
  const label = data.hub === "connected" ? "Ping Hub connected" : data.hub === "pending" ? "Ping Hub sync pending" : "Ping Hub not connected";
  return <p className="mt-4 text-xs text-muted-foreground">{label}{!data.configured && " · Ping connection not configured yet"}</p>;
}

export function PingAdminPanel() {
  const fn = useServerFn(getPingAdminSummary);
  const { data, isLoading, error } = useQuery({ queryKey: ["ping", "admin"], queryFn: () => fn() });
  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />;
  if (error || !data) return <p role="alert" className="text-sm text-destructive">{(error as Error)?.message ?? "Unavailable"}</p>;
  const stats: [string, string | number][] = [
    ["Configuration", data.config.state.replace("_", " ")],
    ["Linked accounts", data.linked_accounts],
    ["Mapped Hubs", data.mapped_hubs],
    ["Pending sync events", data.outbox_pending],
    ["Failed sync events", data.outbox_failed],
    ["Last successful sync", data.last_successful_sync ? new Date(data.last_successful_sync).toLocaleString() : "Never"],
  ];
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">Ping is not connected. Events queue here until Ping's API is verified; nothing is sent.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="glass rounded-2xl p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 font-display text-xl font-semibold capitalize tabular-nums">{v}</p></div>
        ))}
      </div>
      {data.config.problems.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-muted-foreground">{data.config.problems.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
      {data.recent_errors.length > 0 && (
        <ul className="text-sm">{data.recent_errors.map((e, i) => <li key={i}>{e.event_type}: {e.last_error} (retries {e.retry_count})</li>)}</ul>
      )}
    </div>
  );
}
