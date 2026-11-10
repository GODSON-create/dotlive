import { createFileRoute } from "@tanstack/react-router";
import { evaluatePingConfig } from "@/lib/ping/config";
import { sha256Hex, verifyLinkState, verifyRequestSignature } from "@/lib/ping/state";
import { linkCallbackSchema } from "@/lib/ping/contracts";

// DOT-proposed contract: Ping POSTs {state, ping_user_id} signed with PING_WEBHOOK_SECRET.
// Links by stable DOT UUID from the signed one-time state only — never by email or username.
export const Route = createFileRoute("/api/public/ping/link-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { config } = evaluatePingConfig(process.env);
        if (!config) return Response.json({ error: "ping_not_configured" }, { status: 503 });
        const raw = await request.text();
        const okSig = await verifyRequestSignature(config.webhookSecret, request.headers.get("x-ping-timestamp"), request.headers.get("x-ping-signature"), raw);
        if (!okSig) return Response.json({ error: "invalid_signature" }, { status: 401 });
        let body;
        try { body = linkCallbackSchema.parse(JSON.parse(raw)); } catch { return Response.json({ error: "invalid_body" }, { status: 400 }); }
        const check = await verifyLinkState(config.linkStateSecret, body.state);
        if (!check.ok) return Response.json({ error: `state_${check.reason}` }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: consumed } = await supabaseAdmin.from("ping_link_states")
          .update({ consumed_at: new Date().toISOString() })
          .eq("nonce_hash", await sha256Hex(check.payload.n)).eq("user_id", check.payload.u)
          .is("consumed_at", null).gt("expires_at", new Date().toISOString())
          .select("user_id");
        if (!consumed?.length) return Response.json({ error: "state_replayed_or_expired" }, { status: 409 });

        const { error } = await supabaseAdmin.from("ping_identity_links").insert({ user_id: check.payload.u, ping_user_id: body.ping_user_id, status: "active" });
        if (error) {
          if (error.code === "23505") return Response.json({ error: "already_linked" }, { status: 409 });
          console.error("ping link insert", error);
          return Response.json({ error: "link_failed" }, { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
