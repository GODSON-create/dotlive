import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  TrendingUp,
  DollarSign,
  Briefcase,
  Users,
  Target,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatNaira, formatDot } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/capital-partner")({
  head: () => ({
    meta: [
      { title: "Capital Partner Portal — DOT" },
      { name: "description", content: "Executive pipeline management, demo participation and commitments dashboard." },
    ],
  }),
  component: CapitalPartnerPage,
});

// Mock commitments data for the executive dashboard
const mockCommitments = {
  totalCommitted: 1500000000, // ₦1.5 Billion
  drawnDown: 650000000, // ₦650 Million
  available: 850000000, // ₦850 Million
  capitalPartnerType: "Venture Capital Firm",
};

// Mock portfolio activity data
const mockPortfolio = [
  { name: "FarmGrid Ltd", industry: "Agriculture", valuation: 120000000, stage: "Pitch", status: "Seed Round Open", progress: 75 },
  { name: "PayShield Technologies", industry: "Fintech", valuation: 450000000, stage: "Scale", status: "Series A Pre-evaluation", progress: 40 },
  { name: "MedVitals Africa", industry: "Health", valuation: 85000000, stage: "Improve", status: "Vantage Diagnostic Completed", progress: 100 },
];

function CapitalPartnerPage() {
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string>("all");

  // Query actual ventures in pipeline
  const { data: pipeline = [], isLoading } = useQuery({
    queryKey: ["pipeline-ventures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_profiles")
        .select("user_id, venture_name, industry, stage, vantage_point, fundability")
        .not("venture_name", "is", null)
        .order("vantage_point", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredPipeline = pipeline.filter((v) => {
    if (selectedPipelineStage === "all") return true;
    return v.stage === selectedPipelineStage;
  });

  const drawdownPercent = Math.round((mockCommitments.drawnDown / mockCommitments.totalCommitted) * 100);

  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Building2 className="size-8 text-primary" />
            Capital Partner Portal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your firm's commitments, active pipelines, and check portfolio achievements.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-xs border-primary/20 bg-primary/5 text-primary w-fit">
          Partner Type: {mockCommitments.capitalPartnerType}
        </Badge>
      </div>

      {/* Commitments Overview */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <DollarSign className="size-4 text-emerald-500" /> Capital Commitment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-black text-white">{formatNaira(mockCommitments.totalCommitted)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total allocated seed capital allocation pool</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="size-4 text-primary" /> Drawdowns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="font-display text-2xl font-black text-white">{formatNaira(mockCommitments.drawnDown)}</span>
              <span className="text-xs font-semibold text-primary">{drawdownPercent}%</span>
            </div>
            <Progress value={drawdownPercent} className="h-1.5 bg-slate-900" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Target className="size-4 text-pink-500" /> Available Reserve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-black text-slate-300">{formatNaira(mockCommitments.available)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Remaining capital available for deployment</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        {/* Venture Pipeline */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="size-5 text-indigo-400" />
              Active Venture Pipeline
            </h2>

            {/* Filter Pipeline */}
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-slate-400" />
              <select
                value={selectedPipelineStage}
                onChange={(e) => setSelectedPipelineStage(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="all">All Pipeline Stages</option>
                <option value="Assess">Assess Stage</option>
                <option value="Learn">Learn Stage</option>
                <option value="Improve">Improve Stage</option>
                <option value="Validate">Validate Stage</option>
                <option value="Pitch">Pitch Stage</option>
                <option value="Fund">Fund Stage</option>
                <option value="Scale">Scale Stage</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                    <th className="p-4 font-semibold uppercase">Venture Name</th>
                    <th className="p-4 font-semibold uppercase">Industry</th>
                    <th className="p-4 font-semibold uppercase">Stage</th>
                    <th className="p-4 font-semibold uppercase text-center">Vantage Point</th>
                    <th className="p-4 font-semibold uppercase text-center">Fundability</th>
                    <th className="p-4 font-semibold uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : filteredPipeline.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No pipeline entries matching this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPipeline.map((v) => (
                      <tr key={v.user_id} className="border-b border-border/40 hover:bg-muted/10 transition-colors last:border-0">
                        <td className="p-4 font-bold text-white">{v.venture_name}</td>
                        <td className="p-4 text-slate-300">{v.industry}</td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-[10px] py-0.5">
                            {v.stage}
                          </Badge>
                        </td>
                        <td className="p-4 text-center font-display font-black text-indigo-400">
                          {v.vantage_point ?? "—"}
                        </td>
                        <td className="p-4 text-center font-semibold text-emerald-400">
                          {v.fundability ? `${v.fundability}%` : "—"}
                        </td>
                        <td className="p-4 text-center">
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2.5" asChild>
                            <a href={`/founder/${v.user_id}`} target="_blank" rel="noopener noreferrer">
                              Inspect <ArrowUpRight className="size-3 ml-1" />
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Portfolio Activity widget */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Users className="size-5 text-pink-400" />
            Portfolio Performance
          </h2>

          <div className="space-y-4">
            {mockPortfolio.map((p) => (
              <div key={p.name} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-bold text-white">{p.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{p.industry} · {p.stage} Stage</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                    {p.status}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Valuation Progress</span>
                    <span className="font-semibold text-white">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-1 bg-slate-900" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
