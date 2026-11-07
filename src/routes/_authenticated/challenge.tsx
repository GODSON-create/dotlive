import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ChallengeJourney } from "@/components/app/ChallengeJourney";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/challenge")({
  head: () => ({ meta: [
    { title: "Builders Challenge — DOT Venture Progression Network" },
    { name: "description", content: "Your individual Builders Challenge journey, milestones and progress evidence on DOT." },
    { property: "og:title", content: "Builders Challenge — DOT Venture Progression Network" },
    { property: "og:description", content: "Track your confirmed participant journey and progress evidence on DOT." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ChallengePage,
});

function ChallengePage() {
  return <AppShell><Button variant="link" className="px-0" asChild><Link to="/dashboard">Back to dashboard</Link></Button><ChallengeJourney /></AppShell>;
}