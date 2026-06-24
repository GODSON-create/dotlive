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
import { ROLE_LABELS, SELF_ASSIGNABLE_ROLES, type AppRole } from "@/lib/constants";
import { updateUserRoles } from "@/lib/user.functions";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  { label: "DOT Work", to: "/work", icon: Hammer },
  { label: "Academy", to: "/academy", icon: BookOpen, roles: ["founder"] },
  { label: "Sessions", to: "/sessions", icon: CalendarCheck },
  { label: "Pitchathons", to: "/pitchathons", icon: Trophy, roles: ["founder"] },
  { label: "Spotlight", to: "/spotlight", icon: Sparkles, roles: ["founder"] },
  { label: "DOT Demo", to: "/demo", icon: Building2 },
  { label: "Community", to: "/community", icon: Users, roles: ["community_leader"] },
  { label: "Investor Portal", to: "/investor", icon: Briefcase, roles: ["investor"] },
  { label: "Admin", to: "/admin", icon: Shield, roles: ["admin", "super_admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, roles, activeRole, switchActiveRole, loading, user, refresh } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [tempRoles, setTempRoles] = useState<AppRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

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
                  <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-white rounded-lg cursor-pointer">
                    <span className="font-semibold text-slate-300">
                      {activeRole ? ROLE_LABELS[activeRole] : "Select Role"}
                    </span>
                    <ChevronDown className="size-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-950 border-slate-900 text-white">
                  <div className="px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Switch Active Persona
                  </div>
                  {roles.map((r) => (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => switchActiveRole(r)}
                      className={cn(
                        "text-xs cursor-pointer py-2 rounded-md focus:bg-slate-900 focus:text-white",
                        activeRole === r ? "bg-primary/20 text-white font-bold" : "text-slate-400 hover:text-white"
                      )}
                    >
                      <UserCheck className="size-3.5 mr-2 text-primary" />
                      {ROLE_LABELS[r]}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-slate-900" />
                  <DropdownMenuItem
                    onClick={openRoleDialog}
                    className="text-xs cursor-pointer text-primary focus:text-primary focus:bg-slate-900 font-semibold py-2 rounded-md"
                  >
                    <Settings className="size-3.5 mr-2" />
                    Manage Identities...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <span className="flex size-9 items-center justify-center rounded-full [background-image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground">
              {initial}
            </span>
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
        <DialogContent className="bg-slate-950 border border-slate-900 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-white text-base">
              Manage User Identities
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-2 text-left">
            <p className="text-xs text-slate-400 leading-relaxed">
              Select the roles that describe your identity on DOT. You can activate different dashboard features by switching between your assigned roles in the top header.
            </p>
            <div className="space-y-3 bg-slate-900/30 border border-slate-900 p-4 rounded-2xl">
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
                      className="mt-0.5 border-slate-800"
                    />
                    <div className="grid gap-0.5">
                      <Label htmlFor={`manage-role-${r}`} className="text-xs font-bold text-white cursor-pointer">
                        {ROLE_LABELS[r]}
                      </Label>
                      <span className="text-[10px] text-slate-500 leading-normal">
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
          <DialogFooter className="pt-3 border-t border-slate-900/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleDialog(false)}
              className="border-slate-800 text-xs font-bold"
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
    </div>
  );
}

