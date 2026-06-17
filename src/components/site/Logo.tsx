import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 font-display", className)}>
      <span className="relative flex size-8 items-center justify-center rounded-lg [background-image:var(--gradient-primary)] shadow-glow">
        <span className="size-2.5 rounded-full bg-primary-foreground" />
      </span>
      <span className="text-xl font-bold tracking-tight">DOT</span>
    </Link>
  );
}
