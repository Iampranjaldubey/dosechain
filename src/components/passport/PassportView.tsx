import type { ReactNode } from "react";
import type { Passport } from "@/lib/health.server";
import { crossingAlert, MILESTONES, ageMonths } from "@/lib/growth";
import { GrowthChart } from "./GrowthChart";

export function fmtDay(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
export function ageLabel(dob: string) {
  const m = Math.floor(ageMonths(dob, new Date().toISOString().slice(0, 10)));
  if (m < 1) return "Newborn";
  if (m < 24) return `${m} month${m === 1 ? "" : "s"}`;
  return `${Math.floor(m / 12)} yr ${m % 12} mo`;
}

export function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SummaryCard({ p }: { p: Passport }) {
  const v = p.vaccines;
  return (
    <section className="rounded-3xl border-4 border-card bg-gradient-to-br from-secondary/40 to-card p-6 shadow-lg ring-2 ring-secondary/60">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Child Health Passport</p>
      <h1 className="mt-1 font-display text-3xl sm:text-4xl">{p.child.name}</h1>
      <p className="mt-1 text-muted-foreground">
        {ageLabel(p.child.dob)} · Born {fmtDay(p.child.dob)}
        {p.child.sex ? ` · ${p.child.sex.toLowerCase().startsWith("f") ? "Girl" : "Boy"}` : ""}
        {p.profile.bloodGroup ? ` · Blood group ${p.profile.bloodGroup}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {p.profile.allergies.map((a) => (
          <span key={a} className="rounded-full bg-destructive px-3 py-1 text-sm font-semibold text-destructive-foreground">⚠ Allergy: {a}</span>
        ))}
        {p.profile.conditions.map((c) => (
          <span key={c} className="rounded-full border-2 border-destructive/60 bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">{c}</span>
        ))}
        {p.profile.allergies.length === 0 && <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">No known allergies recorded</span>}
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${v.overdue ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
          {v.overdue ? `${v.overdue} vaccine${v.overdue > 1 ? "s" : ""} overdue` : "Vaccines up to date"} · {v.given}/{v.total} given
        </span>
      </div>
      {p.clinic && <p className="mt-4 text-sm text-muted-foreground">Home clinic: {p.clinic.clinic_name}, {p.clinic.city} · {p.clinic.doctor_name} · {p.clinic.phone}</p>}
    </section>
  );
}

export function VisitsList({ p }: { p: Passport }) {
  if (!p.visits.length) return <p className="text-sm text-muted-foreground">No visits recorded yet.</p>;
  return (
    <ol className="relative space-y-4 border-l-2 border-dashed border-secondary pl-5">
      {p.visits.map((v) => (
        <li key={v.id} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{fmtDay(v.date)}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.source === "clinic" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
              {v.source === "clinic" ? "✓ Verified by clinic" : "Added by parent"}
            </span>
            {v.isIllness && <span className="rounded-full bg-accent/40 px-2 py-0.5 text-xs font-semibold">Illness</span>}
          </div>
          <p className="text-sm text-muted-foreground">{[v.doctor, v.clinic].filter(Boolean).join(" · ")}</p>
          {v.diagnosis && <p className="mt-1"><span className="font-medium">Diagnosis:</span> {v.diagnosis}</p>}
          {v.symptoms && <p className="text-sm"><span className="font-medium">Symptoms:</span> {v.symptoms}</p>}
          {v.rx.length > 0 && (
            <div className="mt-2 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-3 py-1.5">Medicine</th><th className="px-3 py-1.5">Dose</th><th className="px-3 py-1.5">How often</th><th className="px-3 py-1.5">Days</th></tr>
                </thead>
                <tbody>
                  {v.rx.map((r, i) => (
                    <tr key={i} className="border-t border-border"><td className="px-3 py-1.5 font-medium">{r.medicine}</td><td className="px-3 py-1.5">{r.dose ?? "—"}</td><td className="px-3 py-1.5">{r.frequency ?? "—"}</td><td className="px-3 py-1.5">{r.days ?? "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {v.advice && <p className="mt-1 text-sm"><span className="font-medium">Advice:</span> {v.advice}</p>}
          {v.followUpOn && <p className="text-sm text-muted-foreground">Follow-up: {fmtDay(v.followUpOn)}</p>}
        </li>
      ))}
    </ol>
  );
}

export function GrowthSection({ p }: { p: Passport }) {
  const w = p.growth.filter((g) => g.weight).map((g) => ({ on: g.on, value: g.weight! }));
  const h = p.growth.filter((g) => g.height).map((g) => ({ on: g.on, value: g.height! }));
  const alerts = [
    ["weight", crossingAlert("weight", p.child.sex, p.child.dob, w)],
    ["height", crossingAlert("height", p.child.sex, p.child.dob, h)],
  ] as const;
  return (
    <div className="space-y-6">
      {alerts.map(([k, a]) => a && (
        <p key={k} className="rounded-2xl border border-accent bg-accent/20 px-4 py-3 text-sm">
          <strong>Worth discussing with your doctor:</strong> {k} has moved from about the {a.from}th to the {a.to}th percentile. This is a screening hint, not a diagnosis.
        </p>
      ))}
      {w.length === 0 && h.length === 0 ? (
        <p className="text-sm text-muted-foreground">No measurements yet.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <GrowthChart measure="weight" sex={p.child.sex} dob={p.child.dob} points={w} />
          <GrowthChart measure="height" sex={p.child.sex} dob={p.child.dob} points={h} />
        </div>
      )}
      {p.growth.some((g) => g.head) && (
        <p className="text-sm text-muted-foreground">Head circumference: {p.growth.filter((g) => g.head).map((g) => `${g.head} cm (${fmtDay(g.on)})`).join(", ")}</p>
      )}
    </div>
  );
}

export function MilestoneList({ p, onToggle }: { p: Passport; onToggle?: (code: string, on: boolean) => void }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {MILESTONES.map((m) => {
        const done = p.milestones[m.code];
        return (
          <li key={m.code} className="flex items-center gap-3 rounded-2xl border border-border px-3 py-2">
            <input type="checkbox" aria-label={m.en} checked={!!done} disabled={!onToggle} onChange={(e) => onToggle?.(m.code, e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{m.en} <span className="text-muted-foreground">· {m.hi}</span></p>
              <p className="text-xs text-muted-foreground">{done ? `Achieved ${fmtDay(done)}` : `Usually by ~${m.month} months`}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function VaccineTable({ p }: { p: Passport }) {
  const rows = p.vaccines.rows;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No vaccine plan yet.</p>;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
          <tr><th className="px-3 py-2">Vaccine</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Where / batch</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const given = r.status === "given" || r.status === "given_elsewhere";
            const overdue = !given && r.status !== "skipped" && r.dueDate && r.dueDate < today;
            return (
              <tr key={r.code} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{p.vaccines.labels[r.code]?.en ?? r.code}</td>
                <td className="px-3 py-2">{given ? "✓ Given" : overdue ? <span className="font-semibold text-destructive">Overdue</span> : r.status === "skipped" ? "Skipped" : "Due"}</td>
                <td className="px-3 py-2">{fmtDay(given ? r.givenOn : r.dueDate)}</td>
                <td className="px-3 py-2 text-muted-foreground">{[r.where, r.batch].filter(Boolean).join(" · ") || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const KIND: Record<string, string> = { lab: "Lab report", discharge: "Discharge summary", vaccine_card: "Vaccine card", prescription: "Prescription", scan: "Scan / X-ray", other: "Document" };
export function DocList({ p }: { p: Passport }) {
  if (!p.documents.length) return <p className="text-sm text-muted-foreground">No reports uploaded yet.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {p.documents.map((d) => (
        <li key={d.id}>
          <a href={d.url ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-border px-3 py-2 hover:bg-muted">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/50 text-lg">📄</span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{d.title || KIND[d.kind]}</span>
              <span className="block text-xs text-muted-foreground">{KIND[d.kind]} · {fmtDay(d.docDate)} · {d.source === "clinic" ? "Clinic" : "Parent"}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
