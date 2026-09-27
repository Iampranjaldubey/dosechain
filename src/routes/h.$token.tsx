import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ParentShell } from "@/components/ParentShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, DocList, GrowthSection, MilestoneList, SummaryCard, VaccineTable, VisitsList, fmtDay } from "@/components/passport/PassportView";
import { VisitForm, type VisitPayload } from "@/components/passport/VisitForm";
import {
  addGrowthReading, addParentVisit, amIStaffFor, createShareLink, getPassport, readReportPhoto, revokeShareLink,
  saveHealthProfile, setMilestone, staffRecordVisit, uploadHealthDoc,
} from "@/lib/health.functions";

export const Route = createFileRoute("/h/$token")({
  head: () => ({
    meta: [
      { title: "Child Health Passport — DoseChain" },
      { name: "description", content: "Every vaccine, visit, prescription, allergy, growth reading and report for your child in one place, shareable with any doctor." },
      { property: "og:title", content: "Child Health Passport — DoseChain" },
      { property: "og:description", content: "Your child's full health history, ready to show any doctor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PassportPage,
});

const TABS = [["overview", "Overview"], ["visits", "Visits & medicines"], ["growth", "Growth"], ["vaccines", "Vaccines"], ["reports", "Reports"], ["share", "Share with doctor"]] as const;
type Tab = (typeof TABS)[number][0];
const inp = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

function PassportPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const q = useQuery({ queryKey: ["passport", token], queryFn: () => getPassport({ data: { token } }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["passport", token] });
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) amIStaffFor({ data: { token } }).then((r) => setStaff(r.staff)).catch(() => {});
    });
  }, [token]);

  if (q.isLoading) return <ParentShell eyebrow="Health passport"><p className="py-20 text-center text-muted-foreground">Loading…</p></ParentShell>;
  const p = q.data;
  if (!p) return <ParentShell eyebrow="Health passport"><p className="py-20 text-center">This link isn't valid.</p></ParentShell>;

  return (
    <ParentShell eyebrow="Health passport">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 print:max-w-none print:py-0">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Link to="/c/$token" params={{ token }} className="text-sm text-muted-foreground hover:text-foreground">← Vaccine plan</Link>
          <div className="flex gap-2">
            {staff && <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Clinic staff view</span>}
            <button onClick={() => window.print()} className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-semibold">Print doctor summary</button>
          </div>
        </div>
        <SummaryCard p={p} />

        <nav className="sticky top-16 z-20 -mx-4 flex gap-1 overflow-x-auto bg-background/80 px-4 py-2 backdrop-blur print:hidden" role="tablist">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>{l}</button>
          ))}
        </nav>

        <div className="hidden space-y-6 print:block">
          <Card title="Recent visits & medicines"><VisitsList p={{ ...p, visits: p.visits.slice(0, 5) }} /></Card>
          <Card title="Growth"><GrowthSection p={p} /></Card>
          <Card title="Vaccines"><VaccineTable p={p} /></Card>
        </div>

        <div className="space-y-6 print:hidden">
          {tab === "overview" && (
            <>
              {staff && <StaffVisit token={token} allergies={p.profile.allergies} onDone={refresh} />}
              <ProfileEditor token={token} p={p} onSaved={refresh} />
              <Card title="Latest visit"><VisitsList p={{ ...p, visits: p.visits.slice(0, 1) }} /></Card>
            </>
          )}
          {tab === "visits" && (
            <>
              {staff && <StaffVisit token={token} allergies={p.profile.allergies} onDone={refresh} />}
              <Card title="Visit history"><VisitsList p={p} /></Card>
              {!staff && <ParentVisit token={token} allergies={p.profile.allergies} onDone={refresh} />}
            </>
          )}
          {tab === "growth" && (
            <>
              <Card title="Growth charts"><GrowthSection p={p} /></Card>
              <AddGrowth token={token} onDone={refresh} />
              <Card title="Milestones">
                <MilestoneList p={p} onToggle={async (code, on) => { await setMilestone({ data: { token, code, achievedOn: on ? new Date().toISOString().slice(0, 10) : null } }); void refresh(); }} />
              </Card>
            </>
          )}
          {tab === "vaccines" && <Card title="Vaccination record" action={<Link to="/cert/$token" params={{ token }} className="text-sm font-semibold text-primary hover:underline">Certificate →</Link>}><VaccineTable p={p} /></Card>}
          {tab === "reports" && (<><Card title="Reports & documents"><DocList p={p} /></Card><Upload token={token} onDone={refresh} /></>)}
          {tab === "share" && <Share token={token} p={p} onChange={refresh} />}
        </div>
      </div>
    </ParentShell>
  );
}

