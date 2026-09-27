import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { Logo, Footprint } from "@/components/Footprint";
import heroImg from "@/assets/hero.jpg";
import { Doodles, Sticker, Wave } from "@/components/KidVibe";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DoseChain — Nanhe Kadam Child Clinic, Indore" },
      {
        name: "description",
        content:
          "Book once and your child's entire vaccine series is planned — WhatsApp reminders, safe rescheduling, and a rabies bite-course lane. Nanhe Kadam Child Clinic, Vijay Nagar, Indore.",
      },
      { property: "og:title", content: "DoseChain — Nanhe Kadam Child Clinic" },
      {
        property: "og:description",
        content:
          "Book once — every dose, on time. Series auto-booking, fever-day reshuffles, and a rabies bite-course lane for a solo pediatric clinic in Indore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

/** Fades content in when it scrolls into view. */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className ?? ""}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function Index() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-background">
      {/* sticky glass header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">{t.navHow}</a>
            <a href="#bite" className="transition-colors hover:text-foreground">{t.navBite}</a>
            <a href="#visit" className="transition-colors hover:text-foreground">{t.navVisit}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link
              to="/start"
              className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md sm:px-5 sm:text-sm"
            >
              {t.bookVaccine}
            </Link>
          </div>
        </div>
      </header>

      {/* split hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-10 md:grid-cols-2 md:pt-16">
        <Doodles />
        <Reveal>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground">
            <Footprint className="h-3.5 w-3.5" />
            {t.clinicName} · {t.clinicTagline}
          </p>
          <h1 className="font-display text-4xl leading-[1.15] tracking-tight md:text-[3.4rem]">{t.heroTitle}</h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">{t.heroSub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/start"
              className="inline-flex min-h-12 items-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg"
            >
              {t.bookVaccine}
            </Link>
            <a
              href="#bite"
              className="inline-flex min-h-12 items-center rounded-full border-2 border-overdue/60 px-7 text-base font-semibold text-overdue transition-all hover:-translate-y-0.5 hover:bg-overdue/10"
            >
              {t.dogBiteCta}
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t.heroMicro}</p>
          {/* trust chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {[t.trustIap, t.trustWho, t.trustLang].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
          {/* footprint trail */}
          <div className="footprint-drift mt-10 flex items-center gap-3 text-primary/40" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <Footprint key={i} flip={i % 2 === 1} className="h-4 w-4" />
            ))}
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="relative">
            <div className="blob-soft absolute -inset-5 -z-10 bg-secondary/70" aria-hidden />
            <div className="absolute -right-2 -top-8 z-10 sm:-right-6 sm:-top-10">
              <Sticker>{t.stickerHero}</Sticker>
            </div>
            <img
              src={heroImg}
              alt="A mother carrying her baby along a trail of footprints toward Nanhe Kadam Child Clinic"
              width={1024}
              height={1024}
              className="w-full rounded-3xl border border-border shadow-xl"
            />
            {/* floating next-visit card */}
            <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg sm:-bottom-5 sm:left-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-booked text-booked-foreground">
                <Footprint className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-xs font-semibold">{t.nextVisit}</p>
                <p className="text-xs text-muted-foreground">{t.bookedBody}</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* stats band */}
      <Wave className="text-card" />
      <section className="bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <Reveal>
            <h2 className="font-display text-2xl text-muted-foreground md:text-3xl">{t.statTitle}</h2>
          </Reveal>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Reveal delay={100}>
              <div className="h-full rounded-2xl bg-secondary/60 p-7 transition-shadow hover:shadow-md">
                <p className="font-display text-5xl text-primary">57%</p>
                <p className="mt-3 text-sm leading-relaxed text-foreground md:text-base">{t.statRabies}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t.statRabiesSource}</p>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="h-full rounded-2xl bg-secondary/60 p-7 transition-shadow hover:shadow-md">
                <p className="font-display text-5xl text-primary">71.8%</p>
                <p className="mt-3 text-sm leading-relaxed text-foreground md:text-base">{t.statDoses}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t.statDosesSource}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* how it works — connected steps */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl"><span className="crayon-underline">{t.howTitle}</span></h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{t.howIntro}</p>
        </Reveal>
        <div className="relative mt-10 grid gap-8 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-5 hidden border-t-2 border-dashed border-primary/25 md:block" aria-hidden />
          {[
            { title: t.how1Title, body: t.how1Body, n: 1 },
            { title: t.how2Title, body: t.how2Body, n: 2 },
            { title: t.how3Title, body: t.how3Body, n: 3 },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="relative rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground shadow-sm">
                  {s.n}
                </span>
                <h3 className="mt-4 font-display text-xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* bite emergency */}
      <section id="bite" className="scroll-mt-20 border-t border-border bg-overdue/5">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:items-center">
          <Reveal>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-overdue px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-overdue-foreground">
              {t.biteUrgent}
            </p>
            <h2 className="font-display text-3xl text-overdue md:text-4xl">{t.biteFirstAidTitle}</h2>
            <ol className="mt-7 space-y-5">
              {[t.biteFirstAid1, t.biteFirstAid2, t.biteFirstAid3].map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-overdue text-sm font-bold text-overdue-foreground shadow-sm">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-foreground md:text-base">{s}</p>
                </li>
              ))}
            </ol>
            <a
              href="tel:+919876543210"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-overdue px-8 text-base font-semibold text-overdue-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              {t.biteCtaCall}
            </a>
          </Reveal>
          <Reveal delay={150}>
            <div className="rounded-3xl border border-overdue/20 bg-card p-7 shadow-md">
              <p className="font-display text-xl">{t.visitBite}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t.visitBiteHours}</p>
              <div className="my-5 border-t border-dashed border-border" />
              <p className="font-display text-xl">{t.visitOpd}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t.visitOpdHours}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* visit us */}
      <section id="visit" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-8 text-primary-foreground md:flex-row md:items-center md:p-12">
            <div>
              <h2 className="font-display text-3xl md:text-4xl">{t.visitTitle}</h2>
              <p className="mt-3 text-sm opacity-90 md:text-base">{t.visitAddress}</p>
              <p className="mt-1 text-sm opacity-90">{t.visitOpdHours}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="tel:+919876543210"
                className="inline-flex min-h-12 items-center rounded-full bg-primary-foreground px-7 text-base font-semibold text-primary transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {t.visitCall}
              </a>
              <Link
                to="/start"
                className="inline-flex min-h-12 items-center rounded-full border-2 border-primary-foreground/50 px-7 text-base font-semibold transition-all hover:-translate-y-0.5 hover:bg-primary-foreground/10"
              >
                {t.bookVaccine}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
          <Logo />
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-right">
            {t.footerDisclaimer}
          </p>
        </div>
        <div className="border-t border-border/60">
          <p className="mx-auto max-w-6xl px-4 py-4 text-center text-[11px] text-muted-foreground/70">
            © 2026 Nanhe Kadam Child Clinic · Vijay Nagar, Indore
          </p>
        </div>
      </footer>
    </div>
  );
}
