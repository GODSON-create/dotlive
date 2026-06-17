import { createFileRoute } from "@tanstack/react-router";
import { PageShell, FeatureGrid } from "@/components/site/PageShell";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "Communities — DOT" },
      {
        name: "description",
        content:
          "The Community Operating System powers community-led founder acquisition with referral links, dashboards, community Vantage and DOT leader rewards.",
      },
      { property: "og:title", content: "DOT Communities" },
      { property: "og:description", content: "Community-led growth for African ventures." },
    ],
  }),
  component: CommunitiesPage,
});

const features = [
  { title: "Unique referral links", desc: "Each community gets a link like dot.africa/community/name to track visits, signups and activated founders." },
  { title: "Community dashboards", desc: "Members, active members, Vantage completions, Academy progress, Pitchathon entries and Demo qualifiers." },
  { title: "Community Vantage", desc: "Average community score, fundable ventures and active builders — with cross-community ranking." },
  { title: "Leader rewards", desc: "Track referrals, engagement and completion rates and reward Community Leaders with DOT." },
  { title: "WhatsApp-first", desc: "Leaders connect WhatsApp groups and communities; DOT tracks engagement through platform activity." },
  { title: "100 communities pilot", desc: "100 founders per community, 100 Community Leaders — designed to scale to thousands." },
];

function CommunitiesPage() {
  return (
    <PageShell
      eyebrow="Community OS"
      title="Community-led growth, measured end to end"
      intro="Community Leaders recruit, activate and progress founders — and earn DOT for the value they create."
    >
      <FeatureGrid items={features} />
    </PageShell>
  );
}
