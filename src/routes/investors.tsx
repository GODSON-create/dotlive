import { createFileRoute } from "@tanstack/react-router";
import { PageShell, FeatureGrid } from "@/components/site/PageShell";

export const Route = createFileRoute("/investors")({
  head: () => ({
    meta: [
      { title: "Investors & Capital Partners — DOT" },
      {
        name: "description",
        content:
          "Discover fundable African ventures on DOT Demo. Filter by Vantage Point, review reports, request meetings and track your pipeline.",
      },
      { property: "og:title", content: "DOT for Investors" },
      { property: "og:description", content: "Discover and fund Africa's best ventures." },
    ],
  }),
  component: InvestorsPage,
});

const features = [
  { title: "Venture discovery", desc: "Browse ventures with filters, search, Vantage sorting and saved lists." },
  { title: "Vantage reports", desc: "Review fundability, investment readiness and venture health for every opportunity." },
  { title: "Meeting requests", desc: "Request meetings with founders directly through DOT Demo." },
  { title: "Capital partner dashboard", desc: "Track commitments, pipeline, Demo participation and portfolio." },
  { title: "Built for every category", desc: "VCs, Angels, DFIs, Banks, Corporates and Family Offices." },
  { title: "Pilot funding", desc: "100 Runway Ventures × $1,000 and 10 Pre-Seed Ventures × $10,000 — a $200,000 target." },
];

function InvestorsPage() {
  return (
    <PageShell
      eyebrow="Investors"
      title="Discover and fund Africa's most ready ventures"
      intro="DOT Demo connects capital partners with fundable ventures, ranked and verified by Vantage intelligence."
    >
      <FeatureGrid items={features} />
    </PageShell>
  );
}
