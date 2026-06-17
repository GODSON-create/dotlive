import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
  Shield,
  LogOut,
  Loader2,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type AppRole } from "@/lib/constants";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles?: AppRole[]; // if omitted, all roles
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Vantage", to: "/vantage", icon: Gauge, roles: ["founder"] },
  { label: "Wallet", to: "/wallet", icon: Wallet },
  { label: "Academy", to: "/academy", icon: BookOpen, roles: ["founder"] },
  { label: "Sessions", to: "/sessions", icon: CalendarCheck },
  { label: "Pitchathons", to: "/pitchathons", icon: Trophy, roles: ["founder"] },
  { label: "DOT Demo", to: "/demo", icon: Building2 },
  { label: "Community", to: "/community", icon: Users, roles: ["community_leader"] },
  { label: "Investor Portal", to: "/investor", icon: Briefcase, roles: ["investor"] },
  { label: "Admin", to: "/admin", icon: Shield, roles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, roles, primaryRole, loading, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && user && roles.length === 0) {
      navigate({ to: "/onboarding" });
    }
  }, [loading, user, roles, navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const items = NAV_ITEMS.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r)));
  const initial = (profile?.name || profile?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {primaryRole ? ROLE_LABELS[primaryRole] : ""}
            </span>
            <span className="flex size-9 items-center justify-center rounded-full [background-image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground">
              {initial}
            </span>
            <button
              onClick={handleSignOut}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
    </div>
  );
}
