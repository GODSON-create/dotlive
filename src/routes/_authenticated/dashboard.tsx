import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "@/hooks/use-dot-data";
import { JOURNEY_STAGES, dotToNaira, formatDot, formatNaira } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { profile, primaryRole, roles } = useAuth();
  const { data: balance = 0 } = useWallet();
  const { data: founder } = useFounderProfile();
  const { data: assessments = [] } = useAssessments();
  const { data: enrollments = [] } = useMyEnrollments();
  const { data: membership } = useMyMembership();

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

  const stats = [
    { label: "Vantage Score", value: formatDot(vantagePoint), sub: "/ 1000", icon: Gauge, accent: "text-primary" },
    { label: "Venture Valuation", value: formatNaira(currentValuation), sub: `Potential: ${formatNaira(potentialValuation)}`, icon: TrendingUp, accent: "text-indigo-400" },
    { label: "Fundability", value: `${fundability}%`, sub: `Readiness: ${investmentReadiness}%`, icon: Sparkles, accent: "text-gold" },
    { label: "Unicorn Potential", value: `${typeof unicornPotential === 'number' ? unicornPotential.toFixed(1) : '0.0'}%`, sub: archetype, icon: Trophy, accent: "text-pink-400" },
  ];

  // Exchange rate conversions for multi-currency wallet preview
  const balanceNGN = dotToNaira(balance);
  const balanceUSD = balanceNGN / 1500; // ₦1500 = $1
  const balanceBTC = balanceUSD / 60000; // $60,000 = 1 BTC

  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="font-display text-3xl font-bold">{profile?.name || "Founder"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {founder?.venture_name ? `${founder.venture_name} · ` : ""}
            {isFounder ? <>Stage: <span className="text-foreground">{stage}</span></> : primaryRole}
            {membership?.communities ? ` · ${(membership.communities as { name: string }).name}` : ""}
          </p>
        </div>
        {isFounder && (
          <div className="flex items-center gap-2">
            {latest && (
              <Button variant="outline" asChild className="border-pink-500/25 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20">
                <Link to="/result/$id" params={{ id: latest.id }}>
                  <Sparkles className="size-4" />
                  View Wrapped
                </Link>
              </Button>
            )}
            <Button variant="hero" asChild>
              <Link to="/vantage">
                <Gauge className="size-4" />
                {latest ? "Update Valuation" : "Get Valuation"}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Grid Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={cn("size-4", s.accent)} />
            </div>
            <p className="mt-3 font-display text-2xl font-bold">
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Multi-Currency Wallet Preview Widget */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Wallet Balances</h2>
          </div>
          <Link to="/wallet" className="text-xs text-primary hover:underline flex items-center gap-1">
            Manage Wallet <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-900/50 p-4 border border-border/40">
            <span className="text-[10px] text-slate-400 block tracking-widest font-semibold uppercase">DOT Tokens</span>
            <span className="font-display text-xl font-bold text-white mt-1 block">{formatDot(balance)} DOT</span>
          </div>
          <div className="rounded-xl bg-slate-900/50 p-4 border border-border/40">
            <span className="text-[10px] text-slate-400 block tracking-widest font-semibold uppercase">Naira (NGN)</span>
            <span className="font-display text-xl font-bold text-white mt-1 block">{formatNaira(balanceNGN)}</span>
          </div>
          <div className="rounded-xl bg-slate-900/50 p-4 border border-border/40">
            <span className="text-[10px] text-slate-400 block tracking-widest font-semibold uppercase">Dollars (USD)</span>
            <span className="font-display text-xl font-bold text-white mt-1 block">${balanceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="rounded-xl bg-slate-900/50 p-4 border border-border/40">
            <span className="text-[10px] text-slate-400 block tracking-widest font-semibold uppercase">Bitcoin (BTC)</span>
            <span className="font-display text-xl font-bold text-white mt-1 block">{balanceBTC.toFixed(6)} BTC</span>
          </div>
        </div>
      </div>

      {isFounder && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
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

      {/* Main dashboard widgets */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* AI Advisor Recommendations */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="size-5 text-indigo-400" />
              AI Advisor Recommendations
            </h2>
            {currentValuation > 0 && (
              <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                Next Target: {formatNaira(potentialValuation)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tailored suggestions to increase your Vantage score and venture valuation.
          </p>

          <div className="mt-5 space-y-3">
            {latest?.report ? (
              <>
                <div className="rounded-xl bg-slate-900/40 border border-slate-850 p-4 mb-4 text-xs">
                  <p className="text-slate-300 leading-relaxed">
                    💡 <span className="font-bold text-white">Advisor Insight:</span> Your venture is currently valued at <span className="font-bold text-indigo-400">{formatNaira(currentValuation)}</span>. Act on the recommendations below to unlock your valuation potential of <span className="font-bold text-emerald-400">{formatNaira(potentialValuation)}</span>.
                  </p>
                </div>
                {(latest.report as { nextActions?: string[] }).nextActions?.map((a: string, i: number) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-sm font-semibold text-indigo-400">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-300">{a}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Take your Vantage assessment to unlock personalized AI guidance.</p>
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
                <Trophy className="size-5 text-yellow-400" />
                DOT Runway Challenge
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Top ventures ranked by progress and engagement</p>
              
              <div className="mt-4 space-y-3.5">
                {runwayVentures.slice(0, 3).map((v: any, i: number) => (
                  <div key={v.user_id} className="flex items-center justify-between text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${i === 0 ? 'bg-yellow-500/15 text-yellow-500' : 'bg-slate-800 text-slate-400'}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-white max-w-[120px] truncate">{v.venture_name}</span>
                    </div>
                    <span className="font-semibold text-indigo-400">{formatNaira(v.current_valuation)}</span>
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

          {/* Assessment History */}
          {isFounder && assessments.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Clock className="size-4" />
                Assessment History
              </h2>
              <div className="mt-3.5 space-y-3">
                {assessments.slice(-3).reverse().map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-white">{new Date(a.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-500">Score: {a.vantage_point}</p>
                    </div>
                    <Link to="/result/$id" params={{ id: a.id }} className="text-indigo-400 hover:underline">
                      Wrapped →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
