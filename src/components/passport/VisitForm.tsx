import { useState } from "react";
import { allergyConflicts } from "@/lib/allergy";

export interface VisitPayload {
  visitDate: string; doctorName: string; clinicName: string; symptoms: string; diagnosis: string; advice: string;
  followUpOn: string | null; isIllness: boolean; weightKg: number | null; heightCm: number | null; headCm: number | null;
  rx: { medicine: string; dose: string; frequency: string; days: number | null; remind: boolean }[];
}

const inp = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";
const num = (s: string) => (s.trim() === "" ? null : Number(s));

export function VisitForm({ mode, allergies, busy, onSubmit }: { mode: "clinic" | "parent"; allergies: string[]; busy: boolean; onSubmit: (v: VisitPayload) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ visitDate: today, doctorName: "", clinicName: "", symptoms: "", diagnosis: "", advice: "", followUpOn: "", isIllness: false, w: "", h: "", hc: "" });
  const [rx, setRx] = useState<{ medicine: string; dose: string; frequency: string; days: string; remind: boolean }[]>([]);
  const conflicts = rx.flatMap((r) => allergyConflicts(r.medicine, allergies).map((a) => `${r.medicine} ↔ ${a}`));
  const [ack, setAck] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (conflicts.length && !ack) return;
        onSubmit({
          visitDate: f.visitDate, doctorName: f.doctorName, clinicName: f.clinicName, symptoms: f.symptoms, diagnosis: f.diagnosis, advice: f.advice,
          followUpOn: f.followUpOn || null, isIllness: f.isIllness, weightKg: num(f.w), heightCm: num(f.h), headCm: num(f.hc),
          rx: rx.filter((r) => r.medicine.trim()).map((r) => ({ medicine: r.medicine, dose: r.dose, frequency: r.frequency, days: num(r.days), remind: r.remind })),
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">Visit date<input type="date" required max={today} value={f.visitDate} onChange={(e) => set("visitDate", e.target.value)} className={`${inp} mt-1`} /></label>
        {mode === "parent" && (
          <>
            <label className="text-sm font-medium">Doctor<input value={f.doctorName} onChange={(e) => set("doctorName", e.target.value)} className={`${inp} mt-1`} placeholder="Dr. …" /></label>
            <label className="text-sm font-medium">Clinic / hospital<input value={f.clinicName} onChange={(e) => set("clinicName", e.target.value)} className={`${inp} mt-1`} /></label>
          </>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Symptoms<textarea rows={2} value={f.symptoms} onChange={(e) => set("symptoms", e.target.value)} className={`${inp} mt-1`} /></label>
        <label className="text-sm font-medium">Diagnosis<textarea rows={2} value={f.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} className={`${inp} mt-1`} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isIllness} onChange={(e) => set("isIllness", e.target.checked)} className="h-4 w-4" /> Child is unwell (fever / infection){mode === "clinic" && <span className="text-muted-foreground"> — suggests moving a vaccine visit due this week</span>}</label>

      <div>
        <p className="mb-2 text-sm font-medium">Medicines</p>
        <div className="space-y-2">
          {rx.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl border border-border p-2 sm:grid-cols-[2fr_1fr_1.3fr_0.7fr_auto_auto]">
              <input aria-label="Medicine" placeholder="Medicine" value={r.medicine} onChange={(e) => setRx(rx.map((x, j) => (j === i ? { ...x, medicine: e.target.value } : x)))} className={`${inp} col-span-2 sm:col-span-1`} />
              <input aria-label="Dose" placeholder="Dose (5 ml)" value={r.dose} onChange={(e) => setRx(rx.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)))} className={inp} />
              <input aria-label="How often" placeholder="Twice a day" value={r.frequency} onChange={(e) => setRx(rx.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} className={inp} />
              <input aria-label="Days" type="number" min={0} max={90} placeholder="Days" value={r.days} onChange={(e) => setRx(rx.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)))} className={inp} />
              {mode === "clinic" ? (
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.remind} onChange={(e) => setRx(rx.map((x, j) => (j === i ? { ...x, remind: e.target.checked } : x)))} /> WhatsApp reminder</label>
              ) : <span />}
              <button type="button" aria-label="Remove medicine" onClick={() => setRx(rx.filter((_, j) => j !== i))} className="px-2 text-muted-foreground hover:text-destructive">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRx([...rx, { medicine: "", dose: "", frequency: "", days: "", remind: mode === "clinic" }])} className="mt-2 text-sm font-semibold text-primary hover:underline">+ Add medicine</button>
        {conflicts.length > 0 && (
          <div className="mt-3 rounded-2xl border-2 border-destructive bg-destructive/10 p-3 text-sm">
            <p className="font-semibold text-destructive">⚠ Allergy warning: {conflicts.join(", ")}</p>
            <label className="mt-1 flex items-center gap-2"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I've checked this and want to save anyway</label>
          </div>
        )}
      </div>

      <label className="block text-sm font-medium">Advice<textarea rows={2} value={f.advice} onChange={(e) => set("advice", e.target.value)} className={`${inp} mt-1`} /></label>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm font-medium">Weight (kg)<input type="number" step="0.01" min={0.5} max={60} value={f.w} onChange={(e) => set("w", e.target.value)} className={`${inp} mt-1`} /></label>
        <label className="text-sm font-medium">Height (cm)<input type="number" step="0.1" min={30} max={150} value={f.h} onChange={(e) => set("h", e.target.value)} className={`${inp} mt-1`} /></label>
        <label className="text-sm font-medium">Head (cm)<input type="number" step="0.1" min={25} max={60} value={f.hc} onChange={(e) => set("hc", e.target.value)} className={`${inp} mt-1`} /></label>
        {mode === "clinic" && <label className="text-sm font-medium">Follow-up on<input type="date" min={today} value={f.followUpOn} onChange={(e) => set("followUpOn", e.target.value)} className={`${inp} mt-1`} /></label>}
      </div>
      <button disabled={busy || (conflicts.length > 0 && !ack)} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : mode === "clinic" ? "Save visit & notify parent" : "Save visit"}</button>
    </form>
  );
}
