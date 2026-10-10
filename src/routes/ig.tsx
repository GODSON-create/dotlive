import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ig")({
  beforeLoad: () => {
    throw redirect({ to: "/start", search: { source: "instagram" } as never });
  },
});
