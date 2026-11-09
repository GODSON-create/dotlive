import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { joinCommunity, leaveCommunity, type CommunityDTO } from "@/lib/communities.functions";

export function JoinButton({ community, size = "default" }: { community: CommunityDTO; size?: "sm" | "default" }) {
  const qc = useQueryClient();
  const join = useServerFn(joinCommunity);
  const leave = useServerFn(leaveCommunity);
  const m = useMutation({
    mutationFn: async (action: "join" | "leave") =>
      action === "join" ? join({ data: { id: community.id } }) : leave({ data: { id: community.id } }),
    onSuccess: (_d, action) => {
      toast.success(action === "join" ? `You joined ${community.name}` : `You left ${community.name}`);
      qc.invalidateQueries({ queryKey: ["communities"] });
      qc.invalidateQueries({ queryKey: ["membership"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  if (community.is_leader) return <span className="text-xs font-medium text-gold">You lead this</span>;
  if (community.is_member) {
    return (
      <Button size={size} variant="outline" disabled={m.isPending} onClick={() => m.mutate("leave")} aria-label={`Leave ${community.name}`}>
        {m.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Joined · Leave
      </Button>
    );
  }
  if (community.visibility === "invite_only") {
    return <span className="text-xs text-muted-foreground">Join via invite link</span>;
  }
  return (
    <Button size={size} disabled={m.isPending} onClick={() => m.mutate("join")} aria-label={`Join ${community.name}`}>
      {m.isPending && <Loader2 className="size-4 animate-spin" />} Join
    </Button>
  );
}
