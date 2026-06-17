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

  const stats = [
    { label: "Vantage Point", value: formatDot(vantagePoint), sub: "/ 1000", icon: Gauge, accent: "text-primary" },
    { label: "Fundability", value: `${fundability}%`, sub: "ready to raise", icon: TrendingUp, accent: "text-gold" },
    { label: "DOT Balance", value: formatDot(balance), sub: `≈ ${formatNaira(dotToNaira(balance))}`, icon: Wallet, accent: "text-primary" },
    { label: "Academy", value: `${completed}`, sub: "courses done", icon: BookOpen, accent: "text-gold" },
  ];

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
          <Button variant="hero" asChild>
            <Link to="/vantage">
              <Sparkles className="size-4" />
              {latest ? "Update Vantage" : "Take Vantage"}
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={cn("size-4", s.accent)} />
            </div>
            <p className="mt-3 font-display text-3xl font-bold">
              {s.value}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{s.sub}</span>
            </p>
          </div>
        ))}
      </div>

      {isFounder && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Recommended next actions</h2>
          <p className="text-sm text-muted-foreground">
            {latest ? "From your latest Vantage report" : "Take your Vantage assessment to unlock guidance"}
          </p>
          <div className="mt-5 space-y-3">
            {latest?.report &&
              (latest.report as { nextActions?: string[] }).nextActions?.map((a: string, i: number) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{a}</span>
                </div>
              ))}
            {!latest && isFounder && (
              <Button variant="outline" asChild>
                <Link to="/vantage">Start your assessment <ArrowRight className="size-4" /></Link>
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Explore</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { label: "Vantage", to: "/vantage", icon: Gauge },
              { label: "Academy", to: "/academy", icon: BookOpen },
              { label: "Sessions", to: "/sessions", icon: ArrowUpRight },
              { label: "Wallet", to: "/wallet", icon: Wallet },
            ].map((q) => (
              <Link
                key={q.label}
                to={q.to}
                className="flex flex-col items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <q.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
