import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDashboard } from "@/lib/clinic.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clinic/recall")({
  head: () => ({
    meta: [
      { title: "Recall list — DoseChain clinic" },
      { name: "description", content: "Children with missed or overdue vaccine visits." },
      { property: "og:title", content: "Recall list — DoseChain clinic" },
      { property: "og:description", content: "Missed and overdue vaccine visits for clinic staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecallPage,
});

const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });

function RecallPage() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const [filter, setFilter] = useState<"all" | "urgent">("all");
  if (q.isLoading) return <p className="text-muted-foreground">Loading recall list…</p>;
  if (q.error || !q.data) return <p className="text-destructive">Couldn't load the recall list. <button className="underline" onClick={() => q.refetch()}>Try again</button></p>;
  const all = q.data.recall as any[];
  const rows = filter === "urgent" ? all.filter((r) => r.daysLate > 14) : all;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Recall list</h1>
          <p className="mt-1 text-muted-foreground">Missed or overdue vaccine visits. Reminders go out automatically, so nobody needs to phone.</p>
        </div>
        <div className="flex rounded-full border border-border bg-card p-1 text-sm">
          {(["all", "urgent"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-4 py-1.5", filter === f ? "bg-secondary text-secondary-foreground font-semibold" : "text-muted-foreground")}>
              {f === "all" ? `All (${all.length})` : `Over 14 days (${all.filter((r) => r.daysLate > 14).length})`}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {rows.length === 0 ? <p className="p-8 text-center text-muted-foreground">Nobody overdue. 🎉</p> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-5 py-3">Child</th><th className="px-5 py-3">Was due</th><th className="px-5 py-3">Late</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 font-semibold">{r.name}</td>
                  <td className="px-5 py-3">{fmt(r.day)}</td>
                  <td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", r.daysLate > 14 ? "bg-destructive/15 text-destructive" : "bg-accent/25")}>{r.daysLate}d</span></td>
                  <td className="px-5 py-3 capitalize text-muted-foreground">{r.status}</td>
                  <td className="px-5 py-3 text-right">
                    <a href={`/c/${r.token}`} target="_blank" rel="noreferrer" className="mr-4 text-xs text-primary">Plan</a>
                    <a href={`/wa/${r.token}`} target="_blank" rel="noreferrer" className="text-xs text-primary">Chat</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
