import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Rocket, Users } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start on DOT — Africa's Venture Progression Network" },
      { name: "description", content: "Join DOT free. One account to assess your venture, join a Foundry like ARISE, pitch and get funded." },
      { property: "og:title", content: "Start on DOT — Africa's Venture Progression Network" },
      { property: "og:description", content: "Join DOT free. One account to assess your venture, join a Foundry, pitch and get funded." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StartPage,
});

const STEPS = [
  { icon: Users, title: "Create one DOT account", body: "Free. Your single identity across every Foundry, event and pitch." },
  { icon: Compass, title: "Take your AVA assessment", body: "See where your venture stands and what to fix next." },
  { icon: Rocket, title: "Join a Foundry", body: "Progress week by week — ARISE is the first Foundry on DOT." },
];

function StartPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <Logo />
        <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
      </header>
      <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-10 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
        <div>
          <p className="text-sm font-semibold text-gold">Free to join · No payment required</p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Build your venture on Africa's progression network.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            DOT takes founders from idea to funded: assess, learn, validate, pitch and scale — with one account wherever you found us.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth">Create your free account <ArrowRight /></Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </div>
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Step {i + 1}</p>
                <h2 className="font-display text-lg font-semibold">{s.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
