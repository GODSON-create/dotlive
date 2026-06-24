import { useState, useMemo } from "react";
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
  Sliders,
  CheckCircle2,
  Sparkle,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { formatDot, formatNaira } from "@/lib/constants";
import { cn } from "@/lib/utils";
import heroImg from "@/assets/hero-dot.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DOT — Africa's Venture Valuation Network" },
      {
        name: "description",
        content: "What is your idea worth? Discover your Startup Value, DOT Score and founder rank in minutes.",
      },
    ],
  }),
  component: LandingPage,
});

const COPY_OPTIONS = {
  A: {
    title: "Your Idea Has A Value. Find Out How Much.",
    subtext: "Take the DOT test and discover your startup value, score, and growth potential in minutes.",
    cta: "Find My Startup Value",
  },
  B: {
    title: "Could Your Idea Become A Million Dollar Company?",
    subtext: "Every big company started as an idea. See where yours stands in the ecosystem.",
    cta: "Check My Score",
  },
  C: {
    title: "Rate Your Startup Before The World Does.",
    subtext: "Get your startup valuation, founder score, and roadmap immediately.",
    cta: "Get My Score",
  },
  D: {
    title: "Your Next Big Idea Starts Here.",
    subtext: "Discover your startup value, benchmark, and what it takes to grow it.",
    cta: "Test My Idea",
  },
};

const CURRENCIES = {
  NGN: { symbol: "₦", rate: 1 },
  USD: { symbol: "$", rate: 1500 },
  ZAR: { symbol: "R", rate: 81 },
  EUR: { symbol: "€", rate: 1620 },
  BTC: { symbol: "₿", rate: 90000000 },
};

