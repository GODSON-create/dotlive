export const COMMUNITY_TYPES = ["university", "city", "industry", "interest", "builder"] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number];

export const COMMUNITY_TYPE_LABELS: Record<CommunityType, string> = {
  university: "University",
  city: "City / Region",
  industry: "Industry",
  interest: "Interest",
  builder: "Builder",
};

export function parseCommunityType(value: unknown): CommunityType | undefined {
  return typeof value === "string" && (COMMUNITY_TYPES as readonly string[]).includes(value)
    ? (value as CommunityType)
    : undefined;
}

export function cleanSearchText(value: unknown, max = 80): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().slice(0, max);
  return v.length ? v : undefined;
}

export function communityLocation(c: { university_name?: string | null; city?: string | null; region?: string | null; country?: string | null }): string {
  const parts = [c.university_name, c.city, c.region, c.country].filter((p): p is string => !!p && p.trim().length > 0);
  return Array.from(new Set(parts)).join(" · ");
}

export function formatMemberCount(n: number): string {
  return `${n} ${n === 1 ? "member" : "members"}`;
}
