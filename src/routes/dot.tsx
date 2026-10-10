import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dot")({
  beforeLoad: () => {
    throw redirect({ to: "/start", search: { source: "dot" } as never });
  },
});
