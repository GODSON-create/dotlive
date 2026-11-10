import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluatePingConfig } from "./ping/config";
import { createLinkState, sha256Hex } from "./ping/state";
import type { PingAdminSummary, PingConnectionStatus } from "./ping/contracts";

export const getMyPingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PingConnectionStatus> => {
    const { status } = evaluatePingConfig(process.env);
    if (status.state !== "configured") return { state: "not_configured" };
    const { data } = await context.supabase
      .from("ping_identity_links").select("linked_at").eq("user_id", context.userId).eq("status", "active").maybeSingle();
    if (data) return { state: "linked", linkedAt: data.linked_at };
    // Ping's link entry point is not verified yet, so DOT cannot offer a working link.
    return { state: "not_linked", canStart: false };
  });

/**
 * Issues a one-time signed state for the (future) Ping link handshake.
 * Returns only the state token — no Ping URL is built until Ping's contract is verified.
 */
export const startPingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { config } = evaluatePingConfig(process.env);
    if (!config) return { ok: false as const, reason: "not_configured" as const };
    const { token, nonce, expiresAt } = await createLinkState(config.linkStateSecret, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ping_link_states").insert({
      user_id: context.userId, nonce_hash: await sha256Hex(nonce), expires_at: new Date(expiresAt * 1000).toISOString(),
    });
    if (error) {
      console.error("ping_link_states insert", error);
      return { ok: false as const, reason: "error" as const };
    }
    return { ok: true as const, state: token, expiresAt };
  });

export const getCommunityPingHubStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { status } = evaluatePingConfig(process.env);
    const { data: hub } = await context.supabase.rpc("get_ping_hub_status", { _community_id: data.id });
    return { configured: status.state === "configured", hub: (hub as string | null) ?? "not_connected" };
  });

export const getPingAdminSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PingAdminSummary> => {
    const { data, error } = await context.supabase.rpc("ping_integration_admin_summary");
    if (error) throw new Error(error.message.includes("Not authorized") ? "Not authorized" : "Ping status could not be loaded.");
    const { status } = evaluatePingConfig(process.env);
    return { ...(data as Omit<PingAdminSummary, "config">), config: status };
  });
