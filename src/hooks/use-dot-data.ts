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
