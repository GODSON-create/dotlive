import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MILESTONES, nextMilestone, safeOutbound } from "@/lib/challenge";
import { changeChallengeState, getChallengeJourney, requestChallenge, saveChallengeProgress } from "@/lib/challenge.functions";

export function ChallengeJourney({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const get = useServerFn(getChallengeJourney);
  const request = useServerFn(requestChallenge);
  const save = useServerFn(saveChallengeProgress);
  const transition = useServerFn(changeChallengeState);
  const query = useQuery({ queryKey: ["challenge-journey", user?.id], queryFn: () => get(), enabled: !!user, refetchInterval: 60_000 });
  const [pass, setPass] = useState<"standard" | "sponsored">("standard");
  const [community, setCommunity] = useState("none");
  const [milestone, setMilestone] = useState<(typeof MILESTONES)[number]["key"]>("onboarding");
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState("");
  const [pingUpdate, setPingUpdate] = useState("");
  const [pingProfile, setPingProfile] = useState("");
  const action = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["challenge-journey"] }); void qc.invalidateQueries({ queryKey: ["challenge-report"] }); toast.success("Challenge record saved"); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save your record"),
  });
  const data = query.data;
  const enrollment = data?.enrollment;
  const next = nextMilestone(data?.milestones ?? []);
  const live = enrollment?.status === "active" && !data?.clock.ended;
  const ping = safeOutbound(enrollment?.ping_profile_url);

  if (query.isPending) return <section className="mt-6 border-y border-border py-6" role="status"><Loader2 className="mr-2 inline size-4 animate-spin" />Loading Builders Challenge…</section>;
  if (query.isError || !data) return <section className="mt-6 border-y border-border py-6"><p role="alert">Your challenge workspace could not be loaded.</p><Button variant="outline" className="mt-3" onClick={() => void query.refetch()}>Try again</Button></section>;

  return <section className={compact ? "mt-6 border-y border-border py-6" : "py-6"}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><p className="flex items-center gap-2 text-sm text-primary"><CalendarDays className="size-4" />Individual progression</p><h2 className="mt-2 font-display text-2xl font-semibold">DOT Builders Challenge</h2><p className="mt-2 text-sm text-muted-foreground">Your own {enrollment?.duration_days ?? data.settings.duration_days}-day journey, starting only after confirmation.</p></div>
      {compact && <Button variant="outline" asChild><Link to="/challenge">Open journey <ArrowUpRight /></Link></Button>}
    </div>
    {!enrollment || ["cancelled", "rejected"].includes(enrollment.status) ? <div className="mt-5">
      {enrollment && <p className="mb-3 text-sm text-muted-foreground">Previous request: {enrollment.status}. {enrollment.review_note}</p>}
      <p className="text-sm">{data.settings.registration_enabled ? "Enrollment requests are open. Payment and sponsorship confirmation are still paused." : "Registration is not open yet. ARISE handles public programme acquisition; DOT is your participant workspace."}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="challenge-pass">Pass type</Label><Select value={pass} onValueChange={(v) => setPass(v === "sponsored" ? "sponsored" : "standard")}><SelectTrigger id="challenge-pass" className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Founder Pass · USD ${data.settings.standard_price_usd}</SelectItem><SelectItem value="sponsored">Sponsored Pass · USD ${data.settings.sponsored_contribution_usd}</SelectItem></SelectContent></Select></div>
        <div><Label htmlFor="challenge-community">Your community</Label><Select value={community} onValueChange={setCommunity}><SelectTrigger id="challenge-community" className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No community affiliation</SelectItem>{data.communities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">The sponsored contribution is participant-funded; the remaining programme cost requires sponsorship confirmation.</p>
      <Button className="mt-4" disabled={!data.settings.registration_enabled || action.isPending} onClick={() => action.mutate(() => request({ data: { pass, community: community === "none" ? null : community } }))}>{action.isPending && <Loader2 className="size-4 animate-spin" />}Request enrollment</Button>
    </div> : <div className="mt-5">
      <p className="text-sm capitalize">{enrollment.pass_type} pass · {enrollment.status.replaceAll("_", " ")}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[{ title: "Days elapsed", value: enrollment.start_at ? data.clock.elapsed : "Not started" }, { title: "Days remaining", value: data.clock.remaining ?? "Awaiting confirmation" }, { title: "AVA baseline", value: data.ava.completed ? "Recorded" : "Not assessed" }, { title: "Learning", value: `${data.learning.completed} modules completed` }].map((item) => <div key={item.title} className="min-w-0 rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{item.title}</p><p className="mt-2 break-words text-sm font-semibold tabular-nums">{item.value}</p></div>)}
      </div>
      <p className="mt-4 text-sm"><span className="font-semibold">Next action: </span>{enrollment.status === "pending_confirmation" ? "Await verified payment, sponsorship and eligibility confirmation." : enrollment.status === "completed" ? "Journey complete. Review your progress records." : data.clock.ended ? "Your journey period has ended. Await completion review." : next?.action ?? "Await completion review."}</p>
      {enrollment.start_at && <p className="mt-2 text-xs text-muted-foreground">{new Date(enrollment.start_at).toLocaleDateString()} – {enrollment.end_at ? new Date(enrollment.end_at).toLocaleDateString() : "—"} · {next?.title ?? "Completion review"}</p>}
      {enrollment.status === "pending_confirmation" && <Button variant="outline" className="mt-3" disabled={action.isPending} onClick={() => action.mutate(() => transition({ data: { id: enrollment.id, action: "cancel", reason: "Participant cancelled pending request" } }))}>Cancel request</Button>}
      {!compact && <>
        <div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" asChild><Link to="/vantage">{data.ava.completed ? "Review AVA" : "Start complimentary AVA"} <ArrowUpRight /></Link></Button><Button variant="outline" asChild><Link to="/academy">Open learning <ArrowUpRight /></Link></Button>{ping && <Button variant="outline" asChild><a href={ping} target="_blank" rel="noopener noreferrer">Open your Ping link <ArrowUpRight /></a></Button>}</div>
        <p className="mt-3 text-xs text-muted-foreground">One complimentary AVA assessment remains free. Existing assessment and learning records are shown as recorded, not as reviewed programme evidence. Ping links are participant-provided; no Ping activity is verified here.</p>
        <h3 className="mt-7 font-display text-lg font-semibold">Milestones</h3>
        <div className="mt-3 divide-y divide-border">{MILESTONES.map((m) => { const row = data.milestones.find((r) => r.milestone_key === m.key); const url = safeOutbound(row?.evidence_url); return <div key={m.key} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-medium">{row?.review_state === "accepted" && <CheckCircle2 className="size-4 text-primary" />}{m.title}</p>{row?.review_note && <p className="mt-1 break-words text-xs text-muted-foreground">{row.review_note}</p>}{url && <a className="mt-1 block text-xs text-primary underline" href={url} target="_blank" rel="noopener noreferrer">Open submitted evidence</a>}</div><span className="text-xs text-muted-foreground">{row?.review_state.replaceAll("_", " ") ?? "Not submitted"}</span></div>; })}</div>
        <form className="mt-6 grid gap-4 border-t border-border pt-5" onSubmit={(event) => { event.preventDefault(); action.mutate(() => save({ data: { id: enrollment.id, kind: "milestone", key: milestone, note, evidence: evidence || null, ping: null } })); }}>
          <h3 className="font-semibold">Submit milestone evidence</h3><div><Label htmlFor="challenge-milestone">Milestone</Label><Select value={milestone} onValueChange={(v) => { const match = MILESTONES.find((m) => m.key === v); if (match) setMilestone(match.key); }}><SelectTrigger id="challenge-milestone" className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{MILESTONES.map((m) => <SelectItem key={m.key} value={m.key}>{m.title}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="challenge-note">Progress / evidence summary</Label><Textarea id="challenge-note" className="mt-2" maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} disabled={!live} /></div>
          <div><Label htmlFor="challenge-evidence">Evidence link (HTTPS, optional)</Label><Input id="challenge-evidence" type="url" className="mt-2" value={evidence} onChange={(e) => setEvidence(e.target.value)} disabled={!live} /></div>
          <Button type="submit" className="w-fit" disabled={!live || action.isPending}>Submit for review</Button>
          <div><Label htmlFor="challenge-ping-update">Ping update link (optional)</Label><Input id="challenge-ping-update" type="url" className="mt-2" value={pingUpdate} onChange={(e) => setPingUpdate(e.target.value)} disabled={!live} /></div>
          <Button type="button" variant="outline" className="w-fit" disabled={!live || !note.trim() || action.isPending} onClick={() => action.mutate(() => save({ data: { id: enrollment.id, kind: "checkin", note, evidence: evidence || null, ping: pingUpdate || null } }))}>Save week {data.clock.week ?? "—"} check-in</Button>
        </form>
        <div className="mt-6"><Label htmlFor="challenge-ping-profile">Your Ping profile link</Label><Input id="challenge-ping-profile" type="url" className="mt-2" placeholder="https://" value={pingProfile} onChange={(e) => setPingProfile(e.target.value)} disabled={!live} /><Button variant="outline" className="mt-3" disabled={!live || action.isPending || !safeOutbound(pingProfile)} onClick={() => action.mutate(() => save({ data: { id: enrollment.id, kind: "ping_profile", note: "", evidence: null, ping: pingProfile } }))}>Save outbound link</Button></div>
        <h3 className="mt-7 font-semibold">Weekly progress</h3>{!data.checkins.length ? <p className="mt-3 text-sm text-muted-foreground">No check-ins recorded yet.</p> : <div className="mt-3 divide-y divide-border">{data.checkins.map((c) => <div key={c.id} className="py-3"><p className="text-sm font-medium">Week {c.week_number} · {new Date(c.updated_at).toLocaleDateString()}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{c.progress_note}</p>{safeOutbound(c.ping_update_url) && <a href={c.ping_update_url ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-primary underline">Open Ping update</a>}</div>)}</div>}
      </>}
    </div>}
    <div className="mt-6 border-t border-border pt-4"><Button variant="outline" disabled>Checkout unavailable</Button><p className="mt-3 text-xs text-muted-foreground">{data.checkoutMessage}</p><p className="mt-2 text-xs text-muted-foreground">No DOT credits have been issued by this challenge. The 2,000 DOT programme allocation requires correct confirmation and eligibility checks.</p></div>
    {!compact && <><p className="mt-5 text-sm text-muted-foreground">Up to 50 ventures may be selected for showcase; up to 10 flagship launches may be selected from those 50. Selection is competitive and evidence-based, not purchased. Funding, investment, Spotlight, promotion and Demo Day selection are not promised.</p>{data.settings.benefit_catalogue_visible && <p className="mt-3 text-sm text-muted-foreground">Advertised USD $10,000 participant utility is a catalogue/reference value for eligible services, not cash, withdrawable funds, guaranteed redemption or a guaranteed benefit. No benefit catalogue has been published here.</p>}</>}
  </section>;
}