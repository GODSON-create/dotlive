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
  Download,
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
      const { data: assessmentData, error: assessmentErr } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (assessmentErr) throw assessmentErr;
      if (!assessmentData) return null;

      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("name, dot_id")
        .eq("id", assessmentData.user_id)
        .maybeSingle();

      if (profileErr) throw profileErr;

      return {
        ...assessmentData,
        profiles: profileData || null,
      } as any;
    },
  });

  const { data: founderProfile } = useQuery({
    queryKey: ["public-founder-profile", assessment?.user_id],
    enabled: !!assessment?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_profiles")
        .select("*, communities(*)")
        .eq("user_id", assessment?.user_id)
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

  function downloadCardAsImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Background Gradient
    ctx.fillStyle = "#020617"; // slate-950
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Neon Glow Circles
    // Top-Right Pink Glow
    const pinkGlow = ctx.createRadialGradient(900, 200, 50, 900, 200, 600);
    pinkGlow.addColorStop(0, "rgba(219, 39, 119, 0.15)");
    pinkGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = pinkGlow;
    ctx.beginPath();
    ctx.arc(900, 200, 600, 0, Math.PI * 2);
    ctx.fill();

    // Bottom-Left Indigo Glow
    const indigoGlow = ctx.createRadialGradient(100, 1700, 50, 100, 1700, 600);
    indigoGlow.addColorStop(0, "rgba(99, 102, 241, 0.12)");
    indigoGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = indigoGlow;
    ctx.beginPath();
    ctx.arc(100, 1700, 600, 0, Math.PI * 2);
    ctx.fill();

    // 3. Grid overlay lines (subtle tech look)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    for (let x = 120; x < 1080; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1920);
      ctx.stroke();
    }
    for (let y = 120; y < 1920; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    // 4. Header branding
    ctx.fillStyle = "#64748b"; // slate-500
    ctx.font = "bold 26px sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("DOT WRAPPED", 80, 150);

    ctx.fillStyle = "#ec4899"; // pink-500
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`#${assessment?.profiles?.dot_id || "FOUNDER"}`, 1000, 150);

    // 5. Title info
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 68px sans-serif";
    ctx.fillText(founderName, 80, 340);

    ctx.fillStyle = "#94a3b8"; // slate-400
    ctx.font = "500 36px sans-serif";
    ctx.fillText(`Building ${ventureName} (${industry})`, 80, 400);

    // Rounded rectangle helper
    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke: string | null = null, strokeW = 1) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
    };

    // SECTION 1: Archetype Card
    drawRoundRect(80, 480, 920, 200, 28, "#0f172a", "rgba(219, 39, 119, 0.2)", 2);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 24px sans-serif";
    ctx.fillText("FOUNDER ARCHETYPE", 120, 545);

    const archGrad = ctx.createLinearGradient(120, 0, 800, 0);
    archGrad.addColorStop(0, "#ec4899"); // pink-500
    archGrad.addColorStop(1, "#eab308"); // yellow-500
    ctx.fillStyle = archGrad;
    ctx.font = "bold 52px sans-serif";
    ctx.fillText(archetype, 120, 625);

    // SECTION 2: Valuation Card
    drawRoundRect(80, 720, 920, 260, 28, "#0f172a", "rgba(99, 102, 241, 0.2)", 2);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 24px sans-serif";
    ctx.fillText("ESTIMATED STARTUP VALUE", 120, 785);

    const valGrad = ctx.createLinearGradient(120, 0, 800, 0);
    valGrad.addColorStop(0, "#818cf8"); // indigo-400
    valGrad.addColorStop(0.5, "#c084fc"); // purple-400
    valGrad.addColorStop(1, "#f472b6"); // pink-400
    ctx.fillStyle = valGrad;
    ctx.font = "800 84px sans-serif";
    ctx.fillText(formatNaira(currentValuation), 120, 895);

    // SECTION 3: Score & Potential
    drawRoundRect(80, 1020, 440, 240, 28, "#0f172a", "rgba(255, 255, 255, 0.05)", 1.5);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 24px sans-serif";
    ctx.fillText("DOT SCORE", 120, 1080);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 76px sans-serif";
    ctx.fillText(`${vantagePoint}`, 120, 1180);
    const scoreWidth = ctx.measureText(`${vantagePoint}`).width;
    ctx.fillStyle = "#475569"; // slate-600
    ctx.font = "600 32px sans-serif";
    ctx.fillText("/ 1000", 120 + scoreWidth + 10, 1180);

    drawRoundRect(560, 1020, 440, 240, 28, "#0f172a", "rgba(255, 255, 255, 0.05)", 1.5);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 24px sans-serif";
    ctx.fillText("VALUATION POTENTIAL", 600, 1080);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "800 48px sans-serif";
    ctx.fillText(formatNaira(potentialValuation), 600, 1180);

    // SECTION 4: Rank Badge
    drawRoundRect(80, 1300, 920, 150, 28, "#1e1b4b", "rgba(99, 102, 241, 0.3)", 2);
    ctx.fillStyle = "#eab308";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText("🏆", 120, 1390);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(`Top ${assessment.rankPercent || 15}% of African Founders`, 190, 1390);

    // SECTION 5: Scan Box
    drawRoundRect(80, 1490, 920, 210, 28, "rgba(15, 23, 42, 0.6)", "rgba(255, 255, 255, 0.03)", 1.5);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("Find out what your startup is worth.", 120, 1560);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 26px sans-serif";
    ctx.fillText("Discover your DOT Score and join the network at", 120, 1615);
    ctx.fillStyle = "#ec4899";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("dotlive.cv", 120, 1665);

    // 6. Footer branding
    ctx.fillStyle = "#64748b";
    ctx.font = "500 24px sans-serif";
    ctx.fillText(`dotlive.cv/result/${id}`, 80, 1830);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("DOT.", 1000, 1830);

    // 7. Trigger download
    const link = document.createElement("a");
    link.download = `${ventureName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-valuation-card.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <Sparkles className="size-8 animate-spin text-primary" />
          <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Generating Wrapped Recap...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold font-display">Recap Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This assessment recap may have been removed or does not exist.</p>
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
        <span className="rounded-full bg-muted border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          V2 Valuation Network
        </span>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-16 grid gap-12 lg:grid-cols-12 items-center">
        {/* Left Side: Spotify Wrapped Slider */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full max-w-[380px] rounded-[32px] overflow-hidden bg-card border-4 border-border shadow-2xl relative">
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
              <div className="border-t border-slate-800/40 pt-4 flex items-center justify-between">
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
              className="rounded-full border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
              disabled={activeSlide === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-semibold text-muted-foreground">
              Slide {activeSlide + 1} of {slides.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3 animate-pulse" />
              Startups go viral
            </span>
            <h1 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl text-foreground">
              Share Your <span className="text-gradient">Venture Wrapped.</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-lg">
              Let the community know your score! Copy your custom link or share directly to your preferred platforms in one click.
            </p>
          </div>
 
          {/* Share Format Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Share Card Format</label>
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
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
 
          {/* Viral CTA Buttons */}
          <div className="grid gap-3 max-w-md">
            <Button
              onClick={downloadCardAsImage}
              variant="hero"
              className="w-full font-bold py-6 text-sm shadow-soft"
            >
              <Download className="mr-2 size-4.5" /> Download Share Card (PNG)
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={shareWhatsApp}
                className="w-full bg-[#128C7E] hover:bg-[#075E54] text-white font-bold text-xs py-5"
              >
                WhatsApp
              </Button>
              <Button
                onClick={shareLinkedIn}
                className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white font-bold text-xs py-5"
              >
                LinkedIn
              </Button>
            </div>
 
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={shareTwitter}
                className="w-full bg-foreground hover:bg-foreground/90 text-background font-bold text-xs py-5"
              >
                Twitter / X
              </Button>
              <Button
                onClick={copyLink}
                variant="outline"
                className="w-full border-border bg-card text-muted-foreground hover:text-foreground text-xs py-5"
              >
                <Copy className="mr-1.5 size-3.5" /> Copy Link
              </Button>
            </div>
          </div>
 
          <div className="h-px bg-border max-w-md"></div>
 
          {/* Assess Call-To-Action Loop */}
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 max-w-md shadow-sm">
            <h3 className="font-display font-semibold text-foreground">How does your venture measure up?</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
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
