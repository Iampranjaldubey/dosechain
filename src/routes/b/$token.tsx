import { ParentShell } from "@/components/ParentShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { Logo, Footprint } from "@/components/Footprint";
import { getBiteCaseByToken } from "@/lib/parent.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/b/$token")({
  head: () => ({
    meta: [
      { title: "Your rabies vaccine course — DoseChain" },
      { name: "description", content: "Private rabies bite-course tracker at Nanhe Kadam Child Clinic." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BitePage,
});

function fmtDate(iso: string | null, lang: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function BitePage() {
  const { token } = Route.useParams();
  const { t, lang } = useLang();
  const { data, isLoading } = useQuery({
    queryKey: ["bite", token],
    queryFn: () => getBiteCaseByToken({ data: { token } }),
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

  const given = data.doses.filter((d: (typeof data.doses)[number]) => d.status === "given").length;
  const total = data.doses.length;
  const pct = total > 0 ? Math.round((given / total) * 100) : 0;

  const statusStyle: Record<string, string> = {
    given: "bg-given text-given-foreground",
    booked: "bg-primary text-primary-foreground",
    planned: "bg-secondary text-secondary-foreground",
    skipped: "bg-overdue text-overdue-foreground",
  };

  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-muted-foreground">{data.clinic?.clinic_name}</p>
        <h1 className="mt-1 font-display text-3xl">{t.biteCourseTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.case.patientName} · {data.case.animal} · {lang === "hi" ? "श्रेणी" : "Category"}{" "}
          {data.case.category} · {data.regimen ? (lang === "hi" ? data.regimen.labelHi : data.regimen.labelEn) : ""}
        </p>

        {/* progress */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-2xl">
              {given}/{total}
            </p>
            <p className="text-sm font-semibold text-primary">{pct}% {t.biteProgress}</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-given transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* dose trail */}
        <ol className="mt-8">
          {data.doses.map((d: (typeof data.doses)[number], i: number) => (
            <li key={d.offset} className="relative flex gap-4 pb-7">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    statusStyle[d.status] ?? statusStyle["planned"],
                  )}
                >
                  <Footprint flip={i % 2 === 1} className="h-5 w-5" />
                </span>
                {i < data.doses.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="pt-1">
                <p className="text-sm font-semibold">
                  {t.biteDay} {d.offset} · {fmtDate(d.dueDate, lang)}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {d.status === "given"
                    ? t.statusGiven
                    : d.status === "booked"
                      ? t.statusBooked
                      : d.status === "skipped"
                        ? t.statusMissed
                        : t.statusPlanned}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border-2 border-changed/50 bg-changed/10 p-5">
          <p className="text-sm leading-relaxed text-foreground">{t.biteMissedInfo}</p>
        </div>

        <p className="mt-6 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          {t.footerDisclaimer}
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const hi = useLang().lang === "hi";
  return <ParentShell eyebrow={hi?"रेबीज़ कोर्स":"Rabies course"}>{children}</ParentShell>;
}
