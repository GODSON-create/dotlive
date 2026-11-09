import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCommunityType, communityLocation, formatMemberCount, cleanSearchText } from "./communities";

const sql = readFileSync("drizzle/migrations/0005_communities_directory.sql", "utf8");

describe("community helpers", () => {
  it("accepts only the five community types", () => {
    expect(parseCommunityType("university")).toBe("university");
    expect(parseCommunityType("cult")).toBeUndefined();
  });
  it("builds location without duplicates", () => {
    expect(communityLocation({ university_name: "UNIPORT", city: "Port Harcourt", region: "Rivers", country: "Nigeria" })).toBe("UNIPORT · Port Harcourt · Rivers · Nigeria");
    expect(communityLocation({ city: "Lagos", region: "Lagos" })).toBe("Lagos");
  });
  it("pluralises member counts", () => {
    expect(formatMemberCount(1)).toBe("1 member");
    expect(formatMemberCount(0)).toBe("0 members");
  });
  it("trims empty search", () => {
    expect(cleanSearchText("  ")).toBeUndefined();
  });
});

describe("communities migration rules", () => {
  it("removes direct membership inserts so status cannot be spoofed", () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Founders join communities"/);
  });
  it("public join requires an active member and rejects invite-only", () => {
    const fn = sql.slice(sql.indexOf("FUNCTION public.join_community("), sql.indexOf("FUNCTION public.join_community_by_code"));
    expect(fn).toMatch(/is_active_member\(auth\.uid\(\)\)/);
    expect(fn).toMatch(/invite only/);
    expect(fn).toMatch(/ON CONFLICT \(community_id, founder_id\) DO NOTHING/);
  });
  it("ordinary join never overwrites primary community", () => {
    const fn = sql.slice(sql.indexOf("FUNCTION public.join_community("), sql.indexOf("FUNCTION public.join_community_by_code"));
    expect(fn).not.toMatch(/founder_profiles/);
    expect(sql).toMatch(/community_id IS NULL/);
  });
  it("directory never returns referral codes", () => {
    const fn = sql.slice(sql.indexOf("FUNCTION public.list_communities"), sql.indexOf("FUNCTION public.join_community("));
    expect(fn).not.toMatch(/referral_code/);
    expect(sql).toMatch(/REVOKE SELECT ON public\.communities FROM authenticated/);
  });
});
