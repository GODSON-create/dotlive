import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "The Founder Journey — DOT" },
      {
        name: "description",
        content:
          "Assess, Learn, Improve, Validate, Pitch, Fund, Scale — the seven measurable stages every DOT founder moves through.",
      },
      { property: "og:title", content: "The DOT Founder Journey" },
      { property: "og:description", content: "Seven measurable stages from idea to funded." },
    ],
  }),
  component: JourneyPage,
});

const stages = [
  { n: "01", label: "Assess", desc: "Complete Vantage to measure venture quality, founder readiness, market strength and fundability." },
  { n: "02", label: "Learn", desc: "Follow Academy tracks — LEAPFROG, Venture Design, Customer Discovery and more — powered by Whop." },
  { n: "03", label: "Improve", desc: "Act on AI Venture Advisor recommendations to close gaps and raise your score." },
  { n: "04", label: "Validate", desc: "Prove demand, traction and product readiness with real market evidence." },
  { n: "05", label: "Pitch", desc: "Enter Pitchathons, get evaluated by judges and climb the leaderboard." },
  { n: "06", label: "Fund", desc: "Surface on DOT Demo where capital partners discover and meet fundable ventures." },
  { n: "07", label: "Scale", desc: "Grow with community distribution, sessions and continuous reassessment." },
];

function JourneyPage() {
  return (
    <PageShell
      eyebrow="The Journey"
      title="From idea to funded, in seven measurable stages"
      intro="Every founder follows the same progression — and DOT measures movement at every step."
    >
      <ol className="relative space-y-6 border-l border-border pl-8">
        {stages.map((s) => (
          <li key={s.n} className="relative">
            <span className="absolute -left-[42px] flex size-8 items-center justify-center rounded-full [background-image:var(--gradient-primary)] text-xs font-bold text-primary-foreground">
              {s.n}
            </span>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-xl font-semibold">{s.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
