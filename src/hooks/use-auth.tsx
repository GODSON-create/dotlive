import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/constants";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  dot_id: string | null;
  username: string | null;
  active_role: string | null;
  banner_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  whatsapp: string | null;
  skills: string[];
  industry: string | null;
  community: string | null;
  achievements: string[];
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  activeRole: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  switchActiveRole: (role: AppRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = ["admin", "super_admin", "community_leader", "investor", "capital_partner", "founder", "builder", "vendor"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, name, email, phone, avatar_url, dot_id, username, active_role, banner_url, bio, location, website, linkedin, twitter, whatsapp, skills, industry, community, achievements"
        )
        .eq("id", uid)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as any) ?? null);
    setRoles(((roleRows as { role: AppRole }[]) ?? []).map((r) => r.role));
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      await loadUserData(data.session.user.id);
    }
  }, [loadUserData]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadUserData(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer supabase calls to avoid deadlock inside the callback
        setTimeout(() => {
          loadUserData(newSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  }, []);

  const switchActiveRole = useCallback(async (role: AppRole) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ active_role: role })
      .eq("id", user.id);
    if (error) {
      console.error("Failed to switch active role:", error);
      throw error;
    }
    setProfile((prev) => (prev ? { ...prev, active_role: role } : null));
  }, [user]);

  const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;
  const activeRole = (profile?.active_role as AppRole) || primaryRole;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        primaryRole,
        activeRole,
        loading,
        refresh,
        signOut,
        switchActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

