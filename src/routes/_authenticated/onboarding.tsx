import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Rocket,
  Users,
  Briefcase,
  Hammer,
  Store,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Gauge,
  Trophy,
  Share2,
  Linkedin,
  MessageSquare,
  Globe,
  Building,
  School,
  MapPin,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { INDUSTRIES, AFRICAN_COUNTRIES, type AppRole, formatNaira, formatDot } from "@/lib/constants";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { submitAssessment } from "@/lib/vantage.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to DOT" }] }),
  component: OnboardingPage,
});

interface RoleOption {
  role: AppRole;
  title: string;
  desc: string;
  icon: typeof Rocket;
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: "founder", title: "Founder", desc: "Building a venture and raising capital.", icon: Rocket },
  { role: "builder", title: "Builder", desc: "Developer, designer, or product operator.", icon: Hammer },
  { role: "community_leader", title: "Community Leader", desc: "Running a startup community or hub.", icon: Users },
  { role: "investor", title: "Investor", desc: "Discovering and backing high-potential startups.", icon: Briefcase },
  { role: "vendor", title: "Vendor", desc: "Offering professional startup services.", icon: Store },
];

const STAGE_OPTIONS = [
  { value: "Idea", label: "Idea Stage" },
  { value: "Prototype", label: "Prototype Stage" },
  { value: "MVP", label: "MVP Stage" },
  { value: "Growth", label: "Growth/Traction Stage" },
];

const SCALE = [
  { v: 1, label: "Very low" },
  { v: 2, label: "Low" },
  { v: 3, label: "Medium" },
  { v: 4, label: "High" },
  { v: 5, label: "Very high" },
];

