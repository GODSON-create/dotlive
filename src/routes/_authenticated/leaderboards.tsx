import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, Gauge, TrendingUp, Award, Loader2, Landmark } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatDot, formatNaira } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/leaderboards")({
  head: () => ({
    meta: [
      { title: "Ecosystem Leaderboards — DOT" },
      { name: "description", content: "Compare valuations and vantage scores across Africa's startup communities." },
    ],
  }),
  component: LeaderboardsPage,
});

type LeaderboardCategory = "community" | "university" | "city" | "state" | "country" | "industry";

interface LeaderboardRow {
  group_name: string;
  avg_valuation: number;
  avg_vantage: number;
  most_improved: string;
  most_fundable_count: number;
  highest_unicorn_potential: number;
  member_count: number;
}

function LeaderboardsPage() {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>("community");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["community-leaderboard", activeCategory],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await (supabase as any).rpc("get_community_leaderboard", {
        _type: activeCategory,
      });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Trophy className="size-8 text-accent" />
            Ecosystem Leaderboards
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked by average venture valuation, vantage score and fundability metrics.
          </p>
        </div>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={(val) => setActiveCategory(val as LeaderboardCategory)}
        className="mt-8"
      >
        <TabsList className="flex-wrap bg-muted p-1 border border-border">
          <TabsTrigger value="community" className="text-xs">Communities</TabsTrigger>
          <TabsTrigger value="university" className="text-xs">Universities</TabsTrigger>
          <TabsTrigger value="city" className="text-xs">Cities</TabsTrigger>
          <TabsTrigger value="state" className="text-xs">States</TabsTrigger>
          <TabsTrigger value="country" className="text-xs">Countries</TabsTrigger>
          <TabsTrigger value="industry" className="text-xs">Industries</TabsTrigger>
        </TabsList>

        <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center p-6">
              <Trophy className="size-10 text-muted-foreground" />
              <h3 className="mt-4 font-semibold text-foreground">No data available</h3>
              <p className="mt-2 text-xs text-muted-foreground">Founders need to complete assessments with location info to populate ranks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold text-center w-16">Rank</th>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold text-right">Avg Vantage</th>
                    <th className="px-6 py-4 font-semibold text-right">Avg Valuation</th>
                    <th className="px-6 py-4 font-semibold text-center">Fundable</th>
                    <th className="px-6 py-4 font-semibold text-right">Highest Unicorn</th>
                    <th className="px-6 py-4 font-semibold text-center">Members</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, index) => {
                    const isTopThree = index < 3;
                    const medalColor = index === 0 ? "text-accent" : "text-muted-foreground";
                    
                    return (
                      <tr key={row.group_name} className="hover:bg-muted/40 transition-colors">
                        <td className="px-6 py-4 font-display font-bold text-center">
                          {isTopThree ? (
                            <span className={`inline-flex items-center justify-center size-6 rounded-full bg-muted border border-border ${medalColor}`}>
                              {index + 1}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{index + 1}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-foreground">
                          {row.group_name}
                        </td>
                        <td className="px-6 py-4 text-right font-display font-medium text-primary">
                          {formatDot(row.avg_vantage)}
                        </td>
                        <td className="px-6 py-4 text-right font-display font-bold text-foreground">
                          {formatNaira(row.avg_valuation)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary font-medium">
                            {row.most_fundable_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-display text-accent font-bold">
                          {Number(row.highest_unicorn_potential || 0).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-muted-foreground">
                          {row.member_count}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Tabs>
    </AppShell>
  );
}
