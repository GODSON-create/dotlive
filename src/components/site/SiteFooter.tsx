import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const columns = [
  {
    title: "Platform",
    links: [
      { label: "Vantage", to: "/platform" },
      { label: "DOT Academy", to: "/platform" },
      { label: "Sessions", to: "/platform" },
      { label: "Pitchathons", to: "/platform" },
      { label: "DOT Demo", to: "/platform" },
    ],
  },
  {
    title: "For",
    links: [
      { label: "Founders", to: "/journey" },
      { label: "Communities", to: "/communities" },
      { label: "Investors", to: "/investors" },
      { label: "Capital Partners", to: "/investors" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Pilot Program", to: "/" },
      { label: "Contact", to: "/" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground">
              Africa's Venture Progression Network. Helping founders move from idea to funded —
              measurably.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} DOT. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">Built for African founders.</p>
        </div>
      </div>
    </footer>
  );
}
