import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Rocket, Users, Briefcase, Loader2, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { INDUSTRIES, AFRICAN_COUNTRIES, type AppRole } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Get started — DOT" }] }),
  component: Onboarding,
});

const ROLE_OPTIONS: { role: AppRole; title: string; desc: string; icon: typeof Rocket }[] = [
  { role: "founder", title: "Founder", desc: "I'm building a venture and want to progress, learn and raise.", icon: Rocket },
  { role: "community_leader", title: "Community Leader", desc: "I run a community and want to onboard and track founders.", icon: Users },
  { role: "investor", title: "Investor", desc: "I want to discover and back African ventures.", icon: Briefcase },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, roles, profile, loading, refresh } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<AppRole | null>(null);
  const [busy, setBusy] = useState(false);

  // founder profile
  const [ventureName, setVentureName] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!loading && roles.length > 0) navigate({ to: "/dashboard" });
  }, [loading, roles, navigate]);

  async function selectRole(r: AppRole) {
    setRole(r);
    if (r === "founder") {
      setStep(2);
    } else {
      await saveRole(r);
    }
  }

  async function saveRole(r: AppRole, founderData?: { ventureName: string; industry: string; country: string; bio: string }) {
    if (!user) return;
    setBusy(true);
    try {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: r });
      if (roleErr && !roleErr.message.includes("duplicate")) throw roleErr;

      if (r === "founder" && founderData) {
        const { error: fpErr } = await supabase.from("founder_profiles").upsert({
          user_id: user.id,
          venture_name: founderData.ventureName,
          industry: founderData.industry,
          country: founderData.country,
          bio: founderData.bio,
          stage: "Assess",
        });
        if (fpErr) throw fpErr;
      }
      await refresh();
      toast.success("Welcome to DOT!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete setup");
      setBusy(false);
    }
  }

  async function handleFounderSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveRole("founder", { ventureName, industry, country, bio });
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border/60 bg-background/80">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <ThemeToggle />
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {step === 1 ? (
          <>
            <div className="text-center">
              <h1 className="font-display text-3xl font-bold">What are you joining as?</h1>
              <p className="mt-2 text-muted-foreground">
                {profile?.name ? `Welcome, ${profile.name.split(" ")[0]}. ` : ""}
                Pick the role that fits you best.
              </p>
            </div>
            <div className="mt-8 grid gap-4">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.role}
                  onClick={() => selectRole(opt.role)}
                  disabled={busy}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-md disabled:opacity-60",
                    role === opt.role && "border-primary ring-2 ring-primary/20",
                  )}
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <opt.icon className="size-6" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-lg font-semibold">{opt.title}</span>
                    <span className="block text-sm text-muted-foreground">{opt.desc}</span>
                  </span>
                  {busy && role === opt.role ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <ArrowRight className="size-5 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Check className="size-3" /> Founder
              </span>
              <h1 className="mt-3 font-display text-3xl font-bold">Tell us about your venture</h1>
              <p className="mt-2 text-muted-foreground">You can refine this anytime.</p>
            </div>
            <form onSubmit={handleFounderSubmit} className="mx-auto mt-8 max-w-lg space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venture">Venture name</Label>
                <Input id="venture" required value={ventureName} onChange={(e) => setVentureName(e.target.value)} placeholder="FarmLink Africa" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {AFRICAN_COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Short bio</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What does your venture do?" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={busy}>Back</Button>
                <Button type="submit" variant="hero" className="flex-1" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Enter DOT
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
