import { z } from "zod";

// DOT-proposed contracts. Ping's real API is unverified; Ping must agree to these before go-live.
export const PING_OUTBOX_EVENTS = ["community.created", "community.updated", "member.joined", "member.left", "community.leader_changed"] as const;
export type PingOutboxEvent = (typeof PING_OUTBOX_EVENTS)[number];

/** Ping -> DOT: completes an identity link. Signed with PING_WEBHOOK_SECRET (x-ping-timestamp, x-ping-signature). */
export const linkCallbackSchema = z.object({
  state: z.string().min(10).max(2048),
  ping_user_id: z.string().min(1).max(200).regex(/^[A-Za-z0-9_:\-.]+$/),
});
export type LinkCallback = z.infer<typeof linkCallbackSchema>;

/** Ping -> DOT webhook envelope. Only the id and type are stored; no message content. */
export const webhookEnvelopeSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.string().min(1).max(100).regex(/^[a-z0-9_.]+$/),
});

export type PingConnectionStatus =
  | { state: "not_configured" }
  | { state: "linked"; linkedAt: string }
  | { state: "not_linked"; canStart: boolean };

export interface PingAdminSummary {
  config: { state: string; present: Record<string, boolean>; problems: string[] };
  linked_accounts: number;
  mapped_hubs: number;
  outbox_pending: number;
  outbox_failed: number;
  last_successful_sync: string | null;
  webhooks_received: number;
  recent_errors: { event_type: string; last_error: string; retry_count: number; created_at: string }[];
}
