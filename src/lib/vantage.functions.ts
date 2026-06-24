import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeVantage } from "./vantage";

const answersInput = z.record(z.string(), z.number());

/**
 * Server-side verified Vantage Assessment submission.
 *
 * Computes scores (Vantage, Valuation, Fundability, Unicorn Potential) 
 * server-side to prevent client-side spoofing and manipulation.
 */
export const submitAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => {
    const payload = data && typeof data === "object" && "data" in data ? data.data : data;
    return answersInput.parse(payload);
  })
  .handler(async ({ data: answers, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check assessment count to see if we need to charge
    const { count, error: countErr } = await supabaseAdmin
      .from("assessments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countErr) throw new Error(countErr.message);

    if (count !== null && count >= 2) {
      const { data: charged, error: chargeErr } = await (supabaseAdmin as any)
        .rpc("charge_revaluation_fee", {
          _user_id: userId,
          _fee: 100,
        });

      if (chargeErr) throw new Error(chargeErr.message);
      if (!charged) {
        throw new Error("INSUFFICIENT_FUNDS");
      }
    }

    // Calculate scores server-side
    const result = computeVantage(answers);

    // Write assessment record (bypasses direct client-side insert blocks)
    const { data: assessmentData, error: insertErr } = await supabaseAdmin
      .from("assessments")
      .insert({
        user_id: userId,
        answers,
        category_scores: result.categoryScores,
        score: result.score,
        vantage_point: result.vantagePoint,
        fundability: result.fundability,
        investment_readiness: result.investmentReadiness,
        stage: result.stage,
        report: result.report,
        current_valuation: result.currentValuation,
        potential_valuation: result.potentialValuation,
        unicorn_potential: result.unicornPotential,
        founder_archetype: result.founderArchetype,
      })
      .select("id")
      .single();
      
    if (insertErr) throw new Error(insertErr.message);

    // Update profile
    const { error: updateErr } = await supabaseAdmin
      .from("founder_profiles")
      .update({
        vantage_point: result.vantagePoint,
        fundability: result.fundability,
        investment_readiness: result.investmentReadiness,
        stage: result.stage,
        current_valuation: result.currentValuation,
        potential_valuation: result.potentialValuation,
        unicorn_potential: result.unicornPotential,
        founder_archetype: result.founderArchetype,
      })
      .eq("user_id", userId);
      
    if (updateErr) throw new Error(updateErr.message);

    return {
      assessmentId: assessmentData.id,
      ...result
    };
  });

export const buyUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => {
    const payload = data && typeof data === "object" && "data" in data ? data.data : data;
    return z.object({
      upgradeType: z.string(),
      cost: z.number()
    }).parse(payload);
  })
  .handler(async ({ data: { upgradeType, cost }, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: charged, error: chargeErr } = await (supabaseAdmin as any)
      .rpc("charge_revaluation_fee", {
        _user_id: userId,
        _fee: cost,
      });

    if (chargeErr) throw new Error(chargeErr.message);
    if (!charged) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    return { success: true };
  });
