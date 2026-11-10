// Pure configuration evaluation for the DOT <-> Ping integration.
// Values are read from process.env inside server handlers only and never returned to clients.
export const PING_ENV_VARS = [
  "PING_API_BASE_URL",
  "PING_API_KEY",
  "PING_WEBHOOK_SECRET",
  "PING_LINK_STATE_SECRET",
  "PING_DISPATCH_SECRET",
] as const;
export type PingEnvVar = (typeof PING_ENV_VARS)[number];

export type PingConfigState = "not_configured" | "partially_configured" | "invalid" | "configured";

export interface PingConfigStatus {
  state: PingConfigState;
  present: Record<PingEnvVar, boolean>;
  problems: string[];
}

export interface PingConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  linkStateSecret: string;
  dispatchSecret: string;
}

export function evaluatePingConfig(env: Record<string, string | undefined>): { status: PingConfigStatus; config: PingConfig | null } {
  const present = Object.fromEntries(PING_ENV_VARS.map((k) => [k, !!env[k]?.trim()])) as Record<PingEnvVar, boolean>;
  const count = Object.values(present).filter(Boolean).length;
  const problems: string[] = [];
  if (count === 0) return { status: { state: "not_configured", present, problems: ["Ping connection not configured yet."] }, config: null };
  for (const k of PING_ENV_VARS) if (!present[k]) problems.push(`${k} is missing.`);
  if (present.PING_API_BASE_URL) {
    try {
      const u = new URL(env.PING_API_BASE_URL!.trim());
      if (u.protocol !== "https:") problems.push("PING_API_BASE_URL must use https.");
    } catch {
      problems.push("PING_API_BASE_URL is not a valid URL.");
    }
  }
  for (const k of ["PING_WEBHOOK_SECRET", "PING_LINK_STATE_SECRET", "PING_DISPATCH_SECRET"] as const) {
    if (present[k] && env[k]!.trim().length < 32) problems.push(`${k} must be at least 32 characters.`);
  }
  if (count < PING_ENV_VARS.length) return { status: { state: "partially_configured", present, problems }, config: null };
  if (problems.length) return { status: { state: "invalid", present, problems }, config: null };
  return {
    status: { state: "configured", present, problems },
    config: {
      baseUrl: env.PING_API_BASE_URL!.trim().replace(/\/+$/, ""),
      apiKey: env.PING_API_KEY!.trim(),
      webhookSecret: env.PING_WEBHOOK_SECRET!.trim(),
      linkStateSecret: env.PING_LINK_STATE_SECRET!.trim(),
      dispatchSecret: env.PING_DISPATCH_SECRET!.trim(),
    },
  };
}
