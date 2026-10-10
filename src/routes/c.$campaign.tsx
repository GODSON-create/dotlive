import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/c/$campaign")({
  beforeLoad: ({ params, search }) => {
    throw redirect({ to: "/start", search: { source: (search as { source?: string }).source ?? "dot", campaign: params.campaign } as never });
  },
});
