import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getBriefing, getRiskRadar, nudgeHighRisk, getDashboard, giveBiteDose, runAutomationsNow, setDemoClock, setVisitStatus } from "@/lib/clinic.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clinic/")({ component: Today });

/* eslint-disable @typescript-eslint/no-explicit-any */
const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Today() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["dash"], queryFn: () => getDashboard() });
  const refresh = () => qc.invalidateQueries();
  const run = useMutation({
    mutationFn: () => runAutomationsNow(),
    onSuccess: (r) => { toast.success(`Sent ${r.reminders + r.biteReminders} reminders · ${r.rescues} bite rescues`); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const clock = useMutation({ mutationFn: (days: number | null) => setDemoClock({ data: { days } }), onSuccess: refresh });
  const visit = useMutation({ mutationFn: (v: { id: string; status: "checked_in" | "done" | "missed" }) => setVisitStatus({ data: v }), onSuccess: refresh });
  const give = useMutation({ mutationFn: (doseId: string) => giveBiteDose({ data: { doseId } }), onSuccess: () => { toast.success("Dose recorded"); refresh(); } });

  if (isLoading || !data) return <p className="p-10 text-center text-muted-foreground">Loading today…</p>;
  const today = data.today;
  const missed = (data.bites as any[]).flatMap((b) => (b.bite_doses as any[]).filter((d) => d.status !== "given" && d.due_date < today).map((d) => ({ ...d, b })));
  const vial = (data.vials as any[])[0];
  const vialLive = vial && new Date(vial.expires_at) > new Date(data.now);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Brain />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{data.demoClock ? "Demo clock" : "Today"}</p>
          <h1 className="font-display text-4xl">{fmt(today)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => clock.mutate(-1)} className="rounded-full border border-border px-3 py-2 text-sm">− 1 day</button>
          <button onClick={() => clock.mutate(1)} className="rounded-full border border-border px-3 py-2 text-sm">+ 1 day</button>
          {data.demoClock && <button onClick={() => clock.mutate(null)} className="rounded-full border border-border px-3 py-2 text-sm">Reset clock</button>}
          <button onClick={() => run.mutate()} disabled={run.isPending} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {run.isPending ? "Running…" : "Run reminders & watchdog"}
          </button>
        </div>
      </div>

      {data.pendingCount > 0 && (
        <Link to="/clinic/approvals" className="mt-6 flex items-center justify-between rounded-2xl border border-accent bg-accent/15 px-5 py-4">
          <span className="font-semibold">{data.pendingCount} plan change{data.pendingCount > 1 ? "s" : ""} waiting for the doctor</span>
          <span className="text-sm text-primary">Review →</span>
        </Link>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Staff time saved (4 wks)" value={`${Math.round(data.impact.minutes / 60)} h`} strong />
        <Stat label="Reminders sent" value={data.impact.reminders} />
        <Stat label="Auto-confirmed · vial doses saved" value={`${data.impact.confirms} · ${data.impact.vialDoses}`} />
        <Stat label="Re-plans & rescues" value={data.impact.replans} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl">Today's visits</h2>
          {(data.visits as any[]).length === 0 && <p className="mt-4 text-sm text-muted-foreground">No visits booked for this day.</p>}
          <ul className="mt-4 divide-y divide-border">
            {(data.visits as any[]).map((v) => {
              const name = v.children?.name ?? v.bite_cases?.patient_name ?? "—";
              const token = v.children?.public_token ?? v.bite_cases?.public_token;
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-16 text-sm tabular-nums text-muted-foreground">{v.slot_label ?? "—"}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", v.kind === "bite" ? "bg-destructive/15 text-destructive" : "bg-secondary text-secondary-foreground")}>{v.kind === "bite" ? "Bite" : "Vaccine"}</span>
                  <span className="flex-1 font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">{v.status.replace("_", " ")}</span>
                  {token && <a href={`/wa/${token}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">Chat</a>}
                  {v.kind === "vaccine" && v.status !== "done" && (
                    <>
                      {v.status !== "checked_in" && <button onClick={() => visit.mutate({ id: v.id, status: "checked_in" })} className="rounded-full border border-border px-3 py-1 text-xs">Check in</button>}
                      <button onClick={() => visit.mutate({ id: v.id, status: "done" })} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Mark given</button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Shared vial</h2>
            {vialLive ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">Batch {vial.batch_no} · expires {new Date(vial.expires_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}</p>
                <div className="mt-4 flex gap-1.5">
                  {Array.from({ length: vial.sites_total }).map((_, i) => (
                    <span key={i} className={cn("h-8 flex-1 rounded-md", i < vial.sites_used ? "bg-primary" : "bg-muted")} />
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold">{vial.sites_total - vial.sites_used} of {vial.sites_total} doses left in this vial</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No open vial. One opens automatically with the next bite dose.</p>
            )}
          </div>

          <div className={cn("rounded-3xl border p-6", missed.length ? "border-destructive/40 bg-destructive/5" : "border-border bg-card")}>
            <h2 className="font-display text-2xl">Bite watchdog</h2>
            {missed.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No missed rabies doses. 🎉</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {missed.map((m) => (
                  <li key={m.id} className="text-sm"><b>{m.b.patient_name}</b> missed day-{m.day_offset} ({fmt(m.due_date)}). Run the watchdog to send a rescue message and propose new dates.</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Bite lane — active courses</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(data.bites as any[]).map((b) => {
            const doses = [...(b.bite_doses as any[])].sort((x, y) => x.day_offset - y.day_offset);
            const next = doses.find((d) => d.status !== "given");
            return (
              <div key={b.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{b.patient_name} <span className="font-normal text-muted-foreground">· {b.age_years}y · Cat {b.category} {b.animal}</span></p>
                  <a href={`/wa/${b.public_token}`} target="_blank" rel="noreferrer" className="text-xs text-primary">Chat</a>
                </div>
                <div className="mt-3 flex gap-2">
                  {doses.map((d) => (
                    <span key={d.id} title={d.due_date} className={cn("flex-1 rounded-lg px-2 py-1.5 text-center text-xs font-semibold", d.status === "given" ? "bg-primary text-primary-foreground" : d.due_date < today ? "bg-destructive/15 text-destructive" : d.due_date === today ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
                      D{d.day_offset}
                    </span>
                  ))}
                </div>
                {next && (
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Next: day-{next.day_offset} · {fmt(next.due_date)}</span>
                    {next.due_date <= today && <button onClick={() => give.mutate(next.id)} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Give dose</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-5", strong ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
      <p className={cn("text-sm", strong ? "opacity-85" : "text-muted-foreground")}>{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}

function Brain() {
  const qc = useQueryClient();
  const brief = useQuery({ queryKey: ["brief"], queryFn: () => getBriefing(), staleTime: 5 * 60_000 });
  const risk = useQuery({ queryKey: ["risk"], queryFn: () => getRiskRadar() });
  const nudge = useMutation({
    mutationFn: () => nudgeHighRisk(),
    onSuccess: (r) => { toast.success(`Sent ${r.sent} WhatsApp nudges — no calls needed`); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = risk.data ?? [];
  const high = rows.filter((r) => r.level === "high").length;
  const tone: Record<string, string> = { high: "bg-destructive/15 text-destructive", medium: "bg-accent/25 text-foreground", low: "bg-secondary text-secondary-foreground" };
  return (
    <section className="grid gap-4 lg:grid-cols-5">
      <div className="rounded-3xl bg-primary p-6 text-primary-foreground lg:col-span-2">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Morning briefing{brief.data?.ai ? " · AI" : ""}</p>
        {brief.isLoading ? <p className="mt-3 animate-pulse opacity-80">Reading today's schedule…</p> : (
          <p className="mt-3 whitespace-pre-line leading-relaxed">{brief.data?.text ?? "Briefing unavailable."}</p>
        )}
        <button onClick={() => brief.refetch()} className="mt-4 text-xs underline opacity-80">Refresh</button>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl">No-show radar</h2>
            <p className="text-sm text-muted-foreground">Next 3 days · transparent score, reasons shown</p>
          </div>
          <button onClick={() => nudge.mutate()} disabled={!high || nudge.isPending} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {nudge.isPending ? "Sending…" : `Nudge ${high} high-risk`}
          </button>
        </div>
        {risk.isLoading && <p className="mt-4 text-sm text-muted-foreground">Scoring…</p>}
        {!risk.isLoading && rows.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Nobody at risk. 🎉</p>}
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 text-sm">
              <span className={cn("w-12 shrink-0 rounded-full py-0.5 text-center text-xs font-bold tabular-nums", tone[r.level])}>{r.score}</span>
              <span className="min-w-0 flex-1 truncate"><b>{r.kind === "bite" ? "🐕 " : ""}{r.name}</b> <span className="text-muted-foreground">· {r.reasons.join(" · ")}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
