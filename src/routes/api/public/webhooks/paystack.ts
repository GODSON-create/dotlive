import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Paystack webhook — the authoritative, server-to-server credit path.
 * Verifies the HMAC-SHA512 signature, then credits the wallet idempotently.
 * Lives under /api/public so it bypasses app auth; security is the signature.
 */
export const Route = createFileRoute("/api/public/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const raw = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(raw).digest("hex");

        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: {
          event?: string;
          data?: { reference?: string; status?: string; amount?: number; channel?: string; paid_at?: string };
        };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        if (event.event !== "charge.success" || !event.data?.reference) {
          return new Response("Ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const reference = event.data.reference;

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("reference", reference)
          .maybeSingle();

        if (!payment || payment.credited_at) {
          return new Response("OK", { status: 200 });
        }

        const expectedKobo = Number(payment.naira_amount) * 100;
        if (event.data.status !== "success" || event.data.amount !== expectedKobo) {
          await supabaseAdmin.from("payments").update({ status: "amount_mismatch" }).eq("reference", reference);
          return new Response("OK", { status: 200 });
        }

        await supabaseAdmin
          .from("payments")
          .update({
            status: "success",
            paystack_reference: reference,
            channel: event.data.channel,
            paid_at: event.data.paid_at,
          })
          .eq("reference", reference);

        await supabaseAdmin.rpc("credit_paystack_payment", { _reference: reference });

        return new Response("OK", { status: 200 });
      },
    },
  },
});
