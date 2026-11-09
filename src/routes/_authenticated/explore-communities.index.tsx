import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { listCommunities } from "@/lib/communities.functions";
import { COMMUNITY_TYPES, COMMUNITY_TYPE_LABELS, cleanSearchText, parseCommunityType, type CommunityType } from "@/lib/communities";

interface DirectorySearch {
  q?: string;
  type?: CommunityType;
  region?: string;
}

export const Route = createFileRoute("/_authenticated/explore-communities/")({
  validateSearch: (s: Record<string, unknown>): DirectorySearch => ({
    q: cleanSearchText(s.q),
    type: parseCommunityType(s.type),
    region: cleanSearchText(s.region),
  }),
  head: () => ({
    meta: [
      { title: "Communities — DOT" },
      { name: "description", content: "Find and join university, city, industry, interest and builder communities on DOT." },
    ],
  }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/explore-communities/" });
  const list = useServerFn(listCommunities);
  const [q, setQ] = useState(search.q ?? "");
  const [region, setRegion] = useState(search.region ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      navigate({ search: (p) => ({ ...p, q: cleanSearchText(q), region: cleanSearchText(region) }), replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [q, region, navigate]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["communities", search.q ?? "", search.type ?? "", search.region ?? ""],
    queryFn: () => list({ data: { q: search.q, type: search.type, region: search.region } }),
  });

  const filtered = !!(search.q || search.type || search.region);

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl bg-[image:var(--gradient-hero)] px-6 py-8 text-primary-foreground sm:px-10 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-gold/20 blur-3xl" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground/70">DOT Communities</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Find your people</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          Join university, city, industry, interest and builder communities. You can belong to more than one.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_16rem]">
          <label className="relative block">
            <span className="sr-only">Search communities</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or university" className="h-11 bg-background pl-9 text-foreground" />
          </label>
          <label className="block">
            <span className="sr-only">Filter by city, region or country</span>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="City, region or country" className="h-11 bg-background text-foreground" />
          </label>
        </div>
      </section>

      <div role="group" aria-label="Community type" className="sticky top-0 z-10 -mx-1 mt-5 flex gap-2 overflow-x-auto bg-background/85 px-1 py-2 backdrop-blur-sm">
        {[undefined, ...COMMUNITY_TYPES].map((t) => {
          const active = search.type === t;
          return (
            <button
              key={t ?? "all"}
              type="button"
              aria-pressed={active}
              onClick={() => navigate({ search: (p) => ({ ...p, type: t }) })}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:border-primary/50"
              }`}
            >
              {t ? COMMUNITY_TYPE_LABELS[t] : "All"}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="sr-only">{data ? `${data.length} communities shown` : ""}</div>

      {isLoading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />)}
        </div>
      ) : isError ? (
        <div role="alert" className="glass mt-6 flex flex-col items-center rounded-2xl p-10 text-center">
          <AlertCircle className="size-8 text-destructive" aria-hidden />
          <p className="mt-3 font-medium">Communities could not be loaded.</p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
        </div>
      ) : data && data.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c, i) => <CommunityCard key={c.id} c={c} index={i} />)}
        </div>
      ) : (
        <div className="glass mt-6 flex flex-col items-center rounded-2xl p-10 text-center">
          <Users className="size-8 text-primary" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold">{filtered ? "No communities match" : "No communities yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {filtered ? "Try a different search or clear the filters." : "Communities appear here as leaders create them."}
          </p>
          {filtered && (
            <Button className="mt-4" variant="outline" onClick={() => { setQ(""); setRegion(""); navigate({ search: {} }); }}>Clear filters</Button>
          )}
        </div>
      )}
    </AppShell>
  );
}
