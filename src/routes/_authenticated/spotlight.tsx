import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, AlertCircle, Check, Wallet, RotateCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app/AppShell";
import { useWallet } from "@/hooks/use-dot-data";
import { formatDot } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { submitSpotlightCampaign, getFounderCampaigns } from "@/lib/spotlight.functions";
import {
  SPOTLIGHT_PACKAGES,
  STATUS_META,
  SpotlightStatusBadge,
  Metric,
  type SpotlightPackageType,
  type SpotlightStatus,
} from "@/components/spotlight/spotlight-ui";

export const Route = createFileRoute("/_authenticated/spotlight")({
  head: () => ({
    meta: [
      { title: "Spotlight — Feature your venture on DOT" },
      {
        name: "description",
        content: "Submit your venture for a DOT Spotlight placement and track your campaigns.",
      },
    ],
  }),
  component: FounderSpotlightPage,
});

const PITCH_MAX = 2000;

function FounderSpotlightPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: balance = 0, isLoading: balanceLoading } = useWallet();
  const [ventureName, setVentureName] = useState("");
  const [pitch, setPitch] = useState("");
  const [selected, setSelected] = useState<SpotlightPackageType>("Growth");
  const [submitting, setSubmitting] = useState(false);
  const submitFn = useServerFn(submitSpotlightCampaign);

  const campaignsQuery = useQuery({
    queryKey: ["founder-spotlight-campaigns", user?.id],
    enabled: !!user,
    queryFn: () => getFounderCampaigns(),
  });
  const campaigns = campaignsQuery.data ?? [];

  const pkg = SPOTLIGHT_PACKAGES.find((p) => p.type === selected)!;
  const shortfall = Math.max(0, pkg.cost - balance);
  const canAfford = !balanceLoading && shortfall === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ventureName.trim() || !pitch.trim()) {
      toast.error("Add your venture name and pitch before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      // The server charges the wallet atomically and rejects insufficient balances.
      await submitFn({
        data: { ventureName: ventureName.trim(), pitch: pitch.trim(), packageType: selected },
      });
      toast.success(
        `Submitted. ${formatDot(pkg.cost)} DOT was charged and your campaign is in review.`,
      );
      setVentureName("");
      setPitch("");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["founder-spotlight-campaigns"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg === "INSUFFICIENT_FUNDS"
          ? "Your wallet balance is too low for this package."
          : msg || "Submission failed. No campaign was created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border pb-6">
          <div className="min-w-0">
            <h1 className="text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Feature your venture in Spotlight
            </h1>
            <p className="mt-2 max-w-xl text-pretty text-sm text-muted-foreground">
              Submit a campaign, pay with DOT credits, and follow its review and results here.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-right">
            <p className="text-xs text-muted-foreground">Wallet balance</p>
            {balanceLoading ? (
              <Skeleton className="ml-auto mt-1 h-6 w-24" />
            ) : (
              <p className="font-display text-lg font-semibold tabular-nums text-foreground">
                {formatDot(balance)} DOT
              </p>
            )}
          </div>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* New campaign */}
          <section aria-labelledby="new-campaign" className="space-y-6">
            <h2 id="new-campaign" className="font-display text-xl font-semibold text-foreground">
              New campaign
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset>
                <legend className="mb-3 text-sm font-medium text-foreground">
                  1. Choose a package
                </legend>
                <div
                  role="radiogroup"
                  aria-label="Spotlight package"
                  className="grid gap-3 sm:grid-cols-3"
                >
                  {SPOTLIGHT_PACKAGES.map((p) => {
                    const active = p.type === selected;
                    return (
                      <button
                        key={p.type}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setSelected(p.type)}
                        className={cn(
                          "relative flex min-h-11 flex-col rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/40",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-display text-base font-semibold text-foreground">
                            {p.type}
                          </span>
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-5 place-items-center rounded-full border",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border",
                            )}
                          >
                            {active && <Check className="size-3" strokeWidth={2.5} />}
                          </span>
                        </span>
                        <span className="mt-3 font-display text-2xl font-semibold tabular-nums text-foreground">
                          {formatDot(p.cost)}{" "}
                          <span className="text-sm font-normal text-muted-foreground">DOT</span>
                        </span>
                        <span className="mt-1 text-sm text-foreground">{p.duration}</span>
                        <span className="mt-1 text-xs text-muted-foreground">{p.summary}</span>
                        <span className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                          Reach target{" "}
                          <span className="tabular-nums text-foreground">
                            {p.targetReach.toLocaleString()}
                          </span>{" "}
                          views · not guaranteed
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
                <legend className="px-1 text-sm font-medium text-foreground">
                  2. Describe your venture
                </legend>
                <div className="space-y-1.5">
                  <Label htmlFor="ventureName">Venture name</Label>
                  <Input
                    id="ventureName"
                    value={ventureName}
                    maxLength={200}
                    onChange={(e) => setVentureName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="pitch">Pitch</Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {pitch.length}/{PITCH_MAX}
                    </span>
                  </div>
                  <Textarea
                    id="pitch"
                    value={pitch}
                    maxLength={PITCH_MAX}
                    onChange={(e) => setPitch(e.target.value)}
                    rows={5}
                    aria-describedby="pitch-help"
                    required
                  />
                  <p id="pitch-help" className="text-xs text-muted-foreground">
                    What you are building, who it is for, and your latest real milestone.
                  </p>
                </div>
              </fieldset>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <p className="text-sm font-medium text-foreground">3. Confirm and pay</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Package</dt>
                    <dd className="text-foreground">{pkg.type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Wallet balance</dt>
                    <dd className="tabular-nums text-foreground">{formatDot(balance)} DOT</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <dt className="text-foreground">Total</dt>
                    <dd className="tabular-nums text-foreground">{formatDot(pkg.cost)} DOT</dd>
                  </div>
                </dl>

                {!balanceLoading && shortfall > 0 && (
                  <div
                    role="status"
                    className="mt-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <p>
                      You need <span className="tabular-nums">{formatDot(shortfall)}</span> more DOT
                      for this package.{" "}
                      <Link to="/wallet" className="font-medium underline underline-offset-2">
                        Top up your wallet
                      </Link>
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  disabled={submitting || !canAfford}
                  className="mt-4 w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Charging wallet…
                    </>
                  ) : (
                    <>Pay {formatDot(pkg.cost)} DOT and submit</>
                  )}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Credits are charged when you submit. Every campaign is reviewed by the DOT team.
                </p>
              </div>
            </form>
          </section>

          {/* Campaigns */}
          <section aria-labelledby="my-campaigns" className="space-y-4 lg:sticky lg:top-6">
            <h2 id="my-campaigns" className="font-display text-xl font-semibold text-foreground">
              Your campaigns
            </h2>
            {campaignsQuery.isLoading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading campaigns">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
              </div>
            ) : campaignsQuery.isError ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
              >
                <p>Your campaigns couldn't be loaded.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => campaignsQuery.refetch()}
                >
                  <RotateCw className="size-4" /> Try again
                </Button>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Wallet className="mx-auto size-5 text-muted-foreground" strokeWidth={1.75} />
                <p className="mt-2 text-sm text-foreground">No campaigns yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your submissions and their results will appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {campaigns.map((c) => {
                  const meta = STATUS_META[c.status as SpotlightStatus] ?? STATUS_META.pending;
                  const showMetrics = c.status === "active" || c.status === "completed";
                  return (
                    <li key={c.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-medium text-foreground">{c.venture_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {c.package_type} ·{" "}
                            <span className="tabular-nums">{formatDot(Number(c.cost_dot))}</span>{" "}
                            DOT · {new Date(c.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <SpotlightStatusBadge status={c.status} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{meta.hint}</p>
                      {showMetrics ? (
                        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted p-3">
                          <Metric label="Views" value={c.impressions ?? 0} />
                          <Metric label="Clicks" value={c.clicks ?? 0} />
                          <Metric label="Leads" value={c.leads_generated ?? 0} />
                        </dl>
                      ) : null}
                      {c.published_content && (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="text-xs text-muted-foreground">Published copy</p>
                          <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-foreground">
                            {c.published_content}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
