import { Link } from "@tanstack/react-router";
import { Users, Lock, MapPin, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { COMMUNITY_TYPE_LABELS, communityLocation, formatMemberCount, parseCommunityType } from "@/lib/communities";
import type { CommunityDTO } from "@/lib/communities.functions";
import { JoinButton } from "./JoinButton";

export function CommunityCard({ c, index }: { c: CommunityDTO; index: number }) {
  const type = parseCommunityType(c.community_type);
  const location = communityLocation(c);
  return (
    <article
      className="glass community-enter group flex flex-col rounded-2xl p-5 shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-elegant motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className="rounded-full">{type ? COMMUNITY_TYPE_LABELS[type] : "Community"}</Badge>
        {c.visibility === "invite_only" && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" aria-hidden /> Invite only</span>
        )}
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-tight">
        <Link to="/explore-communities/$id" params={{ id: c.id }} className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
          {c.name}
        </Link>
      </h3>
      {location && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {type === "university" ? <GraduationCap className="size-3.5" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
          {location}
        </p>
      )}
      {c.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-foreground/80">
          <Users className="size-4 text-primary" aria-hidden /> {formatMemberCount(c.member_count)}
        </span>
        <JoinButton community={c} size="sm" />
      </div>
    </article>
  );
}
