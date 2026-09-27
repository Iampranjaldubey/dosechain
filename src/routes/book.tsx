import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { Logo, Footprint } from "@/components/Footprint";
import { getBookingCatalogue, createBooking } from "@/lib/parent.functions";
import { buildPlan, addDays, diffDays, dow, type EngineSettings, type GivenDose } from "@/lib/dosechain";
import { readVaccineCard } from "@/lib/media.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book vaccines — DoseChain · Nanhe Kadam Child Clinic" },
      {
        name: "description",
        content:
          "Book your child's vaccines at Nanhe Kadam Child Clinic, Indore. One booking plans the whole series up to age 6.",
      },
      { property: "og:title", content: "Book vaccines — DoseChain" },
      { property: "og:description", content: "One booking plans your child's whole vaccine series." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookPage,
});

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function todayIst(): string {
  return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

function fmtDate(iso: string, lang: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

interface HistoryItem {
  code: string;
  givenOn: string;
  where: "clinic" | "govt";
}

function BookPage() {
  const { t, lang } = useLang();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking-catalogue"],
    queryFn: () => getBookingCatalogue(),
  });

  const [step, setStep] = useState(0);
  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"girl" | "boy">("girl");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [slotDate, setSlotDate] = useState("");
  const [slotLabel, setSlotLabel] = useState("");
  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [bookedToken, setBookedToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const today = todayIst();

  const eng: EngineSettings | null = useMemo(() => {
    if (!data) return null;
    const opdDays: number[] = [];
    WEEKDAYS.forEach((name, i) => {
      if ((data.settings.opdHours[name] ?? []).length > 0) opdDays.push(i);
    });
    return {
      opdDays,
      holidays: data.settings.holidays ?? [],
      rotaBrand: data.settings.rotaBrand,
      hepaType: data.settings.hepaType,
    };
  }, [data]);

  const plan = useMemo(() => {
    if (!data || !eng || !dob) return [];
    return buildPlan(
      dob,
      history.map((h) => ({ code: h.code, givenOn: h.givenOn }) satisfies GivenDose),
      data.catalogue.map((d: (typeof data.catalogue)[number]) => ({
        code: d.code,
        series: d.series,
        recAgeD: d.recAgeD,
        minAgeD: d.minAgeD,
        minGapPrevD: d.minGapPrevD,
        isLive: d.isLive,
      })),
      eng,
      today,
    );
  }, [data, eng, dob, history, today]);

  // doses eligible to mark as "already given" (child is old enough)
  const eligibleHistory = useMemo(() => {
    if (!data || !dob) return [];
    const ageD = diffDays(today, dob);
    return data.catalogue.filter((d: (typeof data.catalogue)[number]) => d.minAgeD <= ageD && d.recAgeD <= ageD + 14);
  }, [data, dob, today]);

  // next 14 bookable OPD days
  const slotDays = useMemo(() => {
    if (!data || !eng) return [];
    const out: { date: string; slots: string[] }[] = [];
    for (let i = 0; i < 21 && out.length < 10; i++) {
      const d = addDays(today, i);
      const wins = data.settings.opdHours[WEEKDAYS[dow(d)] ?? "sun"] ?? [];
      if (wins.length === 0 || eng.holidays.includes(d)) continue;
      out.push({ date: d, slots: wins.map((w: [string, string]) => `${w[0]}–${w[1]}`) });
    }
    return out;
  }, [data, eng, today]);

  if (isLoading)
    return <Shell>{<p className="py-20 text-center text-muted-foreground">{t.loading}</p>}</Shell>;
  if (isError || !data)
    return (
      <Shell>
        <p className="py-20 text-center text-overdue">{t.retry}</p>
      </Shell>
    );

  if (bookedToken) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-given/15">
            <Footprint className="h-8 w-8 text-given" />
          </div>
          <h1 className="mt-5 font-display text-3xl">{t.bookedTitle}</h1>
          <p className="mt-3 text-muted-foreground">{t.bookedBody}</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/c/$token"
              params={{ token: bookedToken }}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t.viewTimeline}
            </Link>
            <Link to="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
              DoseChain
            </Link>
          </div>
          <p className="mt-6 rounded-xl bg-secondary/70 p-3 text-xs text-secondary-foreground">
            Save this page's link — it's your child's private timeline, no login needed.
          </p>
        </div>
      </Shell>
    );
  }

  const steps = [t.stepChild, t.stepHistory, t.stepPlan, t.stepSlot, t.stepParent];
  const canNext =
    step === 0
      ? childName.trim().length > 0 && dob !== "" && dob <= today
      : step === 3
        ? slotDate !== "" && slotLabel !== ""
        : true;

  async function submit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await createBooking({
        data: {
          childName: childName.trim(),
          dob,
          sex,
          history,
          parentName: parentName.trim(),
          phone: phone.trim(),
          lang,
          slotDate,
          slotLabel,
        },
      });
      setBookedToken(res.token);
    } catch {
      setSubmitError(t.retry);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl">{t.bookTitle}</h1>

        {/* stepper */}
        <ol className="mt-6 flex items-center gap-1" aria-hidden>
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-1">
              <span
                className={cn(
                  "h-2 flex-1 rounded-full",
                  i < step ? "bg-given" : i === step ? "bg-primary" : "bg-border",
                )}
              />
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm font-semibold text-primary">
          {step + 1}/5 · {steps[step]}
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          {step === 0 && (
            <div className="space-y-5">
              <Field label={t.childName}>
                <input
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Aarav"
                />
              </Field>
              <Field label={t.childDob}>
                <input
                  type="date"
                  value={dob}
                  max={today}
                  onChange={(e) => {
                    setDob(e.target.value);
                    setHistory([]);
                  }}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <Field label={t.childSex}>
                <div className="flex gap-2">
                  {(["girl", "boy"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(s)}
                      className={cn(
                        "min-h-11 flex-1 rounded-xl border px-4 text-sm font-semibold transition-colors",
                        sex === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-secondary",
                      )}
                    >
                      {s === "girl" ? t.sexGirl : t.sexBoy}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div>
              <CardScanner dob={dob} lang={lang} onRead={(doses) => {
                const merged = [...history];
                for (const d of doses) if (!merged.some((h) => h.code === d.code)) merged.push({ code: d.code, givenOn: d.givenOn, where: "govt" });
                setHistory(merged);
              }} />
              <p className="mt-4 text-sm text-muted-foreground">{t.historyHint}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {eligibleHistory.map((d: (typeof data.catalogue)[number]) => {
                  const checked = history.some((h) => h.code === d.code);
                  return (
                    <label
                      key={d.code}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                        checked ? "border-given bg-given/10" : "border-input hover:bg-secondary/60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setHistory([
                              ...history,
                              { code: d.code, givenOn: addDays(dob, d.recAgeD), where: "govt" },
                            ]);
                          } else {
                            setHistory(history.filter((h) => h.code !== d.code));
                          }
                        }}
                        className="h-4 w-4 accent-[oklch(0.55_0.11_155)]"
                      />
                      <span className="font-medium">{lang === "hi" ? d.labelHi : d.labelEn}</span>
                    </label>
                  );
                })}
              </div>
              {eligibleHistory.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">—</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              {plan.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.loading}</p>
              ) : (
                <ol className="relative space-y-0">
                  {plan.slice(0, 8).map((v, i) => (
                    <li key={i} className="relative flex gap-4 pb-6">
                      {/* footprint trail */}
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full",
                            v.status === "due"
                              ? "bg-overdue/15 text-overdue"
                              : i === 0
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground",
                          )}
                        >
                          <Footprint flip={i % 2 === 1} className="h-4.5 w-4.5" />
                        </span>
                        {i < Math.min(plan.length, 8) - 1 && (
                          <span className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-semibold">
                          {fmtDate(v.date, lang)}
                          {v.status === "due" && (
                            <span className="ml-2 rounded-full bg-overdue/15 px-2 py-0.5 text-xs font-bold text-overdue">
                              {t.dueNow}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {v.doses
                            .map((c) => {
                              const d = data.catalogue.find((x: (typeof data.catalogue)[number]) => x.code === c);
                              return d ? (lang === "hi" ? d.labelHi : d.labelEn) : c;
                            })
                            .join(" · ")}
                        </p>
                      </div>
                    </li>
                  ))}
                  {plan.length > 8 && (
                    <li className="pl-13 text-sm text-muted-foreground">+{plan.length - 8}…</li>
                  )}
                </ol>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm text-muted-foreground">{t.pickSlot}</p>
              <div className="mt-4 space-y-3">
                {slotDays.map((d) => (
                  <div key={d.date} className="flex flex-wrap items-center gap-2">
                    <span className="w-28 text-sm font-semibold">{fmtDate(d.date, lang)}</span>
                    {d.slots.map((s) => {
                      const active = slotDate === d.date && slotLabel === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSlotDate(d.date);
                            setSlotLabel(s);
                          }}
                          className={cn(
                            "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input hover:bg-secondary",
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <Field label={t.parentName}>
                <input
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <Field label={t.parentPhone}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="+91 …"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              {submitError && <p className="text-sm font-semibold text-overdue">{submitError}</p>}
            </div>
          )}
        </div>

        {/* nav */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="min-h-11 rounded-full px-5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            {t.back}
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => canNext && setStep(step + 1)}
              disabled={!canNext}
              className="min-h-11 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {t.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || parentName.trim() === "" || phone.trim().length < 8}
              className="min-h-11 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {submitting ? t.loading : t.confirmBooking}
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
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

function CardScanner({ dob, lang, onRead }: { dob: string; lang: string; onRead: (d: { code: string; givenOn: string }[]) => void }) {
  const hi = lang === "hi";
  const [state, setState] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function onFile(f: File | undefined) {
    if (!f) return;
    if (!dob) { setState("error"); setMsg(hi ? "पहले जन्म तिथि भरें" : "Enter the date of birth first"); return; }
    setState("reading");
    const img = await new Promise<string>((res) => {
      const i = new Image(); const url = URL.createObjectURL(f);
      i.onload = () => { const k = Math.min(1, 1400 / Math.max(i.width, i.height)); const c = document.createElement("canvas"); c.width = i.width * k; c.height = i.height * k; c.getContext("2d")!.drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.85)); };
      i.src = url;
    });
    try {
      const r = await readVaccineCard({ data: { image: img, dob } });
      if (!r.ok || r.doses.length === 0) { setState("error"); setMsg(r.notes || (hi ? "कार्ड पढ़ नहीं सके — नीचे टिक करें" : "Couldn't read the card — tick the doses below.")); return; }
      onRead(r.doses); setState("done");
      const low = r.doses.filter((d) => d.confidence === "low").length;
      setMsg(hi ? `${r.doses.length} टीके मिले — नीचे जाँच लें।` : `Found ${r.doses.length} doses${low ? ` (${low} unclear)` : ""} — please check the ticks below.`);
    } catch { setState("error"); setMsg(hi ? "कार्ड पढ़ नहीं सके — नीचे टिक करें" : "Couldn't read the card — tick the doses below."); }
  }
  return (
    <label className={cn("flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition-colors", state === "done" ? "border-given bg-given/10" : "border-primary/40 bg-secondary/40 hover:bg-secondary")}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-xl text-primary-foreground">{state === "reading" ? "…" : "📷"}</span>
      <span className="min-w-0">
        <span className="block font-semibold">{state === "reading" ? (hi ? "कार्ड पढ़ रहे हैं…" : "Reading the card…") : hi ? "टीका कार्ड की फ़ोटो लें" : "Snap the vaccination card"}</span>
        <span className={cn("block text-sm", state === "error" ? "text-destructive" : "text-muted-foreground")}>{msg || (hi ? "AI पुराने टीके अपने-आप भर देगा — आप जाँच लें" : "AI fills in past doses for you — you confirm")}</span>
      </span>
      <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={state === "reading"} onChange={(e) => onFile(e.target.files?.[0])} />
    </label>
  );
}
