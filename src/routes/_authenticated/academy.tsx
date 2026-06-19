import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Loader2, CheckCircle2, Award, Gift } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useMyEnrollments } from "@/hooks/use-dot-data";
import { useServerFn } from "@tanstack/react-start";
import { completeCourse } from "@/lib/academy.functions";
import { formatDot } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/academy")({
  head: () => ({
    meta: [
      { title: "DOT Academy — DOT" },
      { name: "description", content: "Founder education powered by DOT Academy." },
    ],
  }),
  component: AcademyPage,
});

function AcademyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const completeCourseFn = useServerFn(completeCourse);
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: enrollments = [] } = useMyEnrollments();

  const enrollMap = new Map(enrollments.map((e) => [e.course_id, e]));

  async function enroll(courseId: string, whopUrl: string | null) {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("course_enrollments")
        .upsert({ course_id: courseId, user_id: user.id, status: "enrolled" }, { onConflict: "course_id,user_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["enrollments", user.id] });
      toast.success("Enrolled! Opening course on Whop.");
      if (whopUrl) window.open(whopUrl, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enroll");
    }
  }

  async function complete(courseId: string, reward: number) {
    if (!user) return;
    try {
      // Completion and the DOT reward are verified and granted server-side
      // (idempotent). The client cannot set the amount or self-award.
      await completeCourseFn({ data: { courseId } });
      qc.invalidateQueries({ queryKey: ["enrollments", user.id] });
      qc.invalidateQueries({ queryKey: ["wallet", user.id] });
      qc.invalidateQueries({ queryKey: ["transactions", user.id] });
      toast.success(reward > 0 ? `Completed! +${formatDot(reward)} DOT earned.` : "Marked complete!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  const completedCount = enrollments.filter((e) => e.status === "completed").length;

  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold">DOT Academy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Founder education delivered via Whop. Complete tracks to earn DOT and boost Vantage.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          <Award className="mr-1 size-3" /> {completedCount} completed
        </Badge>
      </div>

      {isLoading ? (
        <Loader2 className="mt-8 size-6 animate-spin text-primary" />
      ) : courses.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No courses available yet. Check back soon.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const enr = enrollMap.get(c.id);
            const done = enr?.status === "completed";
            return (
              <div key={c.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="size-5" />
                  </span>
                  {c.category && <Badge variant="outline">{c.category}</Badge>}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  {c.dot_reward > 0 && (
                    <span className="flex items-center gap-1 text-gold">
                      <Gift className="size-3" /> +{formatDot(c.dot_reward)} DOT
                    </span>
                  )}
                  {c.vantage_boost > 0 && <span>+{c.vantage_boost} Vantage</span>}
                </div>
                <div className="mt-4 flex gap-2">
                  {done ? (
                    <Button variant="outline" className="flex-1" disabled>
                      <CheckCircle2 className="size-4 text-primary" /> Completed
                    </Button>
                  ) : enr ? (
                    <>
                      <Button variant="outline" className="flex-1" onClick={() => c.whop_url && window.open(c.whop_url, "_blank", "noopener")}>
                        <ExternalLink className="size-4" /> Open
                      </Button>
                      <Button variant="hero" onClick={() => complete(c.id, c.dot_reward)}>
                        Mark done
                      </Button>
                    </>
                  ) : (
                    <Button variant="hero" className="flex-1" onClick={() => enroll(c.id, c.whop_url)}>
                      Enroll <ExternalLink className="size-4" />
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
