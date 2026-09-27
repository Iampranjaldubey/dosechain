import { cn } from "@/lib/utils";

/** Little footprint pair — the DoseChain signature mark. */
export function Footprint({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("h-5 w-5", flip && "-scale-x-100", className)}
      aria-hidden
    >
      {/* sole */}
      <ellipse cx="12" cy="14.5" rx="4.6" ry="6.2" transform="rotate(-8 12 14.5)" />
      {/* toes */}
      <circle cx="7.6" cy="6.4" r="1.5" />
      <circle cx="10.4" cy="4.6" r="1.6" />
      <circle cx="13.4" cy="4.2" r="1.6" />
      <circle cx="16.2" cy="5.2" r="1.4" />
      <circle cx="18.2" cy="7.2" r="1.2" />
    </svg>
  );
}

/** Logo: footprint pair + wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative inline-flex">
        <Footprint className="h-6 w-6 text-primary" />
        <Footprint flip className="-ml-2 mt-2 h-6 w-6 text-primary/60" />
      </span>
      <span className="font-display text-xl leading-none">DoseChain</span>
    </span>
  );
}
