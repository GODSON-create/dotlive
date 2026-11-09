import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COMMUNITY_TYPES } from "./communities";

export interface CommunityDTO {
  id: string;
  name: string;
  description: string | null;
  community_type: string;
  region: string | null;
  city: string | null;
  country: string | null;
  university_name: string | null;
  visibility: string;
  member_count: number;
  is_member: boolean;
  is_leader: boolean;
  leader_name: string | null;
  created_at: string;
}

const listSchema = z.object({
  q: z.string().max(80).optional(),
  type: z.enum(COMMUNITY_TYPES).optional(),
  region: z.string().max(80).optional(),
});

export const listCommunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<CommunityDTO[]> => {
    const { data: rows, error } = await context.supabase.rpc("list_communities", {
      _q: data.q ?? undefined,
      _type: data.type ?? undefined,
      _region: data.region ?? undefined,
      _limit: 100,
      _offset: 0,
    });
    if (error) {
      console.error("list_communities", error);
      throw new Error("Communities could not be loaded. Please try again.");
    }
    return (rows ?? []).map((r) => ({ ...r, member_count: Number(r.member_count) })) as CommunityDTO[];
  });

const idSchema = z.object({ id: z.string().uuid() });

export const joinCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("join_community", { _community_id: data.id });
    if (error) throw new Error(error.message.includes("invite") ? "This community is invite only." : "Could not join this community.");
    return { ok: true };
  });

export const leaveCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("leave_community", { _community_id: data.id });
    if (error) throw new Error("Could not leave this community.");
    return { ok: true };
  });
