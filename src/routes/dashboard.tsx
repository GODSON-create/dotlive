import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Gauge,
  BookOpen,
  Trophy,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  CalendarCheck,
  Building2,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Founder Dashboard — DOT" },
      { name: "description", content: "Track your venture progression, Vantage score and DOT wallet." },
    ],
  }),
  component: Dashboard,
});

const founder = {
  name: "Amara Okafor",
  venture: "FarmLink Africa",
  stage: "MVP",
  vantagePoint: 642,
  fundability: 71,
  investmentReadiness: 64,
  dotBalance: 3450,
  community: "Lagos Builders",
};

const journeySteps = [
  { label: "Assess", done: true },
  { label: "Learn", done: true },
  { label: "Improve", done: true },
  { label: "Validate", done: false, current: true },
  { label: "Pitch", done: false },
  { label: "Fund", done: false },
  { label: "Scale", done: false },
];

const stats = [
  { label: "Vantage Point", value: "642", sub: "/ 1000", icon: Gauge, accent: "text-primary" },
  { label: "Fundability", value: "71%", sub: "+6 this month", icon: TrendingUp, accent: "text-gold" },
  { label: "DOT Balance", value: "3,450", sub: "≈ ₦51,750", icon: Wallet, accent: "text-primary" },
  { label: "Academy", value: "5/8", sub: "tracks done", icon: BookOpen, accent: "text-gold" },
];

const actions = [
  { title: "Complete Market Validation track", desc: "Boost your Vantage Point by ~40", icon: BookOpen },
  { title: "Upload your latest pitch deck", desc: "Required for DOT Demo eligibility", icon: Building2 },
  { title: "Register: House of Tara Session", desc: "100 DOT · Live next week", icon: CalendarCheck },
];

const quickLinks = [
  { label: "Vantage", icon: Gauge },
  { label: "Academy", icon: BookOpen },
  { label: "Sessions", icon: CalendarCheck },
  { label: "Pitchathons", icon: Trophy },
  { label: "DOT Demo", icon: Building2 },
  { label: "Wallet", icon: Wallet },
];

function StatCard({ stat }: { stat: (typeof stats)[number] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{stat.label}</span>
        <stat.icon className={cn("size-4", stat.accent)} />
      </div>
      <p className="mt-3 font-display text-3xl font-bold">
        {stat.value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{stat.sub}</span>
      </p>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Exit demo</Link>
            </Button>
            <span className="flex size-9 items-center justify-center rounded-full [background-image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground">
              {founder.name.charAt(0)}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Greeting */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="font-display text-3xl font-bold">{founder.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {founder.venture} · Stage: <span className="text-foreground">{founder.stage}</span> ·{" "}
              {founder.community}
            </p>
          </div>
          <Button variant="hero">
            <Sparkles className="size-4" />
            Ask AI Advisor
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} stat={s} />
          ))}
        </div>

        {/* Journey progress */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Your progression</h2>
            <span className="text-sm text-muted-foreground">3 of 7 stages complete</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {journeySteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                    step.done && "border-primary/30 bg-primary/10 text-primary",
                    step.current && "border-gold/40 bg-gold/10 text-gold",
                    !step.done && !step.current && "border-border text-muted-foreground",
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Circle className="size-4" />
                  )}
                  {step.label}
                </div>
                {i < journeySteps.length - 1 && (
                  <span className="hidden h-px w-4 bg-border sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Recommended actions */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Recommended next actions</h2>
              <p className="text-sm text-muted-foreground">
                AI-generated from your Vantage report
              </p>
              <div className="mt-5 space-y-3">
                {actions.map((a) => (
                  <button
                    key={a.title}
                    className="flex w-full items-center gap-4 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <a.icon className="size-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{a.title}</span>
                      <span className="block text-xs text-muted-foreground">{a.desc}</span>
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick access */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Explore</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {quickLinks.map((q) => (
                <button
                  key={q.label}
                  className="flex flex-col items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
                >
                  <q.icon className="size-5 text-primary" />
                  <span className="text-sm font-medium">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
