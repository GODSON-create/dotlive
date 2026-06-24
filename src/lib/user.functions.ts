import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SELF_ASSIGNABLE_ROLES, type AppRole } from "./constants";

const updateRolesInput = z.object({
  roles: z.array(z.string()),
});

export const updateUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateRolesInput.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Filter input roles to only allow SELF_ASSIGNABLE_ROLES
    const requestedRoles = data.roles.filter((r) =>
      SELF_ASSIGNABLE_ROLES.includes(r as AppRole)
    ) as AppRole[];

    if (requestedRoles.length === 0) {
      throw new Error("You must select at least one role.");
    }

    // 2. Fetch user's current roles to preserve admin/super_admin status
    const { data: currentRows, error: fetchErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (fetchErr) throw fetchErr;

    const currentRoles = (currentRows || []).map((r) => r.role as AppRole);
    const adminRoles = currentRoles.filter((r) => r === "admin" || r === "super_admin");

    // 3. Delete all roles that are self-assignable (to rebuild them)
    const { error: deleteErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", SELF_ASSIGNABLE_ROLES);

    if (deleteErr) throw deleteErr;

    // 4. Insert new self-assignable roles
    const inserts = requestedRoles.map((role) => ({
      user_id: userId,
      role,
    }));

    const { error: insertErr } = await supabaseAdmin
      .from("user_roles")
      .insert(inserts);

    if (insertErr) throw insertErr;

    // 5. Ensure the active_role column is updated if the previous active role was removed
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("active_role")
      .eq("id", userId)
      .maybeSingle();

    const previousActive = profile?.active_role as AppRole | null;
    const finalRoles = [...requestedRoles, ...adminRoles];

    if (!previousActive || !finalRoles.includes(previousActive)) {
      await supabaseAdmin
        .from("profiles")
        .update({ active_role: finalRoles[0] })
        .eq("id", userId);
    }

    return { success: true, roles: finalRoles };
  });
