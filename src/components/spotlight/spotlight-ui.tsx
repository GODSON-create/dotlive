import { cn } from "@/lib/utils";

export type SpotlightPackageType = "Starter" | "Growth" | "Premium";
export type SpotlightStatus = "pending" | "approved" | "active" | "completed" | "rejected";

/**
 * Display copy for the existing Spotlight packages. Costs and reach targets mirror
 * the server-side table in spotlight.functions.ts, which remains the source of truth
 * for charging. Reach is a target only — never a guarantee.
 */
export const SPOTLIGHT_PACKAGES: {
  type: SpotlightPackageType;
  cost: number;
  targetReach: number;
  duration: string;
  summary: string;
}[] = [
  {
    type: "Starter",
    cost: 20000,
    targetReach: 10000,
    duration: "7-day placement",
    summary: "Standard placement in the Spotlight roll.",
  },
  {
    type: "Growth",
    cost: 50000,
    targetReach: 30000,
    duration: "14-day placement",
    summary: "Priority placement in the Spotlight roll.",
  },
  {
    type: "Premium",
    cost: 200000,
    targetReach: 150000,
    duration: "30-day placement",
    summary: "Top placement in the Spotlight roll.",
  },
];

export const STATUS_META: Record<SpotlightStatus, { label: string; hint: string; tone: string }> = {
  pending: {
    label: "In review",
    hint: "The DOT team is reviewing your submission.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  approved: {
    label: "Approved",
    hint: "Approved and waiting to go live.",
    tone: "border-primary/30 bg-primary/10 text-primary",
  },
  active: {
    label: "Live",
    hint: "Your campaign is currently featured.",
    tone: "border-primary/40 bg-primary/15 text-primary",
  },
  completed: {
    label: "Completed",
    hint: "This campaign has finished.",
    tone: "border-border bg-muted text-muted-foreground",
  },
  rejected: {
    label: "Not approved",
    hint: "This submission was not approved.",
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export function SpotlightStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as SpotlightStatus] ?? STATUS_META.pending;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.tone,
      )}
    >
      {meta.label}
    </span>
  );
}

export function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
