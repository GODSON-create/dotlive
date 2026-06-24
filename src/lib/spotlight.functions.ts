import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitCampaignInput = z.object({
  ventureName: z.string().min(1).max(200),
  pitch: z.string().min(1).max(2000),
  packageType: z.enum(["Starter", "Growth", "Premium"]),
});

const updateCampaignInput = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(["pending", "approved", "active", "completed", "rejected"]),
  assignedTeamMember: z.string().nullable(),
  publishedContent: z.string().nullable(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  leadsGenerated: z.number().int().nonnegative(),
});

export const submitSpotlightCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitCampaignInput.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Map packages to costs
    const packageCosts: Record<string, number> = {
      Starter: 20000,
      Growth: 50000,
      Premium: 200000,
    };
    const cost = packageCosts[data.packageType];

    // Map packages to target impressions
    const targetImpressions: Record<string, number> = {
      Starter: 10000,
      Growth: 30000,
      Premium: 150000,
    };

    // 1. Charge spotlight fee
    const { data: charged, error: chargeErr } = await supabase.rpc("charge_spotlight_fee", {
      _user_id: userId,
      _fee: cost,
      _package: data.packageType,
    });

    if (chargeErr) throw new Error(chargeErr.message);
    if (!charged) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    // 2. Insert spotlight campaign (use supabaseAdmin to bypass founder write restrictions on specific fields)
    const { data: campaign, error: insertErr } = await supabaseAdmin
      .from("spotlight_campaigns")
      .insert({
        user_id: userId,
        venture_name: data.ventureName,
        pitch: data.pitch,
        package_type: data.packageType,
        cost_dot: cost,
        target_impressions: targetImpressions[data.packageType],
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);
    return campaign;
  });

export const getFounderCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { data: campaigns, error } = await supabase
      .from("spotlight_campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return campaigns;
  });

export const getAdminCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    // Check if caller is admin
    const { data: isAdmin, error: roleErr } = await supabase.rpc("is_admin", {
      _user_id: userId,
    });
    if (roleErr || !isAdmin) {
      throw new Error("UNAUTHORIZED");
    }

    const { data: campaigns, error } = await supabase
      .from("spotlight_campaigns")
      .select(`
        *,
        profiles:user_id (
          name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return campaigns;
  });

export const updateCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateCampaignInput.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check if caller is admin
    const { data: isAdmin, error: roleErr } = await supabase.rpc("is_admin", {
      _user_id: userId,
    });
    if (roleErr || !isAdmin) {
      throw new Error("UNAUTHORIZED");
    }

    const { data: campaign, error } = await supabaseAdmin
      .from("spotlight_campaigns")
      .update({
        status: data.status,
        assigned_team_member: data.assignedTeamMember,
        published_content: data.publishedContent,
        impressions: data.impressions,
        clicks: data.clicks,
        leads_generated: data.leadsGenerated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.campaignId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return campaign;
  });
