import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Gauge,
  TrendingUp,
  Sparkles,
  Building,
  Target,
  Trophy,
  CheckCircle2,
  Calendar,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDot, formatNaira } from "@/lib/constants";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/venture/$slug")({
  head: () => ({
    meta: [
      { title: "Venture Profile — DOT" },
      { name: "description", content: "View this startup's details on the DOT Venture Valuation Network." },
    ],
  }),
  component: PublicVentureProfile,
});

function PublicVentureProfile() {
  const { slug } = Route.useParams();

  // Find founder profile by replacement of dash with space
  const { data: founder, isLoading } = useQuery({
    queryKey: ["public-venture-profile", slug],
    queryFn: async () => {
      const formattedSlug = slug.replace(/-/g, " ");
      const { data, error } = await supabase
        .from("founder_profiles")
        .select(`
          *,
          profiles (
            name,
            avatar_url,
            dot_id
          ),
          communities (
            name,
            region
          )
        `)
        .ilike("venture_name", `%${formattedSlug}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
  });

  const vantagePoint = founder?.vantage_point || 0;
  const currentValuation = founder?.current_valuation || 0;
  const potentialValuation = founder?.potential_valuation || 0;
  const fundability = founder?.fundability || 0;
  const unicornPotential = founder?.unicorn_potential || 0;
  const investmentReadiness = founder?.investment_readiness || 0;
  const stage = founder?.stage || "Assess";
  const industry = founder?.industry || "Tech";
  const country = founder?.country || "Africa";
  const bio = founder?.bio || "No description provided.";
  const website = founder?.website || "";
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Sparkles className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!founder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold font-display">Venture Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The venture "{slug}" could not be located on DOT.</p>
        <Button variant="hero" className="mt-6" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Header */}
      <header className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between border-b border-border">
        <Link to="/">
          <Logo />
        </Link>
        <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted" asChild>
          <Link to="/auth">Validate Your Venture</Link>
        </Button>
      </header>

      {/* Content Container */}
      <div className="mx-auto max-w-4xl px-4 py-10 md:py-16 space-y-12">
        {/* Venture Jumbotron */}
        <div className="rounded-3xl border border-border bg-card p-6 md:p-10 relative overflow-hidden backdrop-blur-xl shadow-elegant">
          <div className="absolute -bottom-24 -left-24 size-48 rounded-full bg-primary/5 blur-3xl"></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                  {stage} Stage
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {industry}
                </span>
              </div>
              
              <h1 className="font-display text-4xl font-extrabold text-foreground">
                {founder.venture_name}
              </h1>
              
              <p className="text-sm text-foreground/80 leading-relaxed max-w-2xl">
                {bio}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-xs text-muted-foreground pt-2">
                {country && <span>📍 {country}</span>}
                {founder.communities && (
                  <span>🤝 Cohort: {(founder.communities as { name: string }).name}</span>
                )}
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <Globe className="size-3.5" /> Website <ArrowUpRight className="size-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Logo/Initial */}
            {founder.logo_url ? (
              <img src={founder.logo_url} alt={founder.venture_name ?? ""} className="size-24 rounded-2xl border border-border object-cover shrink-0" />
            ) : (
              <span className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-muted border border-border text-3xl font-black text-muted-foreground">
                {(founder.venture_name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Scores */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-elegant">
            <Gauge className="size-8 text-primary mx-auto" />
            <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-3">Vantage Score</h3>
            <p className="font-display text-3xl font-black text-foreground mt-1">{vantagePoint}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">out of 1000</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-elegant">
            <TrendingUp className="size-8 text-primary mx-auto" />
            <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-3">Venture Valuation</h3>
            <p className="font-display text-2xl font-black text-gradient mt-1.5">
              {formatNaira(currentValuation)}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Current Base Valuation</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-elegant">
            <Sparkles className="size-8 text-accent mx-auto" />
            <h3 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-3">Fundability Score</h3>
            <p className="font-display text-3xl font-black text-foreground mt-1">{fundability}%</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Investor Readiness: {investmentReadiness}%</p>
          </div>
        </div>

        {/* Details & Founders */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Key Stats */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-elegant">
            <h3 className="font-display font-semibold text-foreground">Venture Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Potential Valuation</span>
                <span className="font-bold text-foreground">{formatNaira(potentialValuation)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unicorn Potential</span>
                <span className="font-bold text-primary">{typeof unicornPotential === 'number' ? unicornPotential.toFixed(1) : '0.0'}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Investment Readiness</span>
                <span className="font-bold text-foreground">{investmentReadiness}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Founder Archetype</span>
                <span className="font-bold text-primary">{founder.founder_archetype || "Venture Builder"}</span>
              </div>
            </div>
          </div>

          {/* Founder Bio */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-elegant">
            <div>
              <h3 className="font-display font-semibold text-foreground">The Founding Team</h3>
              {founder.profiles ? (
                <div className="mt-4 flex items-center gap-3">
                  {founder.profiles.avatar_url ? (
                    <img src={founder.profiles.avatar_url} alt="" className="size-10 rounded-full border border-border object-cover" />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground uppercase">
                      {(founder.profiles.name || "?").charAt(0)}
                    </span>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{founder.profiles.name}</h4>
                    <p className="text-[10px] text-muted-foreground">Owner & Chief Executive</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">No founder profile linked.</p>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-4 text-center">
              <Button variant="link" className="text-primary text-xs" asChild>
                <Link to="/founder/$dotId" params={{ dotId: founder.profiles?.dot_id || founder.user_id }}>
                  View Founder Profile <ArrowUpRight className="size-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