// 9 questions - 1 from each Vantage category
const FAST_QUESTIONS = [
  { id: "founder_1", cat: "founder", label: "Founder Commitment", text: "How committed are you to building this venture full-time?" },
  { id: "problem_1", cat: "problem", label: "Problem Definition", text: "How clearly can you articulate the problem you solve?" },
  { id: "market_1", cat: "market", label: "Market Size", text: "How large is your addressable market?" },
  { id: "validation_1", cat: "validation", label: "Early Validation", text: "How much customer evidence supports your solution?" },
  { id: "product_1", cat: "product", label: "Product Maturity", text: "How mature is your product (idea → MVP → live)?" },
  { id: "team_1", cat: "team", label: "Team Capability", text: "How complete is your founding team for what you need now?" },
  { id: "revenue_1", cat: "revenue", label: "Revenue Model", text: "How proven is your revenue model?" },
  { id: "scalability_1", cat: "scalability", label: "Scalability", text: "How easily can your model scale across markets?" },
  { id: "investment_readiness_1", cat: "investment_readiness", label: "Raise Readiness", text: "How prepared are you to raise (deck, data room, metrics)?" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, roles, profile, loading, refresh } = useAuth();
  const submitAssessmentFn = useServerFn(submitAssessment);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [busy, setBusy] = useState(false);

  // Profile / Startup data
  const [name, setName] = useState(profile?.name || "");
  const [startupName, setStartupName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("Idea");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [university, setUniversity] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLink, setSocialLink] = useState("");

  // Fast score questions wizard
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
  // Results cache
  const [resultScore, setResultScore] = useState<any>(null);

  useEffect(() => {
    if (!loading && roles.length > 0 && step === 1) {
      // If user already has roles assigned, let them skip onboarding
      navigate({ to: "/dashboard" });
    }
  }, [loading, roles, navigate, step]);

  function toggleRole(r: AppRole) {
    setSelectedRoles(prev => 
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  }

  async function handleIdentitySubmit() {
    if (selectedRoles.length === 0) {
      toast.error("Please select at least one identity.");
      return;
    }
    setStep(2);
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Your name is required.");
      return;
    }
    setStep(3);
  }

  function handleAnswerSelect(v: number) {
    const currentQ = FAST_QUESTIONS[qIdx];
    setAnswers(prev => ({ ...prev, [currentQ.id]: v }));
    
    if (qIdx < FAST_QUESTIONS.length - 1) {
      setTimeout(() => setQIdx(i => i + 1), 150);
    }
  }

  async function handleScoreSubmit() {
    if (!user) return;
    setBusy(true);
    try {
      // Expand 9 answers to fill all 18 questions in Vantage categories for a clean baseline
      const fullAnswers: Record<string, number> = {};
      
      // We set all questions of a category to matching Likert score
      fullAnswers["founder_1"] = answers["founder_1"] || 3;
      fullAnswers["founder_2"] = answers["founder_1"] || 3;
      fullAnswers["founder_3"] = answers["founder_1"] || 3;

      fullAnswers["problem_1"] = answers["problem_1"] || 3;
      fullAnswers["problem_2"] = answers["problem_1"] || 3;
      fullAnswers["problem_3"] = answers["problem_1"] || 3;

      fullAnswers["market_1"] = answers["market_1"] || 3;
      fullAnswers["market_2"] = answers["market_1"] || 3;
      fullAnswers["market_3"] = answers["market_1"] || 3;

      fullAnswers["validation_1"] = answers["validation_1"] || 3;
      fullAnswers["validation_2"] = answers["validation_1"] || 3;
      fullAnswers["validation_3"] = answers["validation_1"] || 3;

      fullAnswers["product_1"] = answers["product_1"] || 3;
      fullAnswers["product_2"] = answers["product_1"] || 3;

      fullAnswers["team_1"] = answers["team_1"] || 3;
      fullAnswers["team_2"] = answers["team_1"] || 3;

      fullAnswers["revenue_1"] = answers["revenue_1"] || 3;
      fullAnswers["revenue_2"] = answers["revenue_1"] || 3;

      fullAnswers["scalability_1"] = answers["scalability_1"] || 3;
      
      fullAnswers["investment_readiness_1"] = answers["investment_readiness_1"] || 3;

      // 1. Update Profile name
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ name })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      // 2. Insert user roles
      const roleInserts = selectedRoles.map(role => ({
        user_id: user.id,
        role: role
      }));
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert(roleInserts);
      if (roleErr && !roleErr.message.includes("duplicate")) throw roleErr;

      // 3. Upsert Founder Profile
      const { error: fpErr } = await supabase
        .from("founder_profiles")
        .upsert({
          user_id: user.id,
          venture_name: startupName || "Venture",
          industry: industry || "Other",
          stage: stage || "Idea",
          country: country || "Nigeria",
          city: city || null,
          state: state || null,
          university: university || null,
          website: website || null,
          vantage_point: 0,
        });
      if (fpErr) throw fpErr;

      // 4. Generate first score via server function
      const scoreResult = await submitAssessmentFn({ data: fullAnswers });
      setResultScore(scoreResult);
      
      await refresh();
      toast.success("Identity and initial startup profile created!");
      setStep(4);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save data");
    } finally {
      setBusy(false);
    }
  }

  function handleShare(platform: "whatsapp" | "linkedin" | "twitter") {
    if (!resultScore) return;
    const shareText = `I just discovered my startup could become a ${formatNaira(resultScore.potentialValuation)} company! DOT Score: ${resultScore.vantagePoint}. Check yours at dotlive.cv 🚀`;
    const url = encodeURIComponent(window.location.origin + `/result/${resultScore.assessmentId}`);
    
    let link = "";
    if (platform === "whatsapp") {
      link = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + window.location.origin + `/result/${resultScore.assessmentId}`)}`;
    } else if (platform === "linkedin") {
      link = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    } else if (platform === "twitter") {
      link = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${url}`;
    }
    
    window.open(link, "_blank");
  }

  function downloadCardAsImage() {
    if (!resultScore) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Background Gradient
    ctx.fillStyle = "#020617"; // slate-950
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Neon Glow Circles
    const pinkGlow = ctx.createRadialGradient(900, 200, 50, 900, 200, 600);
    pinkGlow.addColorStop(0, "rgba(219, 39, 119, 0.15)");
    pinkGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = pinkGlow;
    ctx.beginPath();
    ctx.arc(900, 200, 600, 0, Math.PI * 2);
    ctx.fill();

    const indigoGlow = ctx.createRadialGradient(100, 1700, 50, 100, 1700, 600);
    indigoGlow.addColorStop(0, "rgba(99, 102, 241, 0.12)");
    indigoGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = indigoGlow;
    ctx.beginPath();
    ctx.arc(100, 1700, 600, 0, Math.PI * 2);
    ctx.fill();

    // 3. Grid overlay lines
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
    ctx.fillText(`#${profile?.dot_id || "FOUNDER"}`, 1000, 150);

    // 5. Title info
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 68px sans-serif";
    ctx.fillText(name || "Founder", 80, 340);

    ctx.fillStyle = "#94a3b8"; // slate-400
    ctx.font = "500 36px sans-serif";
    ctx.fillText(`Building ${startupName || "Venture"} (${industry || "Tech"})`, 80, 400);

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
    ctx.fillText(resultScore.founderArchetype || "Founder", 120, 625);

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
    ctx.fillText(formatNaira(resultScore.currentValuation), 120, 895);

    // SECTION 3: Score & Potential
    drawRoundRect(80, 1020, 440, 240, 28, "#0f172a", "rgba(255, 255, 255, 0.05)", 1.5);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 24px sans-serif";
    ctx.fillText("DOT SCORE", 120, 1080);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 76px sans-serif";
    ctx.fillText(`${resultScore.vantagePoint}`, 120, 1180);
    const scoreWidth = ctx.measureText(`${resultScore.vantagePoint}`).width;
    ctx.fillStyle = "#475569"; // slate-600
    ctx.font = "600 32px sans-serif";
    ctx.fillText("/ 1000", 120 + scoreWidth + 10, 1180);

    drawRoundRect(560, 1020, 440, 240, 28, "#0f172a", "rgba(255, 255, 255, 0.05)", 1.5);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 24px sans-serif";
    ctx.fillText("VALUATION POTENTIAL", 600, 1080);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "800 48px sans-serif";
    ctx.fillText(formatNaira(resultScore.potentialValuation), 600, 1180);

    // SECTION 4: Rank Badge
    drawRoundRect(80, 1300, 920, 150, 28, "#1e1b4b", "rgba(99, 102, 241, 0.3)", 2);
    ctx.fillStyle = "#eab308";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText("🏆", 120, 1390);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(`Top ${resultScore.rankPercent || 15}% of African Founders`, 190, 1390);

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
    ctx.fillText(`dotlive.cv/result/${resultScore.assessmentId}`, 80, 1830);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("DOT.", 1000, 1830);

    // 7. Trigger download
    const link = document.createElement("a");
    link.download = `${(startupName || "venture").toLowerCase().replace(/[^a-z0-9]/g, "-")}-wrapped-card.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentQ = FAST_QUESTIONS[qIdx];
  const progressPercent = ((qIdx + (answers[currentQ?.id] ? 1 : 0)) / FAST_QUESTIONS.length) * 100;
  const answeredAll = FAST_QUESTIONS.every(q => answers[q.id]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 flex flex-col justify-center">
        
        {/* Step 1: Identity Selection */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-display text-3xl sm:text-4xl font-black">Choose Your Identity</h1>
              <p className="mt-2 text-slate-400 text-sm">
                Select all that apply to you. You can update this later.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = selectedRoles.includes(opt.role);
                return (
                  <button
                    key={opt.role}
                    onClick={() => toggleRole(opt.role)}
                    className={cn(
                      "flex flex-col p-5 text-left border rounded-2xl transition-all relative overflow-hidden group hover:-translate-y-0.5",
                      isSelected 
                        ? "border-primary bg-primary/10 ring-1 ring-primary" 
                        : "border-slate-800 bg-slate-900/30 hover:border-slate-700"
                    )}
                  >
                    <span className={cn(
                      "flex size-10 items-center justify-center rounded-xl mb-4 transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-slate-900 text-slate-400"
                    )}>
                      <opt.icon className="size-5" />
                    </span>
                    <span className="font-display text-base font-bold text-white block">{opt.title}</span>
                    <span className="text-xs text-slate-500 mt-1 leading-relaxed">{opt.desc}</span>
                    
                    {isSelected && (
                      <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                variant="hero" 
                onClick={handleIdentitySubmit} 
                disabled={selectedRoles.length === 0}
                className="w-full sm:w-auto font-bold px-8 py-5"
              >
                Next Step <ArrowRight className="size-4.5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Startup Profile */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="font-display text-3xl font-black">Tell us about your venture</h1>
              <p className="mt-2 text-slate-400 text-sm">Set up your founder profile to access the score system.</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="mx-auto w-full max-w-lg space-y-4 bg-slate-950/40 border border-slate-900 rounded-3xl p-6">
              
              <div className="space-y-1.5">
                <Label htmlFor="founderName" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  Founder Name
                </Label>
                <Input 
                  id="founderName" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Your full name"
                  className="bg-slate-900/50 border-slate-800 text-white" 
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startupName" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  Startup / Idea Name
                </Label>
                <Input 
                  id="startupName" 
                  required 
                  value={startupName} 
                  onChange={(e) => setStartupName(e.target.value)} 
                  placeholder="e.g. Nova AI" 
                  className="bg-slate-900/50 border-slate-800 text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-400">Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-800 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="bg-slate-905 border-slate-800 text-white">
                      {INDUSTRIES.map((i) => <SelectItem key={i} value={i} className="hover:bg-slate-900">{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-400">Current Stage</Label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-800 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="bg-slate-905 border-slate-800 text-white">
                      {STAGE_OPTIONS.map((st) => <SelectItem key={st.value} value={st.value} className="hover:bg-slate-900">{st.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-400">Location Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-800 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="bg-slate-905 border-slate-800 text-white h-60">
                      {AFRICAN_COUNTRIES.map((c) => <SelectItem key={c} value={c} className="hover:bg-slate-900">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="university" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <School className="size-3" /> University (Optional)
                  </Label>
                  <Input 
                    id="university" 
                    value={university} 
                    onChange={(e) => setUniversity(e.target.value)} 
                    placeholder="e.g. Covenant University" 
                    className="bg-slate-900/50 border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <MapPin className="size-3" /> City (Optional)
                  </Label>
                  <Input 
                    id="city" 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    placeholder="e.g. Ikeja" 
                    className="bg-slate-900/50 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <MapPin className="size-3" /> State (Optional)
                  </Label>
                  <Input 
                    id="state" 
                    value={state} 
                    onChange={(e) => setState(e.target.value)} 
                    placeholder="e.g. Lagos" 
                    className="bg-slate-900/50 border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <Globe className="size-3" /> Website (Optional)
                  </Label>
                  <Input 
                    id="website" 
                    value={website} 
                    onChange={(e) => setWebsite(e.target.value)} 
                    placeholder="https://" 
                    className="bg-slate-900/50 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="socials" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <Linkedin className="size-3" /> Social / LinkedIn (Optional)
                  </Label>
                  <Input 
                    id="socials" 
                    value={socialLink} 
                    onChange={(e) => setSocialLink(e.target.value)} 
                    placeholder="https://linkedin.com/in/" 
                    className="bg-slate-900/50 border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="border-slate-800">
                  <ArrowLeft className="size-4 mr-2" /> Back
                </Button>
                <Button type="submit" variant="hero" className="flex-1 font-bold">
                  Next Step <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Fast Initial Score */}
        {step === 3 && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Fast Assessment Baseline</span>
                <span>Question {qIdx + 1} / {FAST_QUESTIONS.length}</span>
              </div>
              <Progress value={progressPercent} className="mt-2" />
            </div>

            <div className="rounded-3xl border border-slate-900 bg-slate-950/80 p-6 sm:p-8 relative overflow-hidden shadow-elegant">
              <div className="absolute top-0 right-0 size-24 bg-primary/5 blur-2xl -z-10" />
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{currentQ.label}</span>
              <h2 className="mt-2 font-display text-xl sm:text-2xl font-black text-white leading-snug">{currentQ.text}</h2>
              
              <div className="mt-6 grid gap-2">
                {SCALE.map((s) => (
                  <button
                    key={s.v}
                    onClick={() => handleAnswerSelect(s.v)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:border-primary/50",
                      answers[currentQ.id] === s.v ? "border-primary bg-primary/10" : "border-slate-850 bg-slate-900/30"
                    )}
                  >
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="font-display text-xs text-slate-500 font-bold">{s.v}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setQIdx(i => Math.max(0, i - 1))}
                  disabled={qIdx === 0 || busy}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="size-4 mr-2" /> Back
                </Button>
                {qIdx === FAST_QUESTIONS.length - 1 ? (
                  <Button variant="hero" onClick={handleScoreSubmit} disabled={!answeredAll || busy} className="px-8 font-bold">
                    {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4.5 mr-2" />}
                    Calculate My Score
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setQIdx(i => Math.min(FAST_QUESTIONS.length - 1, i + 1))}
                    disabled={!answers[currentQ.id] || busy}
                    className="border-slate-800"
                  >
                    Next <ArrowRight className="size-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Wrapped Share Card */}
        {step === 4 && resultScore && (
          <div className="space-y-8 text-center max-w-md mx-auto w-full">
            <div>
              <Sparkles className="size-8 text-pink-400 mx-auto animate-pulse" />
              <h1 className="mt-3 font-display text-3xl font-black text-white">Your Startup Is Measured!</h1>
              <p className="mt-1 text-slate-400 text-sm">
                Here is your baseline valuation and ranking report.
              </p>
            </div>

            {/* Custom styled Spotify Wrapped Card */}
            <div className="aspect-[9/16] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-elegant text-left">
              <div className="absolute top-0 right-0 size-32 bg-primary/10 blur-3xl -z-10" />
              <div className="absolute bottom-0 left-0 size-32 bg-indigo-500/10 blur-3xl -z-10" />

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">DOT WRAPPED</span>
                <span className="text-[10px] font-bold text-pink-500">#{resultScore.founderArchetype || "Founder"}</span>
              </div>

              <div className="my-auto space-y-6">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">STARTUP VALUATION</span>
                  <span className="font-display text-3xl sm:text-4xl font-black text-gradient block mt-1">
                    {formatNaira(resultScore.currentValuation)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">DOT SCORE</span>
                    <span className="font-display text-2xl font-black text-white block mt-1">{resultScore.vantagePoint}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">POTENTIAL</span>
                    <span className="font-display text-lg font-bold text-slate-300 block mt-1">{formatNaira(resultScore.potentialValuation)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-900">
                  <p className="text-xs font-semibold text-slate-400">Ecosystem Rank</p>
                  <p className="font-display text-base font-bold text-white mt-1 flex items-center gap-1.5">
                    <Trophy className="size-4 text-yellow-400" />
                    Top {resultScore.rankPercent || 15}% of African Founders
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-850 pt-4 flex items-center justify-between text-[10px] text-slate-500">
                <span>dotlive.cv/result/{resultScore.assessmentId}</span>
                <span className="font-black text-white">DOT.</span>
              </div>
            </div>

            {/* Social Sharing buttons */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400">Share your result & build competition:</p>
              
              <Button
                onClick={downloadCardAsImage}
                className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white font-bold py-6 text-sm shadow-lg shadow-pink-500/20"
              >
                <Download className="mr-2 size-4.5" /> Download Share Card (PNG)
              </Button>

              <div className="grid grid-cols-3 gap-2">
                <Button 
                  onClick={() => handleShare("linkedin")} 
                  className="bg-[#0077b5] text-white hover:bg-[#0077b5]/90 text-xs font-bold py-4"
                >
                  LinkedIn
                </Button>
                <Button 
                  onClick={() => handleShare("whatsapp")} 
                  className="bg-[#25d366] text-white hover:bg-[#25d366]/90 text-xs font-bold py-4"
                >
                  WhatsApp
                </Button>
                <Button 
                  onClick={() => handleShare("twitter")} 
                  className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold py-4 border border-slate-800"
                >
                  X / Twitter
                </Button>
              </div>

              <Button 
                variant="hero" 
                onClick={() => navigate({ to: "/dashboard" })} 
                className="w-full font-bold py-6 text-sm mt-4 shadow-lg shadow-primary/10"
              >
                Go to Founder Dashboard <ArrowRight className="size-4.5 ml-2" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
