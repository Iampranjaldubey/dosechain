import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo, Footprint } from "@/components/Footprint";
import { LangToggle } from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

/** Shared frame for every parent-facing page: sticky glass header, soft brand band, footer. */
export function ParentShell({ children, eyebrow }: { children: ReactNode; eyebrow?: string }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-secondary/70 to-transparent" />
      <Footprint aria-hidden className="pointer-events-none absolute right-[8%] top-24 hidden h-10 w-10 rotate-12 text-mint/50 md:block" />
      <Footprint aria-hidden className="pointer-events-none absolute right-[14%] top-40 hidden h-8 w-8 -rotate-6 text-mint/40 md:block" />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" aria-label="DoseChain home"><Logo /></Link>
          {eyebrow && <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground sm:inline">{eyebrow}</span>}
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link to="/book" className="hidden rounded-full px-3 py-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex">{hi ? "टीका बुक करें" : "Book"}</Link>
            <a href="/#bite" className="hidden rounded-full px-3 py-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex">{hi ? "कुत्ते ने काटा?" : "Bite help"}</a>
            <LangToggle />
          </nav>
        </div>
      </header>
      <main className="relative flex-1">{children}</main>
      <footer className="relative mt-16 border-t border-border bg-card/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Nanhe Kadam Child Clinic · Vijay Nagar, Indore</span>
          <span>{hi ? "IAP-ACVIP 2023 व NCDC रेबीज़ दिशानिर्देश · डॉक्टर हर योजना की पुष्टि करते हैं" : "IAP-ACVIP 2023 & NCDC rabies guidelines · the doctor confirms every plan"}</span>
        </div>
      </footer>
    </div>
  );
}