function LandingPage() {
  const [copyOption, setCopyOption] = useState<"A" | "B" | "C" | "D">("A");
  const [currency, setCurrency] = useState<"NGN" | "USD" | "ZAR" | "EUR" | "BTC">("NGN");
  
  // Interactive Simulator State - Set defaults high to show 5B valuation for DOT OS
  const [simVenture, setSimVenture] = useState("DOT OS");
  const [simTraction, setSimTraction] = useState(3800000); // ₦3.8M/mo
  const [simTeam, setSimTeam] = useState(5); // 5 members
  const [simProduct, setSimProduct] = useState(3); // 3: Launch
  const [simMarket, setSimMarket] = useState(2); // 2: Global

  // Dynamic calculations for preview card
  const stats = useMemo(() => {
    // Score range 300 - 1000, summing up to exactly 1000 at absolute maximums
    const scoreBase = 300;
    const tractionBonus = Math.min(250, Math.round((simTraction / 5000000) * 250));
    const teamBonus = Math.min(150, simTeam * 30);
    const productBonus = simProduct * 50; // 0: Idea(0), 1: Proto(50), 2: MVP(100), 3: Launch(150)
    const marketBonus = simMarket * 75; // 0: Local(0), 1: Regional(75), 2: Global(150)
    
    const dotScore = Math.min(1000, scoreBase + tractionBonus + teamBonus + productBonus + marketBonus);
    
    // Valuation math: scales up to exactly 5 Billion NGN at 940 score, and exponentially rises to 3 Trillion NGN ($2B USD) at 1000 score
    let valuation = 1500000;
    if (dotScore >= 940) {
      const factor = (dotScore - 940) / 60; // 0 to 1
      valuation = 5000000000 + Math.pow(factor, 4) * 2995000000000;
    } else {
      const factor = (dotScore - 300) / 640; // 0 to 1
      valuation = 1500000 + Math.pow(Math.max(0, factor), 3) * 4998500000;
    }
    
    // Potential valuation - scales up to 10 Trillion NGN maximum
    const rawPotential = valuation * (3 + (simMarket * 1.5)) + 100000000;
    const potential = Math.min(10000000000000, Math.max(50000000, Math.round(rawPotential / 10000000) * 10000000));

    // Rank percentage: better score -> lower percentage (top X%)
    const rankPercent = Math.max(1, Math.min(99, Math.round(100 - ((dotScore - 300) / 700) * 99)));

    let status = "Idea Explorer";
    if (dotScore >= 800) status = "Unicorn Candidate";
    else if (dotScore >= 600) status = "Rising Founder";
    else if (dotScore >= 450) status = "Cohort Builder";

    return {
      dotScore,
      valuation,
      potential,
      rankPercent,
      status,
    };
  }, [simTraction, simTeam, simProduct, simMarket]);

  function formatVal(amountNaira: number, code: string): string {
    const rate = CURRENCIES[code as keyof typeof CURRENCIES]?.rate || 1;
    const symbol = CURRENCIES[code as keyof typeof CURRENCIES]?.symbol || "";
    const value = amountNaira / rate;
    
    if (code === "BTC") {
      return `₿${value.toFixed(4)}`;
    }
    
    if (value >= 1000000000000) {
      return `${symbol}${(value / 1000000000000).toFixed(1)}T`;
    }
    
    if (value >= 1000000000) {
      return `${symbol}${(value / 1000000000).toFixed(1)}B`;
    }
    
    if (value >= 1000000) {
      return `${symbol}${(value / 1000000).toFixed(1)}M`;
    }
    
    return `${symbol}${Math.round(value).toLocaleString()}`;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center py-20 lg:py-28 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/25 via-background to-background" />
          
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Left copy column */}
              <div className="lg:col-span-6 space-y-6">
                {/* A/B Copy Variation Tester */}
                <div className="flex items-center gap-1.5 rounded-full bg-slate-900/60 border border-slate-800 p-1 text-xs backdrop-blur w-fit">
                  <span className="text-[9px] text-slate-500 px-2 font-bold uppercase tracking-wider">A/B Testing:</span>
                  {(["A", "B", "C", "D"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setCopyOption(opt)}
                      className={cn(
                        "px-2.5 py-1 rounded-full font-bold transition-all text-[11px]",
                        copyOption === opt 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/85 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
                  <span className="size-1.5 rounded-full bg-primary animate-ping" />
                  Africa's Venture Valuation Network
                </span>

                <h1 className="font-display text-4xl font-black leading-[1.05] sm:text-6xl lg:text-7xl tracking-tight">
                  {COPY_OPTIONS[copyOption].title.split("Find Out").map((text, i) => (
                    <span key={i}>
                      {text}
                      {i === 0 && COPY_OPTIONS[copyOption].title.includes("Find Out") && (
                        <span className="text-gradient block mt-1">Find Out.</span>
                      )}
                    </span>
                  ))}
                  {!COPY_OPTIONS[copyOption].title.includes("Find Out") && (
                    <span className="text-gradient block mt-1">Find Out.</span>
                  )}
                </h1>

                <p className="max-w-lg text-base sm:text-lg text-muted-foreground leading-relaxed">
                  {COPY_OPTIONS[copyOption].subtext}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button variant="hero" size="lg" className="px-8 font-bold text-base shadow-lg shadow-primary/20" asChild>
                    <Link to="/auth">
                      {COPY_OPTIONS[copyOption].cta}
                      <ArrowRight className="size-5 ml-1" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="border-slate-800 text-slate-300 hover:bg-slate-900" asChild>
                    <Link to="/auth">Check Leaderboard</Link>
                  </Button>
                </div>
              </div>

              {/* Right scorecard column */}
              <div className="lg:col-span-6 flex flex-col items-center">
                {/* Scorecard mockup wrapper */}
                <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-md overflow-hidden">
                  <div className="absolute top-0 right-0 size-32 rounded-full bg-primary/10 blur-3xl -z-10" />
                  <div className="absolute bottom-0 left-0 size-32 rounded-full bg-indigo-500/10 blur-3xl -z-10" />

                  {/* Header */}
                  <div className="flex flex-col border-b border-slate-900 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-2">
                        <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">STARTUP REPORT</span>
                        <input 
                          type="text"
                          value={simVenture}
                          onChange={(e) => setSimVenture(e.target.value)}
                          className="block bg-transparent text-lg font-bold text-white focus:outline-none focus:border-primary/50 border-b border-transparent w-full"
                          placeholder="Venture Name"
                        />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-900 text-slate-400 rounded-full border border-slate-800 shrink-0">
                        Rank: Top {stats.rankPercent}%
                      </span>
                    </div>

                    {/* Currency switcher tabs */}
                    <div className="mt-3 flex items-center justify-between bg-slate-900/40 border border-slate-900/60 p-0.5 rounded-lg text-[9px] w-full">
                      <span className="text-slate-500 font-bold px-2 uppercase tracking-wide">Currency:</span>
                      <div className="flex gap-0.5">
                        {(["NGN", "USD", "ZAR", "EUR", "BTC"] as const).map((curr) => (
                          <button
                            key={curr}
                            type="button"
                            onClick={() => setCurrency(curr)}
                            className={cn(
                              "px-2 py-0.5 rounded font-bold transition-all",
                              currency === curr 
                                ? "bg-slate-800 text-white border border-slate-700/60" 
                                : "text-slate-400 hover:text-white"
                            )}
                          >
                            {curr}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Scores Grid */}
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-900/30 border border-slate-900 p-4">
                      <span className="text-[10px] font-semibold text-slate-400">Estimated Value</span>
                      <p className="mt-1.5 font-display text-xl sm:text-2xl font-black text-white text-gradient">
                        {formatVal(stats.valuation, currency)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-900/30 border border-slate-900 p-4">
                      <span className="text-[10px] font-semibold text-slate-400">DOT Score</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-display text-2xl font-black text-white">{stats.dotScore}</span>
                        <span className="text-xs text-slate-500">/1000</span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-900/30 border border-slate-900 p-4">
                      <span className="text-[10px] font-semibold text-slate-400">Potential</span>
                      <p className="mt-1.5 font-display text-lg font-bold text-slate-300">
                        {formatVal(stats.potential, currency)}+
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-900/30 border border-slate-900 p-4">
                      <span className="text-[10px] font-semibold text-slate-400">Status</span>
                      <p className="mt-1.5 text-xs font-bold text-primary flex items-center gap-1">
                        {stats.status}
                      </p>
                    </div>
                  </div>

                  {/* Simulator Sliders Panel */}
                  <div className="mt-6 border-t border-slate-900 pt-5 space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                      <span className="flex items-center gap-1"><Sliders className="size-3 text-primary" /> Venture Simulator</span>
                      <span className="text-[10px] text-slate-500">Drag to change value</span>
                    </div>

                    {/* Traction slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Monthly Revenue / Traction</span>
                        <span className="font-bold text-white">{formatVal(simTraction, currency)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="5000000" 
                        step="100000"
                        value={simTraction}
                        onChange={(e) => setSimTraction(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Product Stage selector */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Product Development</span>
                        <span className="font-bold text-white">
                          {simProduct === 0 ? "Idea stage" : simProduct === 1 ? "Prototype ready" : simProduct === 2 ? "MVP launched" : "Market growth"}
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="3" 
                        step="1"
                        value={simProduct}
                        onChange={(e) => setSimProduct(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Team Size */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Team Size & Commitment</span>
                        <span className="font-bold text-white">{simTeam} Fulltime Members</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        step="1"
                        value={simTeam}
                        onChange={(e) => setSimTeam(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Market Reach */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Market Reach / Size</span>
                        <span className="font-bold text-white">
                          {simMarket === 0 ? "Local Market" : simMarket === 1 ? "Regional Market" : "Global Market"}
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="1"
                        value={simMarket}
                        onChange={(e) => setSimMarket(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>

                  {/* CTA inside card */}
                  <Button variant="hero" className="w-full mt-6 text-sm py-5 font-bold" asChild>
                    <Link to="/auth">Get My Startup Score</Link>
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="border-t border-slate-900 bg-slate-950/20 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">3-STEP WORKFLOW</span>
              <h2 className="mt-3 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
                Turn Your Idea Into A Score
              </h2>
              <p className="mt-4 text-slate-400 text-lg">
                Stop guessing. Run your concept through the network, benchmark your metrics, and level up.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-slate-900 bg-slate-950/40 p-6 space-y-4 hover:border-slate-800 transition-all">
                <span className="absolute top-4 right-4 text-3xl font-black text-slate-905 opacity-10">01</span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sliders className="size-5" />
                </span>
                <h3 className="font-display text-xl font-bold text-white">1. Tell Us About Your Idea</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Answer straightforward questions covering your **Problem**, **Solution**, **Market Size**, **Customer Archetypes**, and **Team Strengths**.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-slate-900 bg-slate-950/40 p-6 space-y-4 hover:border-slate-800 transition-all">
                <span className="absolute top-4 right-4 text-3xl font-black text-slate-905 opacity-10">02</span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <BarChart3 className="size-5" />
                </span>
                <h3 className="font-display text-xl font-bold text-white">2. Get Your Startup Report</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Instantly receive your interactive **Startup Valuation**, **DOT Score**, **Fundability Indicator**, **Growth Level**, and **Unicorn Potential** calculation.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-slate-900 bg-slate-950/40 p-6 space-y-4 hover:border-slate-800 transition-all">
                <span className="absolute top-4 right-4 text-3xl font-black text-slate-905 opacity-10">03</span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
                  <Trophy className="size-5" />
                </span>
                <h3 className="font-display text-xl font-bold text-white">3. Level Up</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Unlock dynamic roadmap actions. Gain access to the global **Founder Community**, **Learning Paths**, **Cohort Sessions**, and visibility to **Ecosystem Investors**.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Gamified Competition / Leaderboard Preview Section */}
        <section className="py-24 border-t border-slate-900 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              <div className="lg:col-span-5 space-y-6">
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">ECOSYSTEM RANKINGS</span>
                <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
                  Compete with Founders Across Africa
                </h2>
                <p className="text-slate-400 leading-relaxed">
                  Ecosystem rankings keep you motivated. Compete for the top position by improving your DOT Score and venture metrics. Filter and compete by:
                </p>
                <div className="space-y-3">
                  {[
                    "Highest Startup Value & DOT Score",
                    "Most Improved Founder & Fastest Growing Venture",
                    "Top Universities, Industries, and Regional Communities",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="size-5 text-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-950/80 border border-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
                  <h3 className="font-display font-bold text-white flex items-center gap-2">
                    <Trophy className="size-4.5 text-yellow-400" /> Top Universities Leaderboard
                  </h3>
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-bold uppercase">LIVE</span>
                </div>
                
                {/* Mock Leaderboard rows */}
                <div className="space-y-2">
                  {[
                    { rank: 1, name: "Wigwe University", score: 940, val: "₦5.0B", rate: "+18.4%" },
                    { rank: 2, name: "University of Cape Town", score: 894, val: "₦1.2B", rate: "+4.2%" },
                    { rank: 3, name: "University of Ibadan", score: 862, val: "₦850M", rate: "+12.8%" },
                    { rank: 4, name: "Covenant University", score: 840, val: "₦720M", rate: "+8.5%" },
                  ].map((row) => (
                    <div key={row.rank} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/20 border border-slate-900/60 hover:bg-slate-900/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs font-black",
                          row.rank === 1 ? "bg-yellow-400/20 text-yellow-400" :
                          row.rank === 2 ? "bg-slate-300/20 text-slate-300" :
                          row.rank === 3 ? "bg-amber-600/20 text-amber-500" : "text-slate-500"
                        )}>
                          #{row.rank}
                        </span>
                        <span className="text-sm font-bold text-white">{row.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="text-slate-400">Score: {row.score}</span>
                        <span className="text-gradient">{row.val}</span>
                        <span className="text-primary">{row.rate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* DOT Wrapped Loop / Share Section */}
        <section className="py-20 border-t border-slate-900 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-pink-900/10 via-transparent to-transparent">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
            <Sparkle className="size-8 text-pink-400 mx-auto animate-pulse" />
            <h2 className="mt-4 font-display text-3xl font-black text-white sm:text-5xl">
              Show The World What You're Building
            </h2>
            <p className="mt-4 text-slate-400 text-base sm:text-lg">
              Get an instantly shareable, personalized **DOT Wrapped** card optimized for Instagram Stories, WhatsApp Statuses, LinkedIn, and X.
            </p>
            
            <div className="mt-10 mx-auto max-w-md rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6 text-left relative overflow-hidden shadow-elegant">
              <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">DOT WRAPPED PREVIEW</span>
              <p className="mt-4 text-xl font-bold text-white leading-relaxed">
                "I just discovered my startup could become a <span className="text-gradient font-black">₦500M</span> company"
              </p>
              <div className="mt-6 flex justify-between items-center text-xs border-t border-slate-900 pt-4">
                <div>
                  <p className="font-semibold text-slate-400">DOT Score: <span className="text-white font-bold">742</span></p>
                  <p className="text-[10px] text-slate-500">Founder Rank: Top 10%</p>
                </div>
                <span className="text-sm font-black text-white">DOT.</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 border-t border-slate-900 pt-20">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 p-10 text-center shadow-elegant sm:p-16">
            <h2 className="font-display text-3xl font-black text-white sm:text-5xl">
              Ready to find your Startup Score?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Join the ecosystem today. First two revaluations are completely free.
            </p>
            <div className="mt-8 flex justify-center">
              <Button variant="hero" size="lg" className="px-8 py-6 font-bold text-base" asChild>
                <Link to="/auth">
                  Get My Startup Score
                  <ArrowRight className="size-5 ml-1" />
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
