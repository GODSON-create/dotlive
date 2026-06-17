import { createFileRoute } from "@tanstack/react-router";
import { PageShell, FeatureGrid } from "@/components/site/PageShell";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "Platform — DOT" },
      {
        name: "description",
        content:
          "The six pillars of DOT: Vantage, DOT Academy, Founder Sessions, Pitchathons, DOT Demo and the Community Operating System.",
      },
      { property: "og:title", content: "The DOT Platform" },
      { property: "og:description", content: "Six pillars. One venture progression network." },
    ],
  }),
  component: PlatformPage,
});

const pillars = [
  {
    title: "Vantage",
    desc: "Venture assessment and intelligence engine. A 0–1000 Vantage Point plus fundability and investment readiness scores with reports, benchmarking and reassessment.",
  },
  {
    title: "DOT Academy",
    desc: "Founder learning progression powered by Whop. DOT handles access control, course tracking, scoring, rewards and eligibility — Whop handles content delivery.",
  },
  {
    title: "Founder Sessions",
    desc: "Live access to entrepreneurs, investors, operators and experts. Event listings, DOT-based registration, attendance tracking and replays.",
  },
  {
    title: "Pitchathons",
    desc: "Founder selection and evaluation. Applications, submissions, judge portals, scoring, rankings and leaderboards with configurable eligibility.",
  },
  {
    title: "DOT Demo",
    desc: "Investor discovery and funding marketplace. Venture profiles, pitch decks, investor profiles, meeting requests and funding tracking.",
  },
  {
    title: "Community OS",
    desc: "Community-led founder acquisition. Referral links, community dashboards, community Vantage scoring and DOT leader rewards.",
  },
];

function PlatformPage() {
  return (
    <PageShell
      eyebrow="The Platform"
      title="Six integrated pillars built for venture progression"
      intro="DOT combines venture intelligence, education, access, competition, capital discovery and community-led distribution into a single network."
    >
      <FeatureGrid items={pillars} />
    </PageShell>
  );
}
