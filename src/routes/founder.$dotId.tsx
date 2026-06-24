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
  Linkedin,
  Twitter,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Trophy,
  Users,
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

  // Find user profile by username or dot_id or name slug
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["public-profile", dotId],
    queryFn: async () => {
      // 1. Try by username first
      let q = supabase
        .from("profiles")
        .select(
          "id, name, avatar_url, dot_id, username, active_role, banner_url, bio, location, website, linkedin, twitter, whatsapp, skills, industry, community, achievements, created_at"
        )
        .eq("username", dotId.toLowerCase())
        .maybeSingle();
      let res = await q;

      // 2. Try by dot_id next
      if (!res.data) {
        q = supabase
          .from("profiles")
          .select(
            "id, name, avatar_url, dot_id, username, active_role, banner_url, bio, location, website, linkedin, twitter, whatsapp, skills, industry, community, achievements, created_at"
          )
          .eq("dot_id", dotId)
          .maybeSingle();
        res = await q;
      }
      
      // 3. If not found, try by name match
      if (!res.data) {
        q = supabase
          .from("profiles")
          .select(
            "id, name, avatar_url, dot_id, username, active_role, banner_url, bio, location, website, linkedin, twitter, whatsapp, skills, industry, community, achievements, created_at"
          )
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

  // Load event registrations (sessions attended)
  const { data: sessionsCount = 0 } = useQuery({
    queryKey: ["public-sessions-attended", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("attended", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Load rankings
  const { data: rankings } = useQuery({
    queryKey: ["public-founder-rankings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_founder_rankings", {
        _user_id: userId,
      });
      if (error) throw error;
      return data as any;
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
  const potentialValuation = latest?.potential_valuation || founder?.potential_valuation || 0;
  const vantagePoint = latest?.vantage_point || founder?.vantage_point || 0;
  const fundability = latest?.fundability || founder?.fundability || 0;
  const unicornPotential = latest?.unicorn_potential || founder?.unicorn_potential || 0;
  const investmentReadiness = latest?.investment_readiness || founder?.investment_readiness || 0;

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

  // Combine profile bio with founder profile bio
  const bioText = profile.bio || founder?.bio;
  const locationText = profile.location || founder?.city || founder?.country || "";
  const websiteText = profile.website || founder?.website || "";
  const skillsArray = profile.skills || [];
  const achievementsArray = profile.achievements || [];

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
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-16 space-y-10">
        
        {/* Profile Card */}
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 overflow-hidden backdrop-blur-xl relative">
          {/* Banner */}
          <div className="h-44 w-full bg-gradient-to-r from-pink-900/40 via-purple-900/30 to-indigo-900/40 border-b border-slate-900 relative">
            {profile.banner_url && (
              <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
          </div>

          <div className="p-6 md:p-8 pt-0 -mt-10 relative">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name ?? ""} className="size-24 rounded-full border-4 border-slate-950 object-cover shadow-2xl bg-slate-900" />
                ) : (
                  <span className="flex size-24 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 text-3xl font-bold text-white shadow-2xl border-4 border-slate-950">
                    {initial}
                  </span>
                )}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <h1 className="font-display text-3xl font-extrabold text-white leading-tight">{profile.name}</h1>
                    <span className="rounded-full bg-slate-900 border border-slate-800 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pink-400">
                      {profile.dot_id}
                    </span>
                    {profile.username && (
                      <span className="text-xs text-slate-500">@{profile.username}</span>
                    )}
                  </div>
                  {founder?.venture_name && (
                    <p className="text-sm text-indigo-400 font-semibold uppercase tracking-wider">
                      Founder of {founder.venture_name}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-400 mt-2">
                    {locationText && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 text-slate-500" /> {locationText}
                      </span>
                    )}
                    {founder?.industry && (
                      <span className="flex items-center gap-1">
                        <Building className="size-3.5 text-slate-500" /> {founder.industry}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-slate-500" /> Joined {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Archetype Badge */}
              <div className="flex flex-col gap-2 items-center md:items-end w-full md:w-auto">
                <div className="rounded-2xl bg-slate-950/80 border border-slate-900 px-4 py-2.5 text-center md:text-right shadow-lg">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold block">Archetype</span>
                  <span className="font-display text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-yellow-400">
                    {archetype}
                  </span>
                </div>
              </div>
            </div>

            {/* Social handles and Bio */}
            <div className="mt-6 border-t border-slate-900 pt-6 space-y-4">
              {bioText && (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line max-w-3xl">
                  {bioText}
                </p>
              )}

              {/* Social and Website Links */}
              <div className="flex flex-wrap gap-3 pt-2">
                {websiteText && (
                  <Button variant="outline" size="sm" className="h-8 border-slate-800 bg-slate-900/30 hover:bg-slate-900 text-xs text-slate-300" asChild>
                    <a href={websiteText.startsWith("http") ? websiteText : `https://${websiteText}`} target="_blank" rel="noopener noreferrer">
                      <Globe className="size-3.5 mr-1.5" /> Website
                    </a>
                  </Button>
                )}
                {profile.linkedin && (
                  <Button variant="outline" size="sm" className="h-8 border-slate-800 bg-slate-900/30 hover:bg-slate-900 text-xs text-slate-300" asChild>
                    <a href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="size-3.5 mr-1.5 text-blue-400" /> LinkedIn
                    </a>
                  </Button>
                )}
                {profile.twitter && (
                  <Button variant="outline" size="sm" className="h-8 border-slate-800 bg-slate-900/30 hover:bg-slate-900 text-xs text-slate-300" asChild>
                    <a href={profile.twitter.startsWith("http") ? profile.twitter : `https://${profile.twitter}`} target="_blank" rel="noopener noreferrer">
                      <Twitter className="size-3.5 mr-1.5 text-sky-400" /> Twitter/X
                    </a>
                  </Button>
                )}
                {profile.whatsapp && (
                  <Button variant="outline" size="sm" className="h-8 border-slate-800 bg-slate-900/30 hover:bg-slate-900 text-xs text-slate-300" asChild>
                    <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="size-3.5 mr-1.5 text-emerald-400" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Ranking Badges Row */}
        {rankings && !rankings.error && (
          <div className="flex flex-wrap gap-2.5">
            {rankings.country?.rank && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 text-slate-400 px-3.5 py-1.5 rounded-full">
                <MapPin className="size-3 text-pink-500" /> #{rankings.country.rank} in {rankings.country.name}
              </span>
            )}
            {rankings.industry?.rank && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 text-slate-400 px-3.5 py-1.5 rounded-full">
                <TrendingUp className="size-3 text-indigo-400" /> #{rankings.industry.rank} in {rankings.industry.name}
              </span>
            )}
            {rankings.university?.rank && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 text-slate-400 px-3.5 py-1.5 rounded-full">
                <Trophy className="size-3 text-yellow-500" /> #{rankings.university.rank} in {rankings.university.name}
              </span>
            )}
            {rankings.community?.rank && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 text-slate-400 px-3.5 py-1.5 rounded-full">
                <Users className="size-3 text-purple-400" /> #{rankings.community.rank} in {rankings.community.name}
              </span>
            )}
          </div>
        )}

        {/* Valuation Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 size-16 bg-emerald-500/5 blur-xl" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Vantage Score</span>
            <div className="flex items-baseline gap-1 mt-2">
              <p className="font-display text-3xl font-black text-white">{formatDot(vantagePoint)}</p>
              <span className="text-[10px] text-slate-500">/1000</span>
            </div>
          </div>
          
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 size-16 bg-indigo-500/5 blur-xl" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Startup Valuation</span>
            <p className="font-display text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 mt-2">
              {formatNaira(currentValuation)}
            </p>
            <span className="text-[10px] text-slate-500 block mt-1">Potential: {formatNaira(potentialValuation)}</span>
          </div>

          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 size-16 bg-yellow-500/5 blur-xl" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Fundability</span>
            <p className="font-display text-3xl font-black text-white mt-2">{fundability}%</p>
            <span className="text-[10px] text-slate-500 block mt-1">Readiness: {investmentReadiness}%</span>
          </div>

          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 size-16 bg-pink-500/5 blur-xl" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Unicorn Potential</span>
            <p className="font-display text-3xl font-black text-pink-400 mt-2">
              {typeof unicornPotential === 'number' ? unicornPotential.toFixed(1) : '0.0'}%
            </p>
            <span className="text-[10px] text-slate-500 block mt-1">Vantage Index</span>
          </div>
        </div>

        {/* History Chart */}
        {chartData.length > 0 && (
          <div className="rounded-3xl border border-slate-850 bg-slate-900/20 p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-white">Venture Growth History</h2>
            <p className="text-xs text-slate-400 mt-1">Tracking Vantage Score & Valuation over time</p>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-850" />
                  <XAxis dataKey="date" className="text-xs text-slate-500" />
                  <YAxis className="text-xs text-slate-500" />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b" }} />
                  <Line type="monotone" dataKey="vantage" name="Vantage Score" stroke="#10b981" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="valuation" name="Valuation (Millions ₦)" stroke="#6366f1" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Skills & Achievements arrays */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Skills Badges */}
          <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 text-left shadow-lg">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <Award className="size-4.5 text-pink-500" /> Core Skills & Expertise
            </h3>
            {skillsArray.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {skillsArray.map((sk) => (
                  <span key={sk} className="text-xs bg-slate-950 border border-slate-850 text-slate-300 px-3 py-1 rounded-lg">
                    {sk}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">No custom skills listed.</p>
            )}
          </div>

          {/* Achievements */}
          <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 text-left shadow-lg">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <Trophy className="size-4.5 text-yellow-500" /> Achievements & Badges
            </h3>
            {achievementsArray.length > 0 ? (
              <div className="space-y-2.5 mt-4">
                {achievementsArray.map((ac) => (
                  <div key={ac} className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>{ac}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">No achievements recorded yet.</p>
            )}
          </div>
        </div>

        {/* Bottom grid (Communities & Academy progress) */}
        <div className="grid gap-6 md:grid-cols-2 text-left">
          {/* Community */}
          <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-lg">
            <h3 className="font-display font-semibold text-white">Cohort Hubs & Community</h3>
            {founder?.communities ? (
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-slate-950/30 p-4 border border-slate-850">
                <span className="flex size-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400">
                  <Building className="size-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">{(founder.communities as { name: string }).name}</h4>
                  <p className="text-xs text-slate-400">{(founder.communities as { region: string }).region || "Africa"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                This founder is not currently a member of any cohort community.
              </p>
            )}
          </div>

          {/* Academy completed */}
          <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-lg">
            <h3 className="font-display font-semibold text-white">Completed Course Paths</h3>
            {enrollments.length > 0 ? (
              <div className="mt-4 space-y-2">
                {enrollments.map((en: any) => (
                  <div key={en.id} className="flex items-center gap-3 rounded-xl bg-slate-950/30 p-3 border border-slate-850 text-xs">
                    <BookOpen className="size-4 text-emerald-400 shrink-0" />
                    <span className="font-medium text-white">{en.courses?.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                No academy courses completed yet. Courses help increase fundability and score progression.
              </p>
            )}
          </div>
        </div>

        {/* Sessions Attended summary bar */}
        <div className="rounded-3xl border border-slate-850 bg-slate-900/20 p-6 text-left shadow-lg flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-white text-sm">Ecosystem Sessions & Workshops</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live training webinars, cohort reviews and pitch events</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Attended</span>
            <span className="font-display text-lg font-black text-white">{sessionsCount} Sessions</span>
          </div>
        </div>
      </div>
    </div>
  );
}

