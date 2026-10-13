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
  Loader2,
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


  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Building2 className="size-8 text-primary" />
            Capital Partner Portal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review ventures on DOT by stage and AVA Score.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        Commitment and drawdown tracking is coming soon. No figures are shown until your firm's records exist in DOT.
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
                    <th className="p-4 font-semibold uppercase text-center">AVA Score</th>
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

          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Portfolio tracking is coming soon. No portfolio companies are recorded yet.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
