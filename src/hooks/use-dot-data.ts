import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });
}

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, dot_id, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFounderProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["founder_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAssessments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["assessments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyMembership() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["membership", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*, communities(*)")
        .eq("founder_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ============ DOT Work ============

export function useServices(category?: string, search?: string) {
  return useQuery({
    queryKey: ["services", category ?? "all", search ?? ""],
    queryFn: async () => {
      let q = supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (category) q = q.eq("category", category);
      if (search && search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyBuilderProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["builder_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("builder_profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyServices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_services", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("builder_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyOrders(role: "client" | "builder") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders", role, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const col = role === "client" ? "client_id" : "builder_id";
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .eq(col, user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBuilderStats(builderId?: string) {
  return useQuery({
    queryKey: ["builder_stats", builderId],
    enabled: !!builderId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_builder_stats", { _builder_id: builderId! });
      if (error) throw error;
      return data?.[0] ?? { orders_completed: 0, total_earned: 0, avg_rating: 0, review_count: 0 };
    },
  });
}

