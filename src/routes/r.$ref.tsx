import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/r/$ref")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/start", search: { source: "referral", ref: params.ref } as never });
  },
});
