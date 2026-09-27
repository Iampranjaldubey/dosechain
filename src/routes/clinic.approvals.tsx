import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { decideApproval, listApprovals } from "@/lib/clinic.functions";
import { listStaffRequests, approveStaff } from "@/lib/clinic.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clinic/approvals")({ component: Approvals });

/* eslint-disable @typescript-eslint/no-explicit-any */
const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Approvals() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["approvals"], queryFn: () => listApprovals() });
  const decide = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => decideApproval({ data: v }),
    onSuccess: (_r, v) => { toast.success(v.approve ? "Approved — parent notified" : "Rejected"); void qc.invalidateQueries(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const pending = (data as any[]).filter((p) => p.status === "pending");
  const done = (data as any[]).filter((p) => p.status !== "pending");

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <StaffRequests />
      <h1 className="font-display text-4xl">Doctor approvals</h1>
      <p className="mt-1 text-muted-foreground">DoseChain suggests — the doctor confirms. Nothing changes for the parent until you approve.</p>
      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {!isLoading && pending.length === 0 && <p className="mt-8 rounded-2xl bg-muted p-6 text-center text-muted-foreground">All caught up — no changes waiting.</p>}
      <div className="mt-6 space-y-4">
        {pending.map((p) => <Card key={p.id} p={p} onDecide={(approve) => decide.mutate({ id: p.id, approve })} busy={decide.isPending} />)}
      </div>
      {done.length > 0 && (
        <>
          <h2 className="mt-12 font-display text-2xl">Recently decided</h2>
          <div className="mt-4 space-y-3 opacity-80">{done.slice(0, 10).map((p) => <Card key={p.id} p={p} />)}</div>
        </>
      )}
    </main>
  );
}

function Card({ p, onDecide, busy }: { p: any; onDecide?: (a: boolean) => void; busy?: boolean }) {
  const d = p.diff ?? {};
  return (
    <article className="rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{d.type === "bite" ? `Bite course · ${d.patient}` : `Vaccine plan · ${d.childName}`}</p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", p.status === "pending" ? "bg-accent text-accent-foreground" : p.status === "approved" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{p.status}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{p.reason}</p>
      <div className="mt-4 rounded-2xl bg-muted/60 p-4 text-sm">
        {d.type === "child" && (
          <>
            <p>Visit <b>{fmt(d.fromDay)}</b> → <b className="text-primary">{fmt(d.toDay)}</b></p>
            {(d.entries ?? []).length > 0 && (
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {d.entries.slice(0, 12).map((e: any) => <li key={e.dose} className="tabular-nums">{e.dose}: {fmt(e.oldDate)} → {fmt(e.newDate)}</li>)}
              </ul>
            )}
            <p className={cn("mt-2 font-semibold", d.stillOnTrack ? "text-primary" : "text-destructive")}>{d.stillOnTrack ? "✓ All minimum intervals kept — series stays on track" : "⚠ Some doses fall behind schedule — check before approving"}</p>
          </>
        )}
        {d.type === "bite" && (
          <ul className="space-y-1">
            {(d.changes ?? []).map((c: any) => <li key={c.doseId}>Day-{c.offset}: {fmt(c.oldDate)} → <b className="text-primary">{fmt(c.newDate)}</b></li>)}
            <li className="pt-1 font-semibold text-primary">✓ Gaps preserved from the dose actually given</li>
          </ul>
        )}
      </div>
      {onDecide && (
        <div className="mt-4 flex gap-2">
          <button disabled={busy} onClick={() => onDecide(true)} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">Approve & notify parent</button>
          <button disabled={busy} onClick={() => onDecide(false)} className="rounded-full border border-border px-5 py-2.5 text-sm">Reject</button>
        </div>
      )}
    </article>
  );
}

function StaffRequests() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["staffreq"], queryFn: () => listStaffRequests() });
  const act = useMutation({
    mutationFn: (v: { userId: string; approve: boolean }) => approveStaff({ data: v }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["staffreq"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  if (!data.length) return null;
  return (
    <section className="mb-8 rounded-3xl border border-accent bg-accent/10 p-6">
      <h2 className="font-display text-2xl">Staff asking for access</h2>
      <ul className="mt-3 space-y-2">
        {data.map((r) => (
          <li key={r.user_id} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex-1 font-medium">{r.email ?? r.user_id}</span>
            <button onClick={() => act.mutate({ userId: r.user_id, approve: true })} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Approve as desk</button>
            <button onClick={() => act.mutate({ userId: r.user_id, approve: false })} className="rounded-full border border-border px-3 py-1 text-xs">Decline</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
