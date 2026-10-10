import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { parseAttribution, normalizeSource } from "./attribution";

describe("acquisition attribution", () => {
  it("maps short channel codes to sources", () => {
    expect(normalizeSource("ig")).toBe("instagram");
    expect(normalizeSource("wa")).toBe("whatsapp");
    expect(normalizeSource("tg")).toBe("telegram");
    expect(normalizeSource("Varsityscape")).toBe("varsityscape");
  });
  it("buckets unknown sources as other", () => {
    expect(normalizeSource("tiktok")).toBe("other");
  });
  it("treats a ref code alone as a referral", () => {
    expect(parseAttribution("/start", "?ref=ABC123")?.source).toBe("referral");
  });
  it("keeps campaign and foundry from the link", () => {
    const a = parseAttribution("/start", "?source=ig&campaign=launch_oct&foundry=arise");
    expect(a).toMatchObject({ source: "instagram", campaign: "launch_oct", foundry_slug: "arise" });
  });
  it("returns nothing when the link has no attribution", () => {
    expect(parseAttribution("/", "?q=1")).toBeNull();
  });
  it("strips unsafe characters from campaign names", () => {
    expect(parseAttribution("/start", "?source=dot&campaign=<script>")?.campaign).toBe("script");
  });
});
