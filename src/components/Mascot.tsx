import type { ReactNode } from "react";

/**
 * "Nanhu" — a gentle baby-elephant guide. Soft, rounded and calm so it reads
 * as child-friendly to parents without making the clinic feel like a toy.
 * The small plaster on the ear is a quiet nod to vaccines.
 */
export function Mascot({ className = "h-24 w-24", wave = false }: { className?: string; wave?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className={`${className} mascot-bob`} role="img" aria-label="Nanhu the baby elephant">
      {/* ears */}
      <ellipse cx="26" cy="56" rx="22" ry="26" className="fill-[var(--mascot-ear)]" />
      <ellipse cx="94" cy="56" rx="22" ry="26" className="fill-[var(--mascot-ear)]" />
      <ellipse cx="28" cy="58" rx="13" ry="16" className="fill-[var(--blush)]" opacity="0.55" />
      <ellipse cx="92" cy="58" rx="13" ry="16" className="fill-[var(--blush)]" opacity="0.55" />
      {/* plaster on ear */}
      <g transform="rotate(-25 98 40)">
        <rect x="88" y="36" width="20" height="8" rx="4" className="fill-[var(--butter)]" />
        <circle cx="96" cy="40" r="0.9" className="fill-[var(--mascot-line)]" />
        <circle cx="100" cy="40" r="0.9" className="fill-[var(--mascot-line)]" />
      </g>
      {/* body hint */}
      <ellipse cx="60" cy="108" rx="26" ry="12" className="fill-[var(--mascot-body)]" />
      {/* head */}
      <circle cx="60" cy="56" r="34" className="fill-[var(--mascot-body)]" />
      {/* trunk */}
      <path
        d="M60 66 C 58 82, 62 94, 72 96 C 78 97, 80 91, 75 89 C 70 88, 68 84, 69 74"
        className="fill-[var(--mascot-body)] stroke-[var(--mascot-line)]"
        strokeWidth="0"
      />
      {/* eyes */}
      <ellipse cx="47" cy="52" rx="4" ry="5" className="fill-[var(--mascot-line)]" />
      <ellipse cx="73" cy="52" rx="4" ry="5" className="fill-[var(--mascot-line)]" />
      <circle cx="48.4" cy="50.3" r="1.4" className="fill-card" />
      <circle cx="74.4" cy="50.3" r="1.4" className="fill-card" />
      {/* cheeks */}
      <ellipse cx="40" cy="64" rx="6" ry="3.5" className="fill-[var(--blush)]" />
      <ellipse cx="80" cy="64" rx="6" ry="3.5" className="fill-[var(--blush)]" />
      {/* smile */}
      <path d="M53 68 Q 60 73 67 68" fill="none" className="stroke-[var(--mascot-line)]" strokeWidth="2" strokeLinecap="round" />
      {/* tuft */}
      <path d="M56 23 q 4 -8 8 0" fill="none" className="stroke-[var(--mascot-line)]" strokeWidth="2" strokeLinecap="round" />
      {wave && (
        <g className="mascot-wave" style={{ transformOrigin: "90px 104px" }}>
          <ellipse cx="94" cy="96" rx="7" ry="10" className="fill-[var(--mascot-body)]" transform="rotate(30 94 96)" />
        </g>
      )}
    </svg>
  );
}

/** Mascot with a soft speech bubble — used for friendly guidance lines. */
export function MascotSays({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <Mascot className="h-16 w-16 shrink-0" />
      <div className="relative mb-3 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 text-sm leading-snug shadow-sm">
        {children}
      </div>
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
    { d: cloud, cls: "left-[42%] top-[4%] h-12 w-12 text-[var(--mascot-ear)] opacity-60", delay: "1.5s" },
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
