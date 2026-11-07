import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHALLENGE_DEFAULTS, challengeSettingsInput, journeyClock, progressInput, transitionInput } from "./challenge";

export const getChallengeJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [settings, enrollments, ava, learning, memberships] = await Promise.all([
      supabase.from("challenge_settings").select("*").maybeSingle(),
      supabase.from("challenge_enrollments").select("*").eq("participant_id", userId).order("created_at", { ascending: false }),
      supabase.from("assessments").select("id,created_at").eq("user_id", userId).order("created_at"),
      supabase.from("academy_module_progress").select("module_id,status").eq("user_id", userId),
      supabase.from("community_members").select("community_id,communities(id,name,region)").eq("founder_id", userId),
    ]);
    for (const result of [settings, enrollments, ava, learning, memberships]) if (result.error) throw new Error("Your challenge workspace could not be loaded. Please try again.");
    const enrollment = enrollments.data?.find((e) => ["active", "pending_confirmation"].includes(e.status)) ?? enrollments.data?.[0] ?? null;
    const milestones = enrollment ? await supabase.from("challenge_milestones").select("*").eq("enrollment_id", enrollment.id) : { data: [], error: null };
    const checkins = enrollment ? await supabase.from("challenge_checkins").select("*").eq("enrollment_id", enrollment.id).order("week_number", { ascending: false }) : { data: [], error: null };
    if (milestones.error || checkins.error) throw new Error("Progress is temporarily unavailable. Please try again.");
    const now = new Date().toISOString();
    return {
      settings: settings.data ?? CHALLENGE_DEFAULTS, enrollment, milestones: milestones.data ?? [], checkins: checkins.data ?? [],
      clock: journeyClock(enrollment?.start_at ?? null, enrollment?.end_at ?? null, now), serverNow: now,
      ava: { completed: (ava.data?.length ?? 0) > 0, baselineId: ava.data?.[0]?.id ?? null },
      learning: { completed: learning.data?.filter((m) => m.status === "completed").length ?? 0, tracked: learning.data?.length ?? 0 },
      communities: memberships.data?.flatMap((m) => m.communities ? [m.communities] : []) ?? [],
      checkoutEnabled: false,
      checkoutMessage: "Checkout is paused while programme payments, exchange-rate configuration, sponsorship checks and credit delivery are verified. No charge or DOT award is made here.",
    };
  });

export const requestChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ pass: z.enum(["standard", "sponsored"]), community: z.string().uuid().nullable() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("request_challenge_enrollment", { _pass_type: data.pass, _community_id: data.community ?? undefined });
    if (error) throw new Error(error.message);
    return { id };
  });

export const saveChallengeProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((data: unknown) => progressInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("save_challenge_progress", { _id: data.id, _kind: data.kind, _key: data.key ?? "", _note: data.note, _evidence: data.evidence ?? undefined, _ping: data.ping ?? undefined });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeChallengeState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((data: unknown) => transitionInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("challenge_transition", { _id: data.id, _action: data.action, _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const configureChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((data: unknown) => challengeSettingsInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("configure_challenge", { _registration: data.registration, _standard: data.standard, _sponsored: data.sponsored, _duration: data.duration, _catalogue: data.catalogue, _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewChallengeMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), state: z.enum(["accepted", "changes_requested"]), reason: z.string().trim().min(3).max(1000) }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("review_challenge_milestone", { _id: data.id, _state: data.state, _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getChallengeReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [admin, lead] = await Promise.all([
      supabase.rpc("challenge_is_admin"), supabase.rpc("has_role", { _user_id: userId, _role: "community_leader" }),
    ]);
    if (admin.error || lead.error || (!admin.data && !lead.data)) throw new Error("Programme reporting requires authorized admin or community lead access.");
    // Caller-scoped client and RLS enforce assigned-community access, including for leads.
    const [enrollments, milestones, communities, settings] = await Promise.all([
      supabase.from("challenge_enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("challenge_milestones").select("*"),
      admin.data ? supabase.from("communities").select("id,name,region") : supabase.from("communities").select("id,name,region").eq("leader_id", userId),
      supabase.from("challenge_settings").select("*").maybeSingle(),
    ]);
    for (const result of [enrollments, milestones, communities, settings]) if (result.error) throw new Error("Programme reporting is temporarily unavailable.");
    const scoped = admin.data ? enrollments.data ?? [] : (enrollments.data ?? []).filter((e) => communities.data?.some((c) => c.id === e.community_id));
    return { isAdmin: !!admin.data, enrollments: scoped, milestones: (milestones.data ?? []).filter((m) => scoped.some((e) => e.id === m.enrollment_id)), communities: communities.data ?? [], settings: settings.data ?? CHALLENGE_DEFAULTS };
  });