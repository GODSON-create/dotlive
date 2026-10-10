import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/wa")({
  beforeLoad: () => {
    throw redirect({ to: "/start", search: { source: "whatsapp" } as never });
  },
});
