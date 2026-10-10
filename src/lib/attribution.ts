// Acquisition attribution: parse entry links, keep first touch in the browser,
// log anonymous visits, and bind attribution to the member once signed in.
import { supabase } from "@/integrations/supabase/client";

export const ACQUISITION_SOURCES = [
  "instagram",
  "arise",
  "whatsapp",
  "telegram",
  "whop",
  "varsityscape",
  "dot",
  "referral",
  "foundry",
] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number] | "other";

export const SOURCE_LABELS: Record<AcquisitionSource, string> = {
  instagram: "Instagram",
  arise: "ARISE",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  whop: "Whop",
  varsityscape: "Varsityscape",
  dot: "DOT",
  referral: "Referral",
  foundry: "Foundry",
  other: "Other",
};

const ALIASES: Record<string, AcquisitionSource> = {
  ig: "instagram",
  insta: "instagram",
  instagram: "instagram",
  wa: "whatsapp",
  whatsapp: "whatsapp",
  tg: "telegram",
  telegram: "telegram",
  arise: "arise",
  joinarise: "arise",
  whop: "whop",
  varsityscape: "varsityscape",
  vs: "varsityscape",
  dot: "dot",
  referral: "referral",
  ref: "referral",
  foundry: "foundry",
};

export function normalizeSource(raw: string | null | undefined): AcquisitionSource | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  return ALIASES[key] ?? "other";
}

const clean = (v: string | null | undefined, max: number, pattern = /[^A-Za-z0-9_\-]/g) => {
  if (!v) return null;
  const out = v.trim().replace(pattern, "").slice(0, max);
  return out || null;
};

export interface Attribution {
  source: AcquisitionSource;
  campaign: string | null;
  ref_code: string | null;
  foundry_slug: string | null;
  landing_path: string;
  first_seen_at: string;
}

/** Parse a URL's search params into attribution. Returns null when no signal is present. */
export function parseAttribution(pathname: string, search: string, now = new Date()): Attribution | null {
  const p = new URLSearchParams(search);
  const ref = clean(p.get("ref"), 40);
  const campaign = clean(p.get("campaign") ?? p.get("utm_campaign"), 80);
  const foundry = clean(p.get("foundry"), 40, /[^a-z0-9-]/g)?.toLowerCase() ?? null;
  let source = normalizeSource(p.get("source") ?? p.get("utm_source"));
  if (!source && ref) source = "referral";
  if (!source && foundry) source = "foundry";
  if (!source && campaign) source = "other";
  if (!source) return null;
  return {
    source,
    campaign,
    ref_code: ref,
    foundry_slug: foundry,
    landing_path: pathname.slice(0, 200),
    first_seen_at: now.toISOString(),
  };
}

const KEY = "dot-attribution";
const VISITOR_KEY = "dot-visitor-id";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function readStoredAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Attribution;
    if (Date.now() - new Date(a.first_seen_at).getTime() > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return a;
  } catch {
    return null;
  }
}

/** Call from useEffect. Keeps first touch; always logs the visit. */
export async function captureAttribution(): Promise<void> {
  if (typeof window === "undefined") return;
  const a = parseAttribution(window.location.pathname, window.location.search);
  if (!a) return;
  if (!readStoredAttribution()) localStorage.setItem(KEY, JSON.stringify(a));
  try {
    await supabase.rpc("record_acquisition_visit", {
      _visitor_id: getVisitorId(),
      _source: a.source,
      _campaign: a.campaign ?? undefined,
      _ref_code: a.ref_code ?? undefined,
      _foundry_slug: a.foundry_slug ?? undefined,
      _landing_path: a.landing_path,
    });
  } catch {
    /* attribution must never block the visitor */
  }
}

/** Call after sign-in. First touch wins server-side; one row per member. */
export async function claimAttribution(): Promise<void> {
  const a = readStoredAttribution();
  if (!a) return;
  const { error } = await supabase.rpc("claim_acquisition_attribution", {
    _visitor_id: getVisitorId(),
    _source: a.source,
    _campaign: a.campaign ?? undefined,
    _ref_code: a.ref_code ?? undefined,
    _foundry_slug: a.foundry_slug ?? undefined,
    _landing_path: a.landing_path,
    _first_seen_at: a.first_seen_at,
  });
  if (!error) localStorage.removeItem(KEY);
}
