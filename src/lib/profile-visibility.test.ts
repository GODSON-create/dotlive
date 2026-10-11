import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("drizzle/migrations/0002_member_scoped_profile_visibility.sql", "utf8");

describe("founder/builder profile visibility rule", () => {
  it("limits founder profiles to active DOT members", () => {
    expect(sql).toMatch(/ON public\.founder_profiles\s+FOR SELECT TO authenticated USING \(public\.is_active_member\(auth\.uid\(\)\)\)/);
  });
  it("limits builder profiles to active DOT members", () => {
    expect(sql).toMatch(/ON public\.builder_profiles\s+FOR SELECT TO authenticated USING \(public\.is_active_member\(auth\.uid\(\)\)\)/);
  });
  it("excludes suspended members", () => {
    expect(sql).toMatch(/NOT p\.suspended/);
  });
  it("never opens rows to everyone", () => {
    expect(sql).not.toMatch(/USING \(true\)/i);
  });
});
