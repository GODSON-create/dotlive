import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Gauge,
  Loader2,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAssessments } from "@/hooks/use-dot-data";
import { useQueryClient } from "@tanstack/react-query";
import {
  VANTAGE_CATEGORIES,
  TOTAL_QUESTIONS,
  computeVantage,
  type VantageAnswers,
} from "@/lib/vantage";
import { formatDot, formatNaira } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vantage")({
  head: () => ({
    meta: [
      { title: "Vantage — DOT" },
      { name: "description", content: "Measure your venture with the Vantage assessment." },
    ],
  }),
  component: VantagePage,
});

const SCALE = [
  { v: 1, label: "Very low" },
  { v: 2, label: "Low" },
  { v: 3, label: "Medium" },
  { v: 4, label: "High" },
  { v: 5, label: "Very high" },
];

const FLAT_QUESTIONS = VANTAGE_CATEGORIES.flatMap((c) =>
  c.questions.map((q) => ({ ...q, category: c.label })),
);

function VantagePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: assessments = [], isLoading } = useAssessments();
  const [taking, setTaking] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<VantageAnswers>({});
  const [busy, setBusy] = useState(false);

  const latest = assessments[assessments.length - 1];

  const history = useMemo(
    () =>
      assessments.map((a) => ({
        date: new Date(a.created_at).toLocaleDateString("en", { month: "short", day: "numeric" }),
        vantage: a.vantage_point,
        fundability: a.fundability,
      })),
    [assessments],
  );

  const current = FLAT_QUESTIONS[idx];
  const progress = ((idx + (answers[current?.id] ? 1 : 0)) / TOTAL_QUESTIONS) * 100;
  const answeredAll = FLAT_QUESTIONS.every((q) => answers[q.id]);

  function setAnswer(v: number) {
    setAnswers((a) => ({ ...a, [current.id]: v }));
    if (idx < FLAT_QUESTIONS.length - 1) {
      setTimeout(() => setIdx((i) => i + 1), 150);
    }
  }

  async function submit() {
    if (!user || !answeredAll) return;
    setBusy(true);
    try {
      const result = computeVantage(answers);
      const { error } = await supabase.from("assessments").insert({
        user_id: user.id,
        answers,
        category_scores: result.categoryScores,
        score: result.score,
        vantage_point: result.vantagePoint,
        fundability: result.fundability,
        investment_readiness: result.investmentReadiness,
        stage: result.stage,
        report: result.report,
        current_valuation: result.currentValuation,
        potential_valuation: result.potentialValuation,
        unicorn_potential: result.unicornPotential,
        founder_archetype: result.founderArchetype,
      });
      if (error) throw error;

      await supabase
        .from("founder_profiles")
        .update({
          vantage_point: result.vantagePoint,
          fundability: result.fundability,
          investment_readiness: result.investmentReadiness,
          stage: result.stage,
          current_valuation: result.currentValuation,
          potential_valuation: result.potentialValuation,
          unicorn_potential: result.unicornPotential,
          founder_archetype: result.founderArchetype,
        })
        .eq("user_id", user.id);

      toast.success(`Vantage complete! You scored ${result.vantagePoint} points.`);
      qc.invalidateQueries({ queryKey: ["assessments", user.id] });
      qc.invalidateQueries({ queryKey: ["founder_profile", user.id] });
      setTaking(false);
      setIdx(0);
      setAnswers({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save assessment");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <Loader2 className="size-6 animate-spin text-primary" />
      </AppShell>
    );
  }

  // ===== Assessment flow =====
  if (taking) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{current.category}</span>
              <span>{idx + 1} / {TOTAL_QUESTIONS}</span>
            </div>
            <Progress value={progress} className="mt-2" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold">{current.text}</h2>
            <div className="mt-6 grid gap-2">
              {SCALE.map((s) => (
                <button
                  key={s.v}
                  onClick={() => setAnswer(s.v)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 text-left transition-all hover:border-primary/50",
                    answers[current.id] === s.v ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="font-display text-sm text-muted-foreground">{s.v}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              {idx === FLAT_QUESTIONS.length - 1 ? (
                <Button variant="hero" onClick={submit} disabled={!answeredAll || busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  See my results
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIdx((i) => Math.min(FLAT_QUESTIONS.length - 1, i + 1))}
                  disabled={!answers[current.id]}
                >
                  Next <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ===== Results / intro =====
  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold">Vantage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your measurable venture intelligence score.
          </p>
        </div>
        <Button variant="hero" onClick={() => setTaking(true)}>
          {latest ? <RefreshCw className="size-4" /> : <Gauge className="size-4" />}
          {latest ? "Retake assessment" : "Take assessment"}
        </Button>
      </div>

      {!latest ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Gauge className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 font-display text-xl font-semibold">Take your first Vantage</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Answer {TOTAL_QUESTIONS} quick questions across 9 categories. We'll generate your
            Vantage Point, Fundability and Investment Readiness, plus a venture report.
          </p>
          <Button variant="hero" className="mt-6" onClick={() => setTaking(true)}>
            Start now <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ScoreCard label="Vantage Point" value={`${formatDot(latest.vantage_point)}`} max="/ 1000" icon={Gauge} pct={latest.vantage_point / 10} />
            <ScoreCard label="Fundability" value={`${latest.fundability}%`} icon={TrendingUp} pct={latest.fundability} />
            <ScoreCard label="Investment Ready" value={`${latest.investment_readiness}%`} icon={Target} pct={latest.investment_readiness} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <span className="text-sm text-muted-foreground">Estimated Startup Valuation</span>
              <p className="mt-3 font-display text-2xl font-bold text-gradient">
                {formatNaira(latest.current_valuation ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <span className="text-sm text-muted-foreground">Potential Valuation</span>
              <p className="mt-3 font-display text-2xl font-bold text-foreground">
                {formatNaira(latest.potential_valuation ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <span className="text-sm text-muted-foreground">Unicorn Potential</span>
              <p className="mt-3 font-display text-2xl font-bold text-primary">
                {typeof latest.unicorn_potential === 'number' ? latest.unicorn_potential.toFixed(1) : '0.0'}%
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <span className="text-sm text-muted-foreground">Founder Archetype</span>
              <p className="mt-3 font-display text-2xl font-bold text-gold">
                {latest.founder_archetype ?? "Venture Builder"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <Button variant="hero" asChild className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white font-semibold shadow-md">
              <Link to={`/result/${latest.id}`}>
                <Sparkles className="mr-2 size-4 animate-pulse" />
                View my DOT Wrapped Recap
              </Link>
            </Button>
          </div>


          {history.length > 1 && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Progress over time</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="vantage" name="Vantage Point" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Category breakdown</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {VANTAGE_CATEGORIES.map((c) => {
                const score = (latest.category_scores as Record<string, number>)?.[c.key] ?? 0;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.label}</span>
                      <span className="text-muted-foreground">{score}%</span>
                    </div>
                    <Progress value={score} className="mt-1.5" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <ReportCard
              title="Strengths"
              icon={CheckCircle2}
              tone="text-primary"
              items={(latest.report as { strengths: { label: string; score: number }[] })?.strengths?.map((s) => `${s.label} (${s.score}%)`) ?? []}
            />
            <ReportCard
              title="Weaknesses"
              icon={AlertTriangle}
              tone="text-gold"
              items={(latest.report as { weaknesses: { label: string; score: number }[] })?.weaknesses?.map((s) => `${s.label} (${s.score}%)`) ?? []}
            />
            <ReportCard
              title="Next actions"
              icon={Sparkles}
              tone="text-primary"
              items={(latest.report as { nextActions: string[] })?.nextActions ?? []}
            />
          </div>
        </>
      )}
    </AppShell>
  );
}

function ScoreCard({
  label,
  value,
  max,
  icon: Icon,
  pct,
}: {
  label: string;
  value: string;
  max?: string;
  icon: typeof Gauge;
  pct: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 font-display text-3xl font-bold">
        {value}
        {max && <span className="ml-1 text-sm font-normal text-muted-foreground">{max}</span>}
      </p>
      <Progress value={pct} className="mt-3" />
    </div>
  );
}

function ReportCard({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: typeof Gauge;
  tone: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-5", tone)} />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-muted-foreground">
            <span className="text-foreground">•</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
