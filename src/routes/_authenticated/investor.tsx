import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Filter, Bookmark } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { INDUSTRIES, JOURNEY_STAGES } from "@/lib/constants";
import { FounderCard, type FounderShowcase } from "./demo";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/investor")({
  head: () => ({
    meta: [
      { title: "Investor Portal — DOT" },
      { name: "description", content: "Browse, filter and connect with African ventures." },
    ],
  }),
  component: InvestorPage,
});

function InvestorPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [industry, setIndustry] = useState("all");
  const [stage, setStage] = useState("all");
  const [minVantage, setMinVantage] = useState(0);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"vantage" | "fundability" | "industry" | "stage">("vantage");
 
  const { data: ventures = [], isLoading } = useQuery({
    queryKey: ["showcase"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_profiles")
        .select("user_id, venture_name, industry, stage, country, bio, funding_goal, vantage_point, fundability")
        .not("venture_name", "is", null)
        .order("vantage_point", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FounderShowcase[];
    },
  });
 
  const { data: saves = [] } = useQuery({
    queryKey: ["investor-saves", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("investor_saves").select("founder_id").eq("investor_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const saved = new Set(saves.map((s) => s.founder_id));
 
  const filtered = useMemo(
    () => {
      const res = ventures.filter((v) => {
        if (industry !== "all" && v.industry !== industry) return false;
        if (stage !== "all" && v.stage !== stage) return false;
        if ((v.vantage_point ?? 0) < minVantage) return false;
        if (savedOnly && !saved.has(v.user_id)) return false;
        return true;
      });

      return [...res].sort((a, b) => {
        if (sortBy === "vantage") {
          return (b.vantage_point ?? 0) - (a.vantage_point ?? 0);
        } else if (sortBy === "fundability") {
          return (b.fundability ?? 0) - (a.fundability ?? 0);
        } else if (sortBy === "industry") {
          return (a.industry ?? "").localeCompare(b.industry ?? "");
        } else if (sortBy === "stage") {
          return (a.stage ?? "").localeCompare(b.stage ?? "");
        }
        return 0;
      });
    },
    [ventures, industry, stage, minVantage, savedOnly, saved, sortBy],
  );
 
  async function toggleSave(founderId: string) {
    if (!user) return;
    try {
      if (saved.has(founderId)) {
        await supabase.from("investor_saves").delete().eq("investor_id", user.id).eq("founder_id", founderId);
      } else {
        await supabase.from("investor_saves").insert({ investor_id: user.id, founder_id: founderId });
      }
      qc.invalidateQueries({ queryKey: ["investor-saves", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }
 
  async function requestMeeting(founderId: string) {
    if (!user) return;
    try {
      const { error } = await supabase.from("meeting_requests").insert({
        investor_id: user.id,
        founder_id: founderId,
        message: "I'd like to learn more about your venture.",
      });
      if (error) throw error;
      toast.success("Meeting request sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send request");
    }
  }
 
  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Investor Portal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Discover and connect with vetted African ventures.
      </p>
 
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4 text-primary" /> Filters
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-xs text-muted-foreground">Industry</label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All industries</SelectItem>
                {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Stage</label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {JOURNEY_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Sort By</label>
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vantage">Vantage Score</SelectItem>
                <SelectItem value="fundability">Fundability Score</SelectItem>
                <SelectItem value="industry">Industry</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Min Vantage: {minVantage}</label>
            <Slider className="mt-3" value={[minVantage]} onValueChange={([v]) => setMinVantage(v)} max={1000} step={50} />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setSavedOnly((s) => !s)}
              className={`w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${savedOnly ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
            >
              <Bookmark className="size-4" /> Saved only
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Badge variant="secondary">{filtered.length} ventures</Badge>
      </div>

      {isLoading ? (
        <Loader2 className="mt-8 size-6 animate-spin text-primary" />
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <FounderCard
              key={v.user_id}
              v={v}
              isInvestor
              isSaved={saved.has(v.user_id)}
              isSelf={v.user_id === user?.id}
              onSave={() => toggleSave(v.user_id)}
              onMeet={() => requestMeeting(v.user_id)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
