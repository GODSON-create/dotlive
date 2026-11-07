import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ChallengeReport } from "@/components/app/ChallengeReport";

export const Route = createFileRoute("/_authenticated/challenge-report")({
  head: () => ({ meta: [
    { title: "Challenge Reporting — DOT Venture Progression Network" },
    { name: "description", content: "Authorized community-scoped Builders Challenge reporting." },
    { property: "og:title", content: "Challenge Reporting — DOT Venture Progression Network" },
    { property: "og:description", content: "Community-scoped participant progress and programme operations." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ChallengeReportingPage,
});

function ChallengeReportingPage() {
  return <AppShell><ChallengeReport /></AppShell>;
}