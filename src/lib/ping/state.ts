// Short-lived, signed, one-time link state + HMAC request signatures (Web Crypto; works on workerd).
// One-time use is enforced by storing sha256(nonce) in ping_link_states and consuming it atomically.
export const LINK_STATE_TTL_SECONDS = 600;
export const SIGNATURE_TOLERANCE_SECONDS = 300;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function hmac(secret: string, data: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", key, enc.encode(data));
}
export async function sha256Hex(data: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(data)));
}

export interface LinkStatePayload { u: string; n: string; e: number }

export async function createLinkState(secret: string, userId: string, nowSec = Math.floor(Date.now() / 1000)) {
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer);
  const payload: LinkStatePayload = { u: userId, n: nonce, e: nowSec + LINK_STATE_TTL_SECONDS };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = b64url(new Uint8Array(await hmac(secret, body)));
  return { token: `${body}.${sig}`, nonce, expiresAt: payload.e };
}

export type StateCheck = { ok: true; payload: LinkStatePayload } | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export async function verifyLinkState(secret: string, token: string, nowSec = Math.floor(Date.now() / 1000)): Promise<StateCheck> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const expected = b64url(new Uint8Array(await hmac(secret, parts[0])));
  if (!safeEqual(expected, parts[1])) return { ok: false, reason: "bad_signature" };
  let payload: LinkStatePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.u !== "string" || typeof payload.n !== "string" || typeof payload.e !== "number") return { ok: false, reason: "malformed" };
  if (payload.e <= nowSec) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}

/** Signature scheme DOT expects from Ping: hex HMAC-SHA256(secret, `${timestamp}.${rawBody}`). */
export async function signRequest(secret: string, timestamp: number, rawBody: string): Promise<string> {
  return hex(await hmac(secret, `${timestamp}.${rawBody}`));
}

export async function verifyRequestSignature(
  secret: string, timestampHeader: string | null, signatureHeader: string | null, rawBody: string, nowSec = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!timestampHeader || !signatureHeader) return false;
  const ts = Number(timestampHeader);
  if (!Number.isInteger(ts) || Math.abs(nowSec - ts) > SIGNATURE_TOLERANCE_SECONDS) return false;
  return safeEqual(await signRequest(secret, ts, rawBody), signatureHeader.toLowerCase());
}
