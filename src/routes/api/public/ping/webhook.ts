import { createFileRoute } from "@tanstack/react-router";
import { evaluatePingConfig } from "@/lib/ping/config";
import { verifyRequestSignature } from "@/lib/ping/state";
import { webhookEnvelopeSchema } from "@/lib/ping/contracts";

// Receives signed Ping events. Stores id/type only (replay protection); no message content.
// Event handling is deferred until Ping's event catalogue is verified.
export const Route = createFileRoute("/api/public/ping/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { config } = evaluatePingConfig(process.env);
        if (!config) return Response.json({ error: "ping_not_configured" }, { status: 503 });
        const raw = await request.text();
        if (raw.length > 64_000) return Response.json({ error: "too_large" }, { status: 413 });
        const ok = await verifyRequestSignature(config.webhookSecret, request.headers.get("x-ping-timestamp"), request.headers.get("x-ping-signature"), raw);
        if (!ok) return Response.json({ error: "invalid_signature" }, { status: 401 });
        let evt;
        try { evt = webhookEnvelopeSchema.parse(JSON.parse(raw)); } catch { return Response.json({ error: "invalid_body" }, { status: 400 }); }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("ping_webhook_events").insert({
          external_event_id: evt.id, event_type: evt.type, status: "ignored", metadata: { handler: "pending_ping_contract" },
        });
        if (error?.code === "23505") return Response.json({ ok: true, duplicate: true });
        if (error) { console.error("ping webhook insert", error); return Response.json({ error: "store_failed" }, { status: 500 }); }
        return Response.json({ ok: true });
      },
    },
  },
});
