import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, MapPin, GraduationCap, Lock } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { JoinButton } from "@/components/communities/JoinButton";
import { PingHubStatus } from "@/components/ping/PingStatus";
import { listCommunities } from "@/lib/communities.functions";
import { COMMUNITY_TYPE_LABELS, communityLocation, formatMemberCount, parseCommunityType } from "@/lib/communities";

export const Route = createFileRoute("/_authenticated/explore-communities/$id")({
  head: () => ({ meta: [{ title: "Community — DOT" }, { name: "description", content: "Community details on DOT." }] }),
  component: CommunityDetail,
});

function CommunityDetail() {
  const { id } = Route.useParams();
  const list = useServerFn(listCommunities);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["communities", "", "", ""],
    queryFn: () => list({ data: {} }),
  });
  const c = data?.find((x) => x.id === id);
  const type = c ? parseCommunityType(c.community_type) : undefined;

  return (
    <AppShell>
      <Link to="/explore-communities" search={{}} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All communities
      </Link>
      {isLoading ? (
        <div className="mt-4 h-64 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" />
      ) : isError ? (
        <p role="alert" className="mt-6 text-sm text-destructive">This community could not be loaded.</p>
      ) : !c ? (
        <div className="glass mt-6 rounded-2xl p-10 text-center">
          <p className="font-display text-lg font-semibold">Community not found</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have been removed.</p>
        </div>
      ) : (
        <article className="glass community-enter mt-4 rounded-3xl p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">{type ? COMMUNITY_TYPE_LABELS[type] : "Community"}</Badge>
            {c.visibility === "invite_only" && <Badge variant="outline" className="gap-1 rounded-full"><Lock className="size-3" aria-hidden /> Invite only</Badge>}
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">{c.name}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {communityLocation(c) && (
              <span className="inline-flex items-center gap-1.5">
                {type === "university" ? <GraduationCap className="size-4" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
                {communityLocation(c)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 tabular-nums"><Users className="size-4 text-primary" aria-hidden /> {formatMemberCount(c.member_count)}</span>
            {c.leader_name && <span>Led by <span className="text-foreground">{c.leader_name}</span></span>}
          </div>
          {c.description && <p className="mt-6 max-w-2xl whitespace-pre-line leading-relaxed">{c.description}</p>}
          <div className="mt-8"><JoinButton community={c} /></div>
          <PingHubStatus communityId={c.id} />
        </article>
      )}
    </AppShell>
  );
}
