import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Gauge,
  Wallet,
  BookOpen,
  CalendarCheck,
  Trophy,
  Building2,
  Users,
  Briefcase,
  Hammer,
  Shield,
  LogOut,
  Loader2,
  Sparkles,
  ChevronDown,
  Settings,
  UserCheck,
  ShieldAlert,
  MapPin,
  Store,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, SELF_ASSIGNABLE_ROLES, type AppRole, formatDot } from "@/lib/constants";
import { updateUserRoles } from "@/lib/user.functions";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles?: AppRole[]; // if omitted, all roles
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Vantage", to: "/vantage", icon: Gauge, roles: ["founder"] },
  { label: "Leaderboards", to: "/leaderboards", icon: Trophy },
  { label: "Wallet", to: "/wallet", icon: Wallet },
  { label: "DOT Store", to: "/store", icon: Store },
  { label: "DOT Work", to: "/work", icon: Hammer },
  { label: "Academy", to: "/academy", icon: BookOpen, roles: ["founder"] },
  { label: "Sessions", to: "/sessions", icon: CalendarCheck },
  { label: "Pitchathons", to: "/pitchathons", icon: Trophy, roles: ["founder"] },
  { label: "Spotlight", to: "/spotlight", icon: Sparkles, roles: ["founder"] },
  { label: "DOT Demo", to: "/demo", icon: Building2 },
  { label: "Community", to: "/community", icon: Users, roles: ["community_leader"] },
  { label: "Investor Portal", to: "/investor", icon: Briefcase, roles: ["investor"] },
  { label: "Capital Partner", to: "/capital-partner", icon: Building2, roles: ["capital_partner"] },
  { label: "Admin", to: "/admin", icon: Shield, roles: ["admin", "super_admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, roles, activeRole, switchActiveRole, loading, user, refresh } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [tempRoles, setTempRoles] = useState<AppRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const updateRolesFn = useServerFn(updateUserRoles);

  useEffect(() => {
    if (!loading && user && roles.length === 0) {
      navigate({ to: "/onboarding" });
    }
  }, [loading, user, roles, navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function openRoleDialog() {
    setTempRoles([...roles]);
    setShowRoleDialog(true);
  }

  async function saveRoles() {
    const selfAssigned = tempRoles.filter((r) => SELF_ASSIGNABLE_ROLES.includes(r));
    if (selfAssigned.length === 0) {
      toast.error("Please select at least one identity.");
      return;
    }
    setSavingRoles(true);
    try {
      await updateRolesFn({ data: { roles: selfAssigned } });
      toast.success("Identity roles updated successfully!");
      await refresh();
      setShowRoleDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update roles");
    } finally {
      setSavingRoles(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // Filter navigation items strictly based on the current active role persona
  const items = NAV_ITEMS.filter((i) => !i.roles || (activeRole && i.roles.includes(activeRole)));
  const initial = (profile?.name || profile?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {/* Active Role Selector */}
            {roles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs border border-border bg-card hover:bg-muted text-foreground rounded-lg cursor-pointer">
                    <span className="font-semibold text-muted-foreground hover:text-foreground">
                      {activeRole ? ROLE_LABELS[activeRole] : "Select Role"}
                    </span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border border-border text-popover-foreground">
                  <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Switch Active Persona
                  </div>
                  {roles.map((r) => (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => switchActiveRole(r)}
                      className={cn(
                        "text-xs cursor-pointer py-2 rounded-md focus:bg-muted focus:text-foreground",
                        activeRole === r ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <UserCheck className="size-3.5 mr-2 text-primary" />
                      {ROLE_LABELS[r]}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={openRoleDialog}
                    className="text-xs cursor-pointer text-primary focus:text-primary focus:bg-muted font-semibold py-2 rounded-md"
                  >
                    <Settings className="size-3.5 mr-2" />
                    Manage Identities...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button
              onClick={() => setShowProfileDrawer(true)}
              className="flex size-9 items-center justify-center rounded-full [background-image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
              aria-label="View Profile"
            >
              {initial}
            </button>
            <button
              onClick={handleSignOut}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-1">
            {items.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="sticky bottom-0 z-40 flex items-center justify-around border-t border-border/60 bg-background/90 px-2 py-1 backdrop-blur-xl lg:hidden">
        {items.slice(0, 5).map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Manage Roles Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="bg-card border border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-foreground text-base">
              Manage User Identities
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-2 text-left">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select the roles that describe your identity on DOT. You can activate different dashboard features by switching between your assigned roles in the top header.
            </p>
            <div className="space-y-3 bg-muted/40 border border-border p-4 rounded-2xl">
              {SELF_ASSIGNABLE_ROLES.map((r) => {
                const checked = tempRoles.includes(r);
                return (
                  <div key={r} className="flex items-start gap-3 p-1">
                    <Checkbox
                      id={`manage-role-${r}`}
                      checked={checked}
                      onCheckedChange={(isChecked) => {
                        setTempRoles((prev) =>
                          isChecked
                            ? [...prev, r]
                            : prev.filter((x) => x !== r)
                        );
                      }}
                      className="mt-0.5 border-border"
                    />
                    <div className="grid gap-0.5">
                      <Label htmlFor={`manage-role-${r}`} className="text-xs font-bold text-foreground cursor-pointer">
                        {ROLE_LABELS[r]}
                      </Label>
                      <span className="text-[10px] text-muted-foreground/80 leading-normal">
                        {r === "founder" && "Building a venture and tracking valuation."}
                        {r === "builder" && "Offering developer, designer, or product services."}
                        {r === "vendor" && "Providing startup and legal professional services."}
                        {r === "community_leader" && "Leading ecosystem hubs or universities."}
                        {r === "investor" && "Backing startups and reviewing assessments."}
                        {r === "capital_partner" && "Offering funding programs, grants and credit lines."}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {roles.some((r) => r === "admin" || r === "super_admin") && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/5 border border-red-500/10 p-3 text-[10px] text-red-400 font-semibold">
                <ShieldAlert className="size-4 shrink-0" />
                <span>Admin roles cannot be self-removed or modified from this screen.</span>
              </div>
            )}
          </div>
          <DialogFooter className="pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleDialog(false)}
              className="border-border text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              size="sm"
              disabled={savingRoles}
              onClick={saveRoles}
              className="text-xs font-bold"
            >
              {savingRoles ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Password Change Dialog */}
      <Dialog open={profile?.force_password_change === true}>
        <DialogContent className="bg-card border border-border text-foreground max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-foreground text-base">
              Update Temporary Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-2 text-left">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This account was seeded with a temporary password. For security, you must set a new strong password before continuing.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="mandatory-password">New Password</Label>
              <Input
                id="mandatory-password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-border">
            <Button
              variant="hero"
              disabled={updatingPassword || newPassword.length < 6}
              onClick={async () => {
                setUpdatingPassword(true);
                try {
                  const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
                  if (authErr) throw authErr;
                  const { error: profileErr } = await supabase
                    .from("profiles")
                    .update({ force_password_change: false })
                    .eq("id", user?.id);
                  if (profileErr) throw profileErr;
                  toast.success("Password updated successfully!");
                  await refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to update password");
                } finally {
                  setUpdatingPassword(false);
                }
              }}
              className="text-xs font-bold w-full"
            >
              {updatingPassword ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Update Password & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Drawer */}
      <Sheet open={showProfileDrawer} onOpenChange={setShowProfileDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-card border-l border-border text-foreground p-6 overflow-y-auto max-h-screen">
          <SheetHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full [background-image:var(--gradient-primary)] text-lg font-bold text-primary-foreground">
                {initial}
              </span>
              <div>
                <SheetTitle className="font-display font-black text-xl text-foreground">
                  {profile?.name || "User Profile"}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6 text-left">
            {/* Personal Information */}
            <div className="space-y-2 bg-muted/20 border border-border/60 p-4 rounded-2xl">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">Personal Details</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div><span className="text-muted-foreground">DOT ID:</span> <span className="font-mono">{profile?.dot_id || "—"}</span></div>
                <div><span className="text-muted-foreground">Username:</span> <span>@{profile?.username || "—"}</span></div>
                <div><span className="text-muted-foreground">Location:</span> <span>{profile?.location || "—"}</span></div>
                <div><span className="text-muted-foreground">Active Role:</span> <span className="font-semibold text-primary">{profile?.active_role ? ROLE_LABELS[profile.active_role as AppRole] : "—"}</span></div>
                {profile?.phone && <div className="col-span-2"><span className="text-muted-foreground">Phone:</span> <span>{profile.phone}</span></div>}
                {profile?.bio && <div className="col-span-2"><span className="text-muted-foreground">Bio:</span> <p className="mt-0.5 text-foreground/90">{profile.bio}</p></div>}
              </div>
            </div>

            {/* Venture Information */}
            {activeRole === "founder" && (
              <VentureDrawerSection userId={user?.id} />
            )}

            {/* Vantage History */}
            <VantageHistorySection userId={user?.id} />

            {/* Wallet Activity */}
            <WalletActivitySection userId={user?.id} />

            {/* Academy Progress */}
            <AcademyProgressSection userId={user?.id} />

            {/* Referrals & Rewards */}
            <ReferralsSection userId={user?.id} dotId={profile?.dot_id} />
            
            {/* Skills & Certifications */}
            {profile?.skills && profile.skills.length > 0 && (
              <div className="space-y-2 bg-muted/20 border border-border/60 p-4 rounded-2xl">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">Skills & Certifications</h3>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                  {profile?.achievements && profile.achievements.map((a) => (
                    <Badge key={a} variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5">{a}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ================= Drawer Helper Sub-sections ================= */
function VentureDrawerSection({ userId }: { userId?: string }) {
  const { data: founder } = useQuery({
    queryKey: ["drawer-founder-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_profiles")
        .select("*, communities(*)")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  if (!founder) return null;
  return (
    <div className="space-y-2 bg-muted/20 border border-border/60 p-4 rounded-2xl">
      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">Venture Information</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div><span className="text-muted-foreground">Startup:</span> <span className="font-semibold">{founder.venture_name || "—"}</span></div>
        <div><span className="text-muted-foreground">Industry:</span> <span>{founder.industry || "—"}</span></div>
        <div><span className="text-muted-foreground">Stage:</span> <span>{founder.stage || "Idea"}</span></div>
        <div><span className="text-muted-foreground">Country:</span> <span>{founder.country || "—"}</span></div>
        <div><span className="text-muted-foreground">Vantage Score:</span> <span className="font-black text-primary">{founder.vantage_point || 0} pts</span></div>
        {founder.website && <div className="col-span-2"><span className="text-muted-foreground">Website:</span> <a href={founder.website} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold ml-1">{founder.website}</a></div>}
      </div>
    </div>
  );
}

function VantageHistorySection({ userId }: { userId?: string }) {
  const { data: history = [] } = useQuery({
    queryKey: ["drawer-vantage-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select("id, vantage_point, created_at, founder_archetype")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return data || [];
    }
  });

  if (history.length === 0) return null;
  return (
    <div className="space-y-2 bg-muted/20 border border-border/60 p-4 rounded-2xl">
      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">Vantage Assessment History</h3>
      <div className="divide-y divide-border/40 max-h-36 overflow-y-auto pr-1">
        {history.map((h: any) => (
          <div key={h.id} className="flex justify-between items-center py-2 text-xs">
            <div>
              <p className="font-semibold text-foreground">{h.founder_archetype || "Baseline Assessment"}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
            </div>
            <Badge variant="hero" className="font-bold text-[10px]">{h.vantage_point} pts</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletActivitySection({ userId }: { userId?: string }) {
  const { data: activity = [] } = useQuery({
    queryKey: ["drawer-wallet-activity", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, type, description, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  if (activity.length === 0) return null;
  return (
    <div className="space-y-2 bg-muted/20 border border-border/60 p-4 rounded-2xl">
      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">Recent Wallet Transactions</h3>
      <div className="divide-y divide-border/40 max-h-40 overflow-y-auto pr-1">
        {activity.map((a: any) => {
          const isCredit = a.amount > 0;
          return (
            <div key={a.id} className="flex justify-between items-start py-2 text-xs">
              <div className="flex-1 pr-4">
                <p className="font-medium text-foreground">{a.description}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <span className={cn("font-bold text-[11px] shrink-0", isCredit ? "text-primary" : "text-destructive")}>
                {isCredit ? "+" : ""}{formatDot(a.amount)} DOT
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AcademyProgressSection({ userId }: { userId?: string }) {
  const { data: enrolls = [] } = useQuery({
    queryKey: ["drawer-academy-progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_enrollments")
        .select("*, courses(*)")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      return data || [];
    }
  });

  if (enrolls.length === 0) return null;
  return (
    <div className="space-y-2 bg-muted/20 border border-border/60 p-4 rounded-2xl">
      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">Academy Progress</h3>
      <div className="divide-y divide-border/40 max-h-36 overflow-y-auto pr-1">
        {enrolls.map((e: any) => (
          <div key={e.id} className="flex justify-between items-center py-2 text-xs">
            <span className="font-medium truncate max-w-[280px]">{e.courses?.title || "Course"}</span>
            <Badge variant={e.status === "completed" ? "default" : "secondary"} className="text-[9px]">
              {e.status === "completed" ? "Completed" : "In Progress"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferralsSection({ userId, dotId }: { userId?: string; dotId?: string | null }) {
  const { data: referredCount = 0 } = useQuery({
    queryKey: ["drawer-referred-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by_id", userId!);
      return count || 0;
    }
  });

  return (
    <div className="space-y-2 bg-muted/20 border border-border/60 p-4 rounded-2xl">
      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">Referral Link & Rewards</h3>
      <div className="text-xs space-y-2.5 pt-1">
        <div className="flex justify-between items-center bg-background border border-border p-2.5 rounded-xl">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold">Your Referral Code</p>
            <p className="font-mono font-bold text-primary mt-0.5">{dotId || "—"}</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-[10px] font-bold" 
            onClick={() => {
              if (dotId) {
                navigator.clipboard.writeText(dotId);
                toast.success("Referral code copied to clipboard!");
              }
            }}
          >
            Copy Code
          </Button>
        </div>
        <div className="flex justify-between text-xs font-semibold text-foreground/90 px-1">
          <span>Successful Referrals:</span>
          <span className="text-primary font-black">{referredCount} users</span>
        </div>
      </div>
    </div>
  );
}

