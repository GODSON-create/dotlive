import { trackEventServer } from "./analytics.functions";
import { supabase } from "@/integrations/supabase/client";

// Define the valid event names we track
export type PXXLEvent =
  | "Landing Page Visit"
  | "Signup Start"
  | "Signup Completed"
  | "Assessment Start"
  | "Assessment Completion"
  | "Wallet Activation"
  | "Wallet Funding"
  | "Community Referral"
  | "DOT Wrapped Share"
  | "Founder Profile View"
  | "Venture Profile View"
  | "Investor Interest"
  | "Venture Listing";

/**
 * Tracks a user engagement event to PXXL Analytics.
 * This runs safely on the client side, logging to console, sending to PXXL cloud,
 * and saving to the local Supabase analytics table.
 */
export async function trackPXXL(eventName: PXXLEvent, metadata: Record<string, any> = {}) {
  try {
    // 1. Log to console
    console.log(`[PXXL Analytics] Tracking event: "${eventName}"`, metadata);

    // 2. Fetch current user from Supabase client auth cache
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // 3. Trigger server-side insertion into pxxl_analytics table
    await trackEventServer({
      data: {
        eventName,
        userId,
        metadata: {
          ...metadata,
          path: typeof window !== "undefined" ? window.location.pathname : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          timestamp: new Date().toISOString(),
        },
      },
    });

    // 4. Fire-and-forget payload simulation to PXXL cloud API
    if (typeof window !== "undefined") {
      const pxxlUrl = new URL("https://pxxl.app/api/track");
      pxxlUrl.searchParams.append("e", eventName);
      pxxlUrl.searchParams.append("domain", "dotlive.cv");
      if (userId) pxxlUrl.searchParams.append("uid", userId);

      // Using navigator.sendBeacon if available, or fetch
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
        navigator.sendBeacon(pxxlUrl.toString(), blob);
      } else {
        fetch(pxxlUrl.toString(), {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        }).catch(() => {});
      }
    }
  } catch (error) {
    // Fail silently to prevent analytics failures from blocking main app actions
    console.error("[PXXL Analytics] Track failed:", error);
  }
}
