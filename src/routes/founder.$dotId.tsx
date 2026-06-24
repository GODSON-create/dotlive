import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Gauge,
  TrendingUp,
  Sparkles,
  Award,
  Calendar,
  Building,
  MapPin,
  Globe,
  BookOpen,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatDot, formatNaira } from "@/lib/constants";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/founder/$dotId")({
  head: () => ({
    meta: [
      { title: "Founder Profile — DOT" },
      { name: "description", content: "View this founder's profile and progress on the DOT Venture Valuation Network." },
    ],
  }),
  component: PublicFounderProfile,
});

function PublicFounderProfile() {
  const { dotId } = Route.useParams();

  // Find user profile by dot_id or name slug
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["public-profile", dotId],
    queryFn: async () => {
      // Try by dot_id first
      let q = supabase
        .from("profiles")
        .select("id, name, avatar_url, dot_id, created_at")
        .eq("dot_id", dotId)
        .maybeSingle();
      let res = await q;
      
      // If not found, try by name match
      if (!res.data) {
        q = supabase
          .from("profiles")
          .select("id, name, avatar_url, dot_id, created_at")
          .ilike("name", `%${dotId}%`)
          .limit(1)
          .maybeSingle();
        res = await q;
      }
      if (res.error) throw res.error;
      return res.data;
    },
  });

  const userId = profile?.id;

  // Load founder profile
  const { data: founder, isLoading: loadingFounder } = useQuery({
    queryKey: ["public-founder", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_profiles")
        .select("*, communities(*)")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Load assessments history
  const { data: assessments = [] } = useQuery({
    queryKey: ["public-assessments-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Load completed courses (academy achievements)
  const { data: enrollments = [] } = useQuery({
    queryKey: ["public-courses-completed", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*, courses(*)")
        .eq("user_id", userId!)
        .eq("status", "completed");
      if (error) throw error;
      return data ?? [];
    },
  });

  const chartData = useMemo(() => {
    return assessments.map((a) => ({
      date: new Date(a.created_at).toLocaleDateString("en", { month: "short", day: "numeric" }),
      vantage: a.vantage_point,
      valuation: Number(a.current_valuation ?? 0) / 1000000, // in Millions
    }));
  }, [assessments]);

  const latest = assessments[assessments.length - 1];
  const archetype = latest?.founder_archetype || founder?.founder_archetype || "Venture Builder";
  const currentValuation = latest?.current_valuation || founder?.current_valuation || 0;
  const vantagePoint = latest?.vantage_point || founder?.vantage_point || 0;
  const fundability = latest?.fundability || founder?.fundability || 0;
  const unicornPotential = latest?.unicorn_potential || founder?.unicorn_potential || 0;

  if (loadingProfile || loadingFounder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Sparkles className="size-6 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold font-display">Profile Not Found</h1>
        <p className="mt-2 text-sm text-slate-400">The founder profile "{dotId}" could not be located.</p>
        <Button variant="hero" className="mt-6" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  const initial = (profile.name || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-pink-500/30">
      {/* Header */}
      <header className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link to="/">
          <Logo />
        </Link>
        <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:text-white" asChild>
          <Link to="/auth">Join DOT Network</Link>
        </Button>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-16 space-y-12">
        {/* Profile Card */}
        <div className="rounded-3xl border border-slate-850 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 size-48 rounded-full bg-pink-500/5 blur-3xl"></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name ?? ""} className="size-20 rounded-full border-2 border-slate-850 object-cover" />
              ) : (
                <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 text-2xl font-bold text-white shadow-md">
                  {initial}
                </span>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-col md:flex-row items-center gap-2">
                  <h1 className="font-display text-3xl font-extrabold text-white">{profile.name}</h1>
                  <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-400">
                    {profile.dot_id}
                  </span>
                </div>
                {founder?.venture_name && (
                  <p className="text-sm text-indigo-400 font-semibold uppercase tracking-wider">
                    Founder of {founder.venture_name}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-400 mt-2">
                  {founder?.industry && (
                    <span className="flex items-center gap-1">
                      <Building className="size-3.5" /> {founder.industry}
                    </span>
                  )}
                  {founder?.country && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" /> {founder.country}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" /> Joined {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 items-center md:items-end w-full md:w-auto">
              <div className="rounded-2xl bg-slate-850/80 border border-slate-800 px-4 py-2 text-center md:text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium block">Archetype</span>
                <span className="font-display text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">
                  {archetype}
                </span>
              </div>
            </div>
          </div>

          {founder?.bio && (
            <p className="mt-6 text-sm text-slate-300 border-t border-slate-850 pt-6">
              {founder.bio}
            </p>
          )}
        </div>

        {/* Valuation Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">Vantage Score</span>
            <div className="flex items-center gap-2 mt-2">
              <Gauge className="size-5 text-emerald-400" />
              <p className="font-display text-2xl font-black text-white">{formatDot(vantagePoint)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">Venture Valuation</span>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="size-5 text-indigo-400" />
              <p className="font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                {formatNaira(currentValuation)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">Fundability</span>
            <div className="flex items-center gap-2 mt-2">
              <Sparkles className="size-5 text-yellow-400" />
              <p className="font-display text-2xl font-black text-white">{fundability}%</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">Unicorn Potential</span>
            <div className="flex items-center gap-2 mt-2">
              <Award className="size-5 text-pink-400" />
              <p className="font-display text-2xl font-black text-pink-400">
                {typeof unicornPotential === 'number' ? unicornPotential.toFixed(1) : '0.0'}%
              </p>
            </div>
          </div>
        </div>

        {/* History Chart */}
        {chartData.length > 0 && (
          <div className="rounded-2xl border border-slate-850 bg-slate-900/20 p-6">
            <h2 className="font-display text-lg font-semibold text-white">Venture Growth History</h2>
            <p className="text-xs text-slate-400 mt-1">Tracking Vantage Score & Valuation over time</p>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-850" />
                  <XAxis dataKey="date" className="text-xs text-slate-500" />
                  <YAxis className="text-xs text-slate-500" />
                  <Tooltip />
                  <Line type="monotone" dataKey="vantage" name="Vantage Score" stroke="#10b981" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="valuation" name="Valuation (Millions ₦)" stroke="#6366f1" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Bottom grid (Communities & Academy progress) */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Community */}
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-6">
            <h3 className="font-display font-semibold text-white">Community</h3>
            {founder?.communities ? (
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-slate-850/30 p-4 border border-slate-800">
                <span className="flex size-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400">
                  <Building className="size-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">{(founder.communities as { name: string }).name}</h4>
                  <p className="text-xs text-slate-400">{(founder.communities as { region: string }).region || "Africa"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                This founder is not currently a member of any cohort community.
              </p>
            )}
          </div>

          {/* Academy completed */}
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-6">
            <h3 className="font-display font-semibold text-white">Academy Completed Paths</h3>
            {enrollments.length > 0 ? (
              <div className="mt-4 space-y-2">
                {enrollments.map((en: any) => (
                  <div key={en.id} className="flex items-center gap-3 rounded-xl bg-slate-850/30 p-3 border border-slate-800 text-xs">
                    <BookOpen className="size-4 text-emerald-400 shrink-0" />
                    <span className="font-medium text-white">{en.courses?.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                No academy courses completed yet. Academy paths support fundability score progression.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
