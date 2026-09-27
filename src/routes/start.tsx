import { PhoneInput } from "@/components/PhoneInput";
import { isValidMobile } from "@/lib/validation";
import { ParentShell } from "@/components/ParentShell";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { Footprint } from "@/components/Footprint";
import { startChild } from "@/lib/parent.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start your child's vaccine plan — DoseChain · Nanhe Kadam Child Clinic" },
      {
        name: "description",
        content:
          "New here? Create your child's profile in two minutes and book the first visit at Nanhe Kadam Child Clinic, Indore.",
      },
      { property: "og:title", content: "Start your child's vaccine plan — DoseChain" },
      { property: "og:description", content: "Two minutes to set up, then pick your first visit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StartPage,
});

function StartPage() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"girl" | "boy">("girl");
  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

  const valid =
    childName.trim().length > 0 && dob !== "" && dob <= today && parentName.trim().length > 0 && isValidMobile(phone);

  async function go() {
    setBusy(true);
    setErr("");
    try {
      const res = await startChild({
        data: {
          childName: childName.trim(),
          dob,
          sex,
          history: [],
          parentName: parentName.trim(),
          phone: `+91${phone}`,
          lang,
        },
      });
      await nav({ to: "/book", search: { child: res.token } });
    } catch {
      setErr(t.retry);
      setBusy(false);
    }
  }

  return (
    <ParentShell eyebrow={lang === "hi" ? "नया यहाँ?" : "New here?"}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-given/15">
              <Footprint className="h-6 w-6 text-given" />
            </span>
            <h1 className="mt-4 font-display text-3xl">{t.startTitle}</h1>
            <p className="mt-2 text-muted-foreground">{t.startSub}</p>
          </div>
          <LangToggle />
        </div>

        <div className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t.stepParent}</p>
          <Field label={t.parentName}>
            <input
              value={parentName}
                  maxLength={80}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label={t.parentPhone}>
            <PhoneInput value={phone} onChange={setPhone} required />
          </Field>

          <p className="pt-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t.stepChild}</p>
          <Field label={t.childName}>
            <input
              value={childName}
                  maxLength={80}
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
              onChange={(e) => setDob(e.target.value)}
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
                    sex === s ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-secondary",
                  )}
                >
                  {s === "girl" ? t.sexGirl : t.sexBoy}
                </button>
              ))}
            </div>
          </Field>

          {err && <p className="text-sm font-semibold text-overdue">{err}</p>}
          <button
            type="button"
            onClick={go}
            disabled={!valid || busy}
            className="min-h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {busy ? t.loading : t.startCta}
          </button>
        </div>
        <ReturningCard />
      </div>
    </ParentShell>
  );
}

function ReturningCard() {
  const { lang } = useLang();
  const hi = lang === "hi";
  return (
    <Link to="/family" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 hover:bg-secondary/40">
      <span>
        <span className="block font-display text-xl">{hi ? "पहले बुकिंग कर चुके हैं?" : "Booked with us before?"}</span>
        <span className="text-sm text-muted-foreground">{hi ? "पैरेंट लॉगिन करें — सभी बच्चे, विज़िट और संदेश एक जगह।" : "Sign in to your parent account — all your children, visits and messages in one place."}</span>
      </span>
      <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{hi ? "लॉगिन" : "Parent login"}</span>
    </Link>
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
