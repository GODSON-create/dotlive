import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, User, Loader2, Check, Coins } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { formatDot } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({
    meta: [
      { title: "Founder Sessions — DOT" },
      { name: "description", content: "Register for live founder sessions with operators and investors." },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("event_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const registered = new Set(registrations.map((r) => r.event_id));

  async function register(eventId: string, cost: number) {
    if (!user) return;
    try {
      if (cost > 0) {
        const { error: spendErr } = await supabase.rpc("spend_dot", {
          _amount: cost,
          _description: "Session registration",
        });
        if (spendErr) throw spendErr;
      }
      const { error } = await supabase
        .from("event_registrations")
        .insert({ event_id: eventId, user_id: user.id });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my-registrations", user.id] });
      qc.invalidateQueries({ queryKey: ["wallet", user.id] });
      qc.invalidateQueries({ queryKey: ["transactions", user.id] });
      toast.success(cost > 0 ? `Registered! ${formatDot(cost)} DOT spent.` : "Registered!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    }
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Founder Sessions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Live access to operators, experts and investors. Pay with DOT.
      </p>

      {isLoading ? (
        <Loader2 className="mt-8 size-6 animate-spin text-primary" />
      ) : events.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No sessions scheduled yet.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {events.map((e) => {
            const isReg = registered.has(e.id);
            const date = e.event_date ? new Date(e.event_date) : null;
            return (
              <div key={e.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    <CalendarCheck className="mr-1 size-3" />
                    {date ? date.toLocaleDateString("en", { month: "short", day: "numeric" }) : "TBA"}
                  </Badge>
                  <span className="flex items-center gap-1 text-sm font-medium text-gold">
                    <Coins className="size-4" /> {e.dot_cost > 0 ? `${formatDot(e.dot_cost)} DOT` : "Free"}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{e.title}</h3>
                {e.speaker && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="size-3.5" /> {e.speaker}
                  </p>
                )}
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{e.description}</p>
                {date && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {date.toLocaleString("en", { weekday: "long", hour: "numeric", minute: "2-digit" })}
                  </p>
                )}
                <div className="mt-4">
                  {isReg ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Check className="size-4 text-primary" /> Registered
                    </Button>
                  ) : (
                    <Button variant="hero" className="w-full" onClick={() => register(e.id, e.dot_cost)}>
                      Register {e.dot_cost > 0 ? `· ${formatDot(e.dot_cost)} DOT` : ""}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
