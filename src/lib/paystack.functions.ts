import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DOT_RATE_NGN = 15;
const MIN_DEPOSIT_DOT = 2000;
const PAYSTACK_BASE = "https://api.paystack.co";

const initInput = z.object({
  dotAmount: z.number().int().min(MIN_DEPOSIT_DOT),
  callbackUrl: z.string().url(),
});

const verifyInput = z.object({
  reference: z.string().min(6).max(120),
});

function makeReference(userId: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `dot_${userId.slice(0, 8)}_${Date.now()}_${rand}`;
}

/**
 * Step 1 — create a pending payment record and a Paystack hosted-checkout
 * session. The wallet is NOT credited here; crediting only happens after
 * verification (verifyPaystackPayment or the webhook).
 */
export const initPaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => initInput.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payment provider is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve a billing email
    let email = (claims as { email?: string }).email;
    if (!email) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      email = profile?.email ?? undefined;
    }
    if (!email) throw new Error("No email on file for this account");

    const dotAmount = data.dotAmount;
    const nairaAmount = dotAmount * DOT_RATE_NGN;
    const reference = makeReference(userId);

    const { error: insertErr } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      reference,
      dot_amount: dotAmount,
      naira_amount: nairaAmount,
      status: "pending",
    });
    if (insertErr) throw new Error(insertErr.message);

    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: nairaAmount * 100, // kobo
        reference,
        callback_url: data.callbackUrl,
        metadata: { user_id: userId, dot_amount: dotAmount },
      }),
    });

    const body = (await res.json()) as {
      status: boolean;
      message: string;
      data?: { authorization_url: string };
    };

    if (!res.ok || !body.status || !body.data?.authorization_url) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed", metadata: { error: body.message } })
        .eq("reference", reference);
      throw new Error(body.message || "Could not start payment");
    }

    return { authorizationUrl: body.data.authorization_url, reference };
  });

/**
 * Step 2 — verify a payment with Paystack and credit the wallet (idempotent).
 * Safe to call multiple times; the DB function only credits once.
 */
export const verifyPaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => verifyInput.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payment provider is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment, error: pErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("reference", data.reference)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!payment) throw new Error("Payment not found");
    if (payment.user_id !== userId) throw new Error("Not your payment");

    // Already credited — return current balance
    if (payment.credited_at) {
      const { data: w } = await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      return { status: "success" as const, balance: Number(w?.balance ?? 0), dotAmount: Number(payment.dot_amount) };
    }

    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = (await res.json()) as {
      status: boolean;
      data?: { status: string; amount: number; channel: string; paid_at: string; reference: string };
    };

    const tx = body.data;
    const expectedKobo = Number(payment.naira_amount) * 100;

    if (!body.status || !tx || tx.status !== "success" || tx.amount !== expectedKobo) {
      await supabaseAdmin
        .from("payments")
        .update({ status: tx?.status === "success" ? "amount_mismatch" : "failed" })
        .eq("reference", data.reference);
      return { status: "failed" as const, balance: 0, dotAmount: Number(payment.dot_amount) };
    }

    await supabaseAdmin
      .from("payments")
      .update({
        status: "success",
        paystack_reference: tx.reference,
        channel: tx.channel,
        paid_at: tx.paid_at,
      })
      .eq("reference", data.reference);

    const { data: balance, error: cErr } = await supabaseAdmin.rpc("credit_paystack_payment", {
      _reference: data.reference,
    });
    if (cErr) throw new Error(cErr.message);

    return { status: "success" as const, balance: Number(balance ?? 0), dotAmount: Number(payment.dot_amount) };
  });
