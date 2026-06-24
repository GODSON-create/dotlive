import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const completeInput = z.object({ courseId: z.string().uuid() });

/**
 * Server-verified course completion + reward.
 *
 * The reward amount is determined server-side from the course's fixed
 * `dot_reward`, and the grant is idempotent (rewarded once per enrollment).
 * This replaces the previous client-side `reward_dot` call, which let any
 * user self-award arbitrary DOT.
 */
export const completeCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => {
    const payload = data && typeof data === "object" && "data" in data ? data.data : data;
    return completeInput.parse(payload);
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: balance, error } = await supabaseAdmin.rpc("claim_course_reward", {
      _user_id: userId,
      _course_id: data.courseId,
    });
    if (error) throw new Error(error.message);

    return { balance: Number(balance ?? 0) };
  });
