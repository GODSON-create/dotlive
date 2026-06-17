import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  GraduationCap,
  Users,
  Trophy,
  Building2,
  Network,
  Gauge,
  BookOpen,
  CalendarCheck,
  Sparkles,
  Wallet,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-dot.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DOT — Africa's Venture Progression Network" },
      {
        name: "description",
        content:
          "DOT helps African founders Assess, Learn, Improve, Validate, Pitch, Fund and Scale. Venture intelligence, education, sessions, pitchathons and capital — in one network.",
      },
      { property: "og:title", content: "DOT — Africa's Venture Progression Network" },
      {
        property: "og:description",
        content: "Move your venture from idea to funded — measurably.",
      },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  component: LandingPage,
});

const journey = [
  { label: "Assess", icon: Gauge, desc: "Measure venture readiness with Vantage." },
  { label: "Learn", icon: BookOpen, desc: "Founder education via DOT Academy." },
  { label: "Improve", icon: TrendingUp, desc: "Act on AI-driven recommendations." },
  { label: "Validate", icon: ShieldCheck, desc: "Prove the market and traction." },
  { label: "Pitch", icon: Trophy, desc: "Compete and earn selection." },
  { label: "Fund", icon: Wallet, desc: "Discover capital on DOT Demo." },
  { label: "Scale", icon: TrendingUp, desc: "Grow with community distribution." },
];

const pillars = [
  {
    name: "Vantage",
    tagline: "Venture intelligence engine",
    desc: "A 0–1000 Vantage Point measuring quality, founder readiness, market strength and fundability.",
    icon: BarChart3,
  },
  {
    name: "DOT Academy",
    tagline: "Founder education",
    desc: "Progression-based learning paths — powered by Whop, tracked and scored by DOT.",
    icon: GraduationCap,
  },
  {
    name: "Founder Sessions",
    tagline: "Live access",
    desc: "Sessions with entrepreneurs, investors, operators and industry experts.",
    icon: CalendarCheck,
  },
  {
    name: "Pitchathons",
    tagline: "Selection & evaluation",
    desc: "Applications, judge portals, scoring and leaderboards to surface the best.",
    icon: Trophy,
  },
  {
    name: "DOT Demo",
    tagline: "Capital discovery",
    desc: "An investor marketplace connecting fundable ventures with capital partners.",
    icon: Building2,
  },
  {
    name: "Community OS",
    tagline: "Community-led growth",
    desc: "Referral links, dashboards and DOT rewards that power founder acquisition.",
    icon: Network,
  },
];

const pilotStats = [
  { value: "10,000", label: "Founders" },
  { value: "100", label: "Communities" },
  { value: "100", label: "Community Leaders" },
  { value: "$200K", label: "Capital target" },
];

const audiences = [
  {
    title: "Founders",
    points: ["Complete Vantage", "Access Academy", "Enter Pitchathons", "Reach capital"],
    icon: Sparkles,
  },
  {
    title: "Community Leaders",
    points: ["Build communities", "Recruit founders", "Track progress", "Earn DOT rewards"],
    icon: Users,
  },
  {
    title: "Investors",
    points: ["Browse ventures", "Filter by Vantage", "Request meetings", "Join DOT Demo"],
    icon: Building2,
  },
];

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <img
              src={heroImg}
              alt=""
              width={1920}
              height={1080}
              className="h-full w-full object-cover opacity-90 dark:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-36">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <span className="size-1.5 rounded-full bg-primary" />
                Africa's Venture Progression Network
              </span>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
                From idea to funded.{" "}
                <span className="text-gradient">Measurably.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                DOT moves founders through a single, measurable journey — Assess, Learn, Improve,
                Validate, Pitch, Fund and Scale — combining venture intelligence, education and
                capital access.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/auth">
                    Start your assessment
                    <ArrowRight />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/platform">Explore the platform</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Journey */}
        <section className="border-y border-border/60 bg-card/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                One progression. Seven measurable stages.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Every founder follows the same path — and DOT measures movement at every step.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
              {journey.map((step, i) => (
                <div
                  key={step.label}
                  className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <step.icon className="size-4.5" />
                    </span>
                    <span className="font-display text-sm font-semibold text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{step.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-sm font-semibold text-primary">Six pillars, one ecosystem</span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              Everything a venture needs to progress
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map((p) => (
              <div
                key={p.name}
                className="group rounded-2xl border border-border bg-card p-7 transition-all hover:border-primary/40 hover:shadow-soft"
              >
                <span className="flex size-12 items-center justify-center rounded-xl [background-image:var(--gradient-primary)] text-primary-foreground shadow-glow">
                  <p.icon className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm font-medium text-primary">{p.tagline}</p>
                <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pilot stats */}
        <section className="border-y border-border/60 bg-grid">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border bg-card/80 p-8 shadow-soft backdrop-blur sm:p-12">
              <div className="max-w-2xl">
                <span className="text-sm font-semibold text-gold">Pilot program</span>
                <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                  Built to scale from 10K to 10M founders
                </h2>
                <p className="mt-4 text-muted-foreground">
                  A modular, multi-tenant architecture designed to grow across four phases without a
                  redesign.
                </p>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
                {pilotStats.map((s) => (
                  <div key={s.label}>
                    <p className="font-display text-4xl font-bold text-gradient">{s.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Built for the whole network</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {audiences.map((a) => (
              <div key={a.title} className="rounded-2xl border border-border bg-card p-7">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <a.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold">{a.title}</h3>
                <ul className="mt-4 space-y-2">
                  {a.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border [background-image:var(--gradient-primary)] p-10 text-center shadow-elegant sm:p-16">
            <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-5xl">
              Ready to move your venture forward?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
              Join the pilot. Complete your Vantage assessment and unlock your founder roadmap.
            </p>
            <div className="mt-8 flex justify-center">
              <Button variant="gold" size="lg" asChild>
                <Link to="/auth">
                  Get started free
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
