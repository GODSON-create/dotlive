import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CHALLENGE_DEFAULTS, challengeSettingsInput, journeyClock, nextMilestone, progressInput, safeOutbound, transitionInput } from "./challenge";

const id = "11111111-1111-4111-8111-111111111111";
const sql = readFileSync("drizzle/migrations/0004_builders_challenge_journey.sql", "utf8");
describe("Builders Challenge rules", () => {
  it("defaults to USD 20 standard pass", () => expect(CHALLENGE_DEFAULTS.standard_price_usd).toBe(20));
  it("defaults to USD 2 sponsored contribution", () => expect(CHALLENGE_DEFAULTS.sponsored_contribution_usd).toBe(2));
  it("defaults to individual 90-day starts", () => { expect(CHALLENGE_DEFAULTS.duration_days).toBe(90); expect(CHALLENGE_DEFAULTS.start_rule).toBe("confirmed_individual"); });
  it("keeps registration closed by default", () => expect(CHALLENGE_DEFAULTS.registration_enabled).toBe(false));
  it("starts each participant clock independently", () => {
    expect(journeyClock("2026-11-01T00:00:00Z", "2027-01-30T00:00:00Z", "2026-11-08T00:00:00Z")).toEqual({ elapsed: 7, remaining: 83, week: 2, ended: false });
    expect(journeyClock("2026-11-08T00:00:00Z", "2027-02-06T00:00:00Z", "2026-11-08T00:00:00Z")).toEqual({ elapsed: 0, remaining: 90, week: 1, ended: false });
  });
  it("does not start pending enrollments", () => expect(journeyClock(null, null, "2026-11-08T00:00:00Z").remaining).toBeNull());
  it("caps completed clocks at 90 days", () => expect(journeyClock("2026-11-01T00:00:00Z", "2027-01-30T00:00:00Z", "2027-02-01T00:00:00Z")).toEqual({ elapsed: 90, remaining: 0, week: 13, ended: true }));
  it("requires reviewed evidence to advance", () => { expect(nextMilestone([{ milestone_key: "onboarding", review_state: "submitted" }])?.key).toBe("onboarding"); expect(nextMilestone([{ milestone_key: "onboarding", review_state: "accepted" }])?.key).toBe("baseline"); });
  it("rejects activation and forged payment confirmation actions", () => { for (const action of ["activate", "confirm", "credit"]) expect(transitionInput.safeParse({ id, action, reason: "confirmed" }).success).toBe(false); });
  it("rejects unsafe Ping links", () => { expect(safeOutbound("javascript:alert(1)")).toBeNull(); expect(safeOutbound("http://example.com")).toBeNull(); expect(safeOutbound("https://example.com/profile")).toBe("https://example.com/profile"); });
  it("requires a weekly progress note", () => expect(progressInput.safeParse({ id, kind: "checkin", note: "", evidence: null, ping: null }).success).toBe(false));
  it("requires positive pass prices and sponsored contribution no greater than standard", () => expect(challengeSettingsInput.safeParse({ registration: false, standard: 20, sponsored: 21, duration: 90, catalogue: false, reason: "review" }).success).toBe(false));
});
describe("challenge database safety contract (static, not live execution)", () => {
  it("reserves one active or pending enrollment per participant", () => expect(sql).toMatch(/CREATE UNIQUE INDEX challenge_one_open_enrollment[\s\S]*?WHERE status IN \('pending_confirmation','active'\)/));
  it("serializes duplicate requests", () => expect(sql).toMatch(/public.profiles WHERE id=auth.uid\(\) FOR UPDATE/));
  it("requires role and assigned community for lead access", () => expect(sql).toMatch(/has_role\(auth.uid\(\),'community_leader'\)[\s\S]*?c.leader_id=auth.uid\(\)/));
  it("does not grant direct client mutations", () => { expect(sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL).* TO authenticated/); expect(sql).toMatch(/challenge_audit_immutable BEFORE UPDATE OR DELETE/); });
  it("never changes wallet balances or invokes issuance", () => expect(sql).not.toMatch(/(?:UPDATE|INSERT INTO) public\.(wallets|transactions|ledger_entries)|(?:reward_dot|deposit_dot|credit_paystack_payment)\(/));
  it("requires payment, sponsorship and eligibility for active states", () => { expect(sql).toMatch(/payment_state = 'confirmed'/); expect(sql).toMatch(/sponsorship_state='confirmed'/); expect(sql).toMatch(/eligibility_confirmed_at IS NOT NULL/); });
  it("blocks activation inside the transactional boundary", () => expect(sql).toMatch(/RAISE EXCEPTION 'Payment confirmation and activation are disabled/));
  it("preserves the existing complimentary AVA policy", () => expect(readFileSync("src/lib/vantage.functions.ts", "utf8")).toMatch(/count !== null && count >= 2/));
});