import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export function PageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-card/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <span className="text-sm font-semibold text-primary">{eyebrow}</span>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{intro}</p>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function FeatureGrid({
  items,
}: {
  items: { title: string; desc: string }[];
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}
