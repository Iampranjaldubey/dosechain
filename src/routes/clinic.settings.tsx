import { isValidMobile, mobileDigits } from "@/lib/validation";
import { PhoneInput } from "@/components/PhoneInput";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useClinic } from "@/lib/clinic-context";
import { addStaff, getClinicProfile, listTeam, removeStaff, saveClinicProfile } from "@/lib/clinic.functions";

export const Route = createFileRoute("/clinic/settings")({
  head: () => ({
    meta: [
      { title: "Clinic settings — DoseChain" },
      { name: "description", content: "Manage your clinic team, opening hours, bite-clinic windows and holidays." },
      { property: "og:title", content: "Clinic settings — DoseChain" },
      { property: "og:description", content: "Team, hours and holidays for your clinic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const DAYS = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"],
  ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
] as const;
type Week = Record<string, [string, string][]>;
const input = "rounded-xl border border-input bg-background px-3 py-2 text-sm";

function SettingsPage() {
  const { clinicId, role } = useClinic();
  const isDoctor = role === "doctor";
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl">Clinic settings</h1>
        <p className="text-muted-foreground">Your team, opening hours and holidays. Weekly demand lives in the <Link to="/clinic/capacity" className="underline">Capacity planner</Link>.</p>
        {!isDoctor && <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm">Only the clinic doctor can make changes here. You can view everything.</p>}
      </header>
      <Team clinicId={clinicId} isDoctor={isDoctor} />
      <Profile clinicId={clinicId} isDoctor={isDoctor} />
    </div>
  );
}

function Team({ clinicId, isDoctor }: { clinicId: string; isDoctor: boolean }) {
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ["team", clinicId], queryFn: () => listTeam({ data: { clinicId } }) });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"desk" | "doctor">("desk");
  const add = useMutation({
    mutationFn: () => addStaff({ data: { clinicId, email, role } }),
    onSuccess: (r) => {
      if (r.result === "not_found") toast.error("No account with that email yet. Ask them to sign up at the staff sign-in page first, then add them here.");
      else { toast.success("Staff member added"); setEmail(""); }
      void qc.invalidateQueries({ queryKey: ["team", clinicId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeStaff({ data: { clinicId, userId } }),
    onSuccess: () => { toast.success("Removed"); void qc.invalidateQueries({ queryKey: ["team", clinicId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-xl">Team</h2>
      <ul className="mt-4 divide-y divide-border">
        {(team.data ?? []).map((s) => (
          <li key={s.user_id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{s.email}</p>
              <p className="text-xs text-muted-foreground">{s.role === "doctor" ? "Doctor" : "Desk staff"}</p>
            </div>
            {isDoctor && (
              <button onClick={() => confirm(`Remove ${s.email}?`) && remove.mutate(s.user_id)} className="text-sm text-destructive hover:underline">Remove</button>
            )}
          </li>
        ))}
        {team.isLoading && <li className="py-3 text-sm text-muted-foreground">Loading…</li>}
      </ul>
      {isDoctor && (
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <input type="email" required placeholder="staff@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} min-w-56 flex-1`} />
          <select value={role} onChange={(e) => setRole(e.target.value as "desk" | "doctor")} className={input}>
            <option value="desk">Desk staff</option>
            <option value="doctor">Doctor</option>
          </select>
          <button disabled={add.isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Add staff</button>
        </form>
      )}
    </section>
  );
}

function WeekEditor({ value, onChange, disabled }: { value: Week; onChange: (w: Week) => void; disabled: boolean }) {
  const set = (d: string, r: [string, string][]) => onChange({ ...value, [d]: r });
  return (
    <div className="divide-y divide-border">
      {DAYS.map(([d, label]) => {
        const ranges = value[d] ?? [];
        return (
          <div key={d} className="flex flex-wrap items-center gap-2 py-2.5">
            <span className="w-24 text-sm font-medium">{label}</span>
            {ranges.length === 0 && <span className="text-sm text-muted-foreground">Closed</span>}
            {ranges.map((r, i) => (
              <span key={i} className="flex items-center gap-1">
                <input type="time" disabled={disabled} value={r[0]} onChange={(e) => set(d, ranges.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} className={input} />
                <span className="text-muted-foreground">–</span>
                <input type="time" disabled={disabled} value={r[1]} onChange={(e) => set(d, ranges.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} className={input} />
                {!disabled && <button type="button" aria-label="Remove session" onClick={() => set(d, ranges.filter((_, j) => j !== i))} className="px-1 text-muted-foreground hover:text-destructive">✕</button>}
              </span>
            ))}
            {!disabled && ranges.length < 4 && (
              <button type="button" onClick={() => set(d, [...ranges, ["10:00", "13:00"]])} className="text-sm text-primary hover:underline">+ Add session</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Profile({ clinicId, isDoctor }: { clinicId: string; isDoctor: boolean }) {
  const q = useQuery({ queryKey: ["profile", clinicId], queryFn: () => getClinicProfile({ data: { clinicId } }) });
  const [f, setF] = useState({ clinic_name: "", doctor_name: "", city: "", phone: "" });
  const [opd, setOpd] = useState<Week>({});
  const [bite, setBite] = useState<Week>({});
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHol, setNewHol] = useState("");
  useEffect(() => {
    const s = q.data;
    if (!s) return;
    setF({ clinic_name: s.clinic_name ?? "", doctor_name: s.doctor_name ?? "", city: s.city ?? "", phone: s.phone ?? "" });
    setOpd(s.opd_hours ?? {});
    setBite(s.bite_windows ?? {});
    setHolidays(s.holidays ?? []);
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => {
      for (const w of [opd, bite]) for (const rs of Object.values(w)) for (const [a, b] of rs) if (a >= b) throw new Error("Each session must end after it starts.");
      return saveClinicProfile({ data: { clinicId, ...f, opd_hours: opd as never, bite_windows: bite as never, holidays } });
    },
    onSuccess: () => toast.success("Clinic settings saved"),
    onError: (e: Error) => toast.error(e.message),
  });
  const dis = !isDoctor;
  if (q.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-8">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-xl">Clinic details</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {([["clinic_name", "Clinic name", 120], ["doctor_name", "Doctor's name", 80], ["city", "Area / city", 80]] as const).map(([k, l, max]) => (
            <label key={k} className="text-sm font-medium">{l}
              <input disabled={dis} maxLength={max} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={`${input} mt-1 w-full`} />
            </label>
          ))}
          <div className="text-sm font-medium">Phone
            <div className="mt-1"><PhoneInput disabled={dis} value={f.phone} onChange={(d) => setF({ ...f, phone: d })} /></div>
          </div>
        </div>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-xl">Vaccination hours</h2>
        <p className="text-sm text-muted-foreground">Parents can only book inside these sessions.</p>
        <WeekEditor value={opd} onChange={setOpd} disabled={dis} />
      </section>
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-xl">Dog-bite (rabies) windows</h2>
        <p className="text-sm text-muted-foreground">Short windows so one opened vial serves several patients.</p>
        <WeekEditor value={bite} onChange={setBite} disabled={dis} />
      </section>
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-xl">Holidays</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {holidays.length === 0 && <span className="text-sm text-muted-foreground">No holidays set.</span>}
          {[...holidays].sort().map((h) => (
            <span key={h} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
              {new Date(h + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              {!dis && <button type="button" aria-label="Remove holiday" onClick={() => setHolidays(holidays.filter((x) => x !== h))} className="text-muted-foreground hover:text-destructive">✕</button>}
            </span>
          ))}
        </div>
        {!dis && (
          <div className="mt-3 flex gap-2">
            <input type="date" value={newHol} onChange={(e) => setNewHol(e.target.value)} className={input} />
            <button type="button" onClick={() => { if (newHol && !holidays.includes(newHol)) setHolidays([...holidays, newHol]); setNewHol(""); }} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Add holiday</button>
          </div>
        )}
      </section>
      {isDoctor && (
        <div className="sticky bottom-4 flex justify-end">
          <button disabled={save.isPending} className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg disabled:opacity-60">{save.isPending ? "Saving…" : "Save settings"}</button>
        </div>
      )}
    </form>
  );
}
