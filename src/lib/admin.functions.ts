import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const adminRole = z.enum(["admin", "super_admin"]);

const elevateInput = z.object({
  targetUserId: z.string().uuid(),
  newRole: adminRole.default("super_admin"),
  reason: z.string().trim().max(500).optional(),
});

const revokeInput = z.object({
  targetUserId: z.string().uuid(),
  role: adminRole.default("admin"),
  reason: z.string().trim().max(500).optional(),
});

/**
 * Elevate a user to an admin role. Runs as the authenticated caller; the
 * underlying SECURITY DEFINER function enforces that only super admins can
 * call it and blocks self-assignment.
 */
export const elevateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => elevateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("elevate_user_to_admin", {
      _target_user_id: data.targetUserId,
      _new_role: data.newRole,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Revoke an admin role from a user. Super admins only; cannot revoke self. */
export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => revokeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("revoke_admin_role", {
      _target_user_id: data.targetUserId,
      _role: data.role,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * One-time bootstrap: the first authenticated user can claim the Super Admin
 * role, but only while no super admin exists yet. Uses the service-role-only
 * bootstrap_super_admin function via the admin client.
 */
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string })?.email;
    if (!email) throw new Error("No email on account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Guard: refuse if a super admin already exists.
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) throw new Error("A super admin already exists");

    const { error } = await supabaseAdmin.rpc("bootstrap_super_admin", { _email: email });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
