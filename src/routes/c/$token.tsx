import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { Logo, Footprint } from "@/components/Footprint";
import { getChildByToken } from "@/lib/parent.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/c/$token")({
  head: () => ({
    meta: [
      { title: "Your child's vaccine plan — DoseChain" },
      { name: "description", content: "Your child's private vaccine timeline at Nanhe Kadam Child Clinic." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChildPage,
});

function fmtDate(iso: string | null, lang: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ChildPage() {
  const { token } = Route.useParams();
  const { t, lang } = useLang();
  const { data, isLoading } = useQuery({
    queryKey: ["child", token],
    queryFn: () => getChildByToken({ data: { token } }),
  });

  if (isLoading)
    return (
      <Shell>
        <p className="py-20 text-center text-muted-foreground">{t.loading}</p>
      </Shell>
    );
  if (!data)
    return (
      <Shell>
        <p className="mx-auto max-w-md py-20 text-center text-muted-foreground">{t.notFound}</p>
      </Shell>
    );

  // group doses by visit date into a footprint trail
  const byDate = new Map<string, typeof data.doses>();
  for (const d of data.doses) {
    const key = d.givenOn ?? d.dueDate ?? "";
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(d);
  }
  const groups = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  const nextVisit = data.visits.find((v: (typeof data.visits)[number]) => v.status === "booked" || v.status === "confirmed");

  const statusStyle: Record<string, string> = {
    given: "bg-given/15 text-given",
    booked: "bg-booked/15 text-booked",
    planned: "bg-muted text-muted-foreground",
    skipped: "bg-muted text-muted-foreground line-through",
    given_elsewhere: "bg-given/15 text-given",
  };
  const statusLabel: Record<string, string> = {
    given: t.statusGiven,
    booked: t.statusBooked,
    planned: t.statusPlanned,
    given_elsewhere: t.statusGiven,
    skipped: t.statusMissed,
  };

  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-muted-foreground">{data.clinic?.clinic_name}</p>
        <h1 className="mt-1 font-display text-3xl">{data.child.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.childDob}: {fmtDate(data.child.dob, lang)}
        </p>

        {nextVisit && (
          <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-secondary/60 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">{t.nextVisit}</p>
            <p className="mt-1 font-display text-2xl">{fmtDate(nextVisit.day, lang)}</p>
            {nextVisit.slotLabel && (
              <p className="text-sm text-muted-foreground">{nextVisit.slotLabel}</p>
            )}
          </div>
        )}

        {/* footprint timeline */}
        <ol className="mt-8">
          {groups.map(([date, doses], i) => {
            const main = doses[0].status;
            return (
              <li key={date + i} className="relative flex gap-4 pb-7">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      main === "given" || main === "given_elsewhere"
                        ? "bg-given text-given-foreground"
                        : main === "booked"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    <Footprint flip={i % 2 === 1} className="h-5 w-5" />
                  </span>
                  {i < groups.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-semibold">{fmtDate(date, lang)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {doses.map((d: (typeof data.doses)[number]) => (
                      <span
                        key={d.code}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          statusStyle[d.status] ?? statusStyle["planned"],
                        )}
                      >
                        {data.catalogue[d.code]
                          ? lang === "hi"
                            ? data.catalogue[d.code].hi
                            : data.catalogue[d.code].en
                          : d.code}
                        {" · "}
                        {statusLabel[d.status] ?? d.status}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          {t.footerDisclaimer}
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" aria-label="DoseChain home">
          <Logo />
        </Link>
        <LangToggle />
      </header>
      {children}
    </div>
  );
}
