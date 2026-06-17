import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Loader2, Upload, Medal, FileText } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useFounderProfile } from "@/hooks/use-dot-data";
import { uploadDocument } from "@/lib/upload";
import { formatNaira } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pitchathons")({
  head: () => ({
    meta: [
      { title: "Pitchathons — DOT" },
      { name: "description", content: "Compete in DOT Pitchathons and get in front of investors." },
    ],
  }),
  component: PitchathonsPage,
});

function PitchathonsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: founder } = useFounderProfile();
  const [active, setActive] = useState<string | null>(null);
  const [ventureName, setVentureName] = useState("");
  const [fundingAsk, setFundingAsk] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: pitchathons = [], isLoading } = useQuery({
    queryKey: ["pitchathons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pitchathons").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myApps = [] } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pitchathon_applications")
        .select("*")
        .eq("founder_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const appliedTo = new Set(myApps.map((a) => a.pitchathon_id));

  async function submitApplication() {
    if (!user || !active) return;
    setBusy(true);
    try {
      let deckPath: string | null = null;
      if (file) deckPath = await uploadDocument(user.id, "pitch-decks", file);
      const { error } = await supabase.from("pitchathon_applications").insert({
        pitchathon_id: active,
        founder_id: user.id,
        venture_name: ventureName || founder?.venture_name,
        funding_ask: fundingAsk ? Number(fundingAsk) : null,
        pitch_deck_url: deckPath,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my-applications", user.id] });
      toast.success("Application submitted!");
      setActive(null);
      setVentureName("");
      setFundingAsk("");
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Pitchathons</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Submit your venture, get scored by judges, and climb the leaderboard.
      </p>

      {isLoading ? (
        <Loader2 className="mt-8 size-6 animate-spin text-primary" />
      ) : pitchathons.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No pitchathons running yet. Check back soon.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {pitchathons.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5 text-gold" />
                    <h2 className="font-display text-xl font-semibold">{p.title}</h2>
                    <Badge variant={p.status === "open" ? "default" : "secondary"}>{p.status}</Badge>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{p.description}</p>
                  {p.prize && <p className="mt-2 text-sm font-medium text-gold">Prize: {p.prize}</p>}
                </div>
                {appliedTo.has(p.id) ? (
                  <Badge variant="outline">Applied</Badge>
                ) : p.status === "open" ? (
                  <Button variant="hero" onClick={() => { setActive(p.id); setVentureName(founder?.venture_name ?? ""); }}>
                    Apply
                  </Button>
                ) : null}
              </div>
              <Leaderboard pitchathonId={p.id} />
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to pitchathon</DialogTitle>
            <DialogDescription>Submit your venture details and pitch deck.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vn">Venture name</Label>
              <Input id="vn" value={ventureName} onChange={(e) => setVentureName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ask">Funding ask (₦)</Label>
              <Input id="ask" type="number" value={fundingAsk} onChange={(e) => setFundingAsk(e.target.value)} placeholder="5000000" />
              {fundingAsk && <p className="text-xs text-muted-foreground">{formatNaira(Number(fundingAsk))}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deck">Pitch deck (PDF)</Label>
              <Input id="deck" type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file && <p className="flex items-center gap-1 text-xs text-muted-foreground"><FileText className="size-3" /> {file.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="hero" onClick={submitApplication} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Submit application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Leaderboard({ pitchathonId }: { pitchathonId: string }) {
  const { data } = useQuery({
    queryKey: ["leaderboard", pitchathonId],
    queryFn: async () => {
      const { data: apps, error } = await supabase
        .from("pitchathon_applications")
        .select("id, venture_name, pitchathon_scores(score)")
        .eq("pitchathon_id", pitchathonId);
      if (error) throw error;
      return (apps ?? [])
        .map((a) => {
          const scores = (a.pitchathon_scores as { score: number }[]) ?? [];
          const avg = scores.length ? scores.reduce((s, x) => s + Number(x.score), 0) / scores.length : 0;
          return { id: a.id, name: a.venture_name ?? "Unnamed", avg, count: scores.length };
        })
        .sort((a, b) => b.avg - a.avg);
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="mt-5 rounded-xl border border-border">
      <p className="border-b border-border px-4 py-2 text-sm font-medium">Leaderboard</p>
      <ul className="divide-y divide-border">
        {data.map((row, i) => (
          <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className={cn(
              "flex size-7 items-center justify-center rounded-full text-xs font-bold",
              i === 0 ? "bg-gold/20 text-gold" : i < 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}>
              {i < 3 ? <Medal className="size-4" /> : i + 1}
            </span>
            <span className="flex-1 text-sm font-medium">{row.name}</span>
            <span className="text-sm text-muted-foreground">
              {row.count > 0 ? `${row.avg.toFixed(1)} (${row.count})` : "Not scored"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
