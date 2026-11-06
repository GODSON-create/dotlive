import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { parseWalletSettings, quoteCheckout } from "./wallet-pricing";

const now = new Date("2026-11-06T12:00:00Z");
const rows = (fx: number | null, at = "2026-11-06T10:00:00Z") => [
  { key: "purchase_price_usd", value: 5, updated_at: at },
  { key: "redemption_value_usd", value: 5, updated_at: at },
  { key: "ngn_per_usd", value: fx, updated_at: at },
  { key: "fx_max_age_hours", value: 24, updated_at: at },
  { key: "min_purchase_dot", value: 1, updated_at: at },
];
const sql = readFileSync("drizzle/migrations/0003_wallet_credit_foundation.sql", "utf8");

describe("DOT pricing", () => {
  it("keeps purchase price and service reference as separate settings", () => {
    const p = parseWalletSettings(rows(1500));
    expect(p.purchasePriceUsd).toBe(5);
    expect(p.redemptionValueUsd).toBe(5);
  });
  it("prices 10 DOT at $50 using the configured rate", () => {
    const q = quoteCheckout(parseWalletSettings(rows(1500)), 10, now);
    expect(q).toMatchObject({ ok: true, usdAmount: 50, nairaAmount: 75000, koboAmount: 7500000 });
  });
  it("blocks checkout when the FX rate is missing", () => {
    expect(quoteCheckout(parseWalletSettings(rows(null)), 10, now).ok).toBe(false);
  });
  it("blocks checkout when the FX rate is stale", () => {
    expect(quoteCheckout(parseWalletSettings(rows(1500, "2026-11-04T10:00:00Z")), 10, now).ok).toBe(false);
  });
  it("rejects zero, negative and fractional amounts", () => {
    const p = parseWalletSettings(rows(1500));
    for (const a of [0, -5, 1.5]) expect(quoteCheckout(p, a, now).ok).toBe(false);
  });
});

describe("transfer and ledger rules (migration)", () => {
  it("retires instant transfers", () => {
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.transfer_dot\(text, numeric, text\) FROM PUBLIC, anon, authenticated/);
  });
  it("requires verified sender and recipient", () => {
    expect(sql).toMatch(/Only verified DOT members can send transfers/);
    expect(sql).toMatch(/Recipient is not eligible/);
  });
  it("blocks self-transfer and duplicate keys", () => {
    expect(sql).toMatch(/CHECK \(sender_id <> recipient_id\)/);
    expect(sql).toMatch(/UNIQUE \(sender_id, idempotency_key\)/);
  });
  it("only settles pending requests, once", () => {
    expect(sql).toMatch(/IF _r\.status <> 'pending' THEN RAISE EXCEPTION 'Request already %'/);
  });
  it("makes ledger entries immutable", () => {
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON public\.ledger_entries/);
  });
  it("has no withdrawal route", () => {
    expect(existsSync("src/routes/_authenticated/withdraw.tsx")).toBe(false);
  });
});
