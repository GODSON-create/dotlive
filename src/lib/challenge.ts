import { z } from "zod";

export const CHALLENGE_DEFAULTS = {
  registration_enabled: false,
  standard_price_usd: 20,
  sponsored_contribution_usd: 2,
  duration_days: 90,
  start_rule: "confirmed_individual",
  benefit_catalogue_visible: false,
};

export const MILESTONES = [
  { key: "onboarding", title: "Onboarding", action: "Complete your venture profile" },
  { key: "baseline", title: "Baseline AVA", action: "Complete your baseline assessment" },
  { key: "learning", title: "Learning & library", action: "Record what you learned" },
  { key: "progress", title: "Weekly progress", action: "Submit progress evidence" },
  { key: "review", title: "Progress review", action: "Prepare evidence for review" },
  { key: "pitch", title: "Pitch / demo preparation", action: "Submit your pitch preparation" },
  { key: "completion", title: "Completion", action: "Submit your journey summary" },
] as const;

export const httpsLink = z.string().url().max(2000).refine((v) => new URL(v).protocol === "https:", "Use an HTTPS link");
export function safeOutbound(value: string | null | undefined) {
  const parsed = httpsLink.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function journeyClock(start: string | null, end: string | null, now: string) {
  if (!start || !end) return { elapsed: 0, remaining: null, week: null, ended: false };
  const s = Date.parse(start), e = Date.parse(end), n = Date.parse(now);
  if (![s, e, n].every(Number.isFinite) || e <= s) return { elapsed: 0, remaining: null, week: null, ended: false };
  const days = Math.ceil((e - s) / 86_400_000);
  return {
    elapsed: Math.min(days, Math.max(0, Math.floor((n - s) / 86_400_000))),
    remaining: Math.min(days, Math.max(0, Math.ceil((e - n) / 86_400_000))),
    week: n < s ? null : Math.min(Math.ceil(days / 7), Math.floor((n - s) / 604_800_000) + 1),
    ended: n >= e,
  };
}

export function nextMilestone(rows: { milestone_key: string; review_state: string }[]) {
  return MILESTONES.find((m) => !rows.some((r) => r.milestone_key === m.key && r.review_state === "accepted")) ?? null;
}

export const challengeSettingsInput = z.object({
  registration: z.boolean(), standard: z.number().positive(), sponsored: z.number().positive(),
  duration: z.number().int().min(1).max(366), catalogue: z.boolean(), reason: z.string().trim().min(3).max(1000),
}).refine((v) => v.sponsored <= v.standard, "Sponsored contribution cannot exceed the standard price");

export const progressInput = z.object({
  id: z.string().uuid(), kind: z.enum(["checkin", "milestone", "ping_profile"]),
  key: z.enum(["onboarding", "baseline", "learning", "progress", "review", "pitch", "completion"]).optional(),
  note: z.string().trim().max(4000), evidence: httpsLink.nullable(), ping: httpsLink.nullable(),
}).superRefine((v, ctx) => {
  if (v.kind === "checkin" && !v.note) ctx.addIssue({ code: "custom", message: "Describe your progress" });
  if (v.kind === "milestone" && (!v.key || (!v.note && !v.evidence))) ctx.addIssue({ code: "custom", message: "Select a milestone and provide evidence" });
});

// Payment and credit activation are deliberately not supported in this phase.
export const transitionInput = z.object({ id: z.string().uuid(), action: z.enum(["cancel", "reject", "complete"]), reason: z.string().trim().max(1000) });