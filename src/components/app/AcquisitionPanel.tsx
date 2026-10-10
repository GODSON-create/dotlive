import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SOURCE_LABELS, type AcquisitionSource } from "@/lib/attribution";
import { Button } from "@/components/ui/button";

const RANGES = [7, 30, 90] as const;

export function AcquisitionPanel() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["acquisition-overview", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_acquisition_overview", { _days: days });
      if (error) throw error;
      return data ?? [];
    },
  });
  const totals = (data ?? []).reduce(
    (t, r) => ({ visits: t.visits + Number(r.visits), visitors: t.visitors + Number(r.visitors), members: t.members + Number(r.members), founders: t.founders + Number(r.founders), ventures: t.ventures + Number(r.ventures) }),
    { visits: 0, visitors: 0, members: 0, founders: 0, ventures: 0 },
  );
  const stats = [
    ["Tracked visits", totals.visits],
    ["Unique visitors", totals.visitors],
    ["Attributed members", totals.members],
    ["Founder profiles", totals.founders],
    ["Ventures named", totals.ventures],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Acquisition</h2>
          <p className="text-sm text-muted-foreground">Where members come from. Audience → members → founders → ventures.</p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Date range">
          {RANGES.map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)} aria-pressed={days === d}>{d}d</Button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="rounded-lg border border-border p-6 text-sm">
          Couldn't load acquisition data. <Button variant="link" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {stats.map(([label, v]) => (
              <div key={label} className="min-w-0 rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{isLoading ? "—" : v.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>{["Source", "Visits", "Visitors", "Members", "Founders", "Ventures"].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(data ?? []).map((r) => (
                  <tr key={r.source} className="border-t border-border tabular-nums">
                    <td className="p-3 font-medium">{SOURCE_LABELS[r.source as AcquisitionSource] ?? r.source}</td>
                    <td className="p-3">{Number(r.visits)}</td>
                    <td className="p-3">{Number(r.visitors)}</td>
                    <td className="p-3">{Number(r.members)}</td>
                    <td className="p-3">{Number(r.founders)}</td>
                    <td className="p-3">{Number(r.ventures)}</td>
                  </tr>
                ))}
                {!isLoading && (data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No tracked visits yet. Share links like /ig, /wa, /tg, /dot, /r/CODE or /c/campaign-name.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Members who signed up before tracking began, or without a tracked link, aren't counted here.</p>
        </>
      )}
    </div>
  );
}
