// DOT platform constants

export const DOT_RATE_NGN = 15; // 1 DOT = ₦15
export const MIN_DEPOSIT_DOT = 2000; // minimum deposit

export function dotToNaira(dot: number): number {
  return Math.round(dot * DOT_RATE_NGN);
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDot(dot: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(dot);
}

export const JOURNEY_STAGES = [
  "Assess",
  "Learn",
  "Improve",
  "Validate",
  "Pitch",
  "Fund",
  "Scale",
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export type AppRole =
  | "founder"
  | "builder"
  | "vendor"
  | "community_leader"
  | "investor"
  | "capital_partner"
  | "admin"
  | "super_admin";

export const ROLE_LABELS: Record<AppRole, string> = {
  founder: "Founder",
  builder: "Builder",
  vendor: "Vendor",
  community_leader: "Community Leader",
  investor: "Investor",
  capital_partner: "Capital Partner",
  admin: "Admin",
  super_admin: "Super Admin",
};

// Roles a user can self-assign / switch into from the app
export const SELF_ASSIGNABLE_ROLES: AppRole[] = [
  "founder",
  "builder",
  "vendor",
  "community_leader",
  "investor",
  "capital_partner",
];

export const INDUSTRIES = [
  "Agriculture",
  "Fintech",
  "Health",
  "Education",
  "Commerce",
  "Logistics",
  "Energy",
  "Media",
  "SaaS",
  "Other",
] as const;

export const AFRICAN_COUNTRIES = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "Egypt",
  "Rwanda",
  "Tanzania",
  "Uganda",
  "Senegal",
  "Côte d'Ivoire",
  "Ethiopia",
  "Other",
] as const;
