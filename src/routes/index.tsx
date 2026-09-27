import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { Logo, Footprint } from "@/components/Footprint";
import heroImg from "@/assets/hero.jpg";

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

function Index() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-background">
      {/* header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <LangToggle />
          <Link
            to="/book"
            className="hidden min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
          >
            {t.bookVaccine}
          </Link>
        </div>
      </header>

      {/* split hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-2 md:pt-12">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <Footprint className="h-3.5 w-3.5" />
            {t.clinicName} · {t.clinicTagline}
          </p>
          <h1 className="font-display text-4xl leading-tight md:text-5xl">{t.heroTitle}</h1>
          <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">{t.heroSub}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/book"
              className="inline-flex min-h-12 items-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {t.bookVaccine}
            </Link>
            <a
              href="#bite"
              className="inline-flex min-h-12 items-center rounded-full border-2 border-overdue/60 px-7 text-base font-semibold text-overdue transition-colors hover:bg-overdue/10"
            >
              {t.dogBiteCta}
            </a>
          </div>
          {/* footprint trail divider */}
          <div className="mt-10 flex items-center gap-3 text-primary/50" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <Footprint key={i} flip={i % 2 === 1} className="h-4 w-4" />
            ))}
          </div>
        </div>
        <div className="relative">
          <img
            src={heroImg}
            alt="A mother carrying her baby along a trail of footprints toward Nanhe Kadam Child Clinic"
            width={1024}
            height={1024}
            className="w-full rounded-3xl border border-border shadow-lg"
          />
        </div>
      </section>

      {/* stats */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-2">
          <div className="rounded-2xl bg-secondary/60 p-6">
            <p className="font-display text-4xl text-primary">57%</p>
            <p className="mt-2 text-sm text-foreground">{t.statRabies}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.statRabiesSource}</p>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-6">
            <p className="font-display text-4xl text-primary">71.8%</p>
            <p className="mt-2 text-sm text-foreground">{t.statDoses}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.statDosesSource}</p>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl">{t.howTitle}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { title: t.how1Title, body: t.how1Body, n: 1 },
            { title: t.how2Title, body: t.how2Body, n: 2 },
            { title: t.how3Title, body: t.how3Body, n: 3 },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                {s.n}
              </span>
              <h3 className="mt-4 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* bite first aid */}
      <section id="bite" className="border-t border-border bg-overdue/5">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl text-overdue">{t.biteFirstAidTitle}</h2>
          <ol className="mt-6 max-w-2xl space-y-4">
            {[t.biteFirstAid1, t.biteFirstAid2, t.biteFirstAid3].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-overdue text-sm font-bold text-overdue-foreground">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground md:text-base">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <Logo />
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {t.footerDisclaimer}
          </p>
        </div>
      </footer>
    </div>
  );
}
