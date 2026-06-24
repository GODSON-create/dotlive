import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Gauge,
  TrendingUp,
  Share2,
  Copy,
  ArrowRight,
  TrendingDown,
  Globe,
  Award,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDot, formatNaira } from "@/lib/constants";
import { toast } from "sonner";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/result/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "DOT Wrapped Valuation Recap" },
      { name: "description", content: "Check out this venture valuation on DOT!" },
    ],
  }),
  component: ResultPage,
});

type ShareFormat = "story" | "post" | "linkedin" | "twitter";

function ResultPage() {
  const { id } = Route.useParams();
  const [activeSlide, setActiveSlide] = useState(0);
  const [shareFormat, setShareFormat] = useState<ShareFormat>("linkedin");

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["public-assessment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select(`
          *,
          profiles (
            name,
            dot_id
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: founderProfile } = useQuery({
    queryKey: ["public-founder-profile", assessment?.user_id],
    enabled: !!assessment?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_profiles")
        .select("*, communities(*)")
        .eq("user_id", assessment.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const founderName = assessment?.profiles?.name || "Founder";
  const ventureName = founderProfile?.venture_name || "Venture";
  const archetype = assessment?.founder_archetype || "Venture Builder";
  const vantagePoint = assessment?.vantage_point || 0;
  const currentValuation = assessment?.current_valuation || 0;
  const potentialValuation = assessment?.potential_valuation || 0;
  const fundability = assessment?.fundability || 0;
  const unicornPotential = assessment?.unicorn_potential || 0;
  const industry = founderProfile?.industry || "Tech";

  const slides = useMemo(() => {
    if (!assessment) return [];
    return [
      {
        title: "FOUNDER ARCHETYPE",
        content: (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative mb-6 flex size-24 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 p-1 shadow-lg animate-pulse">
              <div className="flex size-full items-center justify-center rounded-full bg-slate-900">
                <Award className="size-10 text-yellow-400" />
              </div>
            </div>
            <p className="text-sm font-semibold tracking-wider text-pink-400">MEET THE FOUNDER</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold text-white">{founderName}</h2>
            <p className="mt-1 text-sm text-slate-400">Building {ventureName} ({industry})</p>
            <div className="mt-6 rounded-2xl bg-slate-800/80 px-6 py-3 border border-pink-500/20">
              <span className="text-xs text-slate-400 uppercase tracking-widest block font-medium">Archetype</span>
              <span className="font-display text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">{archetype}</span>
            </div>
          </div>
        ),
      },
      {
        title: "VANTAGE SCORE",
        content: (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Gauge className="size-16 text-emerald-400 animate-bounce" />
            <p className="mt-4 text-sm font-semibold tracking-wider text-emerald-400">MEASURABLE INTELLIGENCE</p>
            <h2 className="mt-2 font-display text-6xl font-black text-white">{formatDot(vantagePoint)}</h2>
            <p className="mt-1 text-sm text-slate-400">Vantage Point Score / 1000</p>
            <div className="mt-6 max-w-xs text-xs text-slate-400">
              Top 15% of founders in the DOT valuation network. Proven strength in venture validation and commitment.
            </div>
          </div>
        ),
      },
      {
        title: "VENTURE VALUATION",
        content: (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <TrendingUp className="size-14 text-indigo-400" />
            <p className="mt-4 text-sm font-semibold tracking-wider text-indigo-400">ESTIMATED VALUATION</p>
            <h2 className="mt-2 font-display text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              {formatNaira(currentValuation)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Current Base Valuation</p>
            
            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-slate-700"></span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Unlocking Potential</span>
              <span className="h-px w-8 bg-slate-700"></span>
            </div>

            <h3 className="mt-2 font-display text-2xl font-bold text-white">
              {formatNaira(potentialValuation)}
            </h3>
            <p className="text-xs text-indigo-400">Estimated Valuation potential after full validation</p>
          </div>
        ),
      },
      {
        title: "FUNDABILITY PROFILE",
        content: (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="grid grid-cols-2 gap-8 w-full max-w-xs">
              <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block tracking-widest font-semibold uppercase">Fundability</span>
                <span className="font-display text-2xl font-extrabold text-white mt-1 block">{fundability}%</span>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 block tracking-widest font-semibold uppercase">Unicorn Potential</span>
                <span className="font-display text-2xl font-extrabold text-pink-400 mt-1 block">{unicornPotential.toFixed(1)}%</span>
              </div>
            </div>
            <div className="mt-8 text-xs text-slate-400 bg-slate-800/30 p-4 rounded-xl max-w-xs">
              💡 <span className="font-semibold text-white">Advice:</span> Validate {industry} scalability parameters to push valuation to {formatNaira(potentialValuation)}.
            </div>
          </div>
        ),
      },
    ];
  }, [assessment, founderProfile]);

  const shareText = `Check out my startup ${ventureName}'s Venture Valuation on DOT! Vantage: ${formatDot(vantagePoint)}, Est. Valuation: ${formatNaira(currentValuation)}. View my Wrapped recap:`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  }

  function shareWhatsApp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`, "_blank");
  }

  function shareTwitter() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  }

  function shareLinkedIn() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-2">
          <Sparkles className="size-8 animate-spin text-pink-500" />
          <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Generating Wrapped Recap...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold font-display">Recap Not Found</h1>
        <p className="mt-2 text-sm text-slate-400">This assessment recap may have been removed or does not exist.</p>
        <Button variant="hero" className="mt-6" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-pink-500/30">
      {/* Header */}
      <header className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link to="/">
          <Logo />
        </Link>
        <span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-pink-400">
          V2 Valuation Network
        </span>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-16 grid gap-12 lg:grid-cols-12 items-center">
        {/* Left Side: Spotify Wrapped Slider */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full max-w-[380px] rounded-[32px] overflow-hidden bg-slate-900 border-4 border-slate-800 shadow-2xl relative">
            {/* Slide indicators */}
            <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    i === activeSlide ? "bg-pink-500" : "bg-slate-700"
                  }`}
                />
              ))}
            </div>

            {/* Custom styled card layout for Spotify Wrapped vibe */}
            <div className="aspect-[9/16] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-8 flex flex-col justify-between relative overflow-hidden">
              {/* background neon circles */}
              <div className="absolute -top-24 -left-24 size-48 rounded-full bg-pink-500/10 blur-3xl"></div>
              <div className="absolute -bottom-24 -right-24 size-48 rounded-full bg-indigo-500/10 blur-3xl"></div>

              {/* Card Header branding */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">DOT WRAPPED</span>
                <span className="text-[10px] font-semibold text-pink-500">#{assessment.profiles?.dot_id}</span>
              </div>

              {/* Slider Content */}
              <div className="my-auto transition-opacity duration-300">
                {slides[activeSlide]?.content}
              </div>

              {/* Card Footer branding */}
              <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
                <span className="text-[9px] font-semibold text-slate-500">dotlive.cv/result/{id}</span>
                <span className="text-[10px] font-black tracking-tighter text-white">DOT.</span>
              </div>
            </div>
          </div>

          {/* Slider controls */}
          <div className="mt-6 flex items-center gap-6">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
              disabled={activeSlide === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-semibold text-slate-500">
              Slide {activeSlide + 1} of {slides.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              onClick={() => setActiveSlide((prev) => Math.min(slides.length - 1, prev + 1))}
              disabled={activeSlide === slides.length - 1}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Right Side: Virality Sharing controls & CTA */}
        <div className="lg:col-span-6 space-y-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 px-3 py-1 text-xs font-medium text-pink-400">
              <Sparkles className="size-3 animate-pulse" />
              Startups go viral
            </span>
            <h1 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">
              Share Your <span className="text-gradient">Venture Wrapped.</span>
            </h1>
            <p className="mt-3 text-sm text-slate-400 max-w-lg">
              Let the community know your score! Copy your custom link or share directly to your preferred platforms in one click.
            </p>
          </div>

          {/* Share Format Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Share Card Format</label>
            <div className="grid grid-cols-4 gap-2 max-w-md">
              {[
                { id: "story", label: "IG Story" },
                { id: "post", label: "IG Post" },
                { id: "linkedin", label: "LinkedIn" },
                { id: "twitter", label: "X Card" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setShareFormat(f.id as ShareFormat)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    shareFormat === f.id
                      ? "border-pink-500 bg-pink-500/15 text-pink-400"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Viral CTA Buttons */}
          <div className="grid gap-3 sm:grid-cols-2 max-w-md">
            <Button
              onClick={shareWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Share to WhatsApp
            </Button>
            <Button
              onClick={shareLinkedIn}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              Share to LinkedIn
            </Button>
            <Button
              onClick={shareTwitter}
              className="w-full bg-black hover:bg-slate-900 border border-slate-800 text-white font-bold"
            >
              Share to Twitter / X
            </Button>
            <Button
              onClick={copyLink}
              variant="outline"
              className="w-full border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            >
              <Copy className="mr-2 size-4" /> Copy Share Link
            </Button>
          </div>

          <div className="h-px bg-slate-900 max-w-md"></div>

          {/* Assess Call-To-Action Loop */}
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-6 max-w-md">
            <h3 className="font-display font-semibold text-white">How does your venture measure up?</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Complete your assessment on Africa's Venture Valuation Network. Get your fundability score, unicorn potential, and a customized roadmap.
            </p>
            <Button variant="hero" className="mt-4 w-full" asChild>
              <Link to="/auth">
                Evaluate My Venture Now <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
