// Pure pricing rules for DOT purchases. Shared by the checkout server function and tests.
// DOT credits are platform credits, not cash: nothing here computes a cash-out value.

export interface WalletSettingsRow {
  key: string;
  value: number | string | null;
  updated_at: string;
}

export interface WalletPricing {
  purchasePriceUsd: number | null;
  redemptionValueUsd: number | null;
  ngnPerUsd: number | null;
  fxUpdatedAt: string | null;
  fxMaxAgeHours: number;
  minPurchaseDot: number;
}

export function parseWalletSettings(rows: WalletSettingsRow[]): WalletPricing {
  const get = (k: string) => rows.find((r) => r.key === k);
  const num = (k: string) => {
    const v = get(k)?.value;
    const n = v === null || v === undefined ? NaN : Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    purchasePriceUsd: num("purchase_price_usd"),
    redemptionValueUsd: num("redemption_value_usd"),
    ngnPerUsd: num("ngn_per_usd"),
    fxUpdatedAt: num("ngn_per_usd") ? (get("ngn_per_usd")?.updated_at ?? null) : null,
    fxMaxAgeHours: num("fx_max_age_hours") ?? 24,
    minPurchaseDot: num("min_purchase_dot") ?? 1,
  };
}

export type CheckoutQuote =
  | { ok: true; dotAmount: number; usdAmount: number; nairaAmount: number; koboAmount: number; priceUsd: number; ngnPerUsd: number }
  | { ok: false; reason: string };

export function quoteCheckout(p: WalletPricing, dotAmount: number, now: Date = new Date()): CheckoutQuote {
  if (!Number.isInteger(dotAmount) || dotAmount <= 0) return { ok: false, reason: "Enter a whole number of DOT." };
  if (dotAmount < p.minPurchaseDot) return { ok: false, reason: `Minimum purchase is ${p.minPurchaseDot} DOT.` };
  if (!p.purchasePriceUsd) return { ok: false, reason: "DOT purchase price is not configured. Purchases are paused." };
  if (!p.ngnPerUsd || !p.fxUpdatedAt) {
    return { ok: false, reason: "The naira exchange rate has not been set. Purchases are paused until an admin updates it." };
  }
  const ageHours = (now.getTime() - new Date(p.fxUpdatedAt).getTime()) / 3_600_000;
  if (!Number.isFinite(ageHours) || ageHours > p.fxMaxAgeHours) {
    return { ok: false, reason: "The naira exchange rate is out of date. Purchases are paused until an admin updates it." };
  }
  const usdAmount = Math.round(dotAmount * p.purchasePriceUsd * 100) / 100;
  const nairaAmount = Math.ceil(usdAmount * p.ngnPerUsd);
  return { ok: true, dotAmount, usdAmount, nairaAmount, koboAmount: nairaAmount * 100, priceUsd: p.purchasePriceUsd, ngnPerUsd: p.ngnPerUsd };
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}
