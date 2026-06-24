import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  Rocket,
  Flame,
  Award,
  Loader2,
  TrendingUp,
  MousePointerClick,
  Users,
  CheckCircle2,
  AlertCircle,
  Coins,
  BadgeAlert
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/app/AppShell";
import { useWallet } from "@/hooks/use-dot-data";
import { formatDot } from "@/lib/constants";
import { toast } from "sonner";
import { submitSpotlightCampaign, getFounderCampaigns } from "@/lib/spotlight.functions";

export const Route = createFileRoute("/_authenticated/spotlight")({
  head: () => ({ meta: [{ title: "DOT Spotlight — Visibility Center" }] }),
  component: FounderSpotlightPage,
});

type PackageType = "Starter" | "Growth" | "Premium";

const PACKAGES = [
  {
    type: "Starter" as PackageType,
    cost: 20000,
    impressions: "10,000+",
    duration: "7 Days Visibility",
    desc: "Perfect for early-stage ventures seeking initial baseline community awareness.",
    features: [
      "Spotlight roll placement (7 days)",
      "Standard campaign dashboard",
      "Basic impressions reporting",
    ],
    accent: "from-blue-600 to-indigo-500",
    shadow: "shadow-blue-500/10",
  },
  {
    type: "Growth" as PackageType,
    cost: 50000,
    impressions: "30,000+",
    duration: "14 Days Priority",
    desc: "Accelerate your visibility across ecosystem builders, partners and investors.",
    features: [
      "Priority spotlight placement (14 days)",
      "Dedicated social media highlight",
      "Impressions & Clicks tracking",
      "Verified venture badge on roll",
    ],
    accent: "from-purple-600 to-pink-500",
    shadow: "shadow-purple-500/10",
    popular: true,
  },
  {
    type: "Premium" as PackageType,
    cost: 200000,
    impressions: "150,000+",
    duration: "30 Days Hypergrowth",
    desc: "Unmatched ecosystem exposure. Drive direct leads and visibility at scale.",
    features: [
      "Top-tier banner placement (30 days)",
      "Exclusive newsletter founder feature",
      "Full analytics + Lead generation tracking",
      "Direct investor matchmaking highlights",
    ],
    accent: "from-pink-600 to-orange-500",
    shadow: "shadow-pink-500/10",
  },
];

function FounderSpotlightPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: balance = 0 } = useWallet();

  const [ventureName, setVentureName] = useState("");
  const [pitch, setPitch] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<PackageType>("Growth");
  const [submitting, setSubmitting] = useState(false);

  const submitFn = useServerFn(submitSpotlightCampaign);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["founder-spotlight-campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      return getFounderCampaigns();
    },
  });

  // Calculate aggregate metrics for the founder
  const metrics = campaigns.reduce(
    (acc, c) => {
      if (c.status === "active" || c.status === "completed" || c.status === "approved") {
        acc.impressions += c.impressions || 0;
        acc.clicks += c.clicks || 0;
        acc.leads += c.leads_generated || 0;
      }
      return acc;
    },
    { impressions: 0, clicks: 0, leads: 0 }
  );

  const activePackage = PACKAGES.find((p) => p.type === selectedPackage)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ventureName.trim()) {
      toast.error("Venture name is required");
      return;
    }
    if (!pitch.trim()) {
      toast.error("Pitch description is required");
      return;
    }

    if (balance < activePackage.cost) {
      toast.error(`Insufficient funds. You need ${formatDot(activePackage.cost)} DOT, but your balance is ${formatDot(balance)} DOT.`);
      return;
    }

    setSubmitting(true);
    try {
      await submitFn({
        data: {
          ventureName,
          pitch,
          packageType: selectedPackage,
        },
      });
      toast.success("Spotlight request submitted and paid successfully!");
      setVentureName("");
      setPitch("");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["founder-spotlight-campaigns"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3 animate-pulse" />
              Ecosystem Promotion
            </span>
            <h1 className="mt-2 font-display text-4xl font-black text-white tracking-tight">DOT Spotlight</h1>
            <p className="mt-1 text-sm text-slate-400">
              Boost your venture's visibility, attract talent, and get noticed by investors across the network.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shrink-0 flex items-center gap-3">
            <Coins className="size-6 text-yellow-400" />
            <div>
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Wallet Balance</span>
              <span className="font-display font-bold text-white text-lg">{formatDot(balance)} <span className="text-xs text-primary">DOT</span></span>
            </div>
          </div>
        </div>

        {/* Aggregate Metrics Grid */}
        {campaigns.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-900 bg-slate-950/40 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 size-20 bg-blue-500/5 blur-2xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Impressions</span>
                <Users className="size-4 text-blue-400" />
              </div>
              <p className="mt-4 font-display text-3xl font-black text-white">{metrics.impressions.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-1">Total views across spotlight cards</p>
            </div>

            <div className="rounded-3xl border border-slate-900 bg-slate-950/40 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 size-20 bg-purple-500/5 blur-2xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clicks</span>
                <MousePointerClick className="size-4 text-purple-400" />
              </div>
              <p className="mt-4 font-display text-3xl font-black text-white">{metrics.clicks.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-1">Venture profile clickthrough traffic</p>
            </div>

            <div className="rounded-3xl border border-slate-900 bg-slate-950/40 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 size-20 bg-pink-500/5 blur-2xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leads Generated</span>
                <TrendingUp className="size-4 text-pink-400" />
              </div>
              <p className="mt-4 font-display text-3xl font-black text-white">{metrics.leads.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-1">Interested users, vendors & investors</p>
            </div>
          </div>
        )}

        {/* Main Work Area */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Submission and Package Selection Column */}
          <div className="lg:col-span-8 space-y-8">
            <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
              <Rocket className="size-5 text-primary" /> Select Your Visibility Package
            </h2>
            
            {/* Packages Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.type}
                  onClick={() => setSelectedPackage(pkg.type)}
                  className={`relative rounded-3xl border cursor-pointer p-5 flex flex-col justify-between transition-all hover:scale-[1.02] ${
                    selectedPackage === pkg.type
                      ? "border-primary bg-slate-950 shadow-lg " + pkg.shadow
                      : "border-slate-900 bg-slate-950/40 hover:border-slate-800"
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[9px] font-black text-white px-3 py-0.5 tracking-wider uppercase shadow-md">
                      Best Value
                    </span>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Package</span>
                      <h3 className="font-display font-black text-white text-lg mt-0.5">{pkg.type}</h3>
                    </div>
                    
                    <div>
                      <span className="font-display text-2xl font-black text-white">{formatDot(pkg.cost)}</span>
                      <span className="text-xs text-slate-500 ml-1">DOT</span>
                    </div>

                    <div className="text-[11px] leading-relaxed text-slate-400 border-t border-slate-900 pt-3">
                      <p className="font-semibold text-white mb-1">{pkg.duration}</p>
                      <p className="text-slate-500">{pkg.desc}</p>
                    </div>

                    <ul className="space-y-1.5 text-[10px] text-slate-300">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-900/60">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-gradient-to-r ${pkg.accent} text-white`}>
                      <Flame className="size-2.5 animate-pulse" /> {pkg.impressions} Est. Reach
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Campaign submit form */}
            <div className="rounded-3xl border border-slate-900 bg-slate-950/40 p-6 relative">
              <h3 className="font-display text-lg font-bold text-white mb-4">Venture Spotlight Details</h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="ventureName" className="text-xs font-bold text-slate-400">Venture Name</Label>
                  <Input
                    id="ventureName"
                    value={ventureName}
                    onChange={(e) => setVentureName(e.target.value)}
                    placeholder="e.g. Wigwe Health Tracker"
                    className="bg-slate-900/40 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pitch" className="text-xs font-bold text-slate-400">Visibility Pitch / Promotion Hook</Label>
                  <Textarea
                    id="pitch"
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    placeholder="Explain what your startup is building, your key traction milestone, or what you want to achieve with this visibility. Keep it engaging for investors and community readers."
                    rows={4}
                    className="bg-slate-900/40 border-slate-800 text-white resize-none"
                  />
                </div>

                {/* Balance validation alert */}
                {balance < activePackage.cost && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-2.5 text-xs text-red-400 text-left">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Insufficient Balance</span>
                      <p className="mt-0.5 text-[11px] text-red-400/80">
                        This campaign package costs {formatDot(activePackage.cost)} DOT. You need {formatDot(activePackage.cost - balance)} DOT more to submit. Please deposit funds in your wallet first.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-900 pt-4 mt-2">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Cost</span>
                    <span className="font-display font-black text-white text-xl">{formatDot(activePackage.cost)} <span className="text-xs text-primary">DOT</span></span>
                  </div>
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={submitting || balance < activePackage.cost}
                    className="px-8 py-5 font-bold"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" /> Charging Wallet...
                      </>
                    ) : (
                      <>
                        Confirm & Pay {formatDot(activePackage.cost)} DOT
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Active Campaigns Tracking Column */}
          <div className="lg:col-span-4 space-y-6">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Award className="size-5 text-yellow-400" /> Active Campaigns
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/20 p-8 text-center text-slate-500 text-xs space-y-2">
                <BadgeAlert className="size-6 text-slate-600 mx-auto" />
                <p>No active spotlight promotion campaigns found.</p>
                <p className="text-[10px] text-slate-600">Select a visibility package above to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((c) => (
                  <div key={c.id} className="rounded-3xl border border-slate-900 bg-slate-950 p-5 space-y-4 text-left relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{c.venture_name}</h4>
                        <span className="text-[10px] text-slate-500 block">{c.package_type} Package</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        c.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        c.status === "completed" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        c.status === "approved" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                        c.status === "rejected" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-900/30 p-2.5 rounded-xl text-center border border-slate-900/60">
                      <div>
                        <span className="text-[8px] text-slate-500 uppercase block font-semibold">Views</span>
                        <span className="font-display font-bold text-white text-xs">{c.impressions?.toLocaleString() ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 uppercase block font-semibold">Clicks</span>
                        <span className="font-display font-bold text-white text-xs">{c.clicks?.toLocaleString() ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 uppercase block font-semibold">Leads</span>
                        <span className="font-display font-bold text-white text-xs">{c.leads_generated?.toLocaleString() ?? 0}</span>
                      </div>
                    </div>

                    {c.published_content && (
                      <div className="text-[10px] text-slate-400 bg-slate-900/20 p-2.5 rounded-xl border border-slate-900/30">
                        <span className="font-bold text-white block mb-1">Published Visibility Hook:</span>
                        <p className="line-clamp-3">{c.published_content}</p>
                      </div>
                    )}

                    <div className="text-[9px] text-slate-600 flex justify-between">
                      <span>Submitted: {new Date(c.created_at).toLocaleDateString()}</span>
                      {c.assigned_team_member && <span>Agent: {c.assigned_team_member}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
