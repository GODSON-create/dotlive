import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Gauge,
  BookOpen,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  Trophy,
  Coins,
  Shield,
  MessageSquare,
  Clock,
  MapPin,
  Loader2,
  Edit3,
  Users,
  Award,
  Calendar,
  Building2,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  useWallet,
  useFounderProfile,
  useAssessments,
  useMyEnrollments,
  useMyMembership,
  useTransactions,
} from "@/hooks/use-dot-data";
import { JOURNEY_STAGES, dotToNaira, formatDot, formatNaira } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { buyUpgrade } from "@/lib/vantage.functions";
import { toast } from "sonner";
import { ProfileEditDialog } from "@/components/app/ProfileEditDialog";
import { getFounderCampaigns } from "@/lib/spotlight.functions";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DOT" },
      { name: "description", content: "Track your venture progression, Vantage score and DOT wallet." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, primaryRole, roles, user, refresh } = useAuth();
  const wallet = useWallet();
  const balance = wallet.data ?? 0;
  const { data: founder } = useFounderProfile();
  const assessmentQuery = useAssessments();
  const assessments = assessmentQuery.data ?? [];
  const { data: enrollments = [] } = useMyEnrollments();
  const { data: membership } = useMyMembership();
  
  const activityQuery = useTransactions();
  const campaignsFn = useServerFn(getFounderCampaigns);
  const campaigns = useQuery({ queryKey: ["founder-campaigns", user?.id], queryFn: () => campaignsFn(), enabled: !!user });
  const events = useQuery({
    queryKey: ["dashboard-upcoming-event"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").gte("event_date", new Date().toISOString()).order("event_date").limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const pitches = useQuery({
    queryKey: ["dashboard-pitch", user?.id], enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("pitchathon_applications").select("*").eq("founder_id", user.id).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const qc = useQueryClient();
  const buyUpgradeFn = useServerFn(buyUpgrade);
  const [buying, setBuying] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Load sessions attended count
  const { data: attendedCount = 0 } = useQuery({
    queryKey: ["sessions-attended-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("attended", true);
      if (error) throw error;
      return count ?? 0;
    }
  });

  // Load referral signups count
  const { data: referralCount = 0 } = useQuery({
    queryKey: ["referral-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: comms } = await supabase
        .from("communities")
        .select("id")
        .eq("leader_id", user!.id);
      
      if (!comms || comms.length === 0) return 0;
      
      const commIds = comms.map(c => c.id);
      const { count, error } = await supabase
        .from("community_members")
        .select("id", { count: "exact", head: true })
        .in("community_id", commIds);
        
      if (error) throw error;
      return count ?? 0;
    }
  });

  // Dynamic ranking metrics query
  const { data: rankings } = useQuery({
    queryKey: ["founder-rankings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_founder_rankings", {
        _user_id: user?.id,
      });
      if (error) throw error;
      return data as any;
    },
  });

  async function handleBuyUpgrade(type: string, cost: number, label: string) {
    setBuying(type);
    try {
      await buyUpgradeFn({ data: { upgradeType: type, cost } });
      toast.success(`Success! You have purchased the ${label}.`);
      qc.invalidateQueries({ queryKey: ["wallet_balance", user?.id] });
      qc.invalidateQueries({ queryKey: ["transactions", user?.id] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("INSUFFICIENT_FUNDS")) {
        toast.error(`Insufficient credit. The ${label} requires ${cost} DOT. Please fund your wallet.`);
      } else {
        toast.error(msg || "Could not complete purchase");
      }
    } finally {
      setBuying(null);
    }
  }

  const isFounder = roles.includes("founder");
  const latest = assessments[assessments.length - 1];
  const vantagePoint = founder?.vantage_point ?? latest?.vantage_point ?? 0;
  const fundability = founder?.fundability ?? latest?.fundability ?? 0;
  const stage = (founder?.stage as string) ?? "Assess";
  const completed = enrollments.filter((e) => e.status === "completed").length;

  const currentStageIndex = JOURNEY_STAGES.indexOf(stage as (typeof JOURNEY_STAGES)[number]);

  const currentValuation = founder?.current_valuation ?? latest?.current_valuation ?? 0;
  const potentialValuation = founder?.potential_valuation ?? latest?.potential_valuation ?? 0;
  const unicornPotential = founder?.unicorn_potential ?? latest?.unicorn_potential ?? 0;
  const archetype = founder?.founder_archetype ?? latest?.founder_archetype ?? "Venture Builder";
  const investmentReadiness = founder?.investment_readiness ?? latest?.investment_readiness ?? 0;

  const allAchievements = [
    {
      id: "first_assessment",
      title: "Valuation Pioneer",
      desc: "Completed your first Vantage assessment",
      icon: Gauge,
      unlocked: assessments.length > 0 || (profile?.achievements || []).includes("first_assessment"),
    },
    {
      id: "vantage_guru",
      title: "Vantage Elite",
      desc: "Attained a Vantage score over 700",
      icon: Trophy,
      unlocked: vantagePoint > 700 || (profile?.achievements || []).includes("vantage_guru"),
    },
    {
      id: "scholar",
      title: "Venture Scholar",
      desc: "Completed at least one course module",
      icon: BookOpen,
      unlocked: completed > 0 || (profile?.achievements || []).includes("scholar"),
    },
    {
      id: "catalyst",
      title: "Network Catalyst",
      desc: "Referred a founder to join the network",
      icon: Users,
      unlocked: referralCount > 0 || (profile?.achievements || []).includes("catalyst"),
    },
    {
      id: "networker",
      title: "Active Member",
      desc: "Attended at least one live session",
      icon: Calendar,
      unlocked: attendedCount > 0 || (profile?.achievements || []).includes("networker"),
    },
  ];

  // Query runway ventures for challenge widget
  const { data: runwayVentures = [] } = useQuery({
    queryKey: ["dashboard-runway-ventures"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_runway_challenges", {
        _type: "runway",
      });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: isFounder,
  });

  const hasAssessment = assessments.length > 0;
  const stats = [
    { label: "AVA Score", value: assessmentQuery.isPending ? "—" : assessmentQuery.isError ? "Unavailable" : hasAssessment ? formatDot(vantagePoint) : "Not assessed", sub: hasAssessment ? "out of 1,000" : "Your assessment is the starting point", icon: Gauge, accent: "text-primary" },
    { label: "Venture Valuation", value: hasAssessment ? formatNaira(currentValuation) : "—", sub: hasAssessment ? `Potential: ${formatNaira(potentialValuation)}` : "Available after assessment", icon: TrendingUp, accent: "text-primary" },
    { label: "Funding Readiness", value: hasAssessment ? `${investmentReadiness}%` : "—", sub: hasAssessment ? `Fundability: ${fundability}%` : "No assessment yet", icon: Sparkles, accent: "text-gold" },
    { label: "DOT Wallet", value: wallet.isPending ? "—" : wallet.isError ? "Unavailable" : formatDot(balance), sub: wallet.isError ? "Please try again" : "DOT credits", icon: Wallet, accent: "text-primary" },
  ];


  return (
    <AppShell>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:items-end">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Your venture workspace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold flex min-w-0 items-center gap-2">
            <span className="min-w-0 break-words">Welcome, {profile?.name || "Founder"}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditProfile(true)}
              className="size-10 shrink-0 rounded-md hover:bg-muted"
              title="Edit Profile" aria-label="Edit Profile"
            >
              <Edit3 className="size-3.5 text-muted-foreground" />
            </Button>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {founder?.venture_name ? `${founder.venture_name} · ` : ""}
            {isFounder ? <>Stage: <span className="text-foreground">{stage}</span></> : primaryRole}
            {membership?.communities ? ` · ${(membership.communities as { name: string }).name}` : ""}
          </p>
          
          {isFounder && rankings && !rankings.error && (
            <div className="flex flex-wrap gap-2 mt-3">
              {rankings.country?.rank && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-muted border border-border text-muted-foreground px-3 py-1 rounded-full">
                  <MapPin className="size-3 text-primary" /> #{rankings.country.rank} in {rankings.country.name}
                </span>
              )}
              {rankings.industry?.rank && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-muted border border-border text-muted-foreground px-3 py-1 rounded-full">
                  <TrendingUp className="size-3 text-accent" /> #{rankings.industry.rank} in {rankings.industry.name}
                </span>
              )}
              {rankings.university?.rank && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-muted border border-border text-muted-foreground px-3 py-1 rounded-full">
                  <Trophy className="size-3 text-accent" /> #{rankings.university.rank} in {rankings.university.name}
                </span>
              )}
              {rankings.community?.rank && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-muted border border-border text-muted-foreground px-3 py-1 rounded-full">
                  <Users className="size-3 text-accent" /> #{rankings.community.rank} in {rankings.community.name}
                </span>
              )}
            </div>
          )}
        </div>
        {isFounder && (
          <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1">
            {latest && (
              <Button variant="outline" asChild className="border-border bg-card text-foreground">
                <Link to="/result/$id" params={{ id: latest.id }}>
                  <Sparkles className="size-4" />
                  View assessment
                </Link>
              </Button>
            )}
            <Button variant="hero" asChild>
              <Link to="/vantage">
                <Gauge className="size-4" />
                {latest ? "Update AVA" : "Start AVA"}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Grid Stats */}
      <div className="dashboard-stats mt-6 grid gap-3 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={cn("size-4", s.accent)} />
            </div>
            <p className="mt-3 break-words font-display text-xl font-semibold tabular-nums">
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-widgets mt-6 grid gap-4">
        <section className="border-b border-border py-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Building2 className="size-4 text-primary" />Venture</div>
          <h2 className="mt-3 font-display text-xl font-semibold">{founder?.venture_name || "Your venture starts here"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{founder?.venture_name ? [founder.industry, founder.stage, founder.country].filter(Boolean).join(" · ") : "No venture details added yet."}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowEditProfile(true)}><Edit3 />{founder?.venture_name ? "Edit venture profile" : "Complete your profile"}</Button>
        </section>
        <section className="border-b border-border py-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Calendar className="size-4 text-gold" />Foundry Progress</div>
          <h2 className="mt-3 font-display text-xl font-semibold">Your 90-day journey</h2>
          <p className="mt-2 text-sm text-muted-foreground">Cohort progress is not available yet. ARISE is DOT’s first Foundry.</p>
          <Button variant="outline" size="sm" className="mt-4" asChild><Link to="/foundry">ARISE Foundry <ArrowUpRight /></Link></Button>
        </section>
        <section className="border-b border-border py-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><ArrowRight className="size-4 text-primary" />Next Action</div>
          <h2 className="mt-3 font-display text-xl font-semibold">{!founder?.venture_name ? "Introduce your venture" : !latest ? "Establish your baseline" : "Move your venture forward"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{(latest?.report as { nextActions?: string[] } | null)?.nextActions?.[0] || (!founder?.venture_name ? "Add your venture details to your founder profile." : !latest ? "Complete AVA to receive your score and recommendations." : "Review your latest assessment and recommendations.")}</p>
          {!founder?.venture_name ? <Button size="sm" className="mt-4" onClick={() => setShowEditProfile(true)}>Complete profile <ArrowRight /></Button> : <Button size="sm" className="mt-4" asChild><Link to="/vantage">{latest ? "Review AVA" : "Start AVA"} <ArrowRight /></Link></Button>}
        </section>
      </div>
      <div className="dashboard-widgets mt-6 grid gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Calendar className="size-4 text-primary" />Upcoming Event</h2>
          <p className="mt-4 text-sm font-medium">{events.isPending ? "Loading event…" : events.isError ? "Events are temporarily unavailable" : events.data?.title || "No upcoming events"}</p>
          <p className="mt-2 text-xs text-muted-foreground">{events.data?.event_date ? new Date(events.data.event_date).toLocaleString() : "New event dates will appear here when scheduled."}</p>
          <Button variant="link" className="mt-3 h-9 px-0" asChild><Link to="/sessions">View events <ArrowUpRight /></Link></Button>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Trophy className="size-4 text-gold" />Pitch</h2>
          <p className="mt-4 text-sm font-medium">{pitches.isPending ? "Loading application…" : pitches.isError ? "Applications are temporarily unavailable" : pitches.data?.venture_name || "No pitch application yet"}</p>
          <p className="mt-2 text-xs capitalize text-muted-foreground">{pitches.data?.status || "Your next pitch opportunity awaits."}</p>
          <Button variant="link" className="mt-3 h-9 px-0" asChild><Link to="/pitchathons">View pitchathons <ArrowUpRight /></Link></Button>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="size-4 text-primary" />Spotlight</h2>
          <p className="mt-4 text-sm font-medium">{campaigns.isPending ? "Loading campaign…" : campaigns.isError ? "Campaigns are temporarily unavailable" : campaigns.data?.[0]?.venture_name || "No active campaign"}</p>
          <p className="mt-2 text-xs capitalize text-muted-foreground">{campaigns.data?.[0]?.status || "Your venture’s visibility, in one place."}</p>
          <Button variant="link" className="mt-3 h-9 px-0" asChild><Link to="/spotlight">View Spotlight <ArrowUpRight /></Link></Button>
        </div>
      </div>
      <section className="mt-6 border-y border-border py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h2 className="text-base font-semibold">Recent Activity</h2><Button variant="link" size="sm" asChild><Link to="/wallet">DOT Wallet <ArrowUpRight /></Link></Button></div>
        {activityQuery.isPending ? <p className="mt-4 text-sm text-muted-foreground" role="status">Loading activity…</p> : activityQuery.isError ? <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><AlertCircle className="size-4" />Activity is temporarily unavailable.</p> : !activityQuery.data?.length ? <p className="mt-4 text-sm text-muted-foreground">No wallet activity yet. Your transactions will appear here.</p> : <div className="mt-3 divide-y divide-border">{activityQuery.data.slice(0, 4).map((transaction) => <div key={transaction.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"><div className="min-w-0"><p className="text-sm">{transaction.description || transaction.type}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(transaction.created_at).toLocaleDateString()}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums">{formatDot(transaction.amount)} DOT</span></div>)}</div>}
      </section>

      {isFounder && (
        <div className="mt-6 border-b border-border py-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Your progression</h2>
            <span className="text-sm text-muted-foreground">
              {Math.max(currentStageIndex, 0)} of {JOURNEY_STAGES.length} stages
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {JOURNEY_STAGES.map((label, i) => {
              const done = i < currentStageIndex;
              const current = i === currentStageIndex;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                      done && "border-primary/30 bg-primary/10 text-primary",
                      current && "border-gold/40 bg-gold/10 text-gold",
                      !done && !current && "border-border text-muted-foreground",
                    )}
                  >
                    {done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                    {label}
                  </div>
                  {i < JOURNEY_STAGES.length - 1 && <span className="hidden h-px w-4 bg-border sm:block" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer py-3 text-sm font-semibold text-muted-foreground">Insights, achievements &amp; account resources</summary>
      {/* Main dashboard widgets */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* AVA Recommendations */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              AVA Recommendations
            </h2>
            {currentValuation > 0 && (
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">
                Next Target: {formatNaira(potentialValuation)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tailored suggestions to increase your AVA score and venture valuation.
          </p>

          <div className="mt-5 space-y-3">
            {latest?.report ? (
              <>
                <div className="rounded-xl bg-muted/40 border border-border p-4 mb-4 text-xs">
                  <p className="text-muted-foreground leading-relaxed">
                    💡 <span className="font-bold text-foreground">Advisor Insight:</span> Your venture is currently valued at <span className="font-bold text-accent">{formatNaira(currentValuation)}</span>. Act on the recommendations below to unlock your valuation potential of <span className="font-bold text-primary">{formatNaira(potentialValuation)}</span>.
                  </p>
                </div>
                {(latest.report as { nextActions?: string[] }).nextActions?.map((a: string, i: number) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-foreground">{a}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Take your AVA assessment to unlock personalized AI guidance.</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/vantage">Start your assessment <ArrowRight className="size-4" /></Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Runway Challenges & Links widget */}
        <div className="space-y-6">
          {/* Runway Challenge Widget */}
          {isFounder && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Trophy className="size-5 text-accent" />
                DOT Runway Challenge
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Top ventures ranked by progress and engagement</p>
              
              <div className="mt-4 space-y-3.5">
                {runwayVentures.slice(0, 3).map((v: any, i: number) => (
                  <div key={v.user_id} className="flex items-center justify-between text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${i === 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-foreground max-w-[120px] truncate">{v.venture_name}</span>
                    </div>
                    <span className="font-semibold text-accent">{formatNaira(v.current_valuation)}</span>
                  </div>
                ))}

                <div className="mt-4 pt-3 border-t border-border/60 text-center">
                  <Link to="/leaderboards" className="text-xs text-primary hover:underline">
                    View full challenge rankings
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* DOT Upgrades Widget */}
          {isFounder && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Coins className="size-5 text-gold animate-pulse" />
                DOT Upgrades
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Unlock premium analysis and roadmaps using your DOT credits</p>
                    <div className="mt-4 space-y-4">
                {[
                  { key: "report", label: "Detailed Startup Report", cost: 250, desc: "Granular breakdown of your metrics" },
                  { key: "roadmap", label: "Growth Roadmap", cost: 500, desc: "Step-by-step cohort milestones" },
                  { key: "analysis", label: "Premium Founder Analysis", cost: 1000, desc: "Ecosystem reviews and audits" },
                ].map((up) => (
                  <div key={up.key} className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{up.label}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{up.desc}</p>
                      </div>
                      <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded font-bold text-gold shrink-0">
                        {up.cost} DOT
                      </span>
                    </div>
                    <Button 
                      onClick={() => handleBuyUpgrade(up.key, up.cost, up.label)} 
                      disabled={buying === up.key}
                      variant="outline" 
                      className="w-full text-[10px] py-1 h-7 border-border hover:bg-muted cursor-pointer"
                    >
                      {buying === up.key ? <Loader2 className="size-3 animate-spin mr-1" /> : <Sparkles className="size-3 mr-1" />}
                      Purchase Upgrade
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assessment History */}
          {isFounder && assessments.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="size-4" />
                Assessment History
              </h2>
              <div className="mt-3.5 space-y-3">
                {assessments.slice(-3).reverse().map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-muted-foreground">Score: {a.vantage_point}</p>
                    </div>
                    <Link to="/result/$id" params={{ id: a.id }} className="text-primary hover:underline">
                      Wrapped →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning & Sessions Widget */}
          {isFounder && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                <BookOpen className="size-4 text-primary" />
                Learning & Live Sessions
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">Course Modules</span>
                    <span className="text-primary font-bold">{completed}/{enrollments.length} Completed</span>
                  </div>
                  <Progress value={enrollments.length > 0 ? (completed / enrollments.length) * 100 : 0} className="h-2 bg-muted border border-border" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    <span className="text-muted-foreground">Live Sessions Attended</span>
                  </div>
                  <span className="font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">{attendedCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Network & Referrals Widget */}
          {isFounder && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                <Users className="size-4 text-accent" />
                Network & Referrals
              </h2>
              
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
                  <span className="text-muted-foreground">Total Referrals</span>
                  <span className="font-bold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full">{referralCount}</span>
                </div>
                
                {profile?.community && (
                  <p className="text-[10px] text-muted-foreground italic text-center">
                    Share your community invite to level up your referral count!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Achievements Card */}
          {isFounder && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                <Award className="size-4 text-gold" />
                Vantage Achievements
              </h2>
              
              <div className="space-y-3">
                {allAchievements.map((ach) => (
                  <div 
                    key={ach.id} 
                    className={cn(
                      "flex items-start gap-3 p-2.5 rounded-xl border transition-all duration-200",
                      ach.unlocked 
                        ? "bg-muted/30 border-border text-foreground" 
                        : "bg-muted/10 border-border/30 opacity-40 grayscale"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      ach.unlocked ? "bg-gold/10 text-gold border border-gold/25" : "bg-muted text-muted-foreground border border-border"
                    )}>
                      <ach.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold truncate">{ach.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{ach.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      </details>
      <ProfileEditDialog open={showEditProfile} onOpenChange={setShowEditProfile} />
    </AppShell>
  );
}
