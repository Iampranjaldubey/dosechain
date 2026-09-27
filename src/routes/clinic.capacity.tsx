import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Logo } from "@/components/Footprint";

export const Route = createFileRoute("/clinic/capacity")({
  head: () => ({
    meta: [
      { title: "Capacity planner — DoseChain clinic" },
      { name: "description", content: "Enter clinic hours and appointment demand; AI finds scheduling bottlenecks and suggests capacity changes." },
      { property: "og:title", content: "Capacity planner — DoseChain clinic" },
      { property: "og:description", content: "AI-powered scheduling bottleneck finder for vaccination clinics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CapacityPage,
});

type Row = {
  day: string; open: boolean; sessions: string; staff: number; slotMinutes: number;
  requests: number; booked: number; noShows: number; avgWaitMin: number;
};

const SEED: Row[] = [
  ["Mon", true, "10:00-13:00, 17:30-20:30", 2, 10, 96, 72, 6, 38],
  ["Tue", true, "10:00-13:00, 17:30-20:30", 2, 10, 64, 60, 5, 18],
  ["Wed", true, "10:00-13:00, 17:30-20:30", 1, 10, 58, 36, 4, 42],
  ["Thu", true, "10:00-13:00, 17:30-20:30", 2, 10, 55, 54, 7, 15],
  ["Fri", true, "10:00-13:00, 17:30-20:30", 2, 10, 60, 58, 6, 17],
  ["Sat", true, "10:00-13:00, 17:30-20:30", 2, 10, 128, 72, 9, 55],
  ["Sun", false, "10:00-11:00 (bite only)", 1, 15, 22, 4, 1, 30],
].map(([day, open, sessions, staff, slotMinutes, requests, booked, noShows, avgWaitMin]) => ({
  day, open, sessions, staff, slotMinutes, requests, booked, noShows, avgWaitMin,
} as Row));

function minutes(s: string) {
  return [...s.matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)].reduce(
    (t, m) => t + Math.max(0, (+m[3]! * 60 + +m[4]!) - (+m[1]! * 60 + +m[2]!)), 0);
}

const NUM: (keyof Row)[] = ["staff", "slotMinutes", "requests", "booked", "noShows", "avgWaitMin"];
const LABEL: Record<string, string> = {
  staff: "Staff", slotMinutes: "Slot min", requests: "Requests", booked: "Booked", noShows: "No-shows", avgWaitMin: "Wait min",
};

function CapacityPage() {
  const [rows, setRows] = useState<Row[]>(SEED);
  const [peakNotes, setPeak] = useState("Saturday mornings overflow; Monday evenings busy after school.");
  const [constraints, setCons] = useState("Only 2 vaccinators on payroll; Sunday reserved for bite cases.");
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  const set = (i: number, k: keyof Row, v: string | boolean) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: typeof v === "string" && NUM.includes(k) ? Number(v) || 0 : v } : x)));

  async function analyse() {
    setBusy(true); setErr(""); setOut("");
    ctrl.current = new AbortController();
    try {
      const res = await fetch("/api/capacity-analysis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: rows, peakNotes, constraints }), signal: ctrl.current.signal,
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        setErr(res.status === 429 ? "Too many requests — please wait a minute and try again."
          : res.status === 402 ? "AI credits are used up. Add credits in Settings → Plans & credits."
          : t || "Analysis failed. Please try again.");
        return;
      }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let text = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value, { stream: true }); setOut(text); }
      if (!text.trim()) setErr("The AI returned no analysis. Please try again later.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr("Connection lost. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/"><Logo /></Link>
          <span className="text-sm text-muted-foreground">Clinic admin · Capacity planner</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="font-display text-4xl text-foreground">Find your scheduling bottlenecks</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Enter a typical week's hours and demand. AI compares capacity with demand and suggests practical changes. Suggestions only — you decide.</p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-muted-foreground">
              <tr>
                <th className="p-3">Day</th><th className="p-3">Open</th><th className="p-3">Sessions</th>
                {NUM.map((k) => <th key={k} className="p-3">{LABEL[k]}</th>)}
                <th className="p-3">Capacity</th><th className="p-3">Use</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const cap = r.open || r.sessions ? Math.floor(minutes(r.sessions) / r.slotMinutes) * r.staff : 0;
                const use = cap ? Math.round((r.requests / cap) * 100) : 0;
                return (
                  <tr key={r.day} className="border-t border-border">
                    <td className="p-3 font-medium">{r.day}</td>
                    <td className="p-3"><input type="checkbox" aria-label={`${r.day} open`} checked={r.open} onChange={(e) => set(i, "open", e.target.checked)} /></td>
                    <td className="p-2"><input className="w-52 rounded-md border border-input bg-background px-2 py-1.5" value={r.sessions} onChange={(e) => set(i, "sessions", e.target.value)} /></td>
                    {NUM.map((k) => (
                      <td key={k} className="p-2"><input type="number" min={0} aria-label={`${r.day} ${LABEL[k]}`} className="w-20 rounded-md border border-input bg-background px-2 py-1.5" value={r[k] as number} onChange={(e) => set(i, k, e.target.value)} /></td>
                    ))}
                    <td className="p-3 tabular-nums">{cap}</td>
                    <td className={`p-3 font-semibold tabular-nums ${use > 100 ? "text-destructive" : use > 85 ? "text-accent-foreground" : "text-primary"}`}>{use}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">Peak-time notes
            <textarea className="mt-1 w-full rounded-lg border border-input bg-card p-3" rows={3} value={peakNotes} onChange={(e) => setPeak(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">Constraints
            <textarea className="mt-1 w-full rounded-lg border border-input bg-card p-3" rows={3} value={constraints} onChange={(e) => setCons(e.target.value)} />
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={analyse} disabled={busy} className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "Analysing…" : "Analyse with AI"}
          </button>
          {busy && <button onClick={() => ctrl.current?.abort()} className="rounded-full border border-border px-6 py-3">Stop</button>}
        </div>

        {err && <p role="alert" className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">{err}</p>}
        {out && (
          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            {out.split("\n").map((line, i) =>
              /^[A-Z][A-Z ]+$/.test(line.trim())
                ? <h2 key={i} className="mt-4 font-display text-xl text-primary first:mt-0">{line}</h2>
                : <p key={i} className="leading-relaxed text-foreground">{line}</p>)}
          </section>
        )}
      </main>
    </div>
  );
}
