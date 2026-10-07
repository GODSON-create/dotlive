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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
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
import { useWallet } from "@/hooks/use-dot-data";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  future?: boolean;
  roles?: AppRole[]; // if omitted, all roles
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "AVA", to: "/vantage", icon: Gauge, roles: ["founder"] },
  { label: "ARISE Foundry", to: "/foundry", icon: Building2, roles: ["founder"] },
  { label: "Pitch / Pitchathons", to: "/pitchathons", icon: Trophy, roles: ["founder"] },
  { label: "Spotlight", to: "/spotlight", icon: Sparkles, roles: ["founder"] },
  { label: "Events", to: "/sessions", icon: CalendarCheck },
  { label: "DOT Demo", to: "/demo", icon: Building2 },
  { label: "Leaderboards", to: "/leaderboards", icon: Trophy },
  { label: "DOT Wallet", to: "/wallet", icon: Wallet },
  { label: "Admin", to: "/admin", icon: Shield, roles: ["admin", "super_admin"] },
  { label: "Store", to: "/store", icon: Store, future: true },
  { label: "Work / Services", to: "/work", icon: Hammer, future: true },
  { label: "Academy", to: "/academy", icon: BookOpen, roles: ["founder"], future: true },
  { label: "Community OS", to: "/community", icon: Users, roles: ["community_leader"], future: true },
  { label: "Investor Portal", to: "/investor", icon: Briefcase, roles: ["investor"], future: true },
  { label: "Capital Partner", to: "/capital-partner", icon: Building2, roles: ["capital_partner"], future: true },
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

  const [collapsed, setCollapsed] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const wallet = useWallet();
  useEffect(() => {
    setCollapsed(localStorage.getItem("dot-sidebar-collapsed") === "true");
  }, []);
  useEffect(() => { setShowNavigation(false); }, [pathname]);
  function toggleSidebar() {
    setCollapsed((value) => {
      localStorage.setItem("dot-sidebar-collapsed", String(!value));
      return !value;
    });
  }

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
      <div className="flex min-h-dvh items-center justify-center bg-background" role="status" aria-label="Loading DOT workspace">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // Filter navigation items strictly based on the current active role persona
  const items = NAV_ITEMS.filter((i) => !i.roles || (activeRole && i.roles.includes(activeRole)));
  const initial = (profile?.name || profile?.email || "?").charAt(0).toUpperCase();

  const coreItems = items.filter((item) => !item.future);
  const futureItems = items.filter((item) => item.future);
  const currentItem = items.find((item) => item.to === pathname);

  function navigation(compact = false) {
    return (
      <nav aria-label="Workspace navigation" className="space-y-1">
        {coreItems.map((item) => (
          <Button key={item.to} variant="ghost" asChild className={cn(
            "h-11 w-full justify-start gap-3 font-medium",
            compact ? "justify-center px-0" : "px-3",
            pathname === item.to ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}>
            <Link to={item.to} aria-current={pathname === item.to ? "page" : undefined} title={compact ? item.label : undefined}>
              <item.icon className="size-4 shrink-0" />
              {!compact && <span className="truncate">{item.label}</span>}
              {compact && <span className="sr-only">{item.label}</span>}
            </Link>
          </Button>
        ))}
        <Button variant="ghost" onClick={() => { setShowNavigation(false); setShowProfileDrawer(true); }} title={compact ? "Profile" : undefined} className={cn("h-11 w-full justify-start gap-3 text-muted-foreground hover:bg-muted hover:text-foreground", compact ? "justify-center px-0" : "px-3")}>
          <UserRound className="size-4 shrink-0" />
          <span className={compact ? "sr-only" : ""}>Profile</span>
        </Button>
        {!compact && futureItems.length > 0 && (
          <details className="pt-5" open={currentItem?.future || undefined}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground">
              Coming Soon <ChevronDown className="size-3.5" />
            </summary>
            <div className="mt-1 space-y-1">
              {futureItems.map((item) => (
                <Button key={item.to} variant="ghost" asChild className="h-11 w-full justify-start gap-3 px-3 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Link to={item.to} aria-current={pathname === item.to ? "page" : undefined}>
                    <item.icon className="size-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className="text-[10px]">Soon</span>
                  </Link>
                </Button>
              ))}
            </div>
          </details>
        )}
      </nav>
    );
  }

  return (
    <div className="dot-workspace min-h-dvh bg-canvas">
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-card focus:px-4 focus:py-3 focus:text-foreground">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={() => setShowNavigation(true)} aria-label="Open navigation"><Menu /></Button>
            <Logo className="shrink-0" />
            <span className="mx-2 hidden h-5 w-px bg-border sm:block" />
            <span className="hidden truncate text-sm text-muted-foreground sm:block">{currentItem?.label || "Workspace"}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button variant="ghost" asChild className="hidden h-9 gap-2 text-xs sm:inline-flex">
              <Link to="/wallet"><Wallet />{wallet.isError ? "Wallet unavailable" : wallet.isPending ? "— DOT" : `${formatDot(wallet.data ?? 0)} DOT`}</Link>
            </Button>
            <ThemeToggle />
            {roles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden h-9 gap-1.5 sm:inline-flex">
                    <span>{activeRole ? ROLE_LABELS[activeRole] : "Select Role"}</span><ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2 text-xs font-semibold text-muted-foreground">Switch identity</div>
                  {roles.map((role) => <DropdownMenuItem key={role} onClick={() => switchActiveRole(role)} className={cn("min-h-10", activeRole === role && "bg-primary/10 text-primary")}><UserCheck className="mr-2 size-4" />{ROLE_LABELS[role]}</DropdownMenuItem>)}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openRoleDialog}><Settings className="mr-2 size-4" />Manage identities</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowProfileDrawer(true)} className="rounded-full bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" aria-label="View Profile">{initial}</Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden text-muted-foreground sm:inline-flex" aria-label="Sign out"><LogOut /></Button>
          </div>
        </div>
      </header>
      <div className="flex w-full items-start">
        <aside className={cn("sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 md:flex", collapsed ? "w-20" : "w-60")}>
          <div className="flex items-center justify-between px-4 py-4">
            {!collapsed && <span className="text-[11px] font-semibold uppercase text-muted-foreground">Your workspace</span>}
            <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="shrink-0 text-muted-foreground">{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">{navigation(collapsed)}</div>
          {!collapsed && <div className="border-t border-border px-6 py-4 text-xs text-muted-foreground">DOT · Venture progression</div>}
        </aside>
        <main id="workspace-content" tabIndex={-1} className="workspace-content min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-8 lg:px-8 lg:py-8">{children}</main>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 px-2 pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        {coreItems.filter((item) => ["/dashboard", "/vantage", "/sessions", "/wallet"].includes(item.to)).map((item) => (
          <Button key={item.to} variant="ghost" asChild className={cn("h-12 flex-col gap-1 px-1 text-[10px]", pathname === item.to ? "text-primary bg-primary/10" : "text-muted-foreground")}>
            <Link to={item.to} aria-current={pathname === item.to ? "page" : undefined}><item.icon className="size-5" />{item.label === "DOT Wallet" ? "Wallet" : item.label}</Link>
          </Button>
        ))}
        {!coreItems.some((item) => item.to === "/vantage") && <Button variant="ghost" className="h-12 flex-col gap-1 px-1 text-[10px] text-muted-foreground" onClick={() => setShowProfileDrawer(true)}><UserRound />Profile</Button>}
        <Button variant="ghost" className="h-12 flex-col gap-1 px-1 text-[10px] text-muted-foreground" onClick={() => setShowNavigation(true)} aria-label="More navigation"><Menu />More</Button>
      </nav>
      <Sheet open={showNavigation} onOpenChange={setShowNavigation}>
        <SheetContent side="left" className="w-[min(88vw,340px)] overflow-y-auto p-4">
          <SheetHeader className="mb-5 text-left"><SheetTitle><Logo /></SheetTitle><p className="text-sm text-muted-foreground">Your DOT workspace</p></SheetHeader>
          {navigation()}
          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-2 px-3 text-xs text-muted-foreground">Active identity</p>
            {roles.map((role) => <Button key={role} variant="ghost" className={cn("h-11 w-full justify-start", role === activeRole && "bg-primary/10 text-primary")} onClick={() => switchActiveRole(role)}><UserCheck />{ROLE_LABELS[role]}</Button>)}
            <Button variant="ghost" className="mt-2 h-11 w-full justify-start" onClick={() => { setShowNavigation(false); openRoleDialog(); }}><Settings />Manage identities</Button>
            <Button variant="ghost" className="h-11 w-full justify-start" onClick={handleSignOut}><LogOut />Sign out</Button>
          </div>
        </SheetContent>
      </Sheet>

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
              <div className="flex items-center gap-2 rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-[10px] text-destructive font-semibold">
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
                    .eq("id", user?.id ?? "");
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
        <SheetContent side="right" className="w-full sm:max-w-xl bg-card border-l border-border text-foreground p-4 sm:p-6 overflow-y-auto max-h-dvh">
          <SheetHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full [background-image:var(--gradient-primary)] text-lg font-bold text-primary-foreground">
                {initial}
              </span>
              <div className="min-w-0">
                <SheetTitle className="font-display font-bold text-xl text-foreground break-words">
                  {profile?.name || "User Profile"}
                </SheetTitle>
                <p className="break-all text-xs text-muted-foreground">{profile?.email}</p>
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
            <Badge variant="default" className="font-bold text-[10px]">{h.vantage_point} pts</Badge>
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

