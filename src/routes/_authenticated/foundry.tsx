import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/foundry")({
  head: () => ({
    meta: [
      { title: "Foundry — DOT" },
      { name: "description", content: "Your DOT Foundry progression. ARISE is DOT's first Foundry." },
      { property: "og:title", content: "Foundry — DOT" },
      { property: "og:description", content: "Your DOT Foundry progression. ARISE is DOT's first Foundry." },
    ],
  }),
  component: FoundryPage,
});

function FoundryPage() {
  return (
    <AppShell>
      <div className="dot-workspace py-8">
        <div className="max-w-2xl rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Building2 className="size-4 text-gold" /> Foundries
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold">ARISE Foundry</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ARISE is DOT's first Foundry — a 12-week progression. Cohort enrolment and weekly milestones open in an upcoming release.
          </p>
          <Button variant="outline" size="sm" className="mt-5" asChild>
            <Link to="/dashboard">Back to dashboard <ArrowUpRight /></Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
