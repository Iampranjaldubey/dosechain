import type { ReactNode } from "react";

/**
 * Kid-vibe accents without a cartoon character: reward stickers (like the ones
 * a paediatrician hands a brave child) and floating soft doodles.
 */

/** A gently wiggling reward sticker. Sits on photos/sections like a real badge. */
export function Sticker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`sticker-wiggle inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-card px-4 py-2.5 shadow-lg ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[var(--butter)]" aria-hidden>
        <path
          d="M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.3 6.2 19.8l1.6-6.6L2.6 8.8l6.8-.5z"
          fill="currentColor"
        />
      </svg>
      <span className="font-display text-sm leading-tight text-foreground">{children}</span>
    </div>
  );
}

/** Low-contrast hand-drawn doodles (stars, clouds, hearts) that float slowly behind a section. */
export function Doodles({ className = "" }: { className?: string }) {
  const star = "M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.3 6.2 19.8l1.6-6.6L2.6 8.8l6.8-.5z";
  const heart = "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z";
  const cloud = "M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1.4A3.5 3.5 0 0 0 7 18z";
  const items = [
    { d: star, cls: "left-[4%] top-[12%] h-6 w-6 text-[var(--butter)]", delay: "0s" },
    { d: cloud, cls: "left-[42%] top-[4%] h-12 w-12 text-primary/20", delay: "1.5s" },
    { d: heart, cls: "right-[6%] top-[58%] h-6 w-6 text-[var(--blush)]", delay: "0.8s" },
    { d: star, cls: "right-[30%] top-[8%] h-4 w-4 text-primary/30", delay: "2.2s" },
    { d: cloud, cls: "left-[8%] bottom-[10%] h-10 w-10 text-primary/15", delay: "3s" },
    { d: star, cls: "left-[52%] bottom-[6%] h-5 w-5 text-[var(--butter)]", delay: "1.1s" },
  ];
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {items.map((it, i) => (
        <svg key={i} viewBox="0 0 24 24" className={`doodle-float absolute ${it.cls}`} style={{ animationDelay: it.delay }}>
          <path d={it.d} fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}

/** Soft wave divider between sections. `fill` is a CSS color var. */
export function Wave({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 1440 60" preserveAspectRatio="none" className={`block h-8 w-full md:h-12 ${flip ? "rotate-180" : ""} ${className}`}>
      <path d="M0 30 C 240 60 480 0 720 30 S 1200 60 1440 30 V60 H0z" fill="currentColor" />
    </svg>
  );
}