function ProfileEditor({ token, p, onSaved }: { token: string; p: NonNullable<Awaited<ReturnType<typeof getPassport>>>; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ blood: p.profile.bloodGroup ?? "", allergies: p.profile.allergies.join(", "), conditions: p.profile.conditions.join(", "), bw: p.profile.birthWeightKg?.toString() ?? "", notes: p.profile.notes ?? "" });
  const m = useMutation({
    mutationFn: () => saveHealthProfile({ data: {
      token, bloodGroup: f.blood || null, allergies: f.allergies.split(",").map((s) => s.trim()).filter(Boolean), conditions: f.conditions.split(",").map((s) => s.trim()).filter(Boolean),
      birthWeightKg: f.bw ? Number(f.bw) : null, notes: f.notes || null,
    } }),
    onSuccess: () => { toast.success("Health details saved"); setOpen(false); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card title="Health details" action={<button onClick={() => setOpen(!open)} className="text-sm font-semibold text-primary hover:underline">{open ? "Cancel" : "Edit"}</button>}>
      {!open ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Blood group</dt><dd className="font-medium">{p.profile.bloodGroup ?? "Not recorded"}</dd></div>
          <div><dt className="text-muted-foreground">Birth weight</dt><dd className="font-medium">{p.profile.birthWeightKg ? `${p.profile.birthWeightKg} kg` : "Not recorded"}</dd></div>
          <div><dt className="text-muted-foreground">Allergies</dt><dd className="font-medium">{p.profile.allergies.join(", ") || "None known"}</dd></div>
          <div><dt className="text-muted-foreground">Ongoing conditions</dt><dd className="font-medium">{p.profile.conditions.join(", ") || "None"}</dd></div>
          {p.profile.notes && <div className="sm:col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{p.profile.notes}</dd></div>}
        </dl>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Blood group
            <select value={f.blood} onChange={(e) => setF({ ...f, blood: e.target.value })} className={`${inp} mt-1`}>
              <option value="">Not known</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Birth weight (kg)<input type="number" step="0.01" min={0.3} max={7} value={f.bw} onChange={(e) => setF({ ...f, bw: e.target.value })} className={`${inp} mt-1`} /></label>
          <label className="text-sm font-medium">Allergies (comma separated)<input value={f.allergies} onChange={(e) => setF({ ...f, allergies: e.target.value })} placeholder="Penicillin, peanuts" className={`${inp} mt-1`} /></label>
          <label className="text-sm font-medium">Ongoing conditions<input value={f.conditions} onChange={(e) => setF({ ...f, conditions: e.target.value })} placeholder="Asthma" className={`${inp} mt-1`} /></label>
          <label className="text-sm font-medium sm:col-span-2">Notes<textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={`${inp} mt-1`} /></label>
          <button disabled={m.isPending} className="w-fit rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground">Save</button>
        </form>
      )}
    </Card>
  );
}

function StaffVisit({ token, allergies, onDone }: { token: string; allergies: string[]; onDone: () => void }) {
  const [k, setK] = useState(0);
  const m = useMutation({
    mutationFn: (v: VisitPayload) => staffRecordVisit({ data: { token, ...v } }),
    onSuccess: (r) => { toast.success(`Visit saved${r.extras.length ? " · " + r.extras.join(" · ") : ""}`); setK(k + 1); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return <Card title="Record visit (clinic)"><VisitForm key={k} mode="clinic" allergies={allergies} busy={m.isPending} onSubmit={(v) => m.mutate(v)} /></Card>;
}

function ParentVisit({ token, allergies, onDone }: { token: string; allergies: string[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const m = useMutation({
    mutationFn: (v: VisitPayload) => addParentVisit({ data: { token, ...v, followUpOn: null } }),
    onSuccess: () => { toast.success("Visit added"); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card title="Saw another doctor?" action={<button onClick={() => setOpen(!open)} className="text-sm font-semibold text-primary hover:underline">{open ? "Cancel" : "+ Add visit"}</button>}>
      {open ? <VisitForm mode="parent" allergies={allergies} busy={m.isPending} onSubmit={(v) => m.mutate(v)} /> : <p className="text-sm text-muted-foreground">Add visits from other doctors or hospitals. They'll be marked "Added by parent".</p>}
    </Card>
  );
}

function AddGrowth({ token, onDone }: { token: string; onDone: () => void }) {
  const [f, setF] = useState({ on: new Date().toISOString().slice(0, 10), w: "", h: "", hc: "" });
  const n = (s: string) => (s ? Number(s) : null);
  const m = useMutation({
    mutationFn: () => addGrowthReading({ data: { token, on: f.on, weightKg: n(f.w), heightCm: n(f.h), headCm: n(f.hc) } }),
    onSuccess: () => { toast.success("Measurement added"); setF({ ...f, w: "", h: "", hc: "" }); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card title="Add a measurement">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid items-end gap-3 sm:grid-cols-5">
        <label className="text-sm font-medium">Date<input type="date" value={f.on} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, on: e.target.value })} className={`${inp} mt-1`} /></label>
        <label className="text-sm font-medium">Weight (kg)<input type="number" step="0.01" min={0.5} max={60} value={f.w} onChange={(e) => setF({ ...f, w: e.target.value })} className={`${inp} mt-1`} /></label>
        <label className="text-sm font-medium">Height (cm)<input type="number" step="0.1" min={30} max={150} value={f.h} onChange={(e) => setF({ ...f, h: e.target.value })} className={`${inp} mt-1`} /></label>
        <label className="text-sm font-medium">Head (cm)<input type="number" step="0.1" min={25} max={60} value={f.hc} onChange={(e) => setF({ ...f, hc: e.target.value })} className={`${inp} mt-1`} /></label>
        <button disabled={m.isPending} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">Add</button>
      </form>
    </Card>
  );
}

function Upload({ token, onDone }: { token: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ kind: "lab" as "lab" | "discharge" | "vaccine_card" | "prescription" | "scan" | "other", title: "", date: "" });
  const [busy, setBusy] = useState(false);
  const toB64 = (fl: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(fl); });
  const pick = async (fl: File | null) => {
    setFile(fl);
    if (fl && fl.type.startsWith("image/") && fl.size < 8_000_000) {
      const got = await readReportPhoto({ data: { token, dataUrl: await toB64(fl) } }).catch(() => ({}) as Record<string, string>);
      const g = got as { kind?: string; title?: string; date?: string | null };
      setF((cur) => ({
        kind: (["lab", "discharge", "vaccine_card", "prescription", "scan", "other"].includes(g.kind ?? "") ? g.kind : cur.kind) as typeof cur.kind,
        title: g.title || cur.title, date: g.date && /^\d{4}-\d{2}-\d{2}$/.test(g.date) ? g.date : cur.date,
      }));
    }
  };
  const submit = async () => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("File is larger than 10 MB");
    setBusy(true);
    try {
      const dataUrl = await toB64(file);
      await uploadHealthDoc({ data: { token, kind: f.kind, title: f.title || null, docDate: f.date || null, mime: file.type as "image/jpeg", base64: dataUrl.split(",")[1] ?? "" } });
      toast.success("Report uploaded");
      setFile(null); setF({ kind: "lab", title: "", date: "" });
      onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Card title="Upload a report">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">Photo or PDF (max 10 MB)
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => void pick(e.target.files?.[0] ?? null)} className={`${inp} mt-1`} />
        </label>
        <label className="text-sm font-medium">Type
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as typeof f.kind })} className={`${inp} mt-1`}>
            <option value="lab">Lab report</option><option value="discharge">Discharge summary</option><option value="prescription">Prescription</option>
            <option value="vaccine_card">Vaccine card</option><option value="scan">Scan / X-ray</option><option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm font-medium">Report date<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={`${inp} mt-1`} /></label>
        <label className="text-sm font-medium sm:col-span-2">Title<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. CBC blood test" className={`${inp} mt-1`} /></label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Photos are read automatically to fill in the type and date. Please check them.</p>
      <button onClick={submit} disabled={!file || busy} className="mt-3 rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Uploading…" : "Upload"}</button>
    </Card>
  );
}

function Share({ token, p, onChange }: { token: string; p: NonNullable<Awaited<ReturnType<typeof getPassport>>>; onChange: () => void }) {
  const [hours, setHours] = useState<1 | 24 | 168>(24);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const create = useMutation({
    mutationFn: () => createShareLink({ data: { token, hours } }),
    onSuccess: (r) => { setLink({ url: `${window.location.origin}/p/${r.shareToken}`, expiresAt: r.expiresAt }); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const revoke = useMutation({ mutationFn: (linkId: string) => revokeShareLink({ data: { token, linkId } }), onSuccess: () => { toast.success("Link turned off"); onChange(); } });
  const now = Date.now();
  return (
    <>
      <Card title="Show a new doctor">
        <p className="text-sm text-muted-foreground">Create a QR code. Any doctor can scan it to see {p.child.name}'s full record, read-only. Clinics on DoseChain can also add the child to their own records.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {([1, 24, 168] as const).map((h) => (
            <button key={h} onClick={() => setHours(h)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${hours === h ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{h === 1 ? "1 hour" : h === 24 ? "24 hours" : "7 days"}</button>
          ))}
          <button onClick={() => create.mutate()} disabled={create.isPending} className="rounded-xl bg-accent px-5 py-2 font-semibold text-accent-foreground">Create QR</button>
        </div>
        {link && (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl border-4 border-dashed border-secondary p-6 sm:flex-row sm:items-start">
            <div className="rounded-2xl bg-card p-3 shadow"><QRCodeSVG value={link.url} size={176} /></div>
            <div className="min-w-0 space-y-2 text-center sm:text-left">
              <p className="font-semibold">Show this to the doctor</p>
              <p className="text-sm text-muted-foreground">Works until {new Date(link.expiresAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</p>
              <p className="break-all rounded-xl bg-muted px-3 py-2 text-xs">{link.url}</p>
              <button onClick={() => { void navigator.clipboard.writeText(link.url); toast.success("Link copied"); }} className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold">Copy link</button>
            </div>
          </div>
        )}
      </Card>
      <Card title="Who has opened your links">
        {p.shares.length === 0 ? <p className="text-sm text-muted-foreground">No links created yet.</p> : (
          <ul className="divide-y divide-border">
            {p.shares.map((s) => {
              const active = !s.revokedAt && new Date(s.expiresAt).getTime() > now;
              return (
                <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium">Created {fmtDay(s.createdAt.slice(0, 10))} · {active ? <span className="text-primary">Active</span> : s.revokedAt ? "Turned off" : "Expired"}</p>
                    <p className="text-xs text-muted-foreground">{s.views.length ? s.views.map((v) => `${v.viewer ?? "Viewed"} ${new Date(v.at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" })}`).join(" · ") : "Not opened yet"}</p>
                  </div>
                  {active && <button onClick={() => revoke.mutate(s.id)} className="text-sm text-destructive hover:underline">Turn off</button>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
