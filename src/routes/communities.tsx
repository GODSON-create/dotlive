import { createFileRoute } from "@tanstack/react-router";
import { PageShell, FeatureGrid } from "@/components/site/PageShell";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "Communities — DOT Venture Progression Network" },
      { name: "description", content: "Find and join university, city, industry, interest and builder communities on DOT." },
      { property: "og:title", content: "DOT Communities" },
      { property: "og:description", content: "Find and join founder communities on DOT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommunitiesPage,
});

const features = [
  { title: "University", desc: "Connect with founders and builders from your campus." },
  { title: "City / Region", desc: "Meet people building near you." },
  { title: "Industry", desc: "Join peers working in the same sector." },
  { title: "Interest", desc: "Gather around a shared theme or problem." },
  { title: "Builder", desc: "Ship alongside other makers and operators." },
  { title: "Leader tools", desc: "Community leaders get invite links and a member view in Community OS." },
];

function CommunitiesPage() {
  return (
    <PageShell
      eyebrow="Communities"
      title="Find your people on DOT"
      intro="Sign in to browse communities and join as many as fit you. Membership is free."
    >
      <FeatureGrid items={features} />
    </PageShell>
  );
}
