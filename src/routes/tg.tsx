import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tg")({
  beforeLoad: () => {
    throw redirect({ to: "/start", search: { source: "telegram" } as never });
  },
});
