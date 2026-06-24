import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const trackEventInput = z.object({
  eventName: z.string(),
  userId: z.string().uuid().nullable(),
  metadata: z.any().optional(),
});

export const trackEventServer = createServerFn({ method: "POST" })
  .inputValidator((data: any) => {
    const payload = data && typeof data === "object" && "data" in data ? data.data : data;
    return trackEventInput.parse(payload);
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("pxxl_analytics")
      .insert({
        event_name: data.eventName,
        user_id: data.userId || null,
        metadata: data.metadata || {},
      });

    if (error) {
      console.error("Failed to insert PXXL Analytics event:", error);
      throw error;
    }

    return { success: true };
  });
