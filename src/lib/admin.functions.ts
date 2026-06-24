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
  .inputValidator((data: any) => {
    const payload = data && typeof data === "object" && "data" in data ? data.data : data;
    return elevateInput.parse(payload);
  })
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
  .inputValidator((data: any) => {
    const payload = data && typeof data === "object" && "data" in data ? data.data : data;
    return revokeInput.parse(payload);
  })
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

const adminUpdateUserInput = z.object({
  targetUserId: z.string().uuid(),
  verified: z.boolean().optional(),
  suspended: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
  reason: z.string().trim().max(500).optional(),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: any) => {
    const payload = data && typeof data === "object" && "data" in data ? data.data : data;
    return adminUpdateUserInput.parse(payload);
  })
  .handler(async ({ data, context }) => {
    const callerId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check if caller is indeed admin or super_admin
    const { data: callerRolesRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    
    const callerRoles = (callerRolesRow || []).map((r) => r.role);
    const isCallerAdmin = callerRoles.includes("admin") || callerRoles.includes("super_admin");
    const isCallerSuperAdmin = callerRoles.includes("super_admin");

    if (!isCallerAdmin) {
      throw new Error("Admins only");
    }

    // 2. Fetch target user's current profile & roles
    const { data: targetProfile, error: targetProfileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, verified, suspended")
      .eq("id", data.targetUserId)
      .maybeSingle();

    if (targetProfileErr) throw targetProfileErr;
    if (!targetProfile) throw new Error("Target user profile not found");

    const { data: targetRolesRow, error: targetRolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.targetUserId);

    if (targetRolesErr) throw targetRolesErr;
    const targetRoles = (targetRolesRow || []).map((r) => r.role);

    // 3. Prepare updates
    const updates: Record<string, any> = {};
    if (data.verified !== undefined) updates.verified = data.verified;
    if (data.suspended !== undefined) updates.suspended = data.suspended;

    const beforeValue = {
      verified: targetProfile.verified ?? false,
      suspended: targetProfile.suspended ?? false,
      roles: targetRoles,
    };

    // Apply profile updates
    if (Object.keys(updates).length > 0) {
      const { error: profileUpdateErr } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("id", data.targetUserId);
      if (profileUpdateErr) throw profileUpdateErr;
    }

    // Apply role updates if provided
    let finalRoles = targetRoles;
    if (data.roles !== undefined) {
      // If adding/removing admin/super_admin roles, enforce super admin privileges
      const isModifyingAdminRoles = 
        data.roles.includes("admin") !== targetRoles.includes("admin") || 
        data.roles.includes("super_admin") !== targetRoles.includes("super_admin");

      if (isModifyingAdminRoles && !isCallerSuperAdmin) {
        throw new Error("Only Super Admins can grant or revoke administrative roles");
      }

      // Delete target user roles
      const { error: deleteRolesErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.targetUserId);
      if (deleteRolesErr) throw deleteRolesErr;

      // Insert new roles
      if (data.roles.length > 0) {
        const roleInserts = data.roles.map((r) => ({
          user_id: data.targetUserId,
          role: r,
        }));
        const { error: insertRolesErr } = await supabaseAdmin
          .from("user_roles")
          .insert(roleInserts);
        if (insertRolesErr) throw insertRolesErr;
      }
      finalRoles = data.roles;
    }

    const afterValue = {
      verified: data.verified ?? beforeValue.verified,
      suspended: data.suspended ?? beforeValue.suspended,
      roles: finalRoles,
    };

    // 4. Log to admin_audit_log
    const { error: auditErr } = await supabaseAdmin
      .from("admin_audit_log")
      .insert({
        admin_id: callerId,
        action: "admin_update_user",
        target_user_id: data.targetUserId,
        reason: data.reason ?? "Admin user profile update",
        before_value: JSON.stringify(beforeValue),
        after_value: JSON.stringify(afterValue),
      });

    if (auditErr) throw auditErr;

    return { ok: true };
  });
