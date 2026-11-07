import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeChallengeState, configureChallenge, getChallengeReport, reviewChallengeMilestone } from "@/lib/challenge.functions";
import { safeOutbound } from "@/lib/challenge";

export function ChallengeReport() {
  const { user } = useAuth();
  const get = useServerFn(getChallengeReport);
  const configure = useServerFn(configureChallenge);
  const transition = useServerFn(changeChallengeState);
  const review = useServerFn(reviewChallengeMilestone);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["challenge-report", user?.id], queryFn: () => get(), enabled: !!user });
  const [community, setCommunity] = useState("all");
  const [status, setStatus] = useState("all");
  const [reason, setReason] = useState("");
  const mutate = useMutation({ mutationFn: (run: () => Promise<unknown>) => run(), onSuccess: () => { toast.success("Programme record saved"); void qc.invalidateQueries({ queryKey: ["challenge-report"] }); void qc.invalidateQueries({ queryKey: ["challenge-journey"] }); }, onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save programme record") });
  if (query.isPending) return <p className="py-6" role="status"><Loader2 className="mr-2 inline size-4 animate-spin" />Loading programme reporting…</p>;
  if (query.isError || !query.data) return <div className="py-6"><p role="alert">Programme reporting is unavailable or you do not have assigned access.</p><Button variant="outline" className="mt-3" onClick={() => void query.refetch()}>Try again</Button></div>;
  const data = query.data;
  const rows = data.enrollments.filter((e) => (community === "all" || e.community_id === community) && (status === "all" || e.status === status));
  const accepted = data.milestones.filter((m) => m.review_state === "accepted" && rows.some((e) => e.id === m.enrollment_id)).length;
  const metrics = [
    ["Enrollments", rows.length], ["Founder / sponsored", `${rows.filter((e) => e.pass_type === "standard").length} / ${rows.filter((e) => e.pass_type === "sponsored").length}`],
    ["Active / completed", `${rows.filter((e) => e.status === "active").length} / ${rows.filter((e) => e.status === "completed").length}`],
    ["Confirmation exceptions", rows.filter((e) => e.status === "pending_confirmation" || e.payment_state === "failed" || e.sponsorship_state === "rejected").length],
    ["Accepted milestones", `${accepted} / ${rows.length * 7}`],
  ];
  return <section className="py-6">
    <h2 className="font-display text-xl font-semibold">Builders Challenge operations</h2><p className="mt-2 text-sm text-muted-foreground">{data.isAdmin ? "Authorized cross-community reporting." : "Reporting is restricted to your assigned communities."} Community affiliation does not imply a physical hub.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><Label htmlFor="report-community">Community</Label><Select value={community} onValueChange={setCommunity}><SelectTrigger id="report-community" className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All assigned communities</SelectItem>{data.communities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="report-status">Enrollment status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger id="report-status" className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["pending_confirmation", "active", "completed", "cancelled", "rejected"].map((s) => <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">{metrics.map(([name, value]) => <div key={name} className="min-w-0 rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{name}</p><p className="mt-2 text-lg font-semibold tabular-nums">{value}</p></div>)}</div>
    <h3 className="mt-6 font-semibold">Community distribution</h3><div className="mt-3 divide-y divide-border">{data.communities.length ? data.communities.map((c) => <p className="flex flex-wrap justify-between gap-3 py-3 text-sm" key={c.id}><span>{c.name}{c.region ? ` · ${c.region}` : ""}</span><span>{rows.filter((e) => e.community_id === c.id).length} participants</span></p>) : <p className="text-sm text-muted-foreground">No assigned communities.</p>}<p className="py-3 text-sm text-muted-foreground">Unaffiliated: {rows.filter((e) => !e.community_id).length}</p></div>
    {data.isAdmin && <>
      <details className="mt-6 border-y border-border py-4"><summary className="cursor-pointer font-semibold">Programme configuration</summary><form key={JSON.stringify(data.settings)} className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutate.mutate(() => configure({ data: { registration: form.get("registration") === "on", standard: Number(form.get("standard")), sponsored: Number(form.get("sponsored")), duration: Number(form.get("duration")), catalogue: form.get("catalogue") === "on", reason: String(form.get("reason") ?? "") } })); }}>
        <div className="flex items-center gap-2"><Checkbox id="registration-enabled" name="registration" defaultChecked={data.settings.registration_enabled} /><Label htmlFor="registration-enabled">Enrollment requests enabled</Label></div><div className="flex items-center gap-2"><Checkbox id="catalogue-visible" name="catalogue" defaultChecked={data.settings.benefit_catalogue_visible} /><Label htmlFor="catalogue-visible">Show benefit reference disclaimer</Label></div>
        <div><Label htmlFor="standard-price">Founder Pass (USD)</Label><Input id="standard-price" name="standard" type="number" min="0.01" step="0.01" defaultValue={data.settings.standard_price_usd} className="mt-2" required /></div><div><Label htmlFor="sponsored-price">Sponsored contribution (USD)</Label><Input id="sponsored-price" name="sponsored" type="number" min="0.01" step="0.01" defaultValue={data.settings.sponsored_contribution_usd} className="mt-2" required /></div>
        <div><Label htmlFor="challenge-duration">Journey duration (days)</Label><Input id="challenge-duration" name="duration" type="number" min="1" max="366" defaultValue={data.settings.duration_days} className="mt-2" required /></div><div><Label htmlFor="start-rule">Start rule</Label><Input id="start-rule" value="Confirmed individual start" readOnly className="mt-2" /></div>
        <div className="sm:col-span-2"><Label htmlFor="settings-reason">Reason for change</Label><Input id="settings-reason" name="reason" minLength={3} maxLength={1000} required className="mt-2" /></div><Button type="submit" className="w-fit" disabled={mutate.isPending}>Save settings</Button><p className="text-xs text-muted-foreground">Enabling requests does not enable payment, activation or credit issuance. Prices and duration are snapshotted on each request.</p>
      </form></details>
      <div className="mt-5"><Label htmlFor="challenge-review-reason">Decision / review reason</Label><Input id="challenge-review-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2" maxLength={1000} /></div>
    </>}
    <h3 className="mt-6 font-semibold">Participant records</h3>{!rows.length ? <p className="mt-3 text-sm text-muted-foreground">No challenge enrollment records match these filters.</p> : <div className="mt-3 divide-y divide-border">{rows.map((e) => <article key={e.id} className="min-w-0 py-5"><p className="break-all text-sm font-semibold">Participant {e.participant_id}</p><p className="mt-2 text-xs text-muted-foreground">{e.pass_type} · USD ${e.contribution_usd} contribution · {e.status.replaceAll("_", " ")}</p><p className="mt-2 text-xs text-muted-foreground">Payment: {e.payment_state} · Sponsorship: {e.sponsorship_state.replaceAll("_", " ")} · Credits: {e.credit_state.replaceAll("_", " ")}</p>{e.review_note && <p className="mt-2 break-words text-sm">{e.review_note}</p>}
      {data.isAdmin && <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled>Confirmation / activation paused</Button>{e.status === "pending_confirmation" && <Button variant="outline" size="sm" disabled={mutate.isPending || reason.trim().length < 3} onClick={() => mutate.mutate(() => transition({ data: { id: e.id, action: "reject", reason } }))}>Reject request</Button>}{e.status === "active" && <Button variant="outline" size="sm" disabled={mutate.isPending || reason.trim().length < 3} onClick={() => mutate.mutate(() => transition({ data: { id: e.id, action: "complete", reason } }))}>Review completion</Button>}</div>}
      <div className="mt-3">{data.milestones.filter((m) => m.enrollment_id === e.id).map((m) => <div className="mt-3 border-l border-border pl-3" key={m.id}><p className="text-sm">{m.milestone_key} · {m.review_state.replaceAll("_", " ")}</p><p className="mt-1 break-words text-xs text-muted-foreground">{m.participant_note}</p>{safeOutbound(m.evidence_url) && <a href={m.evidence_url ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-primary underline">Open evidence</a>}{data.isAdmin && <div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={mutate.isPending || reason.trim().length < 3} onClick={() => mutate.mutate(() => review({ data: { id: m.id, state: "accepted", reason } }))}>Accept evidence</Button><Button variant="outline" size="sm" disabled={mutate.isPending || reason.trim().length < 3} onClick={() => mutate.mutate(() => review({ data: { id: m.id, state: "changes_requested", reason } }))}>Request changes</Button></div>}</div>)}</div>
    </article>)}</div>}
    <p className="mt-6 text-xs text-muted-foreground">Checkout, payment/sponsorship confirmation, activation and 2,000 DOT delivery are disabled in this phase. No wallet settings or balances are changed here.</p>
  </section>;
}