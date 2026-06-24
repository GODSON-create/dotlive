import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  TrendingUp,
  FileText,
  Search,
  Globe,
  Video,
  Award,
  Users,
  Compass,
  ArrowRight,
  Check,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/scholarship")({
  head: () => ({
    meta: [
      { title: "Founder Scholarship Program — DOT" },
      {
        name: "description",
        content: "Secure institutional subsidies, venture assessments, and AI-driven growth reports to progress your startup.",
      },
    ],
  }),
  component: ScholarshipPage,
});

const benefits = [
  {
    title: "Venture Assessment",
    desc: "Rigorous assessment covering strategy, market, tech, product and team metrics.",
    icon: Compass,
  },
  {
    title: "Vantage Report",
    desc: "Comprehensive diagnostic feedback highlighting structural weaknesses and strengths.",
    icon: FileText,
  },
  {
    title: "Venture Valuation",
    desc: "Ecosystem-aligned valuation estimates based on revenue, stage, team, and reach.",
    icon: TrendingUp,
  },
  {
    title: "SEO Listing",
    desc: "Rank your startup on global directories for organic founder visibility.",
    icon: Search,
  },
  {
    title: "Founder Spotlight",
    desc: "Feature on our official spotlight newsletter sent to active institutional investors.",
    icon: Zap,
  },
  {
    title: "Founder Profile",
    desc: "V2 verified personal and venture portfolio profiles showcasing credentials.",
    icon: Users,
  },
  {
    title: "Google Discoverability",
    desc: "Search engine optimized schemas ensuring your venture page ranks high on search index.",
    icon: Globe,
  },
  {
    title: "AI Visibility",
    desc: "Get indexed into the AI Venture Advisor engine for automatic VC match-making.",
    icon: ShieldCheck,
  },
  {
    title: "Founder Sessions",
    desc: "Direct access and tickets to live workshops with leading operators and seed funds.",
    icon: Video,
  },
  {
    title: "Pitchathon Access",
    desc: "Fast-tracked application entry to competitive ecosystem funding pitchathons.",
    icon: Award,
  },
];

function ScholarshipPage() {
  return (
    <PageShell
      eyebrow="FOUNDER SCHOLARSHIP"
      title="Africa's Venture Progression Subsidies"
      intro="Join the elite 10,000 founder program. Validate ideas, establish investor-readiness, and receive certified venture valuations with a 90% cost subsidy."
    >
      <div className="space-y-20">
        {/* Comparison Hero Box */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center rounded-3xl border border-border bg-card p-8 lg:p-12 shadow-md">
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" /> Institutional Support Program
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Apply for the ₦30,000 Subsidized Access
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Venture building should be backed by clean metrics. DOT offers qualified founders subsidized access to our premium diagnostic suite, listing tools, and capital network.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <span className="rounded-full bg-primary/10 p-1 text-primary shrink-0">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm font-medium text-foreground">Limited to 10,000 startups</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="rounded-full bg-primary/10 p-1 text-primary shrink-0">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm font-medium text-foreground">Instant digital validation</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="rounded-full bg-primary/10 p-1 text-primary shrink-0">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm font-medium text-foreground">Vetted by Lead Angels</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="rounded-full bg-primary/10 p-1 text-primary shrink-0">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm font-medium text-foreground">Full Vantage report included</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-border bg-muted/40 p-6 sm:p-8 space-y-6">
            <div className="border-b border-border pb-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">PROGRAM VALUE</span>
              <p className="mt-1 font-display text-2xl font-black text-muted-foreground line-through opacity-70">
                ₦300,000+
              </p>
              <span className="text-xs font-bold text-primary uppercase tracking-wider block mt-4">FOUNDER CONTRIBUTION</span>
              <p className="mt-1 font-display text-5xl font-black text-foreground">
                ₦30,000
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Equivalent to 2,000 DOT credits. Paid in local currency via Paystack.
              </p>
            </div>

            <Button variant="hero" size="lg" className="w-full font-bold shadow-lg" asChild>
              <Link to="/auth">
                Claim My Scholarship <ArrowRight className="size-5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Ten Core Benefits of the Scholarship
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your premium diagnostic, listing and session resources fully unlocked.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="rounded-2xl border border-border bg-card p-6 flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-semibold">{b.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="text-center rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-elegant">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Empowering the Next Generation of Tech-Ventures
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            DOT is Africa's Venture Progression Network. Claim your spot, assess your startup, and unlock direct visibility.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="hero" size="lg" className="px-8 font-bold" asChild>
              <Link to="/auth">
                Claim My Scholarship
                <ArrowRight className="size-5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
