import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck,
  ArrowRight,
  Check,
} from "lucide-react";
import foundersCollage from "@/assets/founders_collage.png";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/founder-scholarship")({
  head: () => ({
    meta: [
      { title: "Founder Scholarship Program — Build a Fundable Venture" },
      {
        name: "description",
        content: "Build a Fundable Venture. Get Listed. Get Evaluated. Get Discovered.",
      },
    ],
  }),
  component: FounderScholarshipPage,
});

const includesList = [
  { title: "Venture Assessment", desc: "Strategy, market, technology, product, and team readiness audit." },
  { title: "Vantage Report", desc: "Detailed venture diagnostic mapping growth and fundability metrics." },
  { title: "Venture Valuation", desc: "Ecosystem-aligned valuation certification based on clean indicators." },
  { title: "SEO Listing", desc: "Optimised profiles indexing your venture in global directories." },
  { title: "Founder Profile", desc: "V2 verified builder portfolio highlighting experience and achievements." },
  { title: "Venture Profile", desc: "A premium showcase of product-market progress and roadmap." },
  { title: "Investor Visibility", desc: "Direct matchmaking with vetted active angel networks and seed funds." },
  { title: "Community Access", desc: "Connect with Africa's fastest-growing venture builder community." },
  { title: "Founder Sessions", desc: "Interactive masterclasses with top operators, founders, and VCs." },
  { title: "LEAPFROG Access", desc: "Fast-tracked access to capital progression and academy rewards." }
];

function FounderScholarshipPage() {
  const { data: count = 0 } = useQuery({
    queryKey: ["profiles-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const totalClaimed = 7420 + count;
  const remainingSlots = Math.max(0, 10000 - totalClaimed);
  const percentageClaimed = Math.min(100, (totalClaimed / 10000) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground overflow-x-hidden">
      <SiteHeader />
      <main className="flex-grow">
        {/* Full-viewport Hero */}
        <section className="relative min-h-[95vh] flex items-center py-16 overflow-hidden border-b border-border">
          {/* Parallax collage background with deep tint and breathing animation */}
          <div 
            className="absolute inset-0 bg-cover bg-parallax opacity-[0.09] dark:opacity-[0.06] transition-opacity duration-1000 animate-breathe"
            style={{ backgroundImage: `url(${foundersCollage})`, backgroundPosition: "center 20%" }}
          />
          {/* Subtle green radial overlay to tie it into the theme */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-primary)/15,_transparent_70%)] bg-background/50 -z-10" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full z-10">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Left Column: Headlines */}
              <div className="lg:col-span-7 space-y-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                  <ShieldCheck className="size-3.5" /> Flagship Launch Offer
                </span>
                
                <h1 className="font-display text-4xl font-black leading-[1.05] sm:text-6xl lg:text-7xl tracking-tight text-foreground">
                  Build a <span className="text-gradient">Fundable Venture.</span>
                  <span className="block mt-2 text-foreground font-semibold">Get Listed.</span>
                  <span className="block mt-1 text-foreground font-semibold">Get Evaluated.</span>
                  <span className="block mt-1 text-foreground font-semibold">Get Discovered.</span>
                </h1>

                <p className="max-w-lg text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Join the elite 10,000 founder program. Validate ideas, establish investor-readiness, and receive certified venture valuations with a 99% cost subsidy.
                </p>

                {/* Progress Indicators */}
                <div className="space-y-3 max-w-md pt-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">Ecosystem Progress</span>
                    <span className="text-primary">{totalClaimed.toLocaleString()} / 10,000 Founders</span>
                  </div>
                  <div className="h-2 w-full bg-muted border border-border/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000"
                      style={{ width: `${percentageClaimed}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{remainingSlots.toLocaleString()} remaining slots</span>
                    <span>10,000 Founder Target</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <Button variant="hero" size="lg" className="px-8 font-bold text-base shadow-lg shadow-primary/20" asChild>
                    <Link to="/auth">
                      Apply Now <ArrowRight className="size-5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Pricing & Offer Details Card */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-border bg-card/90 p-8 shadow-elegant backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 size-24 bg-primary/10 blur-3xl -z-10" />
                  
                  <div className="border-b border-border pb-6">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">FLAGSHIP PROGRAM VALUE</span>
                    <p className="mt-1 font-display text-3xl font-black text-muted-foreground line-through opacity-60">
                      ₦3,000,000
                    </p>
                    <span className="text-xs font-bold text-primary uppercase tracking-widest block mt-4">TODAY'S COMMITMENT</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="font-display text-5xl font-black text-foreground">
                        ₦30,000
                      </p>
                      <span className="text-sm font-semibold text-muted-foreground">one-time</span>
                    </div>
                    <p className="mt-2.5 text-xs text-muted-foreground">
                      Equivalent to 2,000 DOT credits. Paid securely in local currency via Paystack.
                    </p>
                  </div>

                  <div className="py-6 space-y-4">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Includes Unrestricted Access To:</h3>
                    <div className="grid gap-2.5 grid-cols-2 text-xs">
                      {includesList.slice(0, 8).map((inc) => (
                        <div key={inc.title} className="flex items-center gap-1.5 text-muted-foreground font-medium">
                          <Check className="size-3.5 text-primary shrink-0" />
                          <span className="truncate" title={inc.title}>{inc.title}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-1.5 text-primary font-bold">
                        <Check className="size-3.5 text-primary shrink-0" />
                        <span>And 2 More...</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="hero" size="lg" className="w-full font-bold shadow-lg" asChild>
                    <Link to="/auth">
                      Secure My Subsidized Access <ArrowRight className="size-5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Benefits Detail Section */}
        <section className="py-20 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">CORE BENEFITS</span>
              <h2 className="font-display text-3xl font-black tracking-tight sm:text-5xl">
                What the ₦3,000,000 Value Unlocks
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your premium venture diagnostic, listing tools, and capital network resources fully initialized under one program.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {includesList.map((inc) => (
                <div key={inc.title} className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between transition hover:shadow-md">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Check className="size-4" />
                      </span>
                      <h3 className="font-display text-base font-bold text-foreground">{inc.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-10">{inc.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <div className="inline-flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 md:p-12 shadow-sm max-w-3xl">
                <h3 className="font-display text-2xl font-bold">Empowering the Next Generation of African Ventures</h3>
                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                  DOT is Africa's Venture Progression Network. Claim your spot, assess your startup, and unlock direct visibility.
                </p>
                <Button variant="hero" size="lg" className="px-8 font-bold mt-2" asChild>
                  <Link to="/auth">
                    Claim My Scholarship Now
                    <ArrowRight className="size-5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>

          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
